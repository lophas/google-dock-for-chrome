const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('toolbar app-menu dots follow initial and pushed running state',async()=>{
  class Element{
    constructor(){this.children=[];this.dataset={};this.value='';this.handlers={};this.style={};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(){this.children=[];}
    setAttribute(name,value){(this.attributes??={})[name]=value;}
    querySelectorAll(){return this.children;}
    addEventListener(name,fn){this.handlers[name]=fn;}
    focus(){}
  }
  const nodes=Object.fromEntries(['apps','search','status','settings'].map(id=>[id,new Element()]));let receive;
  const document={getElementById:id=>nodes[id],createElement:()=>new Element(),body:new Element(),addEventListener(){}};
  const chrome={runtime:{sendMessage:async()=>({settings:{},ids:['photos'],activeId:'photos'}),onMessage:{addListener:fn=>receive=fn}}};
  const ctx=vm.createContext({document,chrome,window:{close(){}},URL});
  for(const name of ['shared.js','popup.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
  await new Promise(setImmediate);
  const photos=nodes.apps.children.find(b=>b.dataset.appId==='photos');assert.equal(photos.dataset.running,'true');assert.equal(photos.dataset.active,'true');
  receive({type:'dock-state',state:{settings:{},ids:['gmail'],activeId:'gmail'}});
  assert.equal(photos.dataset.running,'false');assert.equal(nodes.apps.children.find(b=>b.dataset.appId==='gmail').dataset.running,'true');
});
