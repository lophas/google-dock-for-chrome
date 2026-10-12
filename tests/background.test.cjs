const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(tabs=[],settings={}) {
  const calls=[]; let listener;
  const chrome={storage:{local:{get:async()=>({settings})}},runtime:{onMessage:{addListener:fn=>listener=fn},openOptionsPage:async()=>{}},commands:{onCommand:{addListener(){}}},tabs:{query:async()=>tabs,update:async(id,opts)=>{calls.push(['activate',id]);if(id===999)throw Error('Closed');},create:async(opts)=>calls.push(['create',opts])},windows:{getLastFocused:async()=>({id:1}),update:async id=>calls.push(['focus',id])}};
  const ctx=vm.createContext({chrome,URL});
  const run=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  ctx.importScripts=run;run('background.js');
  const send=(message)=>new Promise(resolve=>listener(message,{tab:{windowId:1}},resolve));
  return {send,calls,ctx};
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
