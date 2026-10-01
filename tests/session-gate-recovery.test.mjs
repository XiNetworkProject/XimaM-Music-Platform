import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {read,compile} from './helpers/recommendation-fixtures.mjs';

function harness(initial={status:'authenticated',data:{user:{id:'A'}}}, path='/subscriptions/success') {
 let session=initial,pathname=path,cursor=0,dirty=true,effects=[],value,reloads=0,timerId=0;
 const slots=[],requests=[],timers=new Map(),redirects=[];
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const react={
  useState(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;dirty=true;}];},
  useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
  useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
 };
 const jsx=(type,props)=>({type,props});
 const router={replace:url=>redirects.push(url)};
 const dependencies={react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'next-auth/react':{useSession:()=>session},'next/navigation':{usePathname:()=>pathname,useRouter:()=>router},'@/components/enter/SynauraEntryLoading':{default:'loading'}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(read('components/onboarding/OnboardingGate.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  module,exports:module.exports,require:name=>{if(!(name in dependencies))throw Error(name);return dependencies[name];},
  process:{env:{NODE_ENV:'production'}},AbortController,
  setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),
  window:{location:{search:'?session_id=fixture-only',reload:()=>reloads++}},
  fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
 });
 const render=()=>{let guard=0;while(dirty){assert.ok(guard++<12);dirty=false;cursor=0;value=module.exports.default({children:'PRIVATE_CONTENT'});const pending=effects;effects=[];pending.forEach(fn=>fn());}return value;};
 const flush=async()=>{for(let i=0;i<10;i++){await Promise.resolve();render();}return value;};
 const respond=async(req,body={preferences:{onboarding:{onboardingCompleted:true}}},ok=true)=>{req.resolve({ok,json:async()=>body});return flush();};
 render();
 return {requests,timers,redirects,respond,flush,get value(){return value;},get reloads(){return reloads;},
  change(next,nextPath=pathname){session=next;pathname=nextPath;dirty=true;return render();},
  expire(){for(const [id,t] of [...timers]){timers.delete(id);t.fn();}return render();},
  unmount(){slots.forEach(s=>s?.cleanup?.());},
 };
}
const json=h=>JSON.stringify(h.value);
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const found=find(child,predicate);if(found)return found;}return null;}if(predicate(node))return node;return find(node.props?.children,predicate);};

test('reproduces authenticated cookie without resolved profile when database is unavailable',async()=>{
 const unavailable=async()=>{throw Error('fixture unavailable');};
 const {authOptions}=compile(read('lib/authOptions.ts'),{'next-auth/providers/credentials':{default:x=>x},'next-auth/providers/google':{default:x=>x},'@/lib/localAuth':{getLocalProfileById:unavailable,getLocalProfileByEmail:unavailable,getLocalProfileByUsername:unavailable},'@/lib/security/requestSecurity':{}},{process:{env:{NODE_ENV:'test'}}});
 const data=await authOptions.callbacks.session({session:{user:{name:'Fixture',email:'fixture@example.invalid'}},token:{id:'fixture',username:'fixture'}});
 assert.equal(data.user.id,undefined);
 const h=harness({status:'authenticated',data});assert.match(json(h),/role.*alert/);assert.doesNotMatch(json(h),/PRIVATE_CONTENT/);assert.equal(h.requests.length,0);
 find(h.value,n=>n.type==='button').props.onClick();assert.equal(h.reloads,1);assert.equal(h.redirects.length,0);h.unmount();
});
test('unresolved session reaches recovery after a bounded wait without opening private content',()=>{
 const h=harness({status:'loading',data:null});assert.equal(h.value.type,'loading');assert.equal([...h.timers.values()][0].ms,15000);
 h.expire();assert.match(json(h),/role.*alert/);assert.doesNotMatch(json(h),/PRIVATE_CONTENT/);assert.equal(h.requests.length,0);h.unmount();
});
test('profile request timeout aborts and ignores a late successful response',async()=>{
 const h=harness();const req=h.requests[0];h.expire();assert.equal(req.options.signal.aborted,true);await h.respond(req);
 assert.match(json(h),/role.*alert/);assert.doesNotMatch(json(h),/PRIVATE_CONTENT/);assert.equal(h.redirects.length,0);h.unmount();
});
test('profile server failure and invalid payload fail closed with a retry, not a permanent loader',async()=>{
 for(const [body,ok] of [[{},false],[null,true],[{preferences:[]},true]]){const h=harness();await h.respond(h.requests[0],body,ok);assert.match(json(h),/Recharger et réessayer/);assert.doesNotMatch(json(h),/PRIVATE_CONTENT/);assert.equal(h.timers.size,0);h.unmount();}
});
test('successful account recovery unlocks content and reuses its resolved onboarding check',async()=>{
 const h=harness({status:'authenticated',data:{user:{}}});
 h.change({status:'authenticated',data:{user:{id:'A'}}});await h.respond(h.requests[0]);assert.match(json(h),/PRIVATE_CONTENT/);assert.equal(h.timers.size,0);
 h.change({status:'authenticated',data:{user:{id:'A'}}},'/stats');assert.equal(h.requests.length,1);assert.match(json(h),/PRIVATE_CONTENT/);h.unmount();
});
test('account switch aborts A and cannot use A response to open B or redirect it',async()=>{
 const h=harness();const a=h.requests[0];h.change({status:'authenticated',data:{user:{id:'B'}}});const b=h.requests[1];assert.equal(a.options.signal.aborted,true);
 await h.respond(a,{preferences:{}});assert.equal(h.value.type,'loading');assert.equal(h.redirects.length,0);await h.respond(b);assert.match(json(h),/PRIVATE_CONTENT/);h.unmount();
});
test('incomplete onboarding retains the exact payment return query; unmount cancels checks',async()=>{
 const h=harness();await h.respond(h.requests[0],{preferences:{}});
 assert.equal(h.redirects[0],'/onboarding?callbackUrl=%2Fsubscriptions%2Fsuccess%3Fsession_id%3Dfixture-only');assert.doesNotMatch(json(h),/PRIVATE_CONTENT/);h.unmount();
 const pending=harness();pending.unmount();assert.equal(pending.requests[0].options.signal.aborted,true);assert.equal(pending.timers.size,0);
});
test('public routes and anonymous page-level authentication retain their existing boundaries',()=>{
 for(const path of ['/search','/subscriptions','/auth/signin','/community']){const h=harness({status:'loading',data:null},path);assert.match(json(h),/PRIVATE_CONTENT/);assert.equal(h.requests.length,0);assert.equal(h.timers.size,0);h.unmount();}
 const anonymous=harness({status:'unauthenticated',data:null});assert.match(json(anonymous),/PRIVATE_CONTENT/);assert.equal(anonymous.requests.length,0);anonymous.unmount();
 const privatePage=harness({status:'loading',data:null},'/subscriptions/success');assert.doesNotMatch(json(privatePage),/PRIVATE_CONTENT/);privatePage.unmount();
});
