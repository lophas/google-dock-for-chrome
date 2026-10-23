const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
async function setup(state){
  class Element{
    constructor(){this.children=[];this.dataset={};this.value='';this.handlers={};this.style={};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(){this.children=[];}
    setAttribute(name,value){(this.attributes??={})[name]=value;}
    querySelectorAll(){return this.children.filter(b=>b.tagName==='button');}
    addEventListener(name,fn){this.handlers[name]=fn;}
    focus(){}
  }
  const nodes=Object.fromEntries(['apps','status','settings'].map(id=>[id,new Element()]));let receive,opened=false;
  const document={getElementById:id=>nodes[id],createElement:tag=>Object.assign(new Element(),{tagName:tag}),body:new Element(),addEventListener(){}};
  const chrome={runtime:{sendMessage:async()=>state,onMessage:{addListener:fn=>receive=fn},openOptionsPage:()=>opened=true}};
  const ctx=vm.createContext({document,chrome,window:{close(){}},URL});
  for(const name of ['shared.js','popup.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
  await new Promise(setImmediate);
  return {nodes,receive,ids:()=>nodes.apps.children.map(b=>b.dataset.appId),opened:()=>opened};
}
test('toolbar displays only pins in exact dock order, hiding even running unpinned apps',async()=>{
  const s=await setup({settings:{dockApps:['translate','photos','gmail']},ids:['photos','tasks'],activeId:'photos'});
  assert.deepEqual(s.ids(),['translate','photos','gmail']);
  const photos=s.nodes.apps.children[1];assert.equal(photos.dataset.running,'true');assert.equal(photos.dataset.active,'true');
  s.receive({type:'dock-state',state:{settings:{dockApps:['translate','photos','gmail']},ids:['gmail'],activeId:'gmail'}});
  assert.equal(photos.dataset.running,'false');assert.equal(s.nodes.apps.children[2].dataset.running,'true');
});
test('toolbar follows pinning, unpinning and reorder pushes immediately',async()=>{
  const s=await setup({settings:{dockApps:['gmail','photos']},ids:[]});
  for(const pins of [['photos','gmail'],['photos','tasks','gmail'],['tasks']]){
    s.receive({type:'dock-state',state:{settings:{dockApps:pins},ids:[]}});assert.deepEqual(s.ids(),pins);
  }
});
test('empty pins stay empty with Settings available and warnings do not add a panel',async()=>{
  const s=await setup({settings:{dockApps:[]},ids:['gmail'],pageWarning:'Dock unavailable'});
  assert.deepEqual(s.ids(),[]);s.nodes.settings.onclick();assert.equal(s.opened(),true);
  assert.equal(s.nodes['page-warning'],undefined);
  s.receive({type:'dock-state',state:{settings:{dockApps:[]},ids:[]}});assert.deepEqual(s.ids(),[]);
});
