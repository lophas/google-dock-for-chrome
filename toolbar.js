/* Per-tab availability indicator; uses the same badge colors as Arc Sidebar. */
globalThis.GDockToolbar = (() => {
  const states=new Map(), warnings=new Map(), versions=new Map(), writes=new Map(), ready=new Map();
  const warning='The dock is unavailable on this page. Click to open your pinned apps. After an extension update, refresh ordinary webpages to enable the dock again.';
  function canDisplay(url){
    try {
      const u=new URL(url);
      return ['http:','https:'].includes(u.protocol) && u.hostname!=='chromewebstore.google.com' && !(u.hostname==='chrome.google.com' && /^\/webstore(?:\/|$)/.test(u.pathname));
    } catch { return false; }
  }
  function invalidate(tabId,navigation=false){
    versions.set(tabId,(versions.get(tabId)||0)+1);states.delete(tabId);
    if(navigation)ready.delete(tabId);
  }
  function apply(tab,blocked,version){
    const task=(writes.get(tab.id)||Promise.resolve()).catch(()=>{}).then(async()=>{
      if(versions.get(tab.id)!==version)return;
      const key=String(blocked)+'|'+(tab.pendingUrl || tab.url)+'|'+tab.status;
      if(states.get(tab.id)===key)return;
      try {
        if(blocked){
          await chrome.action.setBadgeBackgroundColor({tabId:tab.id,color:'#fbbf24'});
          if(chrome.action.setBadgeTextColor)await chrome.action.setBadgeTextColor({tabId:tab.id,color:'#18181a'});
        }
        if(versions.get(tab.id)!==version)return;
        await chrome.action.setBadgeText({tabId:tab.id,text:blocked?'!':''});
        await chrome.action.setTitle({tabId:tab.id,title:blocked?warning:'Google Dock'});
        if(versions.get(tab.id)!==version)return;
        states.set(tab.id,key);warnings.set(tab.id,blocked);
      } catch { /* The tab can close during an update. */ }
    });
    writes.set(tab.id,task);
    task.finally(()=>{if(writes.get(tab.id)===task)writes.delete(tab.id);}).catch(()=>{});
    return task;
  }
  async function markReady(tab){
    if(!chrome.action?.setBadgeText || !Number.isInteger(tab?.id) || !canDisplay(tab.url) || (tab.pendingUrl && tab.pendingUrl!==tab.url))return;
    invalidate(tab.id);ready.set(tab.id,tab.url);
    await apply(tab,false,versions.get(tab.id));
  }
  async function refresh(tabs,config){
    if(!chrome.action?.setBadgeText)return;
    await Promise.all(tabs.filter(t=>t.active && Number.isInteger(t.id)).map(async tab=>{
      const version=(versions.get(tab.id)||0)+1;versions.set(tab.id,version);
      let blocked=false;
      if(config.enabled){
        if(!canDisplay(tab.pendingUrl || tab.url))blocked=true;
        else if(tab.status!=='loading' && ready.get(tab.id)!==(tab.pendingUrl || tab.url)){
          // Error documents and the PDF viewer can retain an ordinary HTTPS URL.
          try {blocked=!(await chrome.tabs.sendMessage(tab.id,{type:'dock-ping'}))?.dockReady;}
          catch {blocked=true;}
        }
      }
      await apply(tab,blocked,version);
    }));
    const live=new Set(tabs.map(t=>t.id));
    for(const id of states.keys())if(!live.has(id)){states.delete(id);warnings.delete(id);ready.delete(id);versions.delete(id);}
  }
  function message(tab){return tab && warnings.get(tab.id)?warning:'';}
  return {refresh,message,canDisplay,invalidate,markReady};
})();
