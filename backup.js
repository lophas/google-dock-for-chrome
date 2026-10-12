/* Portable backup of pinned app IDs and their order. No browser tabs or UI settings. */
globalThis.GDockBackup = (() => {
  const format='google-dock-for-chrome/pinned-apps';
  function validate(ids) {
    if(!Array.isArray(ids) || ids.length>GDock.apps.length || ids.some(id=>typeof id!=='string')) throw new Error('Invalid pinned app list.');
    if(new Set(ids).size!==ids.length) throw new Error('The backup contains duplicate apps.');
    const unknown=ids.filter(id=>!GDock.apps.some(app=>app.id===id));
    if(unknown.length) throw new Error('Unknown apps in backup: '+unknown.join(', '));
    return [...ids];
  }
  function serialize(ids) {
    return JSON.stringify({format,version:1,exportedAt:new Date().toISOString(),dockApps:validate(ids)},null,2)+'\n';
  }
  function parse(text) {
    let data;
    try {data=JSON.parse(text);} catch {throw new Error('This file is not valid JSON.');}
    if(!data || data.format!==format || data.version!==1) throw new Error('Choose a Google Dock pinned-app backup (version 1).');
    return validate(data.dockApps);
  }
  return {serialize,parse};
})();
