// Capture the real unpacked extension UI on a neutral demonstration webpage.
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output=path.join(root,'docs/screenshots');
const demo=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Demo workspace</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef2f8;color:#28354b;font:16px system-ui,sans-serif;padding:64px 88px}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #d8dfeb;padding-bottom:24px}.brand{font-weight:700;font-size:19px;letter-spacing:-.4px}.tag{padding:8px 14px;border-radius:22px;background:#fff;color:#718097;font-size:13px}h1{font-size:42px;font-weight:650;letter-spacing:-1.4px;margin:40px 0 10px}p{color:#748198;line-height:1.7}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:36px}.card{background:#fff;border:1px solid #e1e6ef;border-radius:20px;padding:28px;min-height:245px;box-shadow:0 8px 20px #28354b06}.card h2{font-size:19px;margin:24px 0 10px}.symbol{height:44px;width:44px;display:grid;place-items:center;border-radius:13px;color:#4285f4;background:#edf4ff;font-size:24px}.line{height:8px;background:#eaf0f7;border-radius:8px;margin:15px 0;width:85%}.line.short{width:60%}.bottom{margin-top:36px;padding:24px;border:1px dashed #d2dbea;border-radius:18px;color:#8895a9;font-size:14px}</style><header><span class="brand">Workspace</span><span class="tag">Demonstration page</span></header><h1>A little more space to focus.</h1><p>Keep the page clear. Your favorite Google apps are always within reach.</p><div class="cards"><article class="card"><div class="symbol">✓</div><h2>Today’s priorities</h2><div class="line"></div><div class="line short"></div><div class="line"></div></article><article class="card"><div class="symbol">▤</div><h2>Project notes</h2><div class="line"></div><div class="line"></div><div class="line short"></div></article><article class="card"><div class="symbol">◷</div><h2>Upcoming plans</h2><div class="line short"></div><div class="line"></div><div class="line short"></div></article></div><div class="bottom">A neutral example workspace. Screenshots show the actual Google Dock extension.</div></html>`;
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:{width:1280,height:900},deviceScaleFactor:1,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
  try{
    await context.route(/^https?:\/\//,route=>route.fulfill({status:200,contentType:'text/html',body:demo}));
    const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId=worker.url().split('/')[2];
    const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
    for(const url of ['https://mail.google.com/mail/u/0/','https://drive.google.com/drive/u/0/my-drive']){const p=await context.newPage();await p.goto(url);}
    const page=await context.newPage();await page.goto('https://keep.google.com/u/0/');await page.bringToFront();
    async function configure(patch){
      await worker.evaluate(async patch=>{const old=(await chrome.storage.local.get('settings')).settings || {};await chrome.storage.local.set({settings:{...old,...patch}});},patch);
      await page.waitForTimeout(400);
    }
    await configure({enabled:true,triggerEdge:'bottom',autoHide:false,theme:'dark',size:46,transparency:12,dockApps:['gmail','calendar','drive','docs','sheets','meet','keep','photos','youtube','gemini']});
    await page.locator('.shell[data-visible=true] .dock').waitFor({state:'visible'});
    await page.screenshot({path:path.join(output,'dock-bottom.png')});
    await page.locator('.more').click();await page.locator('.launcher').waitFor({state:'visible'});
    if(await page.locator('.grid .tile').count()!==32)throw new Error('Expected all 32 apps');
    for(const query of ['Tasks','Translate','NotebookLM']){
      await page.locator('.search').fill(query);
      if(await page.locator('.grid .tile').count()!==1)throw new Error('Search failed: '+query);
    }
    await page.locator('.search').fill('');
    await page.screenshot({path:path.join(output,'app-menu.png')});
    await page.locator('.more').click();
    await configure({triggerEdge:'top',theme:'light'});
    await page.locator('.shell[data-edge=top][data-visible=true] .dock').waitFor({state:'visible'});
    await page.screenshot({path:path.join(output,'dock-top.png')});
    const options=await context.newPage();await options.setViewportSize({width:860,height:1000});await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.locator('#triggerEdge').waitFor();await options.waitForTimeout(300);
    await options.screenshot({path:path.join(output,'settings.png')});
    if(errors.length)throw new Error('Page errors: '+errors.join('; '));
    console.log('Captured dock-bottom.png, app-menu.png, dock-top.png and settings.png');
  }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
