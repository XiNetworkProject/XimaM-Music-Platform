// Phase 4B.6 visual inventory. Disposable authenticated browser; no content writes.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const base=process.env.POLISH_BASE||'https://synaura.fr';
const output=process.env.POLISH_OUTPUT||'artifacts/polish-phase4b6/before';
const peekOnly=process.env.POLISH_PEEK_ONLY==='1';
const sizes=[[1440,900],[1920,1080],[390,844],[360,800],[430,932],[768,1024]].filter(([w])=>!process.env.POLISH_WIDTHS||process.env.POLISH_WIDTHS.split(',').includes(String(w)));
const selected=process.env.POLISH_SURFACES?.split(',');
const track='track_1773789112971_0egfpy0i2';
const result={base,startedAt:new Date().toISOString(),captures:[],errors:[],httpErrors:[],limitations:['Mobile emulated, no OS keyboard','No real NVDA','No social mutations'],routes:{}};
if(base.startsWith('http://localhost'))result.buildId=(await fs.readFile('.next/BUILD_ID','utf8').catch(()=> 'dev')).trim();
await fs.mkdir(output,{recursive:true});
const browser=await puppeteer.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();page.setDefaultTimeout(25000);page.setDefaultNavigationTimeout(90000);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const api=url=>page.evaluate(async url=>{const r=await fetch(url);return {status:r.status,body:await r.json()};},url);
let current='setup';
page.on('pageerror',e=>result.errors.push({surface:current,error:e.message,stack:e.stack?.slice(0,1200)}));
page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());result.httpErrors.push({surface:current,host:u.hostname,path:u.pathname,status:r.status()});}});
await page.setRequestInterception(true);
page.on('request',r=>{
  const u=new URL(r.url());
  if(r.method()==='POST'&&(/\/api\/(tracks|music-clips)\/[^/]+\/(events|plays)$/.test(u.pathname)||u.pathname==='/api/recommendations/impressions'))void r.respond({status:200,contentType:'application/json',body:'{}'});
  else void r.continue();
});
const capture=async(name,w,h)=>{
  current=name;
  await wait(350);
  await page.$$eval('[aria-label="Notifications temporaires"] button[aria-label="Fermer"]',buttons=>buttons.forEach(b=>b.click()));
  const audit=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none';};
    const corrupted=/Ã|Â|â€|ðŸ|\uFFFD/;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const userCopyMojibake=[];
    while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement&&visible(n.parentElement)&&corrupted.test(n.textContent))userCopyMojibake.push(n.textContent.trim().slice(0,180));}
    for(const e of document.querySelectorAll('[aria-label],[placeholder],[title]')){if(visible(e))for(const a of ['aria-label','placeholder','title'])if(corrupted.test(e.getAttribute(a)||''))userCopyMojibake.push(e.getAttribute(a));}
    return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,userCopyMojibake,
      brokenImages:[...document.images].filter(e=>visible(e)&&e.complete&&!e.naturalWidth).map(e=>({alt:e.alt,path:new URL(e.currentSrc||e.src,location.href).pathname})),
      waveformBars:[...document.querySelectorAll('[data-active="true"] .min-h-\\[3px\\]')].slice(0,3).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,siblings:e.parentElement.children.length,parentWidth:e.parentElement.getBoundingClientRect().width,gap:getComputedStyle(e.parentElement).gap})),
      overflow:[...document.querySelectorAll('main,section,header,footer,button,input,h1,h2,[role="dialog"]')].filter(e=>visible(e)).filter(e=>{const r=e.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1;}).slice(0,25).map(e=>({tag:e.tagName,label:(e.getAttribute('aria-label')||e.textContent).slice(0,60),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})),
      smallTargets:[...document.querySelectorAll('button,a,input')].filter(e=>visible(e)).filter(e=>{const r=e.getBoundingClientRect();return r.height<40&&r.width<100;}).slice(0,25).map(e=>({tag:e.tagName,label:(e.getAttribute('aria-label')||e.textContent).slice(0,45),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),
      headings:[...document.querySelectorAll('h1,h2')].filter(visible).map(e=>e.textContent.slice(0,120)),domNodes:document.querySelectorAll('*').length};
  });
  const file=`${name}-${w}.png`;await page.screenshot({path:`${output}/${file}`,fullPage:process.env.POLISH_FULL_PAGE==='1'});
  result.captures.push({surface:name,file,viewport:`${w}x${h}`,url:new URL(page.url()).pathname,...audit});
  if(name==='ai')assert.deepEqual(audit.userCopyMojibake,[], 'AI visible text and accessible labels must be correctly encoded');
};
const goto=async route=>{await page.goto(base+route,{waitUntil:'networkidle2'});await wait(350);};
const ready=selector=>page.waitForSelector(selector,{visible:true});
const close=async()=>{await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-organization-surface],[data-profile-peek-state],[data-comments-state]'));await wait(250);};
const options='[data-active="true"] button[aria-label^="Options de "]';
try{
  await page.setViewport({width:1440,height:900});await goto('/auth/signin');
  await ready('input[type="email"]');
  await page.type('input[type="email"]',process.env.SYNAURA_E2E_EMAIL);await page.type('input[type="password"]',process.env.SYNAURA_E2E_PASSWORD);await page.click('button[type="submit"]');await page.waitForFunction(()=>!location.pathname.startsWith('/auth/signin'));
  assert((await api('/api/auth/session')).body.user?.id);
  const collections=await api('/api/editorial-collections/featured');
  const collection=collections.body.collections?.find(c=>c.playlistId||c.publicUrl);
  let playlist=collection?.publicUrl|| (collection?.playlistId?'/playlists/'+collection.playlistId:null);
  if(playlist?.startsWith('http'))playlist=new URL(playlist).pathname;
  if(!playlist){const search=await api('/api/search?query=mix&filter=all&limit=30');const p=search.body.playlists?.[0];if(p)playlist='/playlists/'+(p._id||p.id);}
  const routes={discover:'/discover',search:'/search?q=mix',track:'/track/'+track,profile:'/profile/mixxparty',library:'/library',playlist,notifications:'/notifications',messages:'/messages',create:'/create',ai:'/ai-generator',studio:'/studio'};
  result.routes=routes;
  for(const [w,h] of sizes){
    await page.setViewport({width:w,height:h,isMobile:w<600,hasTouch:w<600});
    for(const [name,route] of Object.entries(peekOnly?{}:routes)){
      if(selected&&!selected.includes(name))continue;
      if(!route){result.errors.push({surface:name,error:'No existing readable playlist fixture'});continue;}
      try{current=name;await goto(route);
        if(name==='ai')await ready('input[placeholder="Rechercher une piste…"]');
        else if(name!=='studio')await ready('h1');
        await page.evaluate(()=>document.fonts.ready);await wait(900);
        await capture(name,w,h);
        if(process.env.POLISH_TAIL==='1'){
          await page.evaluate(name=>{const target=name==='track'?document.querySelector('textarea'):name==='discover'?[...document.querySelectorAll('h3')].find(e=>e.textContent.includes('Calme')):null;if(target)target.scrollIntoView({block:'center'});else{const scroller=document.querySelector('.app-scroll-container');if(scroller)scroller.scrollTop=scroller.scrollHeight;}},name);await wait(800);await capture(name+'-tail',w,h);
        }
      }catch(e){result.errors.push({surface:name,viewport:w,error:e.message});}
    }
    if(selected&&!selected.some(name=>['live','options','playlist-picker','queue','lyrics','details','conversation','moments','profile-peek'].includes(name)))continue;
    try{
      current='live';await goto('/live');await ready(options);
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Ouvrir le Flow')?.click());await wait(1200);
      const cover=await page.$('[data-active="true"] button:has(img):has(.lucide-pause)');if(cover)await cover.click();
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-active="true"] div')].some(e=>e.classList.contains('min-h-[3px]')), {timeout:45000});
      if(!peekOnly)await capture('live',w,h);
      // Each context is opened from the existing production controls, never fabricated state.
      for(const [name,id] of (peekOnly?[]:[['options',null],['playlist-picker','playlist-picker'],['queue','queue'],['lyrics','lyrics'],['details','track-details']]).filter(([name])=>!selected||selected.includes(name))){
        current=name;await page.click(options);await ready('[data-organization-state="loaded"]');await wait(240);
        if(id){await page.click(`[data-track-action="${id}"]`);await ready(`[data-organization-surface="${id}"][data-organization-state="loaded"]`);await wait(240);}
        await capture(name,w,h);await close();
      }
      if(!peekOnly&&(!selected||selected.includes('conversation'))){await page.click('[data-active="true"] button[aria-label^="Commentaires de "]');await ready('[data-comments-state="loaded"]');await capture('conversation',w,h);
      await page.click('#comments-tab-moments');await ready('[data-musical-waveform]');await capture('moments',w,h);await close();}
      const author=await page.$('[data-active="true"] [data-context-surface-trigger-key^="live-track-profile-"]');
      if(author&&(!selected||selected.includes('profile-peek'))){await author.click();await ready('[data-profile-peek-state="loaded"]');await capture('profile-peek',w,h);await close();}
      else if(!author)result.errors.push({surface:'profile-peek',viewport:w,error:'Creator trigger not found'});
    }catch(e){result.errors.push({surface:current,viewport:w,error:e.message});}
    await fs.writeFile(output+(peekOnly?'/peek-results.json':'/results.json'),JSON.stringify(result,null,2));
    console.log(`${w} complete: ${result.captures.filter(c=>c.width===w).length} captures; ${result.errors.length} errors`);
  }
}catch(e){result.errors.push({surface:current,error:e.stack});process.exitCode=1;}
finally{
  result.completedAt=new Date().toISOString();await fs.writeFile(output+(peekOnly?'/peek-results.json':'/results.json'),JSON.stringify(result,null,2));
  for(const [w] of sizes){
    const items=result.captures.filter(c=>c.width===w);const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#ddd;font:16px Arial}.grid{display:grid;grid-template-columns:repeat(4,360px);gap:12px}figure{margin:0;background:white;padding:6px}img{width:348px;display:block}figcaption{padding:8px}</style><div class="grid">${items.map(c=>`<figure><figcaption>${c.surface} — ${c.viewport}</figcaption><img src="${c.file}"></figure>`).join('')}</div>`;
    await fs.writeFile(`${output}/overview-${peekOnly?'peek-':''}${w}.html`,html);
  }
  await browser.close();
}
