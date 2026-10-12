let config=GDock.normalize(), order=[], dragged;
const status=document.getElementById('status');
const fields=['enabled','autoHide','reuseTabs','size','triggerHeight','theme'];
function rebuildOrder(){order=[...config.dockApps,...GDock.apps.map(a=>a.id).filter(id=>!config.dockApps.includes(id))];}
async function save(patch){
  try {
    const response=await chrome.runtime.sendMessage({type:'settings-patch',patch});
    if(response?.error) throw new Error(response.error);
    config=GDock.normalize(response.settings);status.textContent='Saved';
  } catch(e) {status.textContent='Save failed: '+e.message;}
}
function syncPins(){config.dockApps=order.filter(id=>config.dockApps.includes(id));}
function move(id,to){
  const from=order.indexOf(id);if(to<0||to>=order.length)return;
  order.splice(from,1);order.splice(to,0,id);syncPins();render();save({dockApps:config.dockApps});
}
function render(){
  const list=document.getElementById('order');list.replaceChildren();
  for(const id of order){
    const app=GDock.apps.find(a=>a.id===id),row=document.createElement('div');
    row.className='row';row.draggable=true;row.dataset.id=id;
    row.innerHTML='<span class="handle" aria-hidden="true">⠿</span>'+app.icon;
    const label=document.createElement('label');label.className='name';
    const check=document.createElement('input');check.type='checkbox';check.checked=config.dockApps.includes(id);
    label.append(check,document.createTextNode(app.name));row.append(label);
    check.onchange=()=>{
      if(check.checked)config.dockApps.push(id);else config.dockApps=config.dockApps.filter(x=>x!==id);
      syncPins();save({dockApps:config.dockApps});
    };
    for(const [symbol,delta,name] of [['↑',-1,'Move up'],['↓',1,'Move down']]){
      const b=document.createElement('button');b.textContent=symbol;b.setAttribute('aria-label',`${name}: ${app.name}`);
      b.disabled=order.indexOf(id)+delta<0||order.indexOf(id)+delta>=order.length;
      b.onclick=()=>move(id,order.indexOf(id)+delta);row.append(b);
    }
    row.ondragstart=e=>{dragged=id;e.dataTransfer.setData('text/plain',id);row.classList.add('dragging');};
    row.ondragend=()=>{dragged=null;row.classList.remove('dragging');};
    row.ondragover=e=>e.preventDefault();
    row.ondrop=e=>{e.preventDefault();if(dragged&&dragged!==id)move(dragged,order.indexOf(id));};
    list.append(row);
  }
}
function controls(){
  for(const id of fields){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=config[id];else el.value=config[id];}
}
(async()=>{
  config=GDock.normalize((await chrome.storage.local.get('settings')).settings);rebuildOrder();controls();render();
  for(const id of fields)document.getElementById(id).onchange=e=>{
    const value=e.target.type==='checkbox'?e.target.checked:['size','triggerHeight'].includes(id)?Number(e.target.value):e.target.value;
    config[id]=value;save({[id]:value});
  };
  document.getElementById('reset').onclick=()=>save(GDock.normalize());
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.settings){config=GDock.normalize(changes.settings.newValue);rebuildOrder();controls();render();}
  });
})().catch(e=>status.textContent=e.message);
