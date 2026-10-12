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
    } else {
      for (const key of Object.keys(GDock.defaults)) {
        if (Object.hasOwn(message.patch || {}, key)) config[key] = message.patch[key];
      }
    }
    const next = normalize(config);
    await chrome.storage.local.set({settings:next});
    return {ok:true, settings:next};
  });
  settingsQueue = task;
  return task;
}

// A window cannot share a native Chrome tab group with another window.
// Serialize grouping within each window to avoid duplicate groups on rapid launches.
const groupQueues = new Map();
function groupAppTab(tab, reveal) {
  const task = (groupQueues.get(tab.windowId) || Promise.resolve()).catch(() => {}).then(async () => {
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
  });
  groupQueues.set(tab.windowId,task);
  task.finally(() => { if (groupQueues.get(tab.windowId) === task) groupQueues.delete(tab.windowId); }).catch(() => {});
  return task;
}
async function groupResult(tab, reveal) {
  try { await groupAppTab(tab,reveal); return {ok:true}; }
  catch (error) { return {ok:true,warning:'App opened, but grouping failed: '+error.message}; }
}
async function launch(message, sender) {
  const app = apps.find(a => a.id === message.appId);
  if (!app) throw new Error('Unknown app');
  const config = await settings();
  const windowId = sender.tab?.windowId ?? (await chrome.windows.getLastFocused()).id;
  if (config.reuseTabs && !message.newTab) {
    const tabs = (await chrome.tabs.query({})).filter(t=>matches(app,t.url || t.pendingUrl));
    tabs.sort((a,b) => Number(b.windowId === windowId)-Number(a.windowId === windowId) || (b.lastAccessed || 0)-(a.lastAccessed || 0));
    if (tabs.length) {
      let activated;
      try { activated = await chrome.tabs.update(tabs[0].id,{active:true}); }
      catch { /* A closed tab should fall back to creating a new one. */ }
      if (activated) {
        await chrome.windows.update(activated.windowId,{focused:true});
        return groupResult(activated,true);
      }
    }
  }
  const tab = await chrome.tabs.create({url:app.url,windowId,active:!message.background});
  return groupResult(tab,!message.background);
}
async function handle(message,sender) {
  if (message.type === 'launch') return launch(message,sender);
  if (message.type === 'pin' || message.type === 'settings-patch') return changeSettings(message);
  if (message.type === 'running') {
    const tabs = await chrome.tabs.query({});
    return {ids:apps.filter(a=>tabs.some(t=>matches(a,t.url || t.pendingUrl))).map(a=>a.id)};
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
