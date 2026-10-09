import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createDatabaseClient } from '../lib/database.ts';
import { loadCommunityModules } from '../scripts/lib/community-posts-harness.mjs';
const read = path => fs.readFileSync(path,'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function hooks() {
  let index=0,dirty=true,effects=[],args=['A','viewer'],value;
  const slots=[],requests=[];
  const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useState(initial){const i=index++;if(!slots[i])slots[i]={value:initial};return[slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;dirty=true;}];},
    useRef(initial){return slots[index++]||=( {current:initial} );},
    useCallback(fn,deps){const i=index++;if(!equal(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn;},
    useEffect(fn,deps){const i=index++;if(!equal(slots[i]?.deps,deps)){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  const module={exports:{}};
  const code=ts.transpileModule(read('components/community/useCommunityThread.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>{assert.equal(name,'react');return react;},AbortController,JSON,encodeURIComponent,fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}))});
  const render=()=>{let guard=0;while(dirty&&guard++<10){dirty=false;index=0;value=module.exports.useCommunityThread(...args);const run=effects;effects=[];run.forEach(fn=>fn());}return value;};
  render();
  return{requests,get value(){return value;},switch:(...next)=>{args=next;dirty=true;return render();},respond:async(req,id,status=200)=>{req.resolve({ok:status<400,status,json:async()=>({post:{id},replies:[],error:status<400?'':'Server message'})});for(let i=0;i<8;i++){await Promise.resolve();if(dirty)render();}},unmount:()=>slots.forEach(slot=>slot?.cleanup?.())};
}
test('thread A/B/C aborts stale requests and keeps C even if A finishes last',async()=>{
  const h=hooks(),a=h.requests[0];h.switch('B','viewer');const b=h.requests[1];h.switch('C','viewer');const c=h.requests[2];
  assert.equal(a.options.signal.aborted,true);assert.equal(b.options.signal.aborted,true);
  await h.respond(c,'C');await h.respond(b,'B');await h.respond(a,'A');assert.equal(h.value.post.id,'C');h.unmount();
});
test('thread viewer switch hides personalized data and aborts the previous account',async()=>{
  const h=hooks();await h.respond(h.requests[0],'A');h.switch('A','different-user');assert.equal(h.value.post,null);assert.equal(h.value.loading,true);h.unmount();assert.equal(h.requests[1].options.signal.aborted,true);
});
test('thread distinguishes not-found from server error and permits retry',async()=>{
  const h=hooks();await h.respond(h.requests[0],'A',500);assert.equal(h.value.missing,false);assert.equal(h.value.post,null);assert.ok(h.value.error);
  h.value.reload();await h.respond(h.requests[1],'A',404);assert.equal(h.value.missing,true);
  h.value.reload();await h.respond(h.requests[2],'A');assert.equal(h.value.error,'');assert.equal(h.value.post.id,'A');h.unmount();
});
test('invalid post input is rejected without any database work',async()=>{
  let calls=0;const db=createDatabaseClient({query:async()=>{calls++;throw Error('No query allowed');}});
  const f=loadCommunityModules(db,{user:{id:'owner'}});
  for(const body of [null,{}, {title:' ',content:'x',category:'feedback'},{title:'x',content:[],category:'feedback'},{title:'x',content:'x',category:'fake'}]) {
    const result=await f.route.POST(new Request('http://localhost/api/community/posts',{method:'POST',body:JSON.stringify(body)}));assert.equal(result.status,400);
  }
  assert.equal(calls,0);
});
test('category check failure stops publication instead of pretending a different stored category',async()=>{
  const calls=[];const db=createDatabaseClient({query:async(sql,values)=>{calls.push({sql,values});throw Object.assign(Error('category constraint'),{code:'23514'});}});
  const f=loadCommunityModules(db,{user:{id:'owner'}});
  const result=await f.route.POST(new Request('http://localhost/api/community/posts',{method:'POST',body:JSON.stringify({title:'A',content:'B',category:'feedback'})}));
  assert.equal(result.status,503);assert.equal(calls.length,1);assert.ok(calls[0].values.includes('feedback'));assert.ok(!calls[0].values.includes('question'));
});
test('all embedded relation shortcuts are removed from community queries',()=>{
  for(const file of ['lib/communityPosts.ts','app/api/community/posts/[id]/route.ts','app/api/community/clubs/route.ts']) assert.doesNotMatch(read(file),/profiles:(user_id|creator_id)\s*\(/);
});
test('migration is additive to categories and contains no user-data rewrite',()=>{
  const sql=read('database/migrations/20261008120000_community_club_categories.sql');
  assert.doesNotMatch(sql,/^\s*(UPDATE|DELETE|INSERT|TRUNCATE|DROP TABLE)\b/im);
  for(const category of ['question','suggestion','general','bug','feedback','collab','remix','ai_prompt']) assert.ok(sql.includes("'"+category+"'"));
  assert.match(sql,/lock_timeout = '3s'/);
});
test('UI uses real helpful votes, isolated drafts, confirmations and accessible forms',()=>{
  const source=read('app/community/forum/[id]/page.tsx');
  assert.match(source,/\/api\/community\/posts\/replies\/likes/);assert.doesNotMatch(source,/ce signal aidera|usefulReplies/);
  assert.match(source,/community-reply:\$\{id\}/);assert.match(source,/key=\{`\$\{id\}:\$\{viewerId\}`\}/);
  assert.match(source,/showModal\(\)/);assert.match(source,/autoFocus type="button"/);assert.match(source,/htmlFor="thread-reply"/);
  assert.match(source,/busyRef.current = true/);assert.match(source,/if \(alive.current\) done/);
  assert.match(read('components/community/community-thread.css'),/prefers-reduced-motion/);
});
test('pagination bounds invalid and excessive inputs',()=>{
  const f=loadCommunityModules(createDatabaseClient({query:async()=>{throw Error('not expected');}}));
  for(const raw of [null,'bad','Infinity']) assert.equal(f.validation.communityPage(raw,10,50),10);
  assert.equal(f.validation.communityPage('999999',10,50),50);assert.equal(f.validation.communityPage('-1',10,50),1);
  assert.deepEqual(plain(f.validation.communityPostInput({title:' Title ',content:' Body ',category:'feedback',tags:['a','a']}).value),{title:'Title',content:'Body',category:'feedback',tags:['a']});
});
