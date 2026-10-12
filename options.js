let config=GDock.normalize(), order=[], dragged;
const status=document.getElementById('status');
const fields=['enabled','autoHide','reuseTabs','size','triggerHeight','transparency','theme'];
function rebuildOrder(){order=[...config.dockApps,...GDock.apps.map(a=>a.id).filter(id=>!config.dockApps.includes(id))];}
let pendingSave=Promise.resolve();
function save(patch){const copy=JSON.parse(JSON.stringify(patch));pendingSave=pendingSave.then(()=>performSave(copy));return pendingSave;}
async function performSave(patch){
  try {
    const response=await chrome.runtime.sendMessage({type:'settings-patch',patch});
    if(response?.error) throw new Error(response.error);
    config=GDock.normalize(response.settings);status.textContent='Saved';return true;
  } catch(e) {status.textContent='Save failed: '+e.message;return false;}
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
  document.getElementById('transparency-value').textContent=config.transparency+'%';
}
(async()=>{
  config=GDock.normalize((await chrome.storage.local.get('settings')).settings);rebuildOrder();controls();render();accountLabel();
  for(const id of fields)document.getElementById(id).onchange=e=>{
    const value=e.target.type==='checkbox'?e.target.checked:['size','triggerHeight','transparency'].includes(id)?Number(e.target.value):e.target.value;
    config[id]=value;save({[id]:value});
  };
  document.getElementById('reset').onclick=()=>save(GDock.normalize());
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.settings){config=GDock.normalize(changes.settings.newValue);rebuildOrder();controls();render();}
  });
})().catch(e=>status.textContent=e.message);

const backupStatus=document.getElementById('backup-status');
const backupButton=document.getElementById('backup'), restoreButton=document.getElementById('restore'), backupFile=document.getElementById('backup-file');
function backupBusy(busy){backupButton.disabled=busy;restoreButton.disabled=busy;}
backupButton.addEventListener('click',async()=>{
  backupBusy(true);
  try {
    await pendingSave;
    const state=await chrome.runtime.sendMessage({type:'state-get'});
    if(state?.error)throw new Error(state.error);
    const text=GDockBackup.serialize(state.settings.dockApps);
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='google-dock-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    backupStatus.textContent='Backup downloaded.';
  } catch(e){backupStatus.textContent='Backup failed: '+e.message;}
  finally{backupBusy(false);}
});
restoreButton.addEventListener('click',()=>{backupFile.value='';backupFile.click();});
backupFile.addEventListener('change',async()=>{
  const file=backupFile.files[0];if(!file)return;
  backupBusy(true);
  try {
    if(file.size>65536)throw new Error('Backup files must be smaller than 64 KB.');
    const dockApps=GDockBackup.parse(await file.text());
    if(!await save({dockApps}))throw new Error('The backup could not be saved.');
    rebuildOrder();render();
    backupStatus.textContent='Restored '+dockApps.length+' pinned app'+(dockApps.length===1?'':'s')+'.';
  } catch(e){backupStatus.textContent='Restore failed: '+e.message;}
  finally{backupBusy(false);backupFile.value='';}
});

document.getElementById('transparency').addEventListener('input',e=>document.getElementById('transparency-value').textContent=e.target.value+'%');

const accountApp=document.getElementById('account-app'),accountStatus=document.getElementById('account-status');
for(const app of GDock.apps){const option=document.createElement('option');option.value=app.id;option.textContent=app.name;accountApp.append(option);}
function accountLabel(){const url=config.accountUrls[accountApp.value];accountStatus.textContent=url?'Saved account: '+url:'Automatic account';}
accountApp.addEventListener('change',accountLabel);
async function changeAccount(type){
  const buttons=[document.getElementById('remember-account'),document.getElementById('reset-account')];buttons.forEach(b=>b.disabled=true);
  try{await pendingSave;const r=await chrome.runtime.sendMessage({type,appId:accountApp.value});if(r.error)throw new Error(r.error);config=GDock.normalize(r.settings);accountLabel();}
  catch(e){accountStatus.textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}
}
document.getElementById('remember-account').onclick=()=>changeAccount('remember-account');
document.getElementById('reset-account').onclick=()=>changeAccount('reset-account');
accountLabel();
