import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../lib/search/model.ts';
import * as catalogue from '../lib/search/catalogue.ts';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function moduleFrom(path, imports, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, {
    exports, require: key => { if (!(key in imports)) throw new Error(`Unexpected import: ${key}`); return imports[key]; },
    URL, URLSearchParams, AbortController, console, ...globals,
  }, { filename: path });
  return exports;
}

test('search normalizes French accents, ligatures, spaces and handles', () => {
  assert.equal(model.normalizeSearch('@ÉCHOS  du Cœur'), 'echos du coeur');
  assert.equal(model.normalizeSearch('Électro'), model.normalizeSearch('electro'));
  assert.equal(model.normalizeSearch('  soleil   bleu  '), 'soleil bleu');
  assert.equal(model.searchFilter('arbitrary'), 'all');
  assert.equal(model.searchFilter('clips'), 'clips');
});

test('search navigation preserves Live return and entity identity', () => {
  const url = new URL(model.searchHref('R&B', 'tracks', 'liveReturn=live-unit&query=old&cursor=old'), 'https://synaura.fr');
  assert.equal(url.searchParams.get('liveReturn'), 'live-unit');
  assert.equal(url.searchParams.get('q'), 'R&B');
  assert.equal(url.searchParams.has('query'), false);
  assert.equal(url.searchParams.has('cursor'), false);
  assert.equal(model.resultHref('tracks', { _id: 'ai-123' }), '/track/ai-123');
  assert.equal(model.resultHref('clips', { id: 'clip-123', sourceTrackId: 'track-1' }), '/clips/clip-123');
  assert.equal(model.resultHref('artists', { username: 'hello world' }), '/profile/hello%20world');
});

test('SQL values are parameterized, literal wildcards cannot broaden matching, ties use keyset order', () => {
  const value = "x' OR 1=1; -- %_";
  for (const kind of model.SEARCH_KINDS) {
    const statement = catalogue.searchStatement(value, kind, 6, null);
    assert.ok(!statement.text.includes(value));
    assert.equal(statement.values[0], model.normalizeSearch(value));
    assert.equal(statement.values[4], 7);
    assert.match(statement.text, /ORDER BY score DESC,id COLLATE "C" DESC LIMIT \$5/);
    assert.doesNotMatch(statement.text, /\bOFFSET\b|\bILIKE\b|SELECT \*|jsonb_build_object\([^)]*email/i);
    assert.ok(statement.text.indexOf('THEN 1000') < statement.text.indexOf('THEN 900'));
    assert.match(statement.text, /public\.word_similarity/);
  }
});

test('search cursor is bounded and bound to category plus normalized query', () => {
  const raw = catalogue.searchCursor({ id: 'abc', score: 900 }, 'Échos', 'tracks');
  assert.equal(catalogue.readSearchCursor(raw, 'echos', 'tracks').id, 'abc');
  for (const args of [[raw,'other','tracks'],[raw,'echos','posts'],['not json','x','tracks'],['x'.repeat(1201),'x','tracks']]) {
    assert.throws(() => catalogue.readSearchCursor(...args));
  }
  const data = JSON.parse(Buffer.from(raw, 'base64url'));
  data.score = -1;
  assert.throws(() => catalogue.readSearchCursor(Buffer.from(JSON.stringify(data)).toString('base64url'), 'echos', 'tracks'));
});

test('SQL visibility contracts cover normal, AI parent, playlists, posts and clips without private fields', () => {
  const sql = kind => catalogue.searchStatement('public', kind, 6, null).text;
  assert.ok(sql('tracks').includes("t.is_public IS TRUE AND nullif(btrim(t.audio_url),'') IS NOT NULL"));
  assert.match(sql('tracks'), /g\.is_public IS TRUE AND g\.status='completed'/);
  assert.match(sql('tracks'), /'ai-'\|\|t\.id::text/);
  assert.match(sql('playlists'), /l\.is_public IS TRUE/);
  assert.match(sql('playlists'), /playlist_tracks pt JOIN public\.tracks/);
  assert.match(sql('posts'), /s\.is_public IS TRUE/);
  assert.match(sql('posts'), /t\.id=s\.track_id AND t\.is_public IS TRUE/);
  assert.match(sql('clips'), /c\.visibility='published'/);
  assert.match(sql('clips'), /source_track_type='track' AND EXISTS/);
  assert.match(sql('clips'), /source_track_type='ai_track' AND EXISTS/);
  assert.match(sql('clips'), /g\.is_public IS TRUE AND g\.status='completed'/);
  assert.doesNotMatch(sql('artists'), /email|password|preferences|role|SELECT \*/i);
});

function apiHarness({ rows = [], allowed = true, fail = false } = {}) {
  const queries = [], errors = [];
  const api = moduleFrom('app/api/search/route.ts', {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200, headers: init.headers }) } },
    '@/lib/postgres': { queryDatabase: async (text, values) => { queries.push({ text, values }); if (fail) throw new Error('private connection details'); return { rows }; } },
    '@/lib/security/requestSecurity': { consumeRequestRateLimit: () => ({ allowed }), rateLimitResponse: () => ({ status: 429 }) },
    '@/lib/search/model': model, '@/lib/search/catalogue': catalogue,
  }, { console: { error: (...args) => errors.push(args.join(' ')) } });
  return { run: params => api.GET({ nextUrl: new URL(`https://synaura.fr/api/search?${params}`) }), queries, errors };
}

test('invalid searches and closed short queries never execute SQL', async () => {
  const api = apiHarness();
  for (const params of ['query=x', 'query=%40', 'query=']) assert.equal((await api.run(params)).status, 200);
  for (const params of ['query=xx&filter=bad', 'query=xx&limit=NaN', 'query=xx&limit=0', `query=${'x'.repeat(121)}`, 'query=xx&cursor=abc']) assert.equal((await api.run(params)).status, 400);
  assert.equal(api.queries.length, 0);
  const denied = apiHarness({ allowed: false });
  assert.equal((await denied.run('query=hello')).status, 429);
  assert.equal(denied.queries.length, 0);
});

test('API keeps legacy arrays, category isolation, cursor pagination and explicit failures', async () => {
  const api = apiHarness({ rows: [{id:'b',score:1000,payload:{_id:'b',title:'Echo'}},{id:'a',score:150,payload:{_id:'a',title:'Echos'}}] });
  const first = await api.run('query=echo&filter=tracks&limit=1');
  assert.equal(first.status, 200);
  assert.equal(first.headers['Cache-Control'], 'private, no-store');
  assert.equal(first.body.totalResults, 1);
  assert.equal(first.body.tracks[0].approximateMatch, false);
  assert.equal(first.body.artists.length, 0);
  assert.equal(first.body.clips.length, 0);
  assert.equal(api.queries.length, 1);
  const cursor = first.body.pagination.tracks.nextCursor;
  await api.run(`query=echo&filter=tracks&limit=1&cursor=${cursor}`);
  assert.equal(api.queries[1].values[2], 1000);
  assert.equal(api.queries[1].values[3], 'b');
  assert.equal((await api.run(`query=other&filter=tracks&cursor=${cursor}`)).status, 400);
  const all = await api.run('query=echo');
  assert.equal(all.body.performance.queryCount, 5);
  for (const kind of model.SEARCH_KINDS) assert.equal(all.body[kind][1].approximateMatch, true);
  const broken = apiHarness({ fail: true });
  const error = await broken.run('query=echo');
  assert.equal(error.status, 503);
  assert.doesNotMatch(JSON.stringify(error) + broken.errors.join(), /private connection details|DATABASE_URL/);
});

// Execute the real hook with a minimal React lifecycle and controllable network.
// This is not a browser, PostgreSQL or production performance claim.
function hookHarness() {
  const slots = [], effects = [], timers = new Map(), requests = [];
  let index = 0, timerId = 0, options = ['alpha', 'tracks', 2, true], current;
  const react = {
    useRef(value) { const i=index++; slots[i] ??= { current:value }; return slots[i]; },
    useState(value) { const i=index++; if (!(i in slots)) slots[i]=value; return [slots[i], next => { slots[i]=typeof next==='function'?next(slots[i]):next; }]; },
    useCallback(fn) { index++; return fn; },
    useEffect(fn,deps) { const i=index++; const prior=slots[i]; if (!prior || deps.some((d,n)=>!Object.is(d,prior.deps[n]))) { effects.push(()=>{prior?.cleanup?.();slots[i]={deps,cleanup:fn()};}); } },
  };
  const mod = moduleFrom('components/search/useCatalogueSearch.ts', { react, '@/lib/search/model': model }, {
    setTimeout: fn => { const id=++timerId;timers.set(id,fn);return id; }, clearTimeout: id => timers.delete(id),
    fetch: (url, options) => new Promise(resolve => requests.push({url,signal:options.signal,resolve})),
  });
  const render = (...next) => { if(next.length)options=next;index=0;current=mod.useCatalogueSearch(...options);while(effects.length)effects.shift()();return current; };
  const runTimer = () => { const pending=[...timers.values()];timers.clear();pending.forEach(fn=>void fn()); };
  const respond = async (i, json, ok=true) => { requests[i].resolve({ok,json:async()=>json});await new Promise(resolve=>setImmediate(resolve));render(); };
  return { render, runTimer, respond, requests, get value(){return current;}, unmount(){slots.forEach(slot=>slot?.cleanup?.());} };
}
const payload = (id, cursor=null) => ({ tracks:[{_id:id}], pagination:{tracks:{hasMore:Boolean(cursor),nextCursor:cursor}} });

test('real hook debounces, cancels A/B, ignores stale replies and clears on close', async () => {
  const hook=hookHarness();
  hook.render('a','tracks',2,true);hook.runTimer();assert.equal(hook.requests.length,0);
  hook.render('alpha','tracks',2,true);hook.runTimer();
  hook.render('bravo','tracks',2,true);hook.runTimer();
  hook.render('charlie','tracks',2,true);hook.runTimer();
  assert.ok(hook.requests[0].signal.aborted && hook.requests[1].signal.aborted);
  await hook.respond(2,payload('C'));await hook.respond(0,payload('A'));await hook.respond(1,payload('B'));
  assert.equal(hook.value.results.tracks[0]._id,'C');
  hook.render('charlie','tracks',2,false);hook.render();
  assert.equal(hook.value.results.tracks.length,0);
  hook.runTimer();assert.equal(hook.requests.length,3);
  hook.unmount();
});

test('real pagination locks double click, deduplicates and cannot migrate to another query', async () => {
  const hook=hookHarness();hook.render();hook.runTimer();await hook.respond(0,payload('A','cursor'));
  const first=hook.value.loadMore();void hook.value.loadMore();assert.equal(hook.requests.length,2);
  await hook.respond(1,{tracks:[{_id:'A'},{_id:'B'}],pagination:{tracks:{hasMore:true,nextCursor:'next'}}});await first;
  assert.deepEqual(Array.from(hook.render().results.tracks,x=>x._id),['A','B']);
  const pending=hook.value.loadMore();hook.render('charlie','tracks',2,true);hook.runTimer();
  assert.equal(hook.requests[2].signal.aborted,true);
  await hook.respond(3,payload('C'));await hook.respond(2,payload('OLD'));await pending;
  assert.deepEqual(Array.from(hook.value.results.tracks,x=>x._id),['C']);hook.unmount();
});

test('real hook exposes recoverable errors and aborts pending work on unmount', async () => {
  const hook=hookHarness();hook.render();hook.runTimer();await hook.respond(0,{error:'Indisponible'},false);
  assert.equal(hook.value.error,'Indisponible');assert.equal(hook.value.loading,false);
  hook.value.retry();hook.render();hook.runTimer();assert.equal(hook.requests.length,2);
  hook.unmount();assert.equal(hook.requests[1].signal.aborted,true);
});

test('UI retains named keyboard search, shared AudioCore and reduced-motion controls', () => {
  const page=read('app/search/page.tsx'), box=read('components/search/SearchBox.tsx'), quick=read('components/synaura/SynauraUniversalSearch.tsx');
  assert.match(box,/role="search"/);assert.match(box,/aria-label="Rechercher dans Synaura"/);assert.match(box,/aria-autocomplete=/);
  for (const key of ['ArrowDown','ArrowUp','Escape','Enter']) assert.ok(quick.includes(`'${key}'`));
  assert.match(quick,/useCatalogueSearch\(query,\s*'all',\s*3,\s*open\)/);
  assert.match(page,/useProfilePeek\('search'\)/);assert.match(page,/TrackActionButton/);
  assert.match(page,/player\.pause\(\)/);assert.match(page,/player\.play\(\)/);assert.match(page,/player\.playTrack\(track\)/);
  assert.doesNotMatch(page+quick,/new Audio|<audio|setQueueAndPlay|setQueueOnly/);
  assert.match(read('components/search/search-experience.css'),/prefers-reduced-motion/);
  assert.match(page,/data-motion=\{motion.enabled\}/);
  assert.match(read('components/onboarding/OnboardingGate.tsx'), /pathname === '\/search'/);
  assert.doesNotMatch(read('components/onboarding/OnboardingGate.tsx'), /pathname\.startsWith\('\/search'\)/);
});

function renderedSearch({ activeId='elsewhere', playing=false } = {}) {
  const calls=[], navigation=[], peeks=[];
  const results={...model.emptySearch(),tracks:[{_id:'music-1',title:'Echo',artist:{name:'Test'},duration:120}],artists:[{_id:'author-1',username:'fixture',name:'Fixture'}],clips:[{_id:'clip-1',title:'Clip',duration:30}],playlists:[{_id:'list-1',name:'Collection'}],posts:[{_id:'post-1',content:'Hello'}]};
  const jsx=(type,props)=>typeof type==='function'?type(props):({type,props:props||{}});
  let stateIndex=0;
  const icons=Object.fromEntries(['ArrowDown','ArrowUpRight','Clock3','Disc3','Film','ListMusic','Loader2','MessageCircle','Pause','Play','Search','Sparkles','Users','X'].map(name=>[name,name]));
  const asDefault=component=>({__esModule:true,default:component});
  const page=moduleFrom('app/search/page.tsx',{
    'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},
    react:{Suspense:'suspense',useState:()=>[[ 'echo',[],[] ][stateIndex++],()=>{}],useEffect:()=>{}},
    'next/navigation':{useSearchParams:()=>new URLSearchParams('q=echo&liveReturn=fixture-return'),useRouter:()=>({replace:url=>navigation.push(url)})},
    'lucide-react':icons,
    '@/components/navigation/HandoffLink':asDefault('Link'),
    '@/components/synaura/SynauraShell':{SynauraAppShell:'shell'},
    '@/components/ui/SynauraImage':{SynauraImage:'image'},
    '@/components/actions/TrackActionButton':asDefault('actions'),
    '@/components/profile/useProfilePeek':{useProfilePeek:()=> (...args)=>peeks.push(args)},
    '@/app/providers':{useAudioPlayer:()=>({audioState:{tracks:[{_id:activeId}],currentTrackIndex:0,isPlaying:playing},playTrack:track=>calls.push(['track',track._id]),play:()=>calls.push(['play']),pause:()=>calls.push(['pause'])})},
    '@/components/ambient/ExperienceMotionFrame':asDefault('motion'),
    '@/components/ambient/useLivingMotion':{useLivingMotion:()=>({enabled:false})},
    '@/components/search/SearchBox':asDefault('search-box'),
    '@/components/search/useCatalogueSearch':{useCatalogueSearch:()=>({results,pagination:{},loading:false,error:'',more:false})},
    '@/lib/search/model':model,
    '@/components/search/search-experience.css':{},
  });
  const tree=page.default();
  function collect(node, predicate) {
    if(Array.isArray(node))return node.flatMap(child=>collect(child,predicate));
    if(!node||typeof node!=='object')return [];
    return [...(predicate(node)?[node]:[]),...collect(node.props?.children,predicate)];
  }
  return {calls,navigation,peeks,find:predicate=>collect(tree,predicate)};
}

test('actual page renders five result families and only explicit play mutates the shared player', () => {
  for(const setup of [{activeId:'elsewhere',playing:true},{activeId:'music-1',playing:false},{activeId:'music-1',playing:true}]) {
    const page=renderedSearch(setup);
    assert.equal(page.calls.length,0);
    for(const kind of model.SEARCH_KINDS)assert.equal(page.find(node=>node.props.className===`sx-section sx-section--${kind}`).length,1);
    page.find(node=>node.props.className==='sx-track-play')[0].props.onClick();
    assert.deepEqual(page.calls,[setup.activeId==='elsewhere'?['track','music-1']:setup.playing?['pause']:['play']]);
    const trigger={focus(){}};
    page.find(node=>node.props.className==='sx-artist')[0].props.onClick({currentTarget:trigger});
    assert.equal(page.peeks[0][0],'fixture');assert.equal(page.peeks[0][1],trigger);
    assert.equal(page.calls.length,1,'Profile Peek must not mutate audio');
    assert.ok(page.find(node=>node.type==='Link').some(node=>node.props.href==='/clips/clip-1'));
  }
});

test('actual search filter navigation keeps the Live return token', () => {
  const page=renderedSearch();
  page.find(node=>node.type==='button'&&node.props.children?.[0]==='Clips')[0].props.onClick();
  const next=new URL(page.navigation[0],'https://synaura.fr');
  assert.equal(next.searchParams.get('q'),'echo');assert.equal(next.searchParams.get('filter'),'clips');
  assert.equal(next.searchParams.get('liveReturn'),'fixture-return');assert.equal(page.calls.length,0);
});
