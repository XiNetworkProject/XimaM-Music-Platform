// Disposable authenticated browser; no social writes and no production changes.
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
dotenv.config({path:'.env.local',quiet:true});
const base=process.env.COMMUNITY_E2E_BASE_URL||'http://localhost:3000', out=process.env.COMMUNITY_E2E_OUTPUT||'artifacts/community-posts-fix/e2e';
assert.ok(['http://localhost:3000','https://synaura.fr'].includes(base),'Explicit local/production target only');
await fs.mkdir(out,{recursive:true});
const result={at:new Date().toISOString(),checks:[],responses:[],requests:[],errors:[],console:[],http:[],writes:[],limitations:['No existing feedback/collab/remix/ai_prompt posts; empty clubs are not a populated-club PASS.']};
const browser=await puppeteer.launch({headless:false,pipe:true,args:['--window-size=1440,1000']});
const page=await browser.newPage();await page.setViewport({width:1440,height:900});
const check=(name,ok)=>{result.checks.push({name,ok:!!ok});assert(ok,name);console.log(name+': PASS');};
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')result.console.push(m.text().replace(/https?:\/\/\S+/g,'[URL]'));});
page.on('response',r=>{if(r.status()>=400){const u=new URL(r.url());result.http.push({path:u.pathname,host:u.hostname,status:r.status()});}});
await page.setRequestInterception(true);
page.on('request',async r=>{
  const u=new URL(r.url());
  if(u.origin===base && u.pathname.startsWith('/api/')) result.requests.push({path:u.pathname,method:r.method()});
  if(u.origin===base && u.pathname.startsWith('/api/') && !['GET','HEAD','OPTIONS'].includes(r.method()) && !u.pathname.startsWith('/api/auth/')) {
    result.writes.push({path:u.pathname,method:r.method()});
    await r.respond({status:200,contentType:'application/json',body:'{}'});return;
  }
  await r.continue();
});
const capture=async name=>{await page.$$eval('[role="status"] button[aria-label="Fermer"]',es=>es.forEach(e=>e.click()));await new Promise(r=>setTimeout(r,400));await page.screenshot({path:`${out}/${name}.png`});};
async function readList(navigate,category) {
  const response=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/community/posts' && (u.searchParams.get('category')||'all')===category;});
  const [r]=await Promise.all([response,navigate()]);const data=await r.json();
  result.responses.push({category,url:r.url(),status:r.status(),posts:data.posts?.length,pagination:data.pagination});check(category+' HTTP 200',r.status()===200);
  return data;
}
try {
  await page.goto(base+'/auth/signin',{waitUntil:'networkidle2'});
  await page.type('input[type=email]',process.env.SYNAURA_E2E_EMAIL);await page.type('input[type=password]',process.env.SYNAURA_E2E_PASSWORD);await page.click('button[type=submit]');
  await page.waitForFunction(()=>!location.pathname.startsWith('/auth/signin'));
  await page.goto(base+'/community',{waitUntil:'networkidle2'});await capture('community');
  for(const [slug,category]of [['feedback','feedback'],['collab','collab'],['remix','remix'],['ai','ai_prompt']]) {
    await page.waitForSelector(`a[href="/community/${slug}"]`,{visible:true});
    const data=await readList(()=>page.click(`a[href="/community/${slug}"]`),category);
    if(data.posts.length===0) await page.waitForFunction(()=>document.querySelector('#club-posts')?.textContent.includes('Aucune discussion'));
    check(slug+' renders truthful empty club',data.posts.length===0);await capture(slug);
    await page.click('a[href="/community"]');await page.waitForFunction(()=>location.pathname==='/community');
  }
  const all=await readList(()=>page.goto(base+'/community/forum',{waitUntil:'networkidle2'}),'all');
  check('historical forum has real posts',all.posts.length>0);
  await page.waitForFunction(title=>document.body.innerText.includes(title),{},all.posts[0].title);
  for(const post of all.posts) {
    check('public author identity '+post.id,post.author?.id===post.user_id && !('email' in post.author));
    const expected=post.author.name;check('author rendered '+post.id,await page.evaluate(name=>document.body.innerText.includes(name),expected));
  }
  await page.evaluate(title=>{
    const heading=[...document.querySelectorAll('h2,h3')].find(e=>e.textContent===title);
    if(!heading) throw new Error('Post heading not found for screenshot');
    heading.scrollIntoView({block:'center'});
  },all.posts[0].title);
  await capture('forum-real-posts');
  check('no frontend N+1 author fallback',!result.requests.some(r=>r.path.startsWith('/api/users/by-id/')));
  await page.goto(base+'/community',{waitUntil:'networkidle2'});check('return to Community',new URL(page.url()).pathname==='/community');
  check('no social mutation attempted',result.writes.every(w=>w.path==='/api/notifications'));
  check('no Community/API errors',!result.http.some(r=>r.host===new URL(base).hostname&&r.path.startsWith('/api/community/')));
  check('no JavaScript exception',result.errors.length===0);result.status='PASS';
} catch(e) {result.status='FAIL';result.failure=e.stack;process.exitCode=1;await capture('failure').catch(()=>{});console.error(e);}
finally {await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2));await browser.close();}
