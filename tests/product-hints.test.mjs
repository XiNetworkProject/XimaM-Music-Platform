import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';
import * as hints from '../lib/productHints.ts';
import { carryHandoff } from '../lib/creationHandoffs.ts';
const read = path => readFileSync(path, 'utf8');
const now=Date.parse('2026-10-01T12:00:00Z');
const free={plan:'free',inventory:[],remainingMs:0,cooldownMs:hints.HINT_DAY,packs:{}};
const item=(type='track',extra={})=>({status:'owned',booster:{type,enabled:true,...extra}});
const facts=raw=>hints.parseHintFacts({...free,...raw});

test('only explicit successful entitlement snapshots can become opportunities',()=>{
  for(const raw of [null,{}, {...free,plan:'unknown'}, {...free,remainingMs:-1},{...free,remainingMs:NaN},{...free,inventory:null},{...free,cooldownMs:0}]) assert.equal(hints.parseHintFacts(raw),null);
  const actual=facts({inventory:[item(),item('credits'),item('artist',{enabled:false}),{...item(),status:'used'},item('invented')]});
  assert.equal(actual.owned,1);assert.equal(actual.creation,1);
});
test('the 12-hour counterfactual is true only after the paid cooldown and before the free cooldown',()=>{
  for(const [remainingMs,allowed] of [[0,false],[1,true],[12*3600000,true],[12*3600000+1,false],[24*3600000,false]]) assert.equal(facts({remainingMs}).earlierWithMembership,allowed);
  assert.equal(facts({plan:'starter',remainingMs:1}).earlierWithMembership,false);
  assert.equal(facts({cooldownMs:48*3600000,remainingMs:1}).earlierWithMembership,false);
});
test('packs are advertised only as existing paid entitlements with remaining claims',()=>{
  const packs={starter:{eligible:true,claimed:0,perWeek:1},exhausted:{eligible:true,claimed:2,perWeek:2},locked:{eligible:false,claimed:0,perWeek:1},bad:{eligible:true,claimed:-1,perWeek:2}};
  assert.equal(facts({plan:'pro',packs}).packs,1);assert.equal(facts({packs}).packs,0);
});
test('paid accounts receive no subscription acquisition prompt on any surface',()=>{
  for(const plan of ['starter','pro','enterprise']) for(const placement of ['live','discover','studio','publish','messages','notifications']) assert.ok(hints.hintsFor(facts({plan,inventory:[item()]}),placement).every(h=>h.kind!=='membership'));
});
test('studio prioritizes a real owned recharge; unowned future catalogue rewards are never promised',()=>{
  assert.equal(hints.hintsFor(facts({inventory:[item('credits')]}),'studio')[0].id,'creation-owned');
  assert.ok(!hints.hintsFor(facts({catalog:[{type:'credits'}]}),'studio').some(h=>h.id==='creation-owned'));
});
test('daily ready, reserve and included pack never turn into a fake play or income guarantee',()=>{
  const offers=hints.hintsFor(facts({inventory:[item()]}),'discover');
  assert.equal(offers[0].id,'boost-owned');assert.match(offers[0].body,/aucune écoute n’est garantie/);
  assert.ok(offers.some(h=>h.id==='daily-ready'));
  assert.ok(!hints.hintsFor(facts({remainingMs:1}),'discover').some(h=>h.id==='daily-ready'));
  assert.ok(offers.every(h=>['/boosters','/subscriptions'].includes(h.href)));
});
test('unknown/corrupt local preferences cannot crash the app or inject arbitrary payloads',()=>{
  for(const raw of [null,'bad','null','[]','42']) assert.deepEqual(hints.parseHintHistory(raw,now),hints.emptyHintHistory());
  const parsed=hints.parseHintHistory(JSON.stringify({seen:[{id:'ok',at:now},{id:'bad',at:'x'},{id:'old',at:now-30*hints.HINT_DAY}],dismissed:{expired:now-1,good:now+1000},quietUntil:Infinity}),now);
  assert.deepEqual(parsed.seen,[{id:'ok',at:now}]);assert.deepEqual(parsed.dismissed,{good:now+1000});
});
test('two impressions per rolling 24 hours, at least 30 minutes apart, shared across placements',()=>{
  let state=hints.emptyHintHistory();const f=facts({inventory:[item()]});
  const first=hints.chooseHint(f,'discover',state,now);state=hints.recordHint(state,first.id,now);
  assert.equal(hints.chooseHint(f,'messages',state,now+1000),null);
  const next=hints.chooseHint(f,'notifications',state,now+hints.HINT_GAP);assert.ok(next);assert.notEqual(next.id,first.id);
  state=hints.recordHint(state,next.id,now+hints.HINT_GAP);
  assert.equal(hints.chooseHint(f,'studio',state,now+hints.HINT_GAP*2),null);
  assert.ok(hints.chooseHint(f,'studio',state,now+hints.HINT_DAY+1));
});
test('same hint cools down for seven days; dismissal lasts fourteen, global quiet thirty',()=>{
  const f=facts({plan:'pro',inventory:[item()],remainingMs:1});
  let state=hints.recordHint(hints.emptyHintHistory(),'boost-owned',now);
  assert.equal(hints.chooseHint(f,'publish',state,now+2*hints.HINT_DAY),null);
  assert.ok(hints.chooseHint(f,'publish',state,now+7*hints.HINT_DAY));
  state=hints.dismissHint(state,'boost-owned',now);
  assert.equal(hints.chooseHint(f,'publish',state,now+13*hints.HINT_DAY),null);
  assert.ok(hints.chooseHint(f,'publish',state,now+14*hints.HINT_DAY));
  state=hints.dismissHint(state,'boost-owned',now,true);
  assert.equal(hints.chooseHint(facts({}),'studio',state,now+29*hints.HINT_DAY),null);
});
test('preference keys isolate two account identities',()=>assert.notEqual(hints.hintStorageKey('first'),hints.hintStorageKey('second')));
test('new destinations carry a validated existing Live return, never a new or foreign snapshot',()=>{
  for(const href of ['/boosters','/subscriptions']) {
    assert.equal(carryHandoff(href,'/live','live-test',()=>true),`${href}?liveReturn=live-test`);
    assert.equal(carryHandoff(href,'/live','live-test',()=>false),href);
  }
});

function renderHint(options={}) {
  const states=[options.visible??true, options.preferences===null?null:{identity:options.preferenceOwner||'owner',state:options.history||hints.emptyHintHistory()},options.lease||null];let index=0;const queries=[];
  const exports={};
  const jsx=(type,props)=>({type,props});
  const require=name=>{
    if(name==='react')return {useEffect(){},useRef:value=>({current:value}),useState:value=>[index<states.length?states[index++]:value,()=>{}]};
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(name==='next-auth/react')return {useSession:()=>({data:options.guest?null:{user:{id:options.identity||'owner'}},status:options.guest?'unauthenticated':'authenticated'})};
    if(name==='@tanstack/react-query')return {useQuery:config=>{queries.push(config);return {data:options.facts||facts({}),isError:!!options.error,isFetching:false}}};
    if(name==='@/lib/productHints')return hints;
    if(name==='./ProductHintCard')return {__esModule:true,default:'HintCard'};
    throw new Error(name);
  };
  const code=ts.transpileModule(read('components/benefits/ProductHint.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require,Date,Symbol});
  return {tree:exports.default({placement:'messages',enabled:options.enabled??true}),query:queries[0]};
}
test('inactive, offscreen, anonymous, capped, quiet or unresolved identity mounts issue no query',()=>{
  for(const options of [{enabled:false},{visible:false},{guest:true},{preferences:null},{preferenceOwner:'previous'},{history:{...hints.emptyHintHistory(),quietUntil:Date.now()+10000}},{history:hints.recordHint(hints.emptyHintHistory(),'any',Date.now())}]) assert.equal(renderHint(options).query.enabled,false,JSON.stringify(options));
  assert.equal(renderHint().query.enabled,true);
});
test('shared query key is account scoped, cached, non-polling and cannot retry a mutation',()=>{
  const q=renderHint().query;
  assert.deepEqual(Array.from(q.queryKey),['synaura-product-opportunities','owner']);
  assert.equal(q.staleTime,120000);assert.equal(q.retry,false);assert.equal(q.refetchInterval,undefined);
});
test('account switch, dismissal, fetch failure and lost entitlement hide an existing hint',()=>{
  const lease={identity:'owner',placement:'messages',id:'boost-owned'};
  const owned=facts({inventory:[item()]});
  assert.ok(renderHint({lease,facts:owned}).tree.props.children);
  for(const options of [{lease,facts:owned,error:true},{lease,facts:owned,identity:'new',preferenceOwner:'new'},{lease,facts:owned,history:hints.dismissHint(hints.emptyHintHistory(),'boost-owned',Date.now())},{lease,facts:facts({plan:'pro',remainingMs:1})}]) assert.ok(!renderHint(options).tree.props.children);
});
test('hint implementation cannot write notifications, messages, billing or playback',()=>{
  const source=read('components/benefits/ProductHint.tsx')+read('components/benefits/ProductHintCard.tsx');
  assert.doesNotMatch(source,/method:\s*['"]POST|Notification\(|requestPermission|new Audio|useAudioPlayer|\/api\/messages|\/api\/notifications|checkout|setInterval/);
  assert.match(source,/IntersectionObserver/);assert.match(source,/document.visibilityState/);assert.match(source,/navigator.locks.request/);
  assert.match(source,/Le petit mot Synaura/);assert.match(source,/À découvrir · Synaura/);
});
test('all requested contexts integrate the same gate; Live never inserts a feed item',()=>{
  for(const [path,placement] of [['components/pilot/PilotLive.tsx','live'],['components/discover/DiscoveryLibrary.tsx','discover'],['components/ai-studio/UnifiedStudio.tsx','studio'],['app/publish/page.tsx','publish'],['app/messages/page.tsx','messages'],['app/notifications/page.tsx','notifications'],['components/NotificationCenter.tsx','notifications']]) assert.ok(read(path).includes(`placement="${placement}"`),path);
  const live=read('components/pilot/PilotLive.tsx');assert.match(live,/activeIndex >= 3/);assert.match(live,/onNavigate=\{model.navigateFromEntry\}/);
  assert.doesNotMatch(live,/items\.splice|items\.push/);
});
test('hint styles stay scoped and reduced motion and keyboard controls are present',()=>{
  postcss.parse(read('components/benefits/product-hints.css'));
  assert.match(read('components/benefits/product-hints.css'),/prefers-reduced-motion:reduce/);
  assert.match(read('components/benefits/product-hints.css'),/focus-visible/);
  assert.match(read('app/dev/benefits/page.tsx'),/NODE_ENV !== 'development'.*notFound/);
});
