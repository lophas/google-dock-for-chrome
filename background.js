importScripts('shared.js');
const {apps, normalize, matches} = GDock;
async function settings() { return normalize((await chrome.storage.local.get('settings')).settings); }
async function launch(message, sender) {
  const app = apps.find(a => a.id === message.appId);
  if (!app) throw new Error('Unknown app');
  const config = await settings();
  const windowId = sender.tab?.windowId ?? (await chrome.windows.getLastFocused()).id;
  if (config.reuseTabs && !message.newTab) {
    const tabs = (await chrome.tabs.query({})).filter(t=>matches(app,t.url || t.pendingUrl));
    tabs.sort((a,b) => Number(b.windowId === windowId)-Number(a.windowId === windowId) || (b.lastAccessed || 0)-(a.lastAccessed || 0));
    if (tabs.length) {
      try {
        await chrome.tabs.update(tabs[0].id,{active:true});
        await chrome.windows.update(tabs[0].windowId,{focused:true});
        return;
      } catch { /* A tab may have closed after query. Open a fresh one. */ }
    }
  }
  await chrome.tabs.create({url:app.url,windowId,active:!message.background});
}
async function handle(message,sender) {
  if (message.type === 'launch') { await launch(message,sender); return {ok:true}; }
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
