const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({URL});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','shared.js'),'utf8'),context);
const {apps,matches,normalize,searchMatches}=context.GDock;
const ids=url=>Array.from(apps.filter(a=>matches(a,url)),a=>a.id);
test('each catalogue launch URL identifies exactly its own app',()=>{
  assert.equal(new Set(apps.map(a=>a.id)).size,apps.length);
  for(const app of apps){assert.deepEqual(ids(app.url),[app.id],app.name);assert.match(app.icon,/^<svg/);}
});
test('Tasks calendar routes and legacy domain never activate Calendar',()=>{
  for(const url of ['https://calendar.google.com/calendar/u/2/r/tasks','https://calendar.google.com/calendar/r/tasks?authuser=a%40example.com','https://tasks.google.com/tasks/'])assert.deepEqual(ids(url),['tasks']);
  assert.deepEqual(ids('https://calendar.google.com/calendar/u/2/r/week'),['calendar']);
});
test('document app routes remain distinct, including Forms and Vids redirects',()=>{
  for(const [route,id] of [['document','docs'],['spreadsheets','sheets'],['presentation','slides'],['forms','forms'],['videos','vids']]){
    for(const suffix of ['', '/', '/u/1/', '/d/example/edit'])assert.deepEqual(ids('https://docs.google.com/'+route+suffix),[id]);
  }
  assert.deepEqual(ids('https://vids.google.com/'),['vids']);
  assert.deepEqual(ids('https://docs.google.com/forms-unrelated/'),[]);
});
test('shared Google domains exclude unrelated pages and published Sites',()=>{
  for(const [url,id] of [['https://www.google.com/finance/quote/GOOG:NASDAQ','finance'],['https://www.google.com/travel/flights','travel'],['https://www.google.com/books/edition/example','books'],['https://sites.google.com/d/example/edit','sites'],['https://sites.google.com/u/1/new','sites']])assert.deepEqual(ids(url),[id]);
  for(const url of ['https://www.google.com/search?q=finance','https://www.google.com/financial','https://sites.google.com/view/example','https://sites.google.com/site/example'])assert.deepEqual(ids(url),[]);
  assert.deepEqual(ids('https://music.youtube.com/watch?v=test'),['youtube-music']);
});
test('Notebook works on both domains and is searchable under its previous name',()=>{
  for(const domain of ['notebook.google.com','notebooklm.google.com'])assert.deepEqual(ids('https://'+domain+'/notebook/example'),['notebooklm']);
  const app=apps.find(a=>a.id==='notebooklm');assert.ok(searchMatches(app,'NotebookLM'));assert.ok(searchMatches(app,'Gemini Notebook'));
});
test('new app pins survive normalization without changing existing favorites',()=>{
  const old=['gmail','photos','gemini'];assert.deepEqual(Array.from(normalize({dockApps:old}).dockApps),old);
  const next=['tasks','translate','forms','notebooklm','youtube-music'];assert.deepEqual(Array.from(normalize({dockApps:next}).dockApps),next);
});
