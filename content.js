(async () => {
  if (document.getElementById('google-dock-for-chrome')) return;
  const host = document.createElement('div'); host.id = 'google-dock-for-chrome';
  const root = host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = await (await fetch(chrome.runtime.getURL('dock.css'))).text(); root.append(style);
  const shell = document.createElement('div'); shell.className='shell'; shell.dataset.visible='false';
  shell.innerHTML = '<section class="launcher" hidden aria-label="Google apps"><input class="search" placeholder="Search Google apps" aria-label="Search Google apps"><div class="grid"></div><div class="footer"><span>Google Dock</span><button class="settings">Settings</button></div></section><nav class="dock" aria-label="Google Dock"><div class="strip"></div><span class="divider"></span><button class="utility more" aria-label="All Google apps" title="All Google apps">⠿</button></nav><div class="context-menu" role="menu" aria-label="App options" hidden></div><div class="status" role="status" hidden></div>';
  root.append(shell); document.documentElement.append(host);
  const dock=shell.querySelector('.dock'), launcher=shell.querySelector('.launcher'), search=shell.querySelector('.search');
  const menu=shell.querySelector('.context-menu');
  let menuOrigin, draggedApp, dropBefore, suppressClick=false;
  let config=GDock.normalize(), visible=false, dwell, hideTimer, lastX=-1,lastY=-1, running=[], activeId=null, revision=-1, applyingState=false;
  async function request(message) { const r=await chrome.runtime.sendMessage(message); if(r?.error) throw new Error(r.error); if(r?.warning) error({message:r.warning}); return r; }
  function error(e) { const status=shell.querySelector('.status'); status.textContent=e.message || 'Could not open app'; status.hidden=false; setTimeout(()=>status.hidden=true,3500); }
  function saveUI(){if(!applyingState&&!document.hidden)request({type:'ui-patch',patch:{visible,launcherOpen:!launcher.hidden,search:search.value}}).catch(()=>{});}
  function setVisible(value,share=true) {
    clearTimeout(dwell); dwell=undefined; cancelHide();
    visible=value && config.enabled && !document.fullscreenElement; shell.dataset.visible=String(visible);
    if (!visible) { launcher.hidden=true; closeMenu(false); if (root.activeElement) root.activeElement.blur(); }
    if(share)saveUI();
  }
  function cancelHide() { clearTimeout(hideTimer); hideTimer=undefined; }
  function hideLater() { if(hideTimer) return; if(config.autoHide && launcher.hidden && menu.hidden && !draggedApp && !dock.matches(':focus-within')) hideTimer=setTimeout(()=>{hideTimer=undefined;setVisible(false);},380); }
  function launchApp(app,flags={}) {
    launcher.hidden=true;search.value='';closeMenu(false);saveUI();hideLater();
    return request({type:'launch',appId:app.id,...flags});
  }
  function button(app, tile=false) {
    const b=document.createElement('button'); b.className=tile?'tile':'app'; b.dataset.appId=app.id; b.setAttribute('aria-label',app.name); b.title=app.name; b.innerHTML=app.icon;
    if(tile){const label=document.createElement('span'); label.textContent=app.name; b.append(label);}
    b.addEventListener('click',e=>{if(suppressClick || draggedApp){e.preventDefault();return;}launchApp(app,{newTab:e.ctrlKey||e.metaKey||e.shiftKey}).catch(error);});
    b.addEventListener('auxclick',e=>{if(e.button===1){e.preventDefault();launchApp(app,{newTab:true,background:true}).catch(error);}});
    b.addEventListener('contextmenu',e=>{e.preventDefault();showMenu(app,b,e);});
    if(!tile && config.dockApps.includes(app.id)) {
      b.draggable=true;
      b.addEventListener('dragstart',e=>{
        draggedApp=app.id; suppressClick=true; closeMenu(false); cancelHide();
        e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',app.id);
        b.classList.add('dragging');
      });
      b.addEventListener('dragend',finishDrag);
    }
    b.dataset.running=String(running.includes(app.id));
    return b;
  }
  const strip=shell.querySelector('.strip');
  function clearDropMarkers(){strip.querySelectorAll('.app').forEach(b=>{b.classList.remove('drop-before','drop-after');});}
  function finishDrag(){
    draggedApp=undefined;dropBefore=undefined;clearDropMarkers();renderDock();hideLater();
    setTimeout(()=>suppressClick=false,300);
  }
  strip.addEventListener('dragover',e=>{
    if(!draggedApp)return;
    e.preventDefault();cancelHide();e.dataTransfer.dropEffect='move';clearDropMarkers();
    const pinned=[...strip.querySelectorAll('.app')].filter(b=>config.dockApps.includes(b.dataset.appId)&&b.dataset.appId!==draggedApp);
    const target=pinned.find(b=>{const r=b.getBoundingClientRect();return e.clientX<r.left+r.width/2;});
    dropBefore=target?.dataset.appId ?? null;
    if(target)target.classList.add('drop-before');else if(pinned.length)pinned[pinned.length-1].classList.add('drop-after');
    const r=strip.getBoundingClientRect();
    if(e.clientX<r.left+25)strip.scrollLeft-=12;else if(e.clientX>r.right-25)strip.scrollLeft+=12;
  });
  strip.addEventListener('dragleave',e=>{if(!strip.contains(e.relatedTarget))clearDropMarkers();});
  strip.addEventListener('drop',async e=>{
    if(!draggedApp)return;
    e.preventDefault();const appId=draggedApp,beforeId=dropBefore ?? null;
    finishDrag();
    try {const response=await request({type:'reorder',appId,beforeId});apply(response.settings);}
    catch(e){error(e);}
  });
  function renderGrid() {
    const grid=shell.querySelector('.grid'); grid.replaceChildren();
    const filtered=GDock.apps.filter(a=>a.name.toLowerCase().includes(search.value.trim().toLowerCase()));
    filtered.forEach(a=>grid.append(button(a,true)));
    if(!filtered.length){const p=document.createElement('div');p.className='empty';p.textContent='No apps found';grid.append(p);}
    markRunning();
  }
  function closeMenu(restoreFocus=true) {
    menu.hidden=true;
    if(restoreFocus && menuOrigin?.isConnected) menuOrigin.focus();
    menuOrigin=undefined;
  }
  function showMenu(app,origin,event) {
    closeMenu(false); menuOrigin=origin; cancelHide(); menu.replaceChildren();
    const title=document.createElement('div'); title.className='menu-title'; title.textContent=app.name; menu.append(title);
    const keep=config.dockApps.includes(app.id);
    const pin=document.createElement('button'); pin.setAttribute('role','menuitemcheckbox'); pin.setAttribute('aria-checked',String(keep)); pin.textContent=(keep?'✓  ':'    ')+'Keep in Dock';
    pin.addEventListener('click',async()=>{
      closeMenu(false);
      try { const response=await request({type:'pin',appId:app.id,keep:!keep}); apply(response.settings); }
      catch(e) { error(e); }
      hideLater();
    });
    const isOpen=running.includes(app.id);
    const open=document.createElement('button'); open.setAttribute('role','menuitem'); open.textContent=isOpen?'Close':'Open';
    open.addEventListener('click',()=>{closeMenu(false);(isOpen?request({type:'close',appId:app.id}):launchApp(app)).catch(error);hideLater();});
    menu.append(pin,open); menu.hidden=false;
    const rect=origin.getBoundingClientRect();
    const x=event.clientX || rect.left, y=event.clientY || rect.top;
    const width=menu.offsetWidth || 200, height=menu.offsetHeight || 125;
    menu.style.left=Math.max(8,Math.min(x,innerWidth-width-8))+'px';
    menu.style.top=Math.max(8,Math.min(config.triggerEdge==='top'?y:y-height,innerHeight-height-8))+'px';
    pin.focus();
  }
  menu.addEventListener('keydown',e=>{
    const items=[...menu.querySelectorAll('button')];
    const index=items.indexOf(root.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp') {
      e.preventDefault(); items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();
    }
  });
  function renderDock() {
    if(draggedApp)return;
    const strip=shell.querySelector('.strip'); strip.replaceChildren();
    config.dockApps.forEach(id=>strip.append(button(GDock.apps.find(a=>a.id===id))));
    const temporary=running.filter(id=>!config.dockApps.includes(id));
    if(temporary.length && config.dockApps.length) {
      const separator=document.createElement('span'); separator.className='divider'; separator.setAttribute('aria-hidden','true'); strip.append(separator);
    }
    temporary.forEach(id=>strip.append(button(GDock.apps.find(a=>a.id===id))));
    markRunning();
  }
  function apply(raw,initial=false) {
    config=GDock.normalize(raw); shell.dataset.theme=config.theme;shell.dataset.edge=config.triggerEdge; shell.style.setProperty('--size',config.size+'px');shell.style.setProperty('--dock-opacity',String(1-config.transparency/100));
    renderDock(); renderGrid();
    setVisible(!config.autoHide || (!initial && visible));
  }
  function markRunning(){
    shell.querySelectorAll('.app,.tile').forEach(b=>{
      const isRunning=running.includes(b.dataset.appId);b.dataset.running=String(isRunning);
      const app=GDock.apps.find(a=>a.id===b.dataset.appId);b.setAttribute('aria-label',app.name+(isRunning?' (open)':''));
      const active=b.dataset.appId===activeId;b.dataset.active=String(active);
      if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
    });
  }
  function applyState(state) {
    if(!state || state.revision<revision)return;
    revision=state.revision ?? revision;applyingState=true;
    try {
      const next=GDock.normalize(state.settings);
      const settingsChanged=JSON.stringify(next)!==JSON.stringify(config);
      const ids=state.ids || [];
      const runningChanged=ids.join(',')!==running.join(',');
      config=next;running=ids;activeId=state.activeId || null;
      shell.dataset.theme=config.theme;shell.dataset.edge=config.triggerEdge;shell.style.setProperty('--size',config.size+'px');shell.style.setProperty('--dock-opacity',String(1-config.transparency/100));
      if(settingsChanged || runningChanged || !strip.children.length)renderDock();else markRunning();
      const ui=state.ui || {};
      if(typeof ui.search==='string' && search.value!==ui.search){search.value=ui.search;renderGrid();}
      setVisible(!config.autoHide || !!ui.visible,false);
      launcher.hidden=!visible || !ui.launcherOpen;
      if(!launcher.hidden)cancelHide();
    } finally {applyingState=false;}
  }
  async function refreshRunning(){try{applyState(await request({type:'state-get'}));}catch{}}
  function safeArea(x,y) {
    const r=dock.getBoundingClientRect(); return x>=r.left-22 && x<=r.right+22 && (config.triggerEdge==='top'?y<=r.bottom+22:y>=r.top-22);
  }
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    lastX=e.clientX;lastY=e.clientY;
    if(!config.enabled||document.fullscreenElement)return;
    if(visible){if(safeArea(lastX,lastY)||!launcher.hidden||!menu.hidden||draggedApp){cancelHide();}else hideLater();return;}
    const r=dock.getBoundingClientRect();
    const edge=(config.triggerEdge==='top'?lastY<=config.triggerHeight:lastY>=innerHeight-config.triggerHeight) && lastX>=r.left-22 && lastX<=r.right+22;
    if(edge&&!dwell)dwell=setTimeout(()=>{dwell=undefined;setVisible(true);},100);
    if(!edge){clearTimeout(dwell);dwell=undefined;}
  },{passive:true});
  dock.addEventListener('pointerenter',()=>cancelHide()); dock.addEventListener('pointerleave',hideLater);
  dock.addEventListener('focusin',()=>cancelHide()); dock.addEventListener('focusout',()=>setTimeout(hideLater,0));
  shell.querySelector('.more').addEventListener('click',()=>{closeMenu(false);launcher.hidden=!launcher.hidden;cancelHide();if(!launcher.hidden){search.value='';renderGrid();search.focus();}else hideLater();saveUI();});
  shell.querySelector('.settings').addEventListener('click',()=>request({type:'options'}).catch(error));
  search.addEventListener('input',()=>{renderGrid();saveUI();});
  document.addEventListener('pointerdown',e=>{const path=e.composedPath();if(!menu.hidden&&!path.includes(menu)){closeMenu(false);hideLater();}if(!launcher.hidden&&!path.includes(host)){launcher.hidden=true;hideLater();saveUI();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&visible){if(!menu.hidden){closeMenu();hideLater();}else setVisible(false);e.stopPropagation();}},true);
  document.documentElement.addEventListener('pointerleave',()=>{clearTimeout(dwell);dwell=undefined;hideLater();});
  window.addEventListener('blur',()=>{if(config.autoHide&&!draggedApp)setVisible(false,false);});
  window.addEventListener('focus',()=>{refreshRunning();});
  document.addEventListener('fullscreenchange',()=>setVisible(!config.autoHide));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&config.autoHide)setVisible(false,false);else if(!document.hidden)refreshRunning();});
  chrome.runtime.onMessage.addListener(m=>{if(m.type==='toggle-dock')setVisible(!visible);else if(m.type==='dock-state')applyState(m.state);else if(m.type==='dock-state-changed')refreshRunning();});
  renderGrid();
  applyState(await request({type:'state-get'}));
})().catch(()=>{ /* An old content script can lose its extension context after reload. */ });
