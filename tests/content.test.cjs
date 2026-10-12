const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
// DOM fixture verifies the actual content-script event/timer wiring; no browser layout emulation.
async function setup(){
  const timers=new Map();let next=0, messageListener, storageListener;
  class Element {
    constructor(){this.dataset={};this.children=[];this.handlers={};this.hidden=false;this.value='';this.style={setProperty(){}};}
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
    querySelectorAll(){return nodes['.strip'].children;}
    getBoundingClientRect(){return {left:200,right:800,top:690,bottom:790};}
  }
  const nodes=Object.fromEntries(['.dock','.launcher','.search','.strip','.grid','.more','.settings','.status'].map(s=>[s,new Element()]));
  nodes['.launcher'].hidden=true;
  const root=new Element(),document=new Element(),window=new Element();document.documentElement=new Element();document.createElement=()=>new Element();document.getElementById=()=>null;
  const chrome={runtime:{getURL:n=>n,sendMessage:async()=>({ids:['gmail']}),onMessage:{addListener:fn=>messageListener=fn}},storage:{local:{get:async()=>({})},onChanged:{addListener:fn=>storageListener=fn}}};
  const context=vm.createContext({document,window,chrome,innerHeight:800,URL,fetch:async()=>({text:async()=>''}),setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>{}});
  const run=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),context);
  run('shared.js');await run('content.js');
  const shell=root.children[1];
  const move=(x,y)=>document.dispatch('pointermove',{pointerType:'mouse',clientX:x,clientY:y});
  const tick=delay=>{for(const [id,t]of [...timers])if(t.delay===delay){timers.delete(id);t.fn();}};
  return {move,tick,timers,shell,nodes,document,window,toggle:()=>messageListener({type:'toggle-dock'}),settings:s=>storageListener({settings:{newValue:s}},'local')};
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
