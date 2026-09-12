// Disposable UI validation; never attaches to the user's browser. No social mutations.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const base='http://localhost:3000', output='artifacts/polish-phase4b6/responsive-gate';
await fs.mkdir(output,{recursive:true});
const result={checks:[],errors:[],httpErrors:[],metrics:[],limitations:['No real Android keyboard','No real NVDA','E2E inbox has no conversation; no message sent']};
const browser=await puppeteer.launch({headless:false,pipe:true,enableExtensions:true,args:['--window-size=1440,1000','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();page.setDefaultTimeout(45000);page.setDefaultNavigationTimeout(90000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok,detail)=>{result.checks.push({name,ok:!!ok,detail});console.log(name+': '+(ok?'PASS':'FAIL'));assert(ok,name);};
page.on('pageerror',e=>result.errors.push(e.message));
page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());result.httpErrors.push({host:u.hostname,path:u.pathname,status:r.status()});}});
await page.setRequestInterception(true);
page.on('request',r=>{
  const u=new URL(r.url());
  if(r.method()==='POST'&&(/\/api\/(tracks|music-clips)\/[^/]+\/(events|plays)$/.test(u.pathname)||u.pathname==='/api/recommendations/impressions'))void r.respond({status:200,contentType:'application/json',body:'{}'});
  else void r.continue();
});
await page.evaluateOnNewDocument(()=>{
  window.__polishVitals={lcp:null,cls:0};
  new PerformanceObserver(l=>{for(const e of l.getEntries())window.__polishVitals.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
  new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__polishVitals.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
});
const goto=async route=>{await page.goto(base+route,{waitUntil:'networkidle2'});await page.waitForFunction(()=>!document.body.innerText.includes('Synaura te reconnaît'));await wait(1200);};
const ready=async selector=>{await page.waitForSelector(selector,{visible:true});await wait(300);};
const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-profile-peek-state],[data-organization-surface],[data-comments-state]'));await wait(250);};
const geometry=()=>page.evaluate(()=>{
  const roots=[...document.querySelectorAll('main,section,h1,h2')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.bottom>0&&r.top<innerHeight;});
  const clipped=roots.filter(e=>{const r=e.getBoundingClientRect();return r.left < -1||r.right>innerWidth+1;}).map(e=>({tag:e.tagName,text:e.textContent.slice(0,60)}));
  return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,clipped};
});
try{
  await page.setViewport({width:390,height:844});await goto('/auth/signin');await ready('input[type="email"]');
  await page.type('input[type="email"]',process.env.SYNAURA_E2E_EMAIL);await page.type('input[type="password"]',process.env.SYNAURA_E2E_PASSWORD);await page.click('button[type="submit"]');await page.waitForFunction(()=>!location.pathname.startsWith('/auth/signin'));
  await goto('/search?q=mix');await ready('button[aria-label^="Options de "]');
  const action='button[aria-label^="Options de "]';
  check('Search mobile actions fit',await page.$$eval(action,es=>es.every(e=>e.getBoundingClientRect().right<=innerWidth)));
  await page.click(action);await ready('[data-organization-state="loaded"]');await close();
  check('Search Actions Back returns to query',new URL(page.url()).search==='?q=mix');
  const searchPeek='[data-context-surface-trigger-key^="search-result-profile-"]';
  await page.$eval(searchPeek,e=>e.scrollIntoView({block:'center'}));await page.click(searchPeek);await ready('[data-profile-peek-state="loaded"]');await close();
  check('Search Profile Peek Back restores trigger',await page.$eval(searchPeek,e=>document.activeElement===e));
  await goto('/discover');const discoverPeek='[data-context-surface-trigger-key^="discover-profile-"]';await ready(discoverPeek);await page.$eval(discoverPeek,e=>e.scrollIntoView({block:'center'}));await page.click(discoverPeek);await ready('[data-profile-peek-state="loaded"]');
  await page.click('[data-profile-peek-state="loaded"] button[aria-label^="Options de "]');await ready('[data-organization-state="loaded"]');await page.keyboard.press('Escape');await ready('[data-profile-peek-state="loaded"]');await close();
  check('Discover Peek Actions Back restores creator',await page.$eval(discoverPeek,e=>document.activeElement===e));
  await goto('/library');await ready('h1');
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Favoris')?.click());await wait(700);
  check('Library Favorites tab is readable',await page.evaluate(()=>document.body.innerText.includes('Favoris')&&document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Playlists')?.click());await wait(700);
  check('Library playlists view returns',await page.evaluate(()=>document.body.innerText.includes('Nouveau dossier')));
  await goto('/messages');check('Messages honest empty state',await page.evaluate(()=>document.body.innerText.includes('Aucune discussion')));
  await page.setViewport({width:1440,height:900});await goto('/live');const options='[data-active="true"] button[aria-label^="Options de "]';await ready(options);
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Ouvrir le Flow')?.click());await wait(2500);
  const pause=await page.$('.live-track-artwork button:has(.lucide-pause)');if(pause)await pause.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-active="true"] div')].some(e=>e.classList.contains('min-h-[3px]')));
  const cdp=await page.createCDPSession();await cdp.send('HeapProfiler.collectGarbage');
  result.metrics.push({phase:'live-warm',...await page.metrics(),...await cdp.send('Memory.getDOMCounters'),vitals:await page.evaluate(()=>window.__polishVitals)});
  for(const [w,h] of [[360,800],[390,844],[430,932],[768,1024],[1440,900],[1920,1080]]){
    await page.setViewport({width:w,height:h});await wait(500);
    const metrics=await page.evaluate(()=>{
      const q=s=>document.querySelector('[data-active="true"] '+s),r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};
      const art=r(q('.live-track-artwork button')),meta=r(q('.live-track-metadata')),rail=r(q('.live-track-actions'));
      const bars=[...document.querySelectorAll('[data-active="true"] div')].filter(e=>e.classList.contains('min-h-[3px]'));
      const dock=document.querySelector('[data-primary-dock]');
      return {art,meta,rail,minBar:Math.min(...bars.map(e=>e.getBoundingClientRect().width)),dock:dock?r(dock):null};
    });
    check('Live '+w+' square artwork and separate rail',Math.abs(metrics.art.w-metrics.art.h)<2&&metrics.rail.h>=44&&metrics.rail.right<=w+1&&metrics.art.right<=metrics.rail.x+1,metrics);
    check('Waveform '+w+' has nonzero bars',metrics.minBar>0,metrics.minBar);
  }
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.click(options);await ready('[data-organization-state="loaded"]');
  check('Reduced motion CSS remains active',await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&getComputedStyle(document.querySelector('[data-organization-surface] button')).transitionDuration.split(',').every(x=>parseFloat(x)<.001)));
  await close();await page.emulateMediaFeatures([]);
  await page.keyboard.press('Tab');await page.focus(options);
  check('Keyboard Options has visible focus outline',await page.$eval(options,e=>e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none'&&parseFloat(getComputedStyle(e).outlineWidth)>=2));
  const current=await page.$eval('[data-active="true"][data-feed-item-id]',e=>e.dataset.feedItemId);
  await page.click('[data-active="true"] button[aria-label="Item suivant"]');
  await page.waitForFunction(id=>document.querySelector('[data-active="true"][data-feed-item-id]')?.dataset.feedItemId!==id,{},current);
  check('Live relocated next control changes item',true);
  await wait(500);await page.click('[data-active="true"] button[aria-label="Item précédent"]');
  await page.waitForFunction(id=>document.querySelector('[data-active="true"][data-feed-item-id]')?.dataset.feedItemId===id,{},current);
  check('Live previous control restores item',true);
  await page.setViewport(null);const {windowId}=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId,bounds:{width:1440,height:1000}});
  const extension=await browser.installExtension(path.resolve('scripts/fixtures/comments-browser-zoom'));
  const worker=await (await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().includes(extension))).worker();
  check('Native browser zoom 200%',await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({url:'http://localhost/*'});for(const t of tabs)await chrome.tabs.setZoom(t.id,2);return chrome.tabs.getZoom(tabs[0].id);})===2);
  for(const [name,route] of Object.entries({search:'/search?q=mix',track:'/track/track_1773789112971_0egfpy0i2',profile:'/profile/mixxparty',library:'/library',playlist:'/playlists/voices-of-creation-signature',notifications:'/notifications',messages:'/messages',create:'/create',discover:'/discover'})){
    await goto(route);await ready('h1');const g=await geometry();check('Zoom 200 '+name+' essential layout fits',g.documentWidth<=g.width+1&&g.clipped.length===0,g);await page.screenshot({path:output+'/zoom-'+name+'.png'});
  }
  check('No JavaScript page error',result.errors.length===0,result.errors);
  result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.stack;console.error(e);process.exitCode=1;await page.screenshot({path:output+'/failure.png'}).catch(()=>{});}
finally{await fs.writeFile(output+'/results.json',JSON.stringify(result,null,2));await browser.close();}
