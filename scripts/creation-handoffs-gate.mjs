// Disposable authenticated browser; no social/publication mutations, never attaches to a user browser.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
dotenv.config({path:'.env.local',quiet:true});
const base=(process.env.SYNAURA_E2E_BASE_URL||'http://localhost:3000').replace(/\/$/,'');
const productionSmoke=process.env.SYNAURA_HANDOFF_SMOKE==='1';
const out=process.env.SYNAURA_E2E_OUTPUT||'artifacts/handoffs-phase4b7/gate';
await fs.mkdir(out,{recursive:true});
const result={base,productionSmoke,checks:[],routes:[],errors:[],consoleErrors:[],httpErrors:[],requests:[],captures:[],limitations:['Android/Gboard réel non testé','NVDA réel non testé','No publication or message sent; remix/clip authorization unchanged']};
const browser=await puppeteer.launch({headless:false,pipe:true,enableExtensions:true,args:['--window-size=1440,1000','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(120000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(name,ok,detail)=>{result.checks.push({name,ok:!!ok,detail});console.log(name+': '+(ok?'PASS':'FAIL'));assert(ok,name);};
const active='[data-active="true"][data-feed-item-id]';
const snap=()=>page.evaluate(()=>({item:document.querySelector('[data-active="true"][data-feed-item-id]')?.dataset.feedItemId,index:document.querySelector('[data-active="true"][data-feed-item-id]')?.dataset.index,filter:[...document.querySelectorAll('button[aria-pressed="true"]')].map(b=>b.textContent.trim()),audio:window.__handoffMedia?.map((e,id)=>({id,src:e.currentSrc||e.src,paused:e.paused,time:e.currentTime})),calls:[...window.__handoffCalls],focus:document.activeElement?.getAttribute('data-testid')||document.activeElement?.tagName}));
const clickText=async text=>{const ok=await page.evaluate(text=>{const el=[...document.querySelectorAll('button,a')].find(e=>e.getBoundingClientRect().width&&(e.textContent.trim()===text||e.querySelector('strong')?.textContent.trim()===text));el?.click();return !!el;},text);assert(ok,text);};
const clickVisible=async selector=>{const ok=await page.evaluate(selector=>{const el=[...document.querySelectorAll(selector)].find(e=>e.getBoundingClientRect().width);el?.click();return !!el;},selector);assert(ok,selector);};
const ready=async()=>{await page.waitForSelector(active,{visible:true});await wait(1100);};
const capture=async name=>{await page.screenshot({path:out+'/'+name+'.png'});result.captures.push(name+'.png');};
const create=async text=>{await clickVisible('button[aria-label="Ouvrir le menu Créer"]');await wait(350);await clickText(text);};
const geometry=()=>page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,returns:[...document.querySelectorAll('[data-handoff-return]')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,text:e.textContent};}),title:document.title}));
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'){let source='';try{const u=new URL(m.location().url);source=u.hostname+u.pathname;}catch{}result.consoleErrors.push({text:m.text().replace(/https?:\/\/\S+/g,'[URL]').slice(0,350),source});}});
page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());result.httpErrors.push({host:u.hostname,path:u.pathname,status:r.status()});}});
await page.setRequestInterception(true);
page.on('request',r=>{const u=new URL(r.url()),p=u.pathname;if(u.origin===base&&p.startsWith('/api/'))result.requests.push({path:p,method:r.method(),at:Date.now()});
  if(r.method()==='POST'&&(/\/api\/(tracks|music-clips)\/[^/]+\/(events|plays)$/.test(p)||p==='/api/recommendations/impressions'))return void r.respond({status:200,contentType:'application/json',body:'{}'});
  // Notification read receipts are intercepted too: leave the E2E inbox untouched.
  if(p==='/api/notifications'&&['PUT','PATCH'].includes(r.method()))return void r.respond({status:200,contentType:'application/json',body:'{"success":true}'});
  return void r.continue();
});
await page.evaluateOnNewDocument(()=>{
  window.__handoffMedia=[];window.__handoffCalls=[];window.__handoffObserved=[];window.__handoffObserve=false;
  const id=e=>{let i=window.__handoffMedia.indexOf(e);if(i<0)i=window.__handoffMedia.push(e)-1;return i;};
  for(const name of ['play','pause','load']){const orig=HTMLMediaElement.prototype[name];HTMLMediaElement.prototype[name]=function(...args){if(this.tagName==='AUDIO')window.__handoffCalls.push({id:id(this),name});return orig.apply(this,args);};}
  const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{...d,set(value){if(this.tagName==='AUDIO')window.__handoffCalls.push({id:id(this),name:'seek'});d.set.call(this,value);}});
  addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{if(!window.__handoffObserve)return;const e=document.querySelector('[data-active="true"][data-feed-item-id]');if(e)window.__handoffObserved.push(e.dataset.feedItemId);}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-active']}));
});
async function queueIds(){await clickVisible(active+' button[aria-label^="Options de "]');await page.waitForSelector('[data-organization-state="loaded"]');await clickVisible('[data-track-action="queue"]');await page.waitForSelector('[data-organization-surface="queue"]');await wait(300);const ids=await page.$$eval('[data-queue-track]',es=>es.map(e=>e.dataset.queueTrack));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-organization-surface]'));await wait(300);return ids;}
async function run(name,enter,route,{back=true,captureName=name,keyboard=false,inside}={}){
  const before=await snap(),queue=await queueIds();await page.evaluate(()=>{window.__handoffObserved=[];window.__handoffObserve=true;});
  const mark=Date.now();await enter();await page.waitForFunction(route=>location.pathname===route,{},route);await page.waitForSelector('[data-handoff-return]',{visible:true});await wait(1200);
  const target=await snap(),url=new URL(page.url());
  check(name+' token present',!!url.searchParams.get('liveReturn'));
  await capture(captureName);const g=await geometry();check(name+' return fits',g.documentWidth<=g.width+1&&g.returns.every(r=>r.right<=g.width+1&&r.left>=0),g);
  if(inside)await inside();
  if(back)await page.goBack();else if(keyboard){await page.focus('[data-handoff-return]');await page.keyboard.press('Enter');}else await clickVisible('[data-handoff-return]');
  await page.waitForFunction(()=>location.pathname==='/live');await ready();
  const after=await snap(),afterQueue=await queueIds();const observed=await page.evaluate(()=>{window.__handoffObserve=false;return [...new Set(window.__handoffObserved)];});
  check(name+' same active item (not zero)',before.item===after.item&&before.index===after.index,{before:before.item,after:after.item,index:after.index});
  check(name+' no transient item zero',observed.every(id=>id===before.item),observed);
  check(name+' same queue',JSON.stringify(queue)===JSON.stringify(afterQueue),{before:queue.length,after:afterQueue.length});
  check(name+' same filter',JSON.stringify(before.filter)===JSON.stringify(after.filter));
  const primary=before.audio.find(e=>!e.paused&&e.src);assert(primary,'playing primary audio required');
  const calls=after.calls.slice(before.calls.length).filter(c=>c.id===primary.id),end=after.audio.find(e=>e.id===primary.id);
  check(name+' zero primary audio mutation',calls.length===0&&end?.src===primary.src&&!end?.paused&&end.time>=primary.time,{calls,elapsed:end?.time-primary.time});
  result.routes.push({name,route,back:back?'browser':'explicit',url:url.pathname+url.search,geometry:g,focus:after.focus,requests:result.requests.filter(r=>r.at>=mark)});
}
try{
 await page.setViewport({width:1440,height:900});await page.goto(base+'/auth/signin',{waitUntil:'networkidle2'});await page.waitForSelector('input[type="email"]');await page.type('input[type="email"]',process.env.SYNAURA_E2E_EMAIL);await page.type('input[type="password"]',process.env.SYNAURA_E2E_PASSWORD);await page.click('button[type="submit"]');await page.waitForFunction(()=>!location.pathname.startsWith('/auth/signin'));
 await page.goto(base+'/live',{waitUntil:'networkidle2'});await ready();await clickText('Ouvrir le Flow');await wait(1200);await clickVisible(active+' button[aria-label="Item suivant"]');await wait(1300);
 if(!await page.evaluate(()=>window.__handoffMedia.some(e=>!e.paused&&e.currentSrc)))await clickVisible(active+' .live-track-artwork button');
 await page.waitForFunction(()=>window.__handoffMedia.some(e=>!e.paused&&e.currentSrc));await wait(600);
 const pre=result.requests.map(r=>r.path);check('No workspace query before navigation',!pre.some(p=>/\/api\/(ai\/(library|generations)|suno|remixes\/sources|messages\/conversations)/.test(p)),pre);
 await run('desktop-create',()=>create('Tous les outils de création'),'/create');
 await run('desktop-ai',()=>create('Créer avec l’IA'),'/ai-generator',{back:false});
 if(!productionSmoke){
   await run('desktop-upload',()=>create('Publier un son'),'/upload');
   await run('desktop-clip',()=>create('Publier un clip'),'/clips/new',{back:false});
 }
 await run('desktop-messages',()=>clickVisible('a[href="/messages"]'),'/messages');
 await run('desktop-notifications',async()=>{await clickVisible('button[aria-label="Notifications"]');await page.waitForSelector('a[href="/notifications"]');await clickText('Voir toutes');},'/notifications',{inside:async()=>{
   const target=await page.evaluate(async()=>{const payload=await (await fetch('/api/notifications?limit=30')).json();const list=payload.notifications||[];return list.filter(n=>/^\/(track|profile)\//.test(n.action_url||'')).map(n=>({title:n.title,url:n.action_url,type:n.type}))[0]||null;});
   if(!target){result.limitations.push('No accessible notification target fixture');return;}
   const clicked=await page.evaluate(title=>{const row=[...document.querySelectorAll('[role="button"]')].find(e=>e.textContent.includes(title));row?.click();return !!row;},target.title);
   check('Real notification target clicked',clicked,{type:target.type});
   await page.waitForFunction(path=>location.pathname===path,{},new URL(target.url,base).pathname);await wait(700);await page.goBack();await page.waitForFunction(()=>location.pathname==='/notifications');await page.waitForSelector('[data-handoff-return]');
   check('Notification target Back preserves origin',new URL(page.url()).searchParams.has('liveReturn'));
 }});
 await run('desktop-community',async()=>{await clickVisible('button[aria-label="Profil"]');await clickVisible('a[href="/community"]');},'/community',{inside:async()=>{
   if(productionSmoke)return;
   await clickVisible('a[href="/community/feedback"]');await page.waitForFunction(()=>location.pathname==='/community/feedback');await page.waitForSelector('[data-handoff-return]');
   check('Club inherits Live token',new URL(page.url()).searchParams.has('liveReturn'));await page.goBack();await page.waitForFunction(()=>location.pathname==='/community');await wait(300);
 }});
 await run('desktop-city',async()=>{await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.startsWith('Events · Synaura Pulse'))?.click());},'/city');
 // Hub is the genuine entry to Studio; explicit return skips the hub but restores the original Live snapshot.
 await run('desktop-studio',async()=>{await create('Tous les outils de création');await page.waitForSelector('a[href="/studio"]');await clickVisible('a[href="/studio"]');},'/studio',{back:false});
 if(!productionSmoke){
 const nestedBefore=await snap();
 await clickVisible(active+' [data-context-surface-trigger-key^="live-track-profile-"]');await page.waitForSelector('[data-profile-peek-state="loaded"]');
 await clickVisible('[data-profile-peek-state="loaded"] button[aria-label^="Options de "]');await page.waitForSelector('[data-organization-state="loaded"]');
 result.permissions=await page.evaluate(()=>({remix:!!document.querySelector('[data-track-action="track-remix"]'),clip:!!document.querySelector('[data-track-action="track-clip"]')}));
 await clickVisible('[data-track-action="track-details"]');await page.waitForSelector('[data-organization-surface="track-details"]');await clickVisible('[data-live-route-intent]');await page.waitForFunction(()=>location.pathname.startsWith('/track/'));await wait(800);
 await page.goBack();await ready();check('Nested Peek → Actions → canonical route → Back leaves no obsolete surface',await page.evaluate(()=>!document.querySelector('[data-profile-peek-state],[data-organization-surface]')));
 check('Nested route restores same Live anchor',(await snap()).item===nestedBefore.item);
 await page.setViewport({width:390,height:844});await wait(400);
 await run('mobile-ai-390',()=>create('Créer avec l’IA'),'/ai-generator',{back:false});
 await run('mobile-create-390',()=>create('Tous les outils de création'),'/create');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 check('Reduced motion active',await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
 await run('mobile-messages-reduced-motion',()=>clickVisible('a[href="/messages"]'),'/messages',{back:false,keyboard:true});
 await page.setViewport(null);
 const cdp=await page.createCDPSession();const {windowId}=await cdp.send('Browser.getWindowForTarget');await cdp.send('Browser.setWindowBounds',{windowId,bounds:{width:1440,height:1000}});
 const extension=await browser.installExtension(path.resolve('scripts/fixtures/comments-browser-zoom'));
 const worker=await (await browser.waitForTarget(t=>t.type()==='service_worker'&&t.url().includes(extension))).worker();
 check('Native browser zoom 200%',await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({url:'http://localhost/*'});for(const t of tabs)await chrome.tabs.setZoom(t.id,2);return chrome.tabs.getZoom(tabs[0].id);})===2);
 await run('zoom200-create',()=>create('Tous les outils de création'),'/create',{back:false,keyboard:true});
 await run('zoom200-ai',()=>create('Créer avec l’IA'),'/ai-generator',{back:false,keyboard:true});
 await page.goto(base+'/studio?liveReturn=live-unknown',{waitUntil:'networkidle2'});await wait(600);
 check('Unknown token does not advertise a false return',await page.$('[data-handoff-return]')===null);
 await page.goto(base+'/live?liveReturn=live-unknown',{waitUntil:'networkidle2'});await ready();
 check('Unknown return falls back cleanly and consumes token',!new URL(page.url()).searchParams.has('liveReturn'));
 }
 check('No JavaScript error',result.errors.length===0,result.errors);
 if(productionSmoke){
   const expected=e=>(e.host==='res.cloudinary.com'&&e.status===401)||(e.path==='/api/suno/credits'&&e.status===403)||(e.path==='/api/community/posts'&&e.status===500);
   check('No new application HTTP error',result.httpErrors.every(expected),result.httpErrors);
   const expectedConsole=e=>/Failed to load resource/.test(e.text)&&result.httpErrors.some(h=>expected(h)&&e.source===h.host+h.path);
   check('No new console error',result.consoleErrors.every(expectedConsole),result.consoleErrors);
 }
 result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.stack;console.error(e);process.exitCode=1;await capture('failure').catch(()=>{});}
finally{await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}
