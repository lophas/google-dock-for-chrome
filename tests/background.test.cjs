const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(tabs=[],settings={}) {
  const calls=[], groupCalls=[], moveCalls=[], groups=[], session={}, listeners={};
  let listener, nextGroup=1, nextTab=100, stored=settings;
  const event=name=>({addListener:fn=>listeners[name]=fn});
  for(let i=0;i<tabs.length;i++){tabs[i].windowId??=1;tabs[i].index??=i;}
  function move(id,index){
    const tab=tabs.find(t=>t.id===id);
    const windowTabs=tabs.filter(t=>t.windowId===tab.windowId).sort((a,b)=>a.index-b.index);
    const current=windowTabs.indexOf(tab);windowTabs.splice(current,1);windowTabs.splice(index,0,tab);
    windowTabs.forEach((t,i)=>t.index=i);return tab;
  }
  const chrome={
    storage:{onChanged:event('storageChanged'),session:{get:async key=>key===null?session:{[key]:session[key]},set:async r=>Object.assign(session,r)},local:{get:async()=>({settings:stored}),set:async r=>{stored=r.settings;}}},
    runtime:{onMessage:{addListener:fn=>listener=fn},onStartup:event('startup'),onInstalled:event('installed'),openOptionsPage:async()=>{}},
    commands:{onCommand:event('command')},
    tabs:{
      onCreated:event('created'),onActivated:event('activated'),onUpdated:event('updated'),onMoved:event('moved'),onAttached:event('attached'),onRemoved:event('removed'),
      query:async(q={})=>tabs.filter(t=>(q.groupId===undefined||t.groupId===q.groupId)&&(q.windowId===undefined||t.windowId===q.windowId)&&(q.active===undefined||t.active===q.active)).sort((a,b)=>a.index-b.index),
      sendMessage:async()=>{},
      update:async(id,opts)=>{calls.push(['activate',id]);if(id===999)throw Error('Closed');const tab=tabs.find(t=>t.id===id);if(opts.active)tabs.filter(t=>t.windowId===tab.windowId).forEach(t=>t.active=t.id===id);return tab;},
      create:async opts=>{calls.push(['create',opts]);const tab={id:nextTab++,index:tabs.filter(t=>t.windowId===opts.windowId).length,...opts};tabs.push(tab);return tab;},
      remove:async id=>{const i=tabs.findIndex(t=>t.id===id);if(i>=0)tabs.splice(i,1);},
      ungroup:async id=>{tabs.find(t=>t.id===id).groupId=-1;},
      move:async(id,opts)=>{moveCalls.push([id,opts.index]);if(opts.windowId!==undefined){const t=tabs.find(t=>t.id===id);t.windowId=opts.windowId;t.index=tabs.filter(x=>x.id!==id&&x.windowId===opts.windowId).length;return t;}return move(id,opts.index);},
      group:async opts=>{
        groupCalls.push(opts);let id=opts.groupId;
        if(id===undefined){id=nextGroup++;groups.push({id,windowId:opts.createProperties.windowId});}
        for(const tabId of opts.tabIds){const tab=tabs.find(t=>t.id===tabId);tab.groupId=id;}
        return id;
      }
    },
    tabGroups:{query:async q=>groups.filter(g=>(q.windowId===undefined||g.windowId===q.windowId)&&g.title===q.title),update:async(id,opts)=>Object.assign(groups.find(g=>g.id===id),opts)},
    windows:{getLastFocused:async()=>({id:1}),update:async id=>calls.push(['focus',id])}
  };
  const ctx=vm.createContext({chrome,URL,setTimeout,clearTimeout});
  const run=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  ctx.importScripts=run;run('background.js');
  const send=(message,windowId=1)=>new Promise(resolve=>listener(message,{tab:{windowId}},resolve));
  return {listeners,moveCalls,session,tabs,send,calls,ctx,groupCalls,groups,chrome,stored:()=>stored};
}
test('expanded apps reuse and close their tabs without touching Calendar',async()=>{
  const entries=[['tasks','https://calendar.google.com/calendar/u/0/r/tasks'],['translate','https://translate.google.com/?sl=en&tl=hu'],['forms','https://docs.google.com/forms/d/test/edit'],['sites','https://sites.google.com/d/test/edit'],['vids','https://docs.google.com/videos/d/test/edit'],['notebooklm','https://notebooklm.google.com/notebook/test'],['news','https://news.google.com/home'],['youtube-music','https://music.youtube.com/watch?v=test'],['earth','https://earth.google.com/web/'],['finance','https://www.google.com/finance/quote/GOOG:NASDAQ'],['scholar','https://scholar.google.com/scholar?q=test'],['books','https://books.google.com/books?id=test'],['travel','https://www.google.com/travel/flights'],['apps-script','https://script.google.com/home/projects/test/edit']];
  for(const [appId,url] of entries){
    const s=setup([{id:10,url:'https://calendar.google.com/calendar/u/0/r/week'},{id:20,url}]);
    assert.equal((await s.send({type:'launch',appId})).ok,true,appId);
    assert.ok(s.calls.some(c=>c[0]==='activate'&&c[1]===20),appId);
    assert.equal(s.calls.some(c=>c[0]==='create'),false,appId);
    await s.send({type:'close',appId});
    assert.equal(s.tabs.some(t=>t.id===20),false,appId);assert.equal(s.tabs.some(t=>t.id===10),true,appId);
  }
});
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
test('rapid same-app clicks create one persistent tab and focus it thereafter',async()=>{
  const s=setup();await Promise.all(Array.from({length:6},()=>s.send({type:'launch',appId:'gemini'})));
  assert.equal(s.calls.filter(c=>c[0]==='create').length,1);
  assert.equal(s.calls.filter(c=>c[0]==='activate').length,5);
  assert.equal(s.session['appTab:gemini'],100);
});
test('remembered app tab is preferred and survives Google sign-in redirects',async()=>{
  const s=setup([{id:10,windowId:1,url:'https://mail.google.com/mail/u/0/'},{id:20,windowId:2,url:'https://accounts.google.com/v3/signin/identifier'}]);
  s.session['appTab:gmail']=20;await s.send({type:'launch',appId:'gmail'});
  assert.equal(s.calls[0][1],20);assert.equal(s.calls.some(c=>c[0]==='create'),false);
});
test('remembered tabs navigated to unrelated sites are not reused',async()=>{
  const s=setup([{id:20,windowId:1,url:'https://example.org/'}]);s.session['appTab:gmail']=20;
  await s.send({type:'launch',appId:'gmail'});assert.equal(s.calls[0][0],'create');
});
test('app detection checks pending URL as well as current URL',async()=>{
  const s=setup([{id:10,windowId:1,url:'about:blank',pendingUrl:'https://gemini.google.com/app'}]);
  await s.send({type:'launch',appId:'gemini'});assert.equal(s.calls[0][0],'activate');
  assert.ok((await s.send({type:'running'})).ids.includes('gemini'));
});
test('drag reorder moves pinned icons without losing concurrently pinned apps',async()=>{
  const s=setup([],{dockApps:['gmail','drive','gemini'],theme:'dark'});
  await Promise.all([s.send({type:'pin',appId:'payments',keep:true}),s.send({type:'reorder',appId:'gemini',beforeId:'gmail'})]);
  assert.deepEqual(Array.from(s.stored().dockApps),['gemini','gmail','drive','payments']);
  await s.send({type:'reorder',appId:'gemini',beforeId:null});
  assert.deepEqual(Array.from(s.stored().dockApps),['gmail','drive','payments','gemini']);assert.equal(s.stored().theme,'dark');
  const r=await s.send({type:'reorder',appId:'photos',beforeId:'gmail'});assert.match(r.error,/Only pinned/);
});
test('Gemini icon uses self-contained colored paths without SVG fragment references',()=>{
  const s=setup();const icon=s.ctx.GDock.apps.find(a=>a.id==='gemini').icon;
  assert.doesNotMatch(icon,/url\(|<defs|id=/);assert.match(icon,/#4285f4/);assert.match(icon,/#a142f4/);
});
test('shortcut catalogue matches only intended Google services',()=>{
  const s=setup(),g=s.ctx.GDock;
  for(const id of ['payments','passwords','account','contacts','one']){
    const app=g.apps.find(a=>a.id===id);assert.ok(app);assert.ok(g.matches(app,app.url));assert.equal(g.matches(app,'https://example.org/'),false);
  }
  assert.ok(g.matches(g.apps.find(a=>a.id==='payments'),'https://pay.google.com/gp/w/home/paymentmethods'));
});
test('manifest declares tab URL access explicitly',()=>{
  const m=JSON.parse(fs.readFileSync(path.join(__dirname,'..','manifest.json'),'utf8'));assert.ok(m.permissions.includes('tabs'));
});
test('active icon reflects the active tab in the requesting window, and clears on other sites',async()=>{
  const s=setup([{id:1,windowId:1,active:true,url:'https://mail.google.com/mail/u/0/'},{id:2,windowId:2,active:true,url:'https://gemini.google.com/app'}]);
  assert.equal((await s.send({type:'running'},1)).activeId,'gmail');assert.equal((await s.send({type:'running'},2)).activeId,'gemini');
  s.tabs[0].url='https://example.org/';await vm.runInContext('refreshDockState()',s.ctx);assert.equal((await s.send({type:'running'},1)).activeId,null);
});
test('launch group order follows pinned icons and then temporary catalogue order',async()=>{
  const s=setup([],{dockApps:['gemini','gmail','drive']});
  for(const appId of ['drive','photos','gmail','gemini'])await s.send({type:'launch',appId});
  const ordered=s.tabs.filter(t=>t.groupId===1).sort((a,b)=>a.index-b.index);
  assert.deepEqual(ordered.map(t=>s.ctx.GDock.apps.find(a=>s.ctx.GDock.matches(a,t.url)).id),['gemini','gmail','drive','photos']);
  const moves=s.moveCalls.length;await s.send({type:'launch',appId:'gmail'});assert.equal(s.moveCalls.length,moves);
});
test('dock reorder synchronizes all windows, preserves other tabs and same-app ordering',async()=>{
  const s=setup([{id:1,windowId:1,index:0,url:'https://example.org/'},{id:2,windowId:1,index:1,groupId:8,url:'https://mail.google.com/mail/u/0/'},{id:3,windowId:1,index:2,groupId:8,url:'https://mail.google.com/mail/u/1/'},{id:4,windowId:1,index:3,groupId:8,url:'https://gemini.google.com/app'},{id:5,windowId:1,index:4,url:'https://other.test/'},{id:6,windowId:2,index:0,groupId:9,url:'https://mail.google.com/mail/u/0/'},{id:7,windowId:2,index:1,groupId:9,url:'https://gemini.google.com/app'}],{dockApps:['gmail','gemini']});
  s.groups.push({id:8,windowId:1,title:'Google Dock'},{id:9,windowId:2,title:'Google Dock'});
  await s.send({type:'reorder',appId:'gemini',beforeId:'gmail'});
  assert.deepEqual(s.tabs.filter(t=>t.windowId===1).sort((a,b)=>a.index-b.index).map(t=>t.id),[1,4,2,3,5]);
  assert.deepEqual(s.tabs.filter(t=>t.windowId===2).sort((a,b)=>a.index-b.index).map(t=>t.id),[7,6]);
});
test('manual group-tab rearrangement is corrected without a move loop',async()=>{
  const s=setup([],{dockApps:['gmail','gemini']});for(const appId of ['gmail','gemini'])await s.send({type:'launch',appId});
  await s.chrome.tabs.move(101,{index:0});s.listeners.moved(101,{windowId:1});
  await new Promise(resolve=>setTimeout(resolve,220));
  assert.deepEqual(s.tabs.sort((a,b)=>a.index-b.index).map(t=>t.id),[100,101]);
});
test('close removes one app tab, leaves pinned icons and unrelated tabs intact',async()=>{
  const s=setup([{id:1,windowId:1,active:true,url:'https://mail.google.com/mail/u/0/'},{id:2,windowId:1,url:'https://mail.google.com/mail/u/1/'},{id:3,windowId:1,url:'https://example.org/'}],{dockApps:['gmail']});
  await s.send({type:'close',appId:'gmail'});assert.deepEqual(s.tabs.map(t=>t.id),[2,3]);assert.deepEqual(s.stored().dockApps,['gmail']);
  await s.send({type:'close',appId:'gmail'});assert.deepEqual(s.tabs.map(t=>t.id),[3]);
  await s.send({type:'close',appId:'gmail'});assert.deepEqual(s.tabs.map(t=>t.id),[3]);
});
test('all page views read the same cached singleton without querying tabs per view',async()=>{
  const s=setup([{id:1,windowId:1,active:true,url:'https://mail.google.com/mail/u/0/'}]);let queries=0;
  const query=s.chrome.tabs.query;s.chrome.tabs.query=async opts=>{queries++;return query(opts);};
  const a=await s.send({type:'state-get'});const afterInit=queries;
  const b=await s.send({type:'state-get'});assert.equal(queries,afterInit);assert.equal(a.revision,b.revision);
  await s.send({type:'ui-patch',patch:{visible:true,launcherOpen:true,search:'drive'}});
  const c=await s.send({type:'state-get'});assert.equal(queries,afterInit);assert.equal(c.ui.visible,true);assert.equal(c.ui.search,'drive');
  assert.equal(s.session.dockState.uiByWindow[1].launcherOpen,true);
});
test('singleton recovers per-window UI when the service worker restarts',async()=>{
  const s=setup([{id:1,windowId:1,active:true,url:'https://mail.google.com/mail/u/0/'}]);
  await s.send({type:'ui-patch',patch:{visible:true,search:'gemini'}});
  vm.runInContext('dockState=undefined;dockTabs=[];',s.ctx);
  const state=await s.send({type:'state-get'});assert.equal(state.ui.visible,true);assert.equal(state.ui.search,'gemini');assert.equal(state.activeId,'gmail');
});
test('app close refreshes the central running state immediately',async()=>{
  const s=setup([{id:1,windowId:1,active:true,url:'https://gemini.google.com/app'}]);assert.ok((await s.send({type:'state-get'})).ids.includes('gemini'));
  await s.send({type:'close',appId:'gemini'});assert.equal((await s.send({type:'state-get'})).ids.includes('gemini'),false);
});
test('launch closes the shared app menu before opening or focusing the target tab',async()=>{
  const s=setup([{id:1,windowId:1,active:true,url:'https://example.org/'}]);
  await s.send({type:'ui-patch',patch:{visible:true,launcherOpen:true,search:'gem'}});
  const create=s.chrome.tabs.create;s.chrome.tabs.create=async opts=>{assert.equal(s.session.dockState.uiByWindow[1].launcherOpen,false);return create(opts);};
  await s.send({type:'launch',appId:'gemini'});
  const state=await s.send({type:'state-get'});assert.equal(state.ui.launcherOpen,false);assert.equal(state.ui.search,'');
});
test('transparency supports both endpoints and survives pinned-list restore',async()=>{
  const s=setup();assert.equal(s.ctx.GDock.normalize().transparency,12);
  for(const value of [0,100]){await s.send({type:'settings-patch',patch:{transparency:value}});assert.equal(s.stored().transparency,value);}
  await s.send({type:'settings-patch',patch:{dockApps:['gemini','gmail']}});assert.equal(s.stored().transparency,100);
  for(const value of [-1,101,'50',null])assert.equal(s.ctx.GDock.normalize({transparency:value}).transparency,12);
});
test('Photos remembers its last-used account and never reuses another account tab',async()=>{
  const s=setup([{id:1,windowId:1,url:'https://photos.google.com/u/0/',lastAccessed:1},{id:2,windowId:1,url:'https://photos.google.com/u/1/album/abc',lastAccessed:20}]);
  await s.send({type:'remember-account',appId:'photos'});assert.equal(s.stored().accountUrls.photos,'https://photos.google.com/u/1/');
  await s.send({type:'launch',appId:'photos'});assert.equal(s.calls[0][1],2);
  s.tabs.splice(s.tabs.findIndex(t=>t.id===2),1);await s.send({type:'launch',appId:'photos'});
  assert.equal(s.calls.find(c=>c[0]==='create')[1].url,'https://photos.google.com/u/1/');
});
test('account choice applies only to one app and close respects the choice',async()=>{
  const s=setup([{id:1,windowId:1,url:'https://photos.google.com/u/0/'},{id:2,windowId:1,url:'https://photos.google.com/u/1/'}],{accountUrls:{photos:'https://photos.google.com/u/1/'}});
  await s.send({type:'close',appId:'photos'});assert.deepEqual(s.tabs.map(t=>t.id),[1]);
  assert.equal((await s.send({type:'state-get'})).ids.includes('photos'),false);
  await s.send({type:'launch',appId:'gmail'});assert.equal(s.calls.find(c=>c[0]==='create')[1].url,'https://mail.google.com/mail/u/0/');
});
test('account remembering rejects unidentifiable URLs and automatic resets the override',async()=>{
  const s=setup([{id:1,windowId:1,url:'https://photos.google.com/'}]);assert.match((await s.send({type:'remember-account',appId:'photos'})).error,/does not identify/);
  const p=setup([],{accountUrls:{photos:'https://photos.google.com/u/1/'}});await p.send({type:'reset-account',appId:'photos'});assert.equal(p.stored().accountUrls.photos,undefined);
});
test('remembered Photos account tab moves from a separate window into the caller window',async()=>{
  const s=setup([{id:10,windowId:2,groupId:7,url:'https://photos.google.com/u/1/'}],{accountUrls:{photos:'https://photos.google.com/u/1/'}});
  s.groups.push({id:7,windowId:2,title:'Old group'});
  await s.send({type:'launch',appId:'photos'},1);
  assert.equal(s.tabs[0].windowId,1);assert.equal(s.groups.find(g=>g.title==='Google Dock').windowId,1);
  assert.equal(s.calls.some(c=>c[0]==='create'),false);assert.deepEqual(s.calls,[['activate',10],['focus',1]]);
});
test('failed window transfer restores the original group and never creates a duplicate',async()=>{
  const s=setup([{id:10,windowId:2,groupId:7,url:'https://photos.google.com/u/1/'}],{accountUrls:{photos:'https://photos.google.com/u/1/'}});
  s.chrome.tabs.move=async()=>{throw Error('Window cannot accept tab');};
  const result=await s.send({type:'launch',appId:'photos'},1);
  assert.match(result.error,/Could not bring/);assert.equal(s.tabs[0].groupId,7);assert.equal(s.calls.some(c=>c[0]==='create'),false);
});
test('dock edge is saved centrally and backup restore leaves it unchanged',async()=>{
  const s=setup();await s.send({type:'settings-patch',patch:{triggerEdge:'top'}});assert.equal((await s.send({type:'state-get'})).settings.triggerEdge,'top');
  await s.send({type:'settings-patch',patch:{dockApps:['photos']}});assert.equal(s.stored().triggerEdge,'top');
  assert.equal(s.ctx.GDock.normalize({triggerEdge:'unknown'}).triggerEdge,'bottom');
});
test('Disabled mode keyboard command opens the toolbar instead of messaging the page',async()=>{
  const s=setup([],{triggerEdge:'disabled'});let popups=0,pageMessages=0;
  s.chrome.action={openPopup:async()=>popups++};s.chrome.tabs.sendMessage=async()=>pageMessages++;
  await s.listeners.command('toggle-dock');assert.equal(popups,1);assert.equal(pageMessages,0);
  assert.equal(s.ctx.GDock.normalize({enabled:false}).triggerEdge,'disabled');
});
