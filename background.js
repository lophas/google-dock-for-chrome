importScripts('shared.js');
const {apps, normalize, matches} = GDock;
async function settings() { return normalize((await chrome.storage.local.get('settings')).settings); }

// Serialize read/modify/write settings so simultaneous pin actions never overwrite each other.
let settingsQueue = Promise.resolve();
function changeSettings(message) {
  const task = settingsQueue.catch(() => {}).then(async () => {
    const config = await settings();
    if (message.type === 'pin') {
      if (!apps.some(app => app.id === message.appId)) throw new Error('Unknown app');
      const ids = config.dockApps.filter(id => id !== message.appId);
      if (message.keep) ids.push(message.appId);
      // Keeping an already-pinned app must not move it to the end.
      if (!message.keep || !config.dockApps.includes(message.appId)) config.dockApps = ids;
    } else if (message.type === 'reorder') {
      if (!config.dockApps.includes(message.appId)) throw new Error('Only pinned apps can be reordered');
      if (message.beforeId === message.appId) return {ok:true,settings:config};
      const ids=config.dockApps.filter(id=>id!==message.appId);
      const index=message.beforeId == null ? ids.length : ids.indexOf(message.beforeId);
      if (index < 0) throw new Error('Drop target is no longer pinned');
      ids.splice(index,0,message.appId); config.dockApps=ids;
    } else {
      for (const key of Object.keys(GDock.defaults)) {
        if (Object.hasOwn(message.patch || {}, key)) config[key] = message.patch[key];
      }
    }
    const next = normalize(config);
    await chrome.storage.local.set({settings:next});
    await syncAllGroups().catch(()=>{});
    return {ok:true, settings:next};
  });
  settingsQueue = task;
  return task;
}

// A window cannot share a native Chrome tab group with another window.
// Serialize grouping within each window to avoid duplicate groups on rapid launches.
const groupQueues = new Map();
function inGroupQueue(windowId,work) {
  const task=(groupQueues.get(windowId)||Promise.resolve()).catch(()=>{}).then(work);
  groupQueues.set(windowId,task);
  task.finally(()=>{if(groupQueues.get(windowId)===task)groupQueues.delete(windowId);}).catch(()=>{});
  return task;
}
async function sortGroup(groupId) {
  const config=await settings();
  const remembered=await chrome.storage.session.get(null);
  const order=[...config.dockApps,...apps.map(a=>a.id).filter(id=>!config.dockApps.includes(id))];
  const tabs=(await chrome.tabs.query({groupId})).sort((a,b)=>a.index-b.index);
  if(tabs.length<2)return;
  const appId=tab=>apps.find(a=>appTabMatches(a,tab))?.id || (isGoogleSignIn(tab)?apps.find(a=>remembered['appTab:'+a.id]===tab.id)?.id:undefined);
  const rank=tab=>{const id=appId(tab);return id?order.indexOf(id):order.length;};
  // Multiple tabs of one app retain their relative order. Unrelated group members stay at the end.
  const desired=[...tabs].sort((a,b)=>rank(a)-rank(b));
  const start=tabs[0].index;
  for(let i=0;i<desired.length;i++) {
    const current=tabs.findIndex(t=>t.id===desired[i].id);
    if(current===i)continue;
    await chrome.tabs.move(desired[i].id,{index:start+i});
    tabs.splice(i,0,tabs.splice(current,1)[0]);
  }
}
async function syncWindowGroups(windowId) {
  return inGroupQueue(windowId,async()=>{
    const groups=await chrome.tabGroups.query({windowId,title:'Google Dock'});
    for(const group of groups)await sortGroup(group.id);
  });
}
async function syncAllGroups() {
  const groups=await chrome.tabGroups.query({title:'Google Dock'});
  const results=await Promise.allSettled([...new Set(groups.map(g=>g.windowId))].map(syncWindowGroups));
  // A group/window may disappear while syncing; never undo a saved dock setting.
  if(results.some(r=>r.status==='rejected'))console.warn('Google Dock: a group changed during order sync');
}
function groupAppTab(tab, reveal) {
  return inGroupQueue(tab.windowId,async()=>{
    if (tab.pinned) throw new Error('Chrome-pinned tabs cannot join a group. Unpin the tab to group it.');
    const groups = await chrome.tabGroups.query({windowId:tab.windowId,title:'Google Dock'});
    let groupId;
    if (groups.length) {
      try { groupId = await chrome.tabs.group({tabIds:[tab.id],groupId:groups[0].id}); }
      catch { /* The group may have closed between query and group. */ }
    }
    if (groupId === undefined) {
      groupId = await chrome.tabs.group({tabIds:[tab.id],createProperties:{windowId:tab.windowId}});
      await chrome.tabGroups.update(groupId,{title:'Google Dock',color:'blue'});
    }
    if (reveal) await chrome.tabGroups.update(groupId,{collapsed:false});
    await sortGroup(groupId);
  });
}
async function groupResult(tab, reveal) {
  try { await groupAppTab(tab,reveal); return {ok:true}; }
  catch (error) { return {ok:true,warning:'App opened, but grouping failed: '+error.message}; }
}
// Same-app launches are serialized, including clicks from different content scripts.
const appQueues=new Map();
function launch(message,sender) {
  const task=(appQueues.get(message.appId)||Promise.resolve()).catch(()=>{}).then(()=>launchOne(message,sender));
  appQueues.set(message.appId,task);
  task.finally(()=>{if(appQueues.get(message.appId)===task)appQueues.delete(message.appId);}).catch(()=>{});
  return task;
}
function appTabMatches(app,tab) { return matches(app,tab.url) || matches(app,tab.pendingUrl); }
function isGoogleSignIn(tab) {
  try { return new URL(tab.url || tab.pendingUrl).hostname === 'accounts.google.com'; } catch { return false; }
}
async function remember(app,tab) { await chrome.storage.session.set({['appTab:'+app.id]:tab.id}); }
async function launchOne(message, sender) {
  const app = apps.find(a => a.id === message.appId);
  if (!app) throw new Error('Unknown app');
  const config = await settings();
  const windowId = sender.tab?.windowId ?? (await chrome.windows.getLastFocused()).id;
  if (config.reuseTabs && !message.newTab) {
    const key='appTab:'+app.id;
    const remembered=(await chrome.storage.session.get(key))[key];
    const all=await chrome.tabs.query({});
    const tabs=all.filter(t=>appTabMatches(app,t) || (t.id===remembered && isGoogleSignIn(t)));
    tabs.sort((a,b) => Number(b.id===remembered)-Number(a.id===remembered) || Number(b.windowId === windowId)-Number(a.windowId === windowId) || (b.lastAccessed || 0)-(a.lastAccessed || 0));
    if (tabs.length) {
      let activated;
      try { activated = await chrome.tabs.update(tabs[0].id,{active:true}); }
      catch { /* A closed tab should fall back to creating a new one. */ }
      if (activated) {
        await chrome.windows.update(activated.windowId,{focused:true});
        await remember(app,activated);
        return groupResult(activated,true);
      }
    }
  }
  const tab = await chrome.tabs.create({url:app.url,windowId,active:!message.background});
  if (!message.newTab) await remember(app,tab);
  return groupResult(tab,!message.background);
}
async function handle(message,sender) {
  if (message.type === 'launch') return launch(message,sender);
  if (message.type === 'pin' || message.type === 'settings-patch' || message.type === 'reorder') return changeSettings(message);
  if (message.type === 'running') {
    const tabs = await chrome.tabs.query({});
    const windowId=sender.tab?.windowId ?? (await chrome.windows.getLastFocused()).id;
    const active=tabs.find(t=>t.windowId===windowId && t.active);
    return {ids:apps.filter(a=>tabs.some(t=>appTabMatches(a,t))).map(a=>a.id),activeId:active ? apps.find(a=>appTabMatches(a,active))?.id || null : null};
  }
  if (message.type === 'options') { await chrome.runtime.openOptionsPage(); return {ok:true}; }
  throw new Error('Unknown request');
}
chrome.runtime.onMessage.addListener((message,sender,respond) => {
  handle(message,sender).then(respond).catch(error=>respond({error:error.message}));
  return true;
});
chrome.commands.onCommand.addListener(async name => {
  if (name !== 'toggle-dock') return;
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (tab?.id) { try { await chrome.tabs.sendMessage(tab.id,{type:'toggle-dock'}); } catch { await chrome.action.openPopup(); } }
});

// Push focus/navigation changes to the active page; polling remains a fallback for running dots.
async function notifyActive(windowId) {
  const [tab]=await chrome.tabs.query({active:true,windowId});
  if(tab?.id){try{await chrome.tabs.sendMessage(tab.id,{type:'dock-state-changed'});}catch{}}
}
const syncTimers=new Map();
function scheduleOrderSync(windowId) {
  if(groupQueues.has(windowId))return; // Ignore moves performed by our own serialized sorter.
  clearTimeout(syncTimers.get(windowId));
  syncTimers.set(windowId,setTimeout(()=>{
    syncTimers.delete(windowId);syncWindowGroups(windowId).catch(()=>{});
  },150));
}
chrome.tabs.onActivated.addListener(info=>{notifyActive(info.windowId).catch(()=>{});});
chrome.tabs.onUpdated.addListener((tabId,changes,tab)=>{
  if(changes.url || changes.status==='complete' || changes.groupId!==undefined){
    if(tab.active)notifyActive(tab.windowId).catch(()=>{});
    scheduleOrderSync(tab.windowId);
  }
});
chrome.tabs.onMoved.addListener((tabId,info)=>scheduleOrderSync(info.windowId));
chrome.tabs.onAttached.addListener((tabId,info)=>scheduleOrderSync(info.newWindowId));
chrome.tabs.onRemoved.addListener((tabId,info)=>{
  if(!info.isWindowClosing){notifyActive(info.windowId).catch(()=>{});scheduleOrderSync(info.windowId);}
});
chrome.runtime.onStartup.addListener(()=>syncAllGroups().catch(()=>{}));
chrome.runtime.onInstalled.addListener(()=>syncAllGroups().catch(()=>{}));
