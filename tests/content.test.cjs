const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
// DOM fixture verifies the actual content-script event/timer wiring; no browser layout emulation.
async function setup(){
  const timers=new Map();let next=0, messageListener, storageListener, running=['gmail'], stored={}, requests=[], activeId=null, ui={visible:false,launcherOpen:false,search:''}, revision=0;
  class Element {
    constructor(){this.dataset={};this.children=[];this.handlers={};this.hidden=false;this.value='';this.style={setProperty(){}};this.isConnected=true;this.classList={add:()=>{},remove:()=>{}};}
    append(...items){this.children.push(...items);}
    replaceChildren(){this.children=[];}
    setAttribute(){}
    removeAttribute(){}
    addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
    dispatch(name,e={}){for(const fn of this.handlers[name]||[])fn(e);}
    matches(){return false;}
    focus(){}
    blur(){}
    attachShadow(){return root;}
    querySelector(s){return nodes[s];}
    querySelectorAll(selector){if(this===nodes['.context-menu'])return this.children.filter(b=>b.tagName==='button');const dock=nodes['.strip'].children.filter(b=>b.className==='app');return selector==='.app,.tile'?[...dock,...nodes['.grid'].children.filter(b=>b.className==='tile')]:dock;}
    getBoundingClientRect(){return {left:200,right:800,top:690,bottom:790};}
  }
  const nodes=Object.fromEntries(['.dock','.launcher','.search','.strip','.grid','.more','.settings','.status','.context-menu'].map(s=>[s,new Element()]));
  nodes['.launcher'].hidden=true;nodes['.context-menu'].hidden=true;
  const root=new Element(),document=new Element(),window=new Element();document.documentElement=new Element();document.createElement=tag=>{const el=new Element();el.tagName=tag;return el;};document.getElementById=()=>null;
  const chrome={runtime:{getURL:n=>n,sendMessage:async message=>{requests.push(message);if(message.type==='ui-patch'){ui={...ui,...message.patch};return {ok:true};}if(message.type==='reorder'){const config=context.GDock.normalize(stored);const ids=config.dockApps.filter(id=>id!==message.appId);ids.splice(message.beforeId==null?ids.length:ids.indexOf(message.beforeId),0,message.appId);config.dockApps=ids;stored=config;return {settings:stored};}if(message.type==='pin'){const config=context.GDock.normalize(stored);config.dockApps=config.dockApps.filter(id=>id!==message.appId);if(message.keep)config.dockApps.push(message.appId);stored=config;return {settings:stored};}return {revision:++revision,settings:stored,ids:running,activeId,ui};},onMessage:{addListener:fn=>messageListener=fn}},storage:{local:{get:async()=>({})},onChanged:{addListener:fn=>storageListener=fn}}};
  const context=vm.createContext({document,window,chrome,innerHeight:800,innerWidth:1000,URL,fetch:async()=>({text:async()=>''}),setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>{}});
  const run=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),context);
  run('shared.js');await run('content.js');
  const shell=root.children[1];
  const move=(x,y)=>document.dispatch('pointermove',{pointerType:'mouse',clientX:x,clientY:y});
  const tick=delay=>{for(const [id,t]of [...timers])if(t.delay===delay){timers.delete(id);t.fn();}};
  return {setActive:id=>activeId=id,stateChanged:()=>messageListener({type:'dock-state-changed'}),requests,setRunning:ids=>running=ids,refresh:async()=>{messageListener({type:'dock-state-changed'});await new Promise(setImmediate);},move,tick,timers,shell,nodes,document,window,toggle:()=>messageListener({type:'toggle-dock'}),settings:s=>{stored=s;messageListener({type:'dock-state',state:{revision:++revision,settings:stored,ids:running,activeId,ui}});}};
}
test('edge dwell cancels on departure and can reveal repeatedly',async()=>{
  const s=await setup();s.move(500,799);assert.equal(s.shell.dataset.visible,'false');s.move(500,500);s.tick(100);assert.equal(s.shell.dataset.visible,'false');
  for(let i=0;i<3;i++){s.move(500,799);s.tick(100);assert.equal(s.shell.dataset.visible,'true');s.move(100,400);s.tick(380);assert.equal(s.shell.dataset.visible,'false');}
});
test('bottom gap and grace corridor preserve visible dock',async()=>{
  const s=await setup();s.toggle();s.move(500,799);s.tick(380);assert.equal(s.shell.dataset.visible,'true');s.move(185,700);s.tick(380);assert.equal(s.shell.dataset.visible,'true');
  s.move(50,500);s.move(500,700);s.tick(380);assert.equal(s.shell.dataset.visible,'true');
});
test('launcher stays open until outside click or Escape',async()=>{
  const s=await setup();s.toggle();s.nodes['.more'].dispatch('click');s.move(50,400);s.tick(380);assert.equal(s.shell.dataset.visible,'true');
  s.document.dispatch('keydown',{key:'Escape',stopPropagation(){}});assert.equal(s.nodes['.launcher'].hidden,true);assert.equal(s.shell.dataset.visible,'false');
});
test('disable setting blocks edge and keyboard reveal; fullscreen suppresses dock',async()=>{
  const s=await setup();s.settings({enabled:false});s.move(500,799);s.tick(100);s.toggle();assert.equal(s.shell.dataset.visible,'false');
  s.settings({enabled:true});s.document.fullscreenElement={};s.toggle();assert.equal(s.shell.dataset.visible,'false');
});

test('activation zone uses the configured height without reaching physical bottom edge',async()=>{
  const s=await setup();s.move(500,780);s.tick(100);assert.equal(s.shell.dataset.visible,'true');
  s.settings({triggerHeight:4});s.toggle();s.move(500,780);s.tick(100);assert.equal(s.shell.dataset.visible,'false');
  s.move(500,799);s.tick(100);assert.equal(s.shell.dataset.visible,'true');
});
test('unpinned running apps appear after pinned apps and disappear when closed',async()=>{
  const s=await setup();s.settings({dockApps:['gmail']});s.setRunning(['gmail','photos']);await s.refresh();
  assert.deepEqual(s.nodes['.strip'].children.filter(b=>b.className==='app').map(b=>b.dataset.appId),['gmail','photos']);
  s.toggle();s.setRunning(['gmail']);await s.refresh();
  assert.deepEqual(s.nodes['.strip'].children.filter(b=>b.className==='app').map(b=>b.dataset.appId),['gmail']);
});
test('right-click menu keeps autohide open and adds a launcher app to the dock',async()=>{
  const s=await setup();s.toggle();
  const photos=s.nodes['.grid'].children.find(b=>b.dataset.appId==='photos');
  photos.dispatch('contextmenu',{preventDefault(){},clientX:500,clientY:700});
  assert.equal(s.nodes['.context-menu'].hidden,false);s.move(50,400);s.tick(380);assert.equal(s.shell.dataset.visible,'true');
  s.nodes['.context-menu'].children[1].dispatch('click');await new Promise(setImmediate);
  assert.ok(s.nodes['.strip'].children.some(b=>b.dataset.appId==='photos'));assert.equal(s.shell.dataset.visible,'true');
});
test('unpinning a running dock app moves it to the temporary section',async()=>{
  const s=await setup();s.setRunning(['gmail']);await s.refresh();
  const gmail=s.nodes['.strip'].children.find(b=>b.dataset.appId==='gmail');
  gmail.dispatch('contextmenu',{preventDefault(){},clientX:500,clientY:700});
  s.nodes['.context-menu'].children[1].dispatch('click');await new Promise(setImmediate);
  const apps=s.nodes['.strip'].children.filter(b=>b.className==='app');
  assert.equal(apps.at(-1).dataset.appId,'gmail');assert.equal(apps.filter(b=>b.dataset.appId==='gmail').length,1);
});

test('dock drag-and-drop persists insertion and never launches the dragged app',async()=>{
  const s=await setup();s.toggle();
  const apps=s.nodes['.strip'].children.filter(b=>b.className==='app');
  apps.forEach((b,i)=>b.getBoundingClientRect=()=>({left:200+i*60,width:56,right:256+i*60}));
  const gemini=apps.find(b=>b.dataset.appId==='gemini');assert.equal(gemini.draggable,true);
  const dataTransfer={setData(){}};
  gemini.dispatch('dragstart',{dataTransfer});
  s.nodes['.strip'].dispatch('dragover',{preventDefault(){},dataTransfer,clientX:201});
  s.nodes['.strip'].dispatch('drop',{preventDefault(){}});await new Promise(setImmediate);
  assert.equal(s.requests.find(r=>r.type==='reorder').beforeId,'gmail');
  assert.equal(s.nodes['.strip'].children[0].dataset.appId,'gemini');
  gemini.dispatch('click',{preventDefault(){}});assert.equal(s.requests.some(r=>r.type==='launch'),false);
});

test('active app has a distinct marker that follows pushed tab changes and clears',async()=>{
  const s=await setup();s.setActive('gmail');await s.refresh();
  let gmail=s.nodes['.strip'].children.find(b=>b.dataset.appId==='gmail');
  assert.equal(gmail.dataset.active,'true');assert.equal(gmail.dataset.running,'true');
  s.setActive('gemini');s.stateChanged();await new Promise(setImmediate);
  assert.equal(gmail.dataset.active,'false');assert.equal(s.nodes['.strip'].children.find(b=>b.dataset.appId==='gemini').dataset.active,'true');
  s.setActive(null);s.stateChanged();await new Promise(setImmediate);
  assert.equal(s.nodes['.strip'].children.some(b=>b.dataset.active==='true'),false);
});
test('context menu uses Close for running apps and Open for closed apps in both surfaces',async()=>{
  const s=await setup();s.toggle();await new Promise(setImmediate);
  const event={preventDefault(){},clientX:500,clientY:700};
  const gmailDock=s.nodes['.strip'].children.find(b=>b.dataset.appId==='gmail');gmailDock.dispatch('contextmenu',event);
  assert.equal(s.nodes['.context-menu'].children[2].textContent,'Close');
  s.nodes['.context-menu'].children[2].dispatch('click');await new Promise(setImmediate);
  assert.ok(s.requests.some(r=>r.type==='close'&&r.appId==='gmail'));
  s.nodes['.grid'].children.find(b=>b.dataset.appId==='gmail').dispatch('contextmenu',event);
  assert.equal(s.nodes['.context-menu'].children[2].textContent,'Close');
  s.nodes['.grid'].children.find(b=>b.dataset.appId==='photos').dispatch('contextmenu',event);
  assert.equal(s.nodes['.context-menu'].children[2].textContent,'Open');
});
test('hidden page preserves shared UI for the next tab and has no per-page polling',async()=>{
  const s=await setup();s.toggle();s.nodes['.more'].dispatch('click');await new Promise(setImmediate);
  const writes=s.requests.filter(r=>r.type==='ui-patch').length;
  s.document.hidden=true;s.document.dispatch('visibilitychange');
  assert.equal(s.requests.filter(r=>r.type==='ui-patch').length,writes);
  s.document.hidden=false;s.document.dispatch('visibilitychange');await new Promise(setImmediate);
  assert.equal(s.shell.dataset.visible,'true');assert.equal(s.nodes['.launcher'].hidden,false);
  const code=fs.readFileSync(path.join(__dirname,'..','content.js'),'utf8');assert.doesNotMatch(code,/setInterval/);
});
test('app-menu launch closes its local and shared UI, including middle click',async()=>{
  for(const middle of [false,true]){
    const s=await setup();s.toggle();s.nodes['.more'].dispatch('click');
    const app=s.nodes['.grid'].children.find(b=>b.dataset.appId==='photos');
    app.dispatch(middle?'auxclick':'click',{button:middle?1:0,preventDefault(){}});
    assert.equal(s.nodes['.launcher'].hidden,true);
    const patch=s.requests.filter(r=>r.type==='ui-patch').at(-1).patch;
    assert.equal(patch.launcherOpen,false);assert.equal(patch.search,'');
    await new Promise(setImmediate);assert.ok(s.requests.some(r=>r.type==='launch'&&r.appId==='photos'));
  }
});

test('top edge reveals at the top and preserves the corridor into the dock',async()=>{
  const s=await setup();s.settings({triggerEdge:'top'});
  s.nodes['.dock'].getBoundingClientRect=()=>({left:200,right:800,top:10,bottom:100});
  s.move(500,799);s.tick(100);assert.equal(s.shell.dataset.visible,'false');
  s.move(500,10);s.tick(100);assert.equal(s.shell.dataset.visible,'true');assert.equal(s.shell.dataset.edge,'top');
  s.move(500,0);s.tick(380);assert.equal(s.shell.dataset.visible,'true');
  s.move(500,118);s.tick(380);assert.equal(s.shell.dataset.visible,'true');
  s.move(500,300);s.tick(380);assert.equal(s.shell.dataset.visible,'false');
});
test('app-menu dots update when app tabs open and close, including filtered results',async()=>{
  const s=await setup();
  assert.equal(s.nodes['.grid'].children.find(b=>b.dataset.appId==='gmail').dataset.running,'true');
  s.setRunning(['photos']);s.stateChanged();await new Promise(setImmediate);
  assert.equal(s.nodes['.grid'].children.find(b=>b.dataset.appId==='gmail').dataset.running,'false');
  assert.equal(s.nodes['.grid'].children.find(b=>b.dataset.appId==='photos').dataset.running,'true');
  s.nodes['.search'].value='photos';s.nodes['.search'].dispatch('input');
  assert.equal(s.nodes['.grid'].children[0].dataset.running,'true');
  s.setRunning([]);s.stateChanged();await new Promise(setImmediate);assert.equal(s.nodes['.grid'].children[0].dataset.running,'false');
});
