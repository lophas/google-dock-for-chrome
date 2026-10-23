/* Shared packaged app catalogue. No remote scripts or icon requests. */
globalThis.GDock = (() => {
  const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  const page = (color, lines) => svg(`<path fill="${color}" d="M10 3h20l9 9v30a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V6a3 3 0 0 1 1-3Z"/><path fill="#fff" opacity=".35" d="M30 3v10h9"/>${lines}`);
  const apps = [
    ['gmail','Gmail','https://mail.google.com/mail/u/0/','mail.google.com','/',svg('<path fill="#4285f4" d="M4 12h8v28H4z"/><path fill="#34a853" d="M36 12h8v28h-8z"/><path fill="#ea4335" d="M4 9l20 15L44 9v10L24 34 4 19z"/><path fill="#fbbc04" d="M36 15l8-6v10l-8 6z"/>')],
    ['calendar','Calendar','https://calendar.google.com/calendar/u/0/r','calendar.google.com','/',svg('<rect x="5" y="6" width="38" height="37" rx="7" fill="#4285f4"/><path fill="#34a853" d="M5 33h28v10H12a7 7 0 0 1-7-7z"/><path fill="#fbbc04" d="M33 6h10v27H33z"/><rect x="12" y="13" width="24" height="23" fill="white"/><text x="24" y="30" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="#4285f4">31</text>')],
    ['drive','Drive','https://drive.google.com/drive/u/0/my-drive','drive.google.com','/',svg('<path fill="#34a853" d="M18 4h12L12 36H0z"/><path fill="#fbbc04" d="M18 4h12l18 32H36z"/><path fill="#4285f4" d="M0 36h48l-6 10H6z"/>')],
    ['docs','Docs','https://docs.google.com/document/u/0/','docs.google.com','/document/',page('#4285f4','<path stroke="white" stroke-width="3" d="M16 23h16M16 29h16M16 35h12"/>')],
    ['sheets','Sheets','https://docs.google.com/spreadsheets/u/0/','docs.google.com','/spreadsheets/',page('#34a853','<path fill="none" stroke="white" stroke-width="2" d="M15 21h18v17H15zM15 27h18M15 32h18M21 21v17"/>')],
    ['slides','Slides','https://docs.google.com/presentation/u/0/','docs.google.com','/presentation/',page('#fbbc04','<rect x="15" y="23" width="18" height="14" rx="1" fill="white"/>')],
    ['meet','Meet','https://meet.google.com/','meet.google.com','/',svg('<rect x="4" y="11" width="28" height="27" rx="6" fill="#34a853"/><path fill="#fbbc04" d="M32 18l12-8v29l-12-8z"/><path fill="#4285f4" d="M4 11h12v12H4z"/>')],
    ['chat','Chat','https://chat.google.com/','chat.google.com','/',svg('<path fill="#34a853" d="M6 5h36v30H22L10 44v-9H6z"/><path fill="#188038" d="M6 5h10v23h26v7H22L10 44v-9H6z"/>')],
    ['keep','Keep','https://keep.google.com/u/0/','keep.google.com','/',page('#fbbc04','<path fill="white" d="M24 18a8 8 0 0 0-5 14v4h10v-4a8 8 0 0 0-5-14Z"/><path stroke="white" stroke-width="3" d="M20 40h8"/>')],
    ['photos','Photos','https://photos.google.com/','photos.google.com','/',svg('<path fill="#ea4335" d="M24 24V4A10 10 0 0 1 34 14v10z"/><path fill="#4285f4" d="M24 24h20a10 10 0 0 1-10 10H24z"/><path fill="#34a853" d="M24 24v20a10 10 0 0 1-10-10V24z"/><path fill="#fbbc04" d="M24 24H4a10 10 0 0 1 10-10h10z"/>')],
    ['maps','Maps','https://www.google.com/maps','www.google.com','/maps',svg('<path fill="#34a853" d="M24 3C4 3 5 24 14 34l10 12 10-12C44 22 43 3 24 3Z"/><path fill="#4285f4" d="M11 9C18-1 33 2 38 12L25 26z"/><path fill="#fbbc04" d="M11 9l14 17-11 8C5 24 5 16 11 9Z"/><circle cx="24" cy="18" r="6" fill="white"/>')],
    ['youtube','YouTube','https://www.youtube.com/','www.youtube.com','/',svg('<rect x="2" y="10" width="44" height="29" rx="10" fill="#ff0033"/><path fill="white" d="M20 17v15l13-7.5z"/>')],
    ['gemini','Gemini','https://gemini.google.com/','gemini.google.com','/',svg('<path fill="#4285f4" d="M24 1C27 16 32 21 47 24L24 24Z"/><path fill="#8861df" d="M47 24C32 27 27 32 24 47L24 24Z"/><path fill="#a142f4" d="M24 47C21 32 16 27 1 24L24 24Z"/><path fill="#669df6" d="M1 24C16 21 21 16 24 1L24 24Z"/>')],
    ['payments','Payments','https://payments.google.com/','payments.google.com','/',svg('<rect x="3" y="9" width="42" height="30" rx="6" fill="#4285f4"/><path fill="#174ea6" d="M3 17h42v7H3z"/><rect x="9" y="29" width="9" height="5" rx="1" fill="#fbbc04"/>')],
    ['passwords','Passwords','https://passwords.google.com/','passwords.google.com','/',svg('<path fill="#4285f4" d="M27 16h19v8h-5v6h-7v-6h-7z"/><circle cx="16" cy="20" r="13" fill="#fbbc04"/><circle cx="16" cy="20" r="5" fill="white"/>')],
    ['account','Google Account','https://myaccount.google.com/','myaccount.google.com','/',svg('<circle cx="24" cy="24" r="22" fill="#4285f4"/><circle cx="24" cy="18" r="8" fill="white"/><path fill="white" d="M9 39a15 15 0 0 1 30 0Z"/>')],
    ['contacts','Contacts','https://contacts.google.com/','contacts.google.com','/',svg('<rect x="6" y="3" width="36" height="42" rx="6" fill="#4285f4"/><circle cx="24" cy="17" r="7" fill="white"/><path fill="white" d="M13 35a11 11 0 0 1 22 0Z"/>')],
    ['one','Google One','https://one.google.com/','one.google.com','/',svg('<path fill="#4285f4" d="M13 15L26 3h7v42H22V17l-4 5Z"/><path fill="#ea4335" d="M26 3h7v10H22z"/><path fill="#34a853" d="M22 32h11v13H22z"/><path fill="#fbbc04" d="M22 23h11v9H22z"/>')],
    ["tasks","Tasks","https://calendar.google.com/calendar/u/0/r/tasks","calendar.google.com","/calendar/",svg("<circle cx=\"24\" cy=\"24\" r=\"20\" fill=\"#4285f4\"/><path d=\"m13 24 8 8 15-17\" fill=\"none\" stroke=\"white\" stroke-width=\"5\"/>")],
    ["translate","Translate","https://translate.google.com/","translate.google.com","/",svg("<rect x=\"4\" y=\"4\" width=\"29\" height=\"34\" rx=\"4\" fill=\"#4285f4\"/><path d=\"M22 13h21v31H22z\" fill=\"#e8eaed\"/><text x=\"16\" y=\"28\" text-anchor=\"middle\" fill=\"white\" font-family=\"Arial\" font-size=\"22\">G</text><path d=\"m27 35 6-14 6 14m-10-5h8\" stroke=\"#5f6368\" stroke-width=\"2\" fill=\"none\"/>")],
    ["forms","Forms","https://docs.google.com/forms/u/0/","docs.google.com","/forms/",svg("<rect x=\"9\" y=\"3\" width=\"30\" height=\"42\" rx=\"4\" fill=\"#7248b9\"/><path d=\"M20 16h12M20 25h12M20 34h12\" stroke=\"white\" stroke-width=\"3\"/><path d=\"M14 16h2m-2 9h2m-2 9h2\" stroke=\"white\" stroke-width=\"3\"/>")],
    ["sites","Sites","https://sites.google.com/new","sites.google.com","/",svg("<rect x=\"4\" y=\"5\" width=\"40\" height=\"38\" rx=\"4\" fill=\"#7b9bdf\"/><path d=\"M10 12h28v8H10zM10 25h10v12H10zM25 25h13v3H25zM25 33h13v3H25z\" fill=\"white\"/>")],
    ["vids","Vids","https://docs.google.com/videos/","docs.google.com","/videos/",svg("<rect x=\"5\" y=\"7\" width=\"32\" height=\"34\" rx=\"6\" fill=\"#a8e8d8\"/><path d=\"m37 19 9-6v22l-9-6\" fill=\"#168c78\"/><path d=\"m17 16 13 8-13 8z\" fill=\"#168c78\"/>")],
    ["notebooklm","Gemini Notebook","https://notebook.google.com/","notebook.google.com","/",svg("<rect x=\"6\" y=\"5\" width=\"36\" height=\"38\" rx=\"5\" fill=\"#202124\"/><path d=\"M15 34V14l18 20V14M11 11h26\" fill=\"none\" stroke=\"white\" stroke-width=\"3\"/>")],
    ["news","News","https://news.google.com/","news.google.com","/",svg("<path d=\"M6 5h34v35H6z\" fill=\"#34a853\" transform=\"rotate(-8 24 24)\"/><path d=\"M8 9h35v33H8z\" fill=\"#fbbc04\" transform=\"rotate(8 24 24)\"/><rect x=\"3\" y=\"13\" width=\"42\" height=\"31\" rx=\"4\" fill=\"#4285f4\"/><text x=\"15\" y=\"35\" fill=\"white\" font-family=\"Arial\" font-size=\"22\" text-anchor=\"middle\">G</text><path d=\"M28 23h10M28 29h10M28 35h10\" stroke=\"white\" stroke-width=\"2\"/>")],
    ["youtube-music","YouTube Music","https://music.youtube.com/","music.youtube.com","/",svg("<circle cx=\"24\" cy=\"24\" r=\"22\" fill=\"#ff0033\"/><circle cx=\"24\" cy=\"24\" r=\"14\" fill=\"none\" stroke=\"white\" stroke-width=\"2\"/><path d=\"m20 15 14 9-14 9z\" fill=\"white\"/>")],
    ["earth","Earth","https://earth.google.com/web/","earth.google.com","/web/",svg("<circle cx=\"24\" cy=\"24\" r=\"22\" fill=\"#4285f4\"/><path d=\"M6 16c14-12 21 9 36 0M3 26c15-12 26 13 42 0M8 36c13-8 19 9 31 0\" stroke=\"#a8c7fa\" stroke-width=\"6\" fill=\"none\"/>")],
    ["finance","Finance","https://www.google.com/finance/","www.google.com","/finance",svg("<rect x=\"6\" y=\"26\" width=\"8\" height=\"17\" rx=\"2\" fill=\"#4285f4\"/><rect x=\"20\" y=\"17\" width=\"8\" height=\"26\" rx=\"2\" fill=\"#34a853\"/><rect x=\"34\" y=\"5\" width=\"8\" height=\"38\" rx=\"2\" fill=\"#fbbc04\"/>")],
    ["scholar","Scholar","https://scholar.google.com/","scholar.google.com","/",svg("<path d=\"m2 17 22-13 22 13-22 13z\" fill=\"#4285f4\"/><path d=\"M10 23v14c8 8 20 8 28 0V23l-14 8z\" fill=\"#174ea6\"/><circle cx=\"24\" cy=\"26\" r=\"10\" fill=\"#a8c7fa\"/>")],
    ["books","Books","https://books.google.com/","books.google.com","/",svg("<path d=\"M4 8c8-4 14-3 20 2 6-5 12-6 20-2v31c-8-4-14-3-20 2-6-5-12-6-20-2z\" fill=\"#4285f4\"/><path d=\"M24 11v27M10 15l9 2M10 23l9 2M30 17l8-2M30 25l8-2\" stroke=\"white\" stroke-width=\"2\"/>")],
    ["travel","Travel","https://www.google.com/travel/","www.google.com","/travel",svg("<rect x=\"5\" y=\"14\" width=\"38\" height=\"29\" rx=\"5\" fill=\"#4285f4\"/><path d=\"M17 14V7h14v7\" fill=\"none\" stroke=\"#174ea6\" stroke-width=\"5\"/><path d=\"M3 25h42M15 14v29M33 14v29\" stroke=\"#a8c7fa\" stroke-width=\"3\"/>")],
    ["apps-script","Apps Script","https://script.google.com/home","script.google.com","/",svg("<path d=\"m16 4 18 7-7 17-18-7z\" fill=\"#4285f4\"/><path d=\"m21 21 18 7-7 17-18-7z\" fill=\"#34a853\"/><path d=\"m10 15 17 7-7 17-17-7z\" fill=\"#fbbc04\"/>")]

  ].map(([id,name,url,host,path,icon]) => ({id,name,url,host,path,icon}));
  const searchAliases = {notebooklm:'NotebookLM Notebook', 'youtube-music':'Music', 'apps-script':'Script'};
  function searchMatches(app, query){return (app.name+' '+(searchAliases[app.id] || '')).toLowerCase().includes(query.trim().toLowerCase());}
  const defaults = {enabled:true, autoHide:true, size:46, triggerHeight:24, triggerEdge:'bottom', transparency:12, theme:'auto', reuseTabs:true, accountUrls:{}, dockApps:['gmail','calendar','drive','docs','sheets','meet','keep','youtube','gemini']};
  function normalize(raw = {}) {
    const s = {...defaults,...raw};
    for (const k of ['enabled','autoHide','reuseTabs']) s[k] = typeof s[k] === 'boolean' ? s[k] : defaults[k];
    s.size = [38,46,54].includes(s.size) ? s.size : 46;
    s.triggerEdge = ['bottom','top','disabled'].includes(s.triggerEdge) ? s.triggerEdge : 'bottom';
    if(!s.enabled)s.triggerEdge='disabled';
    s.enabled=s.triggerEdge!=='disabled';
    s.triggerHeight = [4,16,24,32].includes(s.triggerHeight) ? s.triggerHeight : 24;
    s.transparency = Number.isFinite(s.transparency) && s.transparency>=0 && s.transparency<=100 ? Math.round(s.transparency) : defaults.transparency;
    s.theme = ['auto','light','dark'].includes(s.theme) ? s.theme : 'auto';
    s.dockApps = Array.isArray(s.dockApps) ? [...new Set(s.dockApps)].filter(id=>apps.some(a=>a.id===id)) : [...defaults.dockApps];
    s.accountUrls=Object.fromEntries(Object.entries(s.accountUrls || {}).filter(([id,url])=>{const app=apps.find(a=>a.id===id);return app && typeof url==='string' && matches(app,url) && accountKey(url)!==null;}));
    return s;
  }
  function matches(app, url) {
    try {
      const u = new URL(url);
      if(u.protocol !== 'https:')return false;
      const taskView=u.hostname==='calendar.google.com' && /^\/calendar(?:\/u\/\d+)?\/r\/tasks(?:\/|$)/.test(u.pathname);
      if(app.id==='tasks')return taskView || u.hostname==='tasks.google.com';
      if(app.id==='calendar' && taskView)return false;
      if(app.id==='notebooklm')return ['notebook.google.com','notebooklm.google.com'].includes(u.hostname);
      if(app.id==='vids' && u.hostname==='vids.google.com')return true;
      if(app.id==='books' && u.hostname==='www.google.com')return /^\/books(?:\/|$)/.test(u.pathname);
      if(u.hostname!==app.host && !(app.id==='payments' && u.hostname==='pay.google.com'))return false;
      // Published Sites pages are websites, not the Sites editor/launcher.
      if(app.id==='sites')return u.pathname==='/' || /^\/(?:new|d)(?:\/|$)/.test(u.pathname) || /^\/u\/\d+\/(?:new|d)(?:\/|$)/.test(u.pathname);
      const prefix=app.path.replace(/\/$/,'');
      return u.pathname===prefix || u.pathname.startsWith(prefix+'/');
    } catch { return false; }
  }
  function accountKey(url){
    try{const u=new URL(url),path=u.pathname.match(/\/u\/(\d+)(?:\/|$)/);return path?path[1]:u.searchParams.get('authuser');}catch{return null;}
  }
  function accountMatches(app,tabUrl,config){
    if(!matches(app,tabUrl))return false;
    const preferred=config.accountUrls[app.id];if(!preferred)return true;
    return (accountKey(tabUrl) ?? '0')===accountKey(preferred);
  }
  function menuApps(config){
    const pinned=config.dockApps.map(id=>apps.find(a=>a.id===id)).filter(Boolean);
    return [...pinned,...apps.filter(a=>!config.dockApps.includes(a.id))];
  }
  return {apps,defaults,normalize,matches,accountKey,accountMatches,searchMatches,menuApps};
})();
