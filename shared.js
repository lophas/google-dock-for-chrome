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
    ['gemini','Gemini','https://gemini.google.com/','gemini.google.com','/',svg('<defs><linearGradient id="gem"><stop stop-color="#4285f4"/><stop offset="1" stop-color="#a142f4"/></linearGradient></defs><path fill="url(#gem)" d="M24 1C27 16 32 21 47 24 32 27 27 32 24 47 21 32 16 27 1 24 16 21 21 16 24 1Z"/>')]
  ].map(([id,name,url,host,path,icon]) => ({id,name,url,host,path,icon}));
  const defaults = {enabled:true, autoHide:true, size:46, triggerHeight:24, theme:'auto', reuseTabs:true, dockApps:['gmail','calendar','drive','docs','sheets','meet','keep','youtube','gemini']};
  function normalize(raw = {}) {
    const s = {...defaults,...raw};
    for (const k of ['enabled','autoHide','reuseTabs']) s[k] = typeof s[k] === 'boolean' ? s[k] : defaults[k];
    s.size = [38,46,54].includes(s.size) ? s.size : 46;
    s.triggerHeight = [4,16,24,32].includes(s.triggerHeight) ? s.triggerHeight : 24;
    s.theme = ['auto','light','dark'].includes(s.theme) ? s.theme : 'auto';
    s.dockApps = Array.isArray(s.dockApps) ? [...new Set(s.dockApps)].filter(id=>apps.some(a=>a.id===id)) : [...defaults.dockApps];
    return s;
  }
  function matches(app, url) {
    try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === app.host && u.pathname.startsWith(app.path); } catch { return false; }
  }
  return {apps,defaults,normalize,matches};
})();
