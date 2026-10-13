const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
async function setup(initial={}){
  class Element{
    constructor(){this.children=[];this.value='';this.type='';this.style={};this.dataset={};this.classList={add(){},remove(){}};}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(){this.children=[];}
    setAttribute(){}
    addEventListener(){}
    click(){}
  }
  const nodes=new Map();
  const document={getElementById:id=>{if(!nodes.has(id)){const e=new Element();e.type=['enabled','autoHide','reuseTabs'].includes(id)?'checkbox':'select-one';nodes.set(id,e);}return nodes.get(id);},createElement:()=>new Element(),createTextNode:t=>t,body:new Element()};
  let stored=initial,changed;
  const ctx=vm.createContext({document,URL,Blob,Date,setTimeout,chrome:{storage:{local:{get:async()=>({settings:stored})},onChanged:{addListener:fn=>changed=fn}},runtime:{sendMessage:async message=>{
    assert.equal(message.type,'settings-patch');stored=ctx.GDock.normalize({...stored,...message.patch});
    changed?.({settings:{newValue:stored}},'local');return {settings:stored};
  }}}});
  for(const name of ['shared.js','backup.js','options.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx);
  await new Promise(setImmediate);
  async function select(id,value){const e=document.getElementById(id);e.value=value;e.onchange({target:e});await new Promise(setImmediate);}
  return {nodes,select,stored:()=>stored};
}
test('Options Top dropdown saves as a string and persists after reopening',async()=>{
  const s=await setup();await s.select('triggerEdge','top');
  assert.equal(s.stored().triggerEdge,'top');assert.equal(s.nodes.get('triggerEdge').value,'top');
  const reopened=await setup(s.stored());assert.equal(reopened.nodes.get('triggerEdge').value,'top');
  await reopened.select('triggerEdge','bottom');assert.equal(reopened.stored().triggerEdge,'bottom');
});
test('Options keeps numeric fields numeric while theme and edge remain strings',async()=>{
  const s=await setup();await s.select('size','54');await s.select('triggerHeight','32');await s.select('transparency','90');await s.select('theme','dark');await s.select('triggerEdge','top');
  assert.equal(s.stored().size,54);assert.equal(s.stored().triggerHeight,32);assert.equal(s.stored().transparency,90);assert.equal(s.stored().theme,'dark');assert.equal(s.stored().triggerEdge,'top');
});
