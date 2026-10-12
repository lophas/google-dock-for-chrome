const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({URL,Date});
for(const file of ['shared.js','backup.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
const backup=ctx.GDockBackup;
test('backup round trip preserves exact pinned-app order',()=>{
  const text=backup.serialize(['gemini','payments','gmail']);assert.deepEqual(Array.from(backup.parse(text)),['gemini','payments','gmail']);
  const data=JSON.parse(text);assert.equal(data.version,1);assert.equal(data.settings,undefined);assert.ok(data.exportedAt);
});
test('empty pinned list is valid',()=>assert.deepEqual(Array.from(backup.parse(backup.serialize([]))),[]));
test('invalid backup files are rejected before saving',()=>{
  for(const text of ['bad','null','{}',JSON.stringify({format:'google-dock-for-chrome/pinned-apps',version:2,dockApps:[]}),JSON.stringify({format:'google-dock-for-chrome/pinned-apps',version:1,dockApps:['gmail','gmail']}),JSON.stringify({format:'google-dock-for-chrome/pinned-apps',version:1,dockApps:['unknown']})])assert.throws(()=>backup.parse(text));
});
test('restore ignores unrelated fields and only returns the pinned list',()=>{
  const data=JSON.parse(backup.serialize(['drive']));data.theme='dark';data.settings={enabled:false};assert.deepEqual(Array.from(backup.parse(JSON.stringify(data))),['drive']);
});
