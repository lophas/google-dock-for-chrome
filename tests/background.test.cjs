const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(tabs=[],settings={}) {
  const calls=[], groupCalls=[], groups=[]; let listener, nextGroup=1, nextTab=100, stored=settings;
  const chrome={
    storage:{local:{get:async()=>({settings:stored}),set:async r=>{stored=r.settings;}}},
    runtime:{onMessage:{addListener:fn=>listener=fn},openOptionsPage:async()=>{}},
    commands:{onCommand:{addListener(){}}},
    tabs:{
      query:async()=>tabs,
      update:async(id,opts)=>{calls.push(['activate',id]);if(id===999)throw Error('Closed');return tabs.find(t=>t.id===id);},
      create:async opts=>{calls.push(['create',opts]);const tab={id:nextTab++,...opts};tabs.push(tab);return tab;},
      group:async opts=>{groupCalls.push(opts);if(opts.groupId!==undefined)return opts.groupId;const id=nextGroup++;groups.push({id,windowId:opts.createProperties.windowId});return id;}
    },
    tabGroups:{query:async q=>groups.filter(g=>g.windowId===q.windowId&&g.title===q.title),update:async(id,opts)=>Object.assign(groups.find(g=>g.id===id),opts)},
    windows:{getLastFocused:async()=>({id:1}),update:async id=>calls.push(['focus',id])}
  };
  const ctx=vm.createContext({chrome,URL});
  const run=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  ctx.importScripts=run;run('background.js');
  const send=(message,windowId=1)=>new Promise(resolve=>listener(message,{tab:{windowId}},resolve));
  return {send,calls,ctx,groupCalls,groups,chrome,stored:()=>stored};
}
test('reuse prefers current window and never creates duplicate',async()=>{
  const s=setup([{id:20,windowId:2,url:'https://mail.google.com/mail/u/1/',lastAccessed:999},{id:10,windowId:1,url:'https://mail.google.com/mail/u/0/',lastAccessed:1}]);
  assert.equal((await s.send({type:'launch',appId:'gmail'})).ok,true);
  assert.deepEqual(s.calls,[['activate',10],['focus',1]]);
});
test('middle click creates a background tab despite existing app',async()=>{
  const s=setup([{id:10,windowId:1,url:'https://mail.google.com/mail/u/0/'}]);
  await s.send({type:'launch',appId:'gmail',newTab:true,background:true});
  assert.equal(s.calls[0][0],'create');assert.equal(s.calls[0][1].active,false);
});
test('disabled reuse and closed tab both open a fresh tab',async()=>{
  for(const [tabs,config] of [[[{id:10,url:'https://meet.google.com/'}],{reuseTabs:false}],[ [{id:999,url:'https://meet.google.com/'}],{}]]){
    const s=setup(tabs,config);await s.send({type:'launch',appId:'meet'});assert.equal(s.calls.at(-1)[0],'create');
  }
});
test('running distinguishes Docs, Sheets, Slides and unrelated Google pages',async()=>{
  const s=setup([{url:'https://docs.google.com/spreadsheets/d/abc/edit'},{url:'https://www.google.com/search?q=maps'},{url:'https://gemini.google.com/app'},{pendingUrl:'https://calendar.google.com/calendar/u/0/r'}]);
  const r=await s.send({type:'running'});assert.deepEqual(Array.from(r.ids),['calendar','sheets','gemini']);
});
test('unknown app is rejected without opening user supplied URLs',async()=>{
  const s=setup();assert.match((await s.send({type:'launch',appId:'evil',url:'https://evil.test/'})).error,/Unknown app/);assert.equal(s.calls.length,0);
});
test('settings normalization rejects invalid values and duplicate app IDs',()=>{
  const s=setup();const c=s.ctx.GDock.normalize({size:100,theme:'invalid',dockApps:['gmail','bad','gmail'],enabled:'no'});assert.equal(c.size,46);assert.equal(c.enabled,true);assert.equal(c.theme,'auto');assert.deepEqual(Array.from(c.dockApps),['gmail']);
});

test('launches share one Google Dock group per window, including concurrent launches',async()=>{
  const s=setup();await Promise.all(['gmail','drive','calendar'].map(appId=>s.send({type:'launch',appId,newTab:true})));
  assert.equal(s.groups.length,1);assert.equal(s.groups[0].title,'Google Dock');assert.equal(s.groups[0].color,'blue');
  assert.equal(s.groupCalls.filter(c=>c.createProperties).length,1);
  await s.send({type:'launch',appId:'meet',newTab:true},2);assert.equal(s.groups.length,2);
});
test('reused app joins the group in its own window',async()=>{
  const s=setup([{id:10,windowId:2,url:'https://meet.google.com/'}]);await s.send({type:'launch',appId:'meet'});
  assert.equal(s.groups[0].windowId,2);assert.deepEqual(Array.from(s.groupCalls[0].tabIds),[10]);
});
test('group failures warn without creating duplicate tabs or undoing Chrome pinning',async()=>{
  for(const pinned of [true,false]){
    const s=setup([{id:10,windowId:1,pinned,url:'https://meet.google.com/'}]);s.chrome.tabs.group=async()=>{throw Error('No group');};
    const r=await s.send({type:'launch',appId:'meet'});assert.equal(r.ok,true);assert.match(r.warning,/grouping failed/);assert.equal(s.calls.some(c=>c[0]==='create'),false);
  }
});
test('simultaneous pinning merges changes and preserves unrelated settings',async()=>{
  const s=setup([],{dockApps:['gmail'],theme:'dark',triggerHeight:32});
  await Promise.all(['photos','slides'].map(appId=>s.send({type:'pin',appId,keep:true})));
  assert.deepEqual(Array.from(s.stored().dockApps),['gmail','photos','slides']);assert.equal(s.stored().triggerHeight,32);
  await s.send({type:'pin',appId:'gmail',keep:true});assert.equal(s.stored().dockApps[0],'gmail');
  await s.send({type:'pin',appId:'photos',keep:false});assert.deepEqual(Array.from(s.stored().dockApps),['gmail','slides']);
  await s.send({type:'settings-patch',patch:{triggerHeight:16}});assert.equal(s.stored().triggerHeight,16);assert.equal(s.stored().theme,'dark');
});
test('invalid trigger height falls back to 24 pixels',()=>{
  const s=setup();assert.equal(s.ctx.GDock.normalize({triggerHeight:99}).triggerHeight,24);
});
test('background launches keep an existing group collapsed',async()=>{
  const s=setup();await s.send({type:'launch',appId:'gmail'});s.groups[0].collapsed=true;
  await s.send({type:'launch',appId:'drive',newTab:true,background:true});assert.equal(s.groups[0].collapsed,true);
  await s.send({type:'launch',appId:'drive'});assert.equal(s.groups[0].collapsed,false);
});
