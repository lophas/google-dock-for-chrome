const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
// DOM fixture verifies the actual content-script event/timer wiring; no browser layout emulation.
async function setup(){
  const timers=new Map();let next=0, messageListener, storageListener, running=['gmail'], stored={};
  class Element {
    constructor(){this.dataset={};this.children=[];this.handlers={};this.hidden=false;this.value='';this.style={setProperty(){}};this.isConnected=true;}
    append(...items){this.children.push(...items);}
    replaceChildren(){this.children=[];}
    setAttribute(){}
    addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
    dispatch(name,e={}){for(const fn of this.handlers[name]||[])fn(e);}
    matches(){return false;}
    focus(){}
    blur(){}
    attachShadow(){return root;}
    querySelector(s){return nodes[s];}
    querySelectorAll(selector){return this===nodes['.context-menu']?this.children.filter(b=>b.tagName==='button'):nodes['.strip'].children.filter(b=>b.className==='app');}
    getBoundingClientRect(){return {left:200,right:800,top:690,bottom:790};}
  }
  const nodes=Object.fromEntries(['.dock','.launcher','.search','.strip','.grid','.more','.settings','.status','.context-menu'].map(s=>[s,new Element()]));
  nodes['.launcher'].hidden=true;nodes['.context-menu'].hidden=true;
  const root=new Element(),document=new Element(),window=new Element();document.documentElement=new Element();document.createElement=tag=>{const el=new Element();el.tagName=tag;return el;};document.getElementById=()=>null;
  const chrome={runtime:{getURL:n=>n,sendMessage:async message=>{if(message.type==='pin'){const config=context.GDock.normalize(stored);config.dockApps=config.dockApps.filter(id=>id!==message.appId);if(message.keep)config.dockApps.push(message.appId);stored=config;return {settings:stored};}return {ids:running};},onMessage:{addListener:fn=>messageListener=fn}},storage:{local:{get:async()=>({})},onChanged:{addListener:fn=>storageListener=fn}}};
  const context=vm.createContext({document,window,chrome,innerHeight:800,innerWidth:1000,URL,fetch:async()=>({text:async()=>''}),setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>{}});
  const run=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),context);
  run('shared.js');await run('content.js');
  const shell=root.children[1];
  const move=(x,y)=>document.dispatch('pointermove',{pointerType:'mouse',clientX:x,clientY:y});
  const tick=delay=>{for(const [id,t]of [...timers])if(t.delay===delay){timers.delete(id);t.fn();}};
  return {setRunning:ids=>running=ids,refresh:async()=>{messageListener({type:'toggle-dock'});await new Promise(setImmediate);},move,tick,timers,shell,nodes,document,window,toggle:()=>messageListener({type:'toggle-dock'}),settings:s=>storageListener({settings:{newValue:s}},'local')};
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
