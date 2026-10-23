/* Per-tab availability indicator; uses the same badge colors as Arc Sidebar. */
globalThis.GDockToolbar = (() => {
  const states=new Map(), warnings=new Map();
  const warning='The dock is unavailable on this page. Click to open your pinned apps in the toolbar launcher. Try refreshing an ordinary webpage after an extension update.';
  function canDisplay(url){
    try {
      const u=new URL(url);
      return ['http:','https:'].includes(u.protocol) && u.hostname!=='chromewebstore.google.com' && !(u.hostname==='chrome.google.com' && /^\/webstore(?:\/|$)/.test(u.pathname));
    } catch { return false; }
  }
  async function refresh(tabs,config){
    if(!chrome.action?.setBadgeText)return;
    await Promise.all(tabs.filter(t=>t.active && Number.isInteger(t.id)).map(async tab=>{
      let blocked=false;
      if(config.enabled){
        if(!canDisplay(tab.pendingUrl || tab.url))blocked=true;
        else if(tab.status!=='loading'){
          // Error documents and the PDF viewer can retain an ordinary HTTPS URL.
          try {blocked=!(await chrome.tabs.sendMessage(tab.id,{type:'dock-ping'}))?.dockReady;}
          catch {blocked=true;}
        }
      }
      warnings.set(tab.id,blocked);
      const key=String(blocked)+'|'+(tab.pendingUrl || tab.url)+'|'+tab.status;
      if(states.get(tab.id)===key)return;
      try {
        if(blocked){
          await chrome.action.setBadgeBackgroundColor({tabId:tab.id,color:'#fbbf24'});
          if(chrome.action.setBadgeTextColor)await chrome.action.setBadgeTextColor({tabId:tab.id,color:'#18181a'});
        }
        await chrome.action.setBadgeText({tabId:tab.id,text:blocked?'!':''});
        await chrome.action.setTitle({tabId:tab.id,title:blocked?warning:'Google Dock'});
        states.set(tab.id,key);
      } catch { /* The tab can close during an update. */ }
    }));
    const live=new Set(tabs.map(t=>t.id));
    for(const id of states.keys())if(!live.has(id)){states.delete(id);warnings.delete(id);}
  }
  function message(tab){return tab && warnings.get(tab.id)?warning:'';}
  return {refresh,message,canDisplay};
})();
