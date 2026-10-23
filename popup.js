const grid=document.getElementById('apps'), status=document.getElementById('status');
const menu=document.createElement('div');menu.className='context-menu';menu.hidden=true;menu.setAttribute('role','menu');document.body.append(menu);
let config=GDock.normalize(), running=[], activeId=null, origin, loaded=false;
async function request(message){const r=await chrome.runtime.sendMessage(message);if(r?.error)throw new Error(r.error);return r;}
function closeMenu(){menu.hidden=true;if(origin?.isConnected)origin.focus();}
async function showMenu(app,b,e){
  e.preventDefault();
  try{applyState(await request({type:'state-get'}));}catch(error){status.textContent=error.message;return;}origin=b;menu.replaceChildren();
  const keep=config.dockApps.includes(app.id), pin=document.createElement('button');
  pin.setAttribute('role','menuitemcheckbox');pin.setAttribute('aria-checked',String(keep));pin.textContent=(keep?'✓  ':'')+'Keep in Dock';
  pin.onclick=async()=>{closeMenu();try{const r=await request({type:'pin',appId:app.id,keep:!keep});config=GDock.normalize(r.settings);render();}catch(e){status.textContent=e.message;}};
  const isOpen=running.includes(app.id);
  const open=document.createElement('button');open.textContent=isOpen?'Close':'Open';open.setAttribute('role','menuitem');open.onclick=async()=>{if(!isOpen)return launch(app);closeMenu();try{await request({type:'close',appId:app.id});applyState(await request({type:'state-get'}));}catch(e){status.textContent=e.message;}};
  menu.append(pin,open);menu.hidden=false;
  menu.style.left=Math.max(8,Math.min(e.clientX,innerWidth-menu.offsetWidth-8))+'px';
  menu.style.top=Math.max(8,Math.min(e.clientY-menu.offsetHeight,innerHeight-menu.offsetHeight-8))+'px';
  pin.focus();
}
async function launch(app,flags={}){
  try{const r=await request({type:'launch',appId:app.id,...flags});if(r?.warning){status.textContent=r.warning;closeMenu();}else window.close();}
  catch(e){status.textContent=e.message;}
}
function render(){
  grid.replaceChildren();
  for(const app of config.dockApps.map(id=>GDock.apps.find(a=>a.id===id)).filter(Boolean)){
    const b=document.createElement('button');b.dataset.appId=app.id;b.innerHTML=app.icon;
    const name=document.createElement('span');name.textContent=app.name;b.append(name);
    b.onclick=e=>launch(app,{newTab:e.ctrlKey||e.metaKey||e.shiftKey});
    b.oncontextmenu=e=>showMenu(app,b,e);
    b.onauxclick=e=>{if(e.button===1){e.preventDefault();launch(app,{newTab:true,background:true});}};
    grid.append(b);
  }
  markRunning();
}
document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!e.composedPath().includes(menu))menu.hidden=true;});
document.addEventListener('keydown',e=>{if(!menu.hidden&&e.key==='Escape'){e.preventDefault();closeMenu();}else if(!menu.hidden&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const items=[...menu.querySelectorAll('button')],i=items.indexOf(document.activeElement);items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}});
document.getElementById('settings').onclick=()=>chrome.runtime.openOptionsPage();
function markRunning(){
  grid.querySelectorAll('button').forEach(b=>{
    const app=GDock.apps.find(a=>a.id===b.dataset.appId),open=running.includes(app.id);
    b.dataset.running=String(open);b.dataset.active=String(app.id===activeId);
    b.setAttribute('aria-label',app.name+(open?' (open)':''));
  });
}
function applyState(state){
  const next=GDock.normalize(state.settings),changed=JSON.stringify(next.dockApps)!==JSON.stringify(config.dockApps);
  config=next;running=state.ids || [];activeId=state.activeId || null;
  if(changed||!loaded)render();else markRunning();loaded=true;
}
chrome.runtime.onMessage.addListener(message=>{if(message.type==='dock-state')applyState(message.state);});
request({type:'state-get'}).then(applyState).catch(e=>status.textContent=e.message);
document.getElementById('settings').focus();
