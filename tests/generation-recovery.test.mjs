import test from 'node:test';
import assert from 'node:assert/strict';
import {compile,read} from './helpers/recommendation-fixtures.mjs';
import { feedbackFailure } from '../lib/studio/feedback.ts';

const job=(extra={})=>({id:'fixture',taskId:'fixture-task',status:'failed',lastError:'Polling timeout: offline',title:'Fixture',style:'',prompt:'',progress:0,startTime:Date.now(),estimatedTime:60000,...extra});
// Execute the actual hook; React scheduling and provider responses are isolated.
function harness(jobs=[job()],storageUnavailable=false){
 let owner='A',cursor=0,dirty=true,effects=[],value,timerId=0;
 const slots=[],requests=[],timers=new Map(),intervals=new Map(),storage=new Map([['bg_generations_A',JSON.stringify(jobs)]]);
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={
  useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;dirty=true;}];},
  useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
  useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={deps,fn};return slots[i].fn;},
  useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
 };
 const {useBackgroundGeneration}=compile(read('hooks/useBackgroundGeneration.ts'),{react,'next-auth/react':{useSession:()=>({data:{user:{id:owner}}})}, '@/lib/studio/feedback': {feedbackFailure}, '@/lib/studio/clientActivity': {reportStudioActivity() {}}},{
  process:{env:{NODE_ENV:'production'}},localStorage:{getItem:key=>{if(storageUnavailable)throw Error('blocked');return storage.get(key)||null;},setItem:(key,val)=>{if(storageUnavailable)throw Error('full');storage.set(key,val);}},
  setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms)=>{intervals.set(++timerId,{fn,ms});return timerId;},clearInterval:id=>intervals.delete(id),
  fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
  window:{dispatchEvent:()=>{}},CustomEvent:class{},
 });
 const render=()=>{let guard=0;while(dirty){assert.ok(guard++<15);dirty=false;cursor=0;value=useBackgroundGeneration();const pending=effects;effects=[];pending.forEach(fn=>fn());}return value;};
 const flush=async()=>{for(let i=0;i<12;i++){await Promise.resolve();render();}return value;};
 const respond=async(req,body={status:'PENDING',tracks:[]},ok=true)=>{req.resolve({ok,json:async()=>body});return flush();};
 render();return {requests,timers,storage,respond,flush,render,get value(){return value;},
  switch(next){owner=next;dirty=true;return render();},
  tick(){const [id,t]=[...timers][0]||[];assert.ok(t);timers.delete(id);t.fn();render();},
  unmount(){slots.forEach(s=>s?.cleanup?.());},
 };
}
test('resume after polling timeout only reads the existing job and suppresses duplicate clicks',async()=>{
 const h=harness();assert.equal(h.requests.length,0);h.value.resumeBackgroundGeneration('fixture-task');h.value.resumeBackgroundGeneration('fixture-task');h.render();
 assert.equal(h.requests.length,1);assert.equal(h.requests[0].url,'/api/suno/status?taskId=fixture-task');assert.notEqual(h.requests[0].options.method,'POST');
 await h.respond(h.requests[0]);assert.equal(h.value.generations[0].status,'pending');assert.equal(h.timers.size,1);assert.equal(h.requests.length,1);h.unmount();assert.equal(h.timers.size,0);
});
test('unknown task and genuine provider rejection cannot be resumed as another paid generation',()=>{
 const h=harness([job({lastError:'SENSITIVE_WORD_ERROR'})]);h.value.resumeBackgroundGeneration('missing');h.value.resumeBackgroundGeneration('fixture-task');assert.equal(h.requests.length,0);h.unmount();
});
test('eight transport failures stop polling; explicit retry keeps the same task identity',async()=>{
 const h=harness([job({status:'pending',lastError:undefined})]);
 for(let i=0;i<8;i++){await h.respond(h.requests[i],{error:'offline'},false);if(i<7)h.tick();}
 assert.equal(h.value.generations[0].status,'failed');assert.match(h.value.generations[0].lastError,/Polling timeout:/);assert.equal(h.timers.size,0);
 h.value.resumeBackgroundGeneration('fixture-task');h.render();assert.equal(h.requests.length,9);assert.ok(h.requests.every(r=>r.url==='/api/suno/status?taskId=fixture-task'&&r.options.method!=='POST'));h.unmount();
});
test('a late success from account A cannot save tracks or contaminate account B',async()=>{
 const h=harness();h.value.resumeBackgroundGeneration('fixture-task');h.render();const a=h.requests[0];h.switch('B');
 await h.respond(a,{status:'SUCCESS',tracks:[{id:'foreign-track',audio:'fixture:audio'}]});
 assert.equal(h.value.generations.length,0);assert.equal(h.requests.length,1);assert.equal(h.timers.size,0);assert.equal(h.storage.has('bg_generations_B'),false);h.unmount();
});
test('blocked local storage does not prevent following an already-created job in memory',async()=>{
 const h=harness([],true);h.value.startBackgroundGeneration(job());h.render();assert.equal(h.requests.length,1);await h.respond(h.requests[0]);
 assert.equal(h.value.generations[0].taskId,'fixture-task');assert.equal(h.value.generations[0].status,'pending');assert.ok(h.requests.every(r=>r.options.method!=='POST'));h.unmount();
});
