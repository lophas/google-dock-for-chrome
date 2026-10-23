const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
  const calls=[];let ready=true;
  const action=Object.fromEntries(['setBadgeText','setBadgeBackgroundColor','setBadgeTextColor','setTitle'].map(name=>[name,async value=>calls.push({name,...value})]));
  const chrome={action,tabs:{sendMessage:async()=>{if(!ready)throw Error('No receiving end');return {dockReady:true};}}};
  const ctx=vm.createContext({chrome,URL});vm.runInContext(fs.readFileSync(path.join(__dirname,'..','toolbar.js'),'utf8'),ctx);
  return {api:ctx.GDockToolbar,calls,setReady:value=>ready=value};
}
test('restricted pages get the same yellow ! and dark text as Arc Sidebar',async()=>{
  const s=setup();
  for(const [index,url] of ['chrome://settings/','chrome://newtab/','chrome-extension://other/page.html','https://chromewebstore.google.com/detail/test','https://chrome.google.com/webstore/detail/test','file:///tmp/test.pdf'].entries()){
    await s.api.refresh([{id:index+1,active:true,url,status:'complete'}],{enabled:true});
    assert.ok(s.calls.some(c=>c.name==='setBadgeText'&&c.tabId===index+1&&c.text==='!'));
    assert.ok(s.calls.some(c=>c.name==='setBadgeBackgroundColor'&&c.tabId===index+1&&c.color==='#fbbf24'));
    assert.ok(s.calls.some(c=>c.name==='setBadgeTextColor'&&c.tabId===index+1&&c.color==='#18181a'));
  }
});
test('HTTP error/PDF documents without a dock warn, then clear after supported navigation',async()=>{
  const s=setup(),tab={id:7,active:true,url:'https://example.com/report.pdf',status:'complete'};
  s.setReady(false);await s.api.refresh([tab],{enabled:true});assert.match(s.api.message(tab),/unavailable/);
  s.setReady(true);tab.url='https://example.com/';await s.api.refresh([tab],{enabled:true});
  assert.equal(s.calls.filter(c=>c.name==='setBadgeText').at(-1).text,'');assert.equal(s.api.message(tab),'');
  assert.equal(s.calls.filter(c=>c.name==='setTitle').at(-1).title,'Google Dock');
});
test('loading pages do not warn before injection; Disabled clears even restricted pages',async()=>{
  const s=setup();s.setReady(false);
  const tab={id:8,active:true,url:'https://example.com/',status:'loading'};
  await s.api.refresh([tab],{enabled:true});assert.equal(s.calls.filter(c=>c.name==='setBadgeText').at(-1).text,'');
  tab.status='complete';await s.api.refresh([tab],{enabled:true});assert.equal(s.calls.filter(c=>c.name==='setBadgeText').at(-1).text,'!');
  tab.url='chrome://settings/';await s.api.refresh([tab],{enabled:false});assert.equal(s.calls.filter(c=>c.name==='setBadgeText').at(-1).text,'');
});
test('badges belong to individual active tabs and unchanged states avoid repeated writes',async()=>{
  const s=setup(),tabs=[{id:1,active:true,url:'chrome://settings/'},{id:2,active:false,url:'chrome://version/'}];
  await s.api.refresh(tabs,{enabled:true});const count=s.calls.length;await s.api.refresh(tabs,{enabled:true});assert.equal(s.calls.length,count);
  assert.ok(s.calls.every(c=>c.tabId===1));
});
