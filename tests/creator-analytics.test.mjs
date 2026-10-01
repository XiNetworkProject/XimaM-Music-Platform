import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compile, read, plain } from './helpers/recommendation-fixtures.mjs';

const model = compile(read('lib/creatorAnalytics/model.ts'));
const query = compile(read('lib/creatorAnalytics/query.ts'));
const insights = compile(read('lib/creatorAnalytics/insights.ts'), {'./model': model});
const fixture = compile(read('app/dev/stats/fixture.ts'), { '@/lib/creatorAnalytics/model': model });
const clock = new Date('2026-09-27T12:00:00Z');
const period = (s) => model.analyticsPeriod(new URLSearchParams(s), clock);

test('creator analytics uses equal complete UTC windows, including custom one-day ranges', () => {
  for (const days of [7, 28, 90]) {
    const p = period(`range=${days}d`);
    assert.equal(p.days, days);
    assert.equal(p.end, '2026-09-27T00:00:00.000Z');
    assert.equal(Date.parse(p.start) - Date.parse(p.previousStart), days * model.DAY_MS);
    assert.equal(Date.parse(p.end) - Date.parse(p.start), days * model.DAY_MS);
  }
  assert.equal(period('range=custom&from=2026-09-26&to=2026-09-26').days, 1);
  assert.equal(period('range=custom&from=2026-03-28&to=2026-03-30').days, 3);
});

test('creator analytics rejects invalid, future, reversed and unbounded dates', () => {
  for (const input of ['range=all','range=custom','range=custom&from=2026-02-30&to=2026-03-03','range=custom&from=2026-09-27&to=2026-09-27','range=custom&from=2026-09-20&to=2026-09-19','range=custom&from=2026-01-01&to=2026-09-26']) {
    assert.throws(() => period(input), undefined, input);
  }
});

test('creator analytics never invents uplift or completion on insufficient data', () => {
  assert.equal(model.changePercent(8, 0), null);
  assert.equal(model.changePercent(0, 0), 0);
  assert.equal(model.changePercent(0, 10), -100);
  assert.equal(model.changePercent(15, 10), 50);
  assert.equal(model.completionRate({sessions:4, completed:4}), null);
  assert.equal(model.completionRate({sessions:5, completed:2}), 40);
  assert.equal(model.completionRate({sessions:5, completed:8}), 100);
  assert.equal(model.formatAnalyticsNumber(null), '—');
});

test('creator CSV exports escape formulas and quotes, with explicit period/cumulative scope', () => {
  for (const value of ['=CMD()','+1','@SUM(A1)','-1','  =1','\tformula']) assert.ok(model.csvCell(value).startsWith('"\''), value);
  assert.equal(model.csvCell('Une "voix"; ailleurs'), '"Une ""voix""; ailleurs"');
  const demo = fixture.demoAnalytics('range=7d');
  for (const kind of ['daily','tracks','posts','clips']) {
    const csv = model.analyticsCsv(demo, kind);
    assert.ok(csv.startsWith('\ufeff'));
    assert.ok(csv.includes('\r\n'));
  }
  assert.match(model.analyticsCsv(demo, 'clips'), /cumulés hors période/);
  assert.match(model.analyticsCsv(demo, 'posts'), /Fin exclusive UTC/);
  assert.equal(model.analyticsCsv(demo, 'daily').split('\r\n').length, 8);
});

test('creator query is parameterized, ownership-scoped, aggregate-only and read-only', () => {
  const p = period('range=7d'), malicious = "a' OR true--";
  const s = query.creatorAnalyticsStatement('account-owner', p, 'ai', malicious);
  assert.deepEqual(plain(s.values), ['account-owner',p.previousStart,p.start,p.end,p.now,'ai',malicious]);
  assert.ok(!s.text.includes(malicious));
  assert.doesNotMatch(s.text, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
  assert.match(s.text, /count\(DISTINCT user_id\)/);
  assert.match(s.text, /HAVING bool_or\(event_type = 'play_start'\)/);
  assert.match(s.text, /NOT coalesce\(e.is_ai_track,false\)/);
  assert.match(s.text, /LIMIT 500/);
  // An old custom range must not scan every intervening year up to now.
  assert.doesNotMatch(s.text, /LEAST\(\$2::timestamptz/);
  assert.match(s.text, /e.created_at >= \$2::timestamptz AND e.created_at < \$4::timestamptz/);
});

function api(session, database) {
  return compile(read('app/api/stats/creator/route.ts'), {
    'next/server': {NextResponse: {json: (body, init) => Response.json(body, init)}},
    '@/lib/getApiSession': {getApiSession: async () => session},
    '@/lib/postgres': {queryDatabase: database},
    '@/lib/creatorAnalytics/model': model,
    '@/lib/creatorAnalytics/query': query,
  });
}
const request = (params = '') => ({url:'https://fixture.invalid/api/stats/creator?' + params});

test('creator API requires a real account before any DB query', async () => {
  for (const session of [null, {user:{}}]) {
    const route = api(session, () => assert.fail('Unauthenticated query'));
    const res = await route.GET(request());
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('creator API validates all bounded filters before hitting the database', async () => {
  const route = api({user:{id:'owner'}}, () => assert.fail('Invalid query'));
  for (const params of ['range=all','format=foreign','track='+ 'a'.repeat(161),'range=custom&from=invalid']) {
    assert.equal((await route.GET(request(params))).status, 400);
  }
});

test('creator API uses session ownership, never a requested owner or cache', async () => {
  let called = 0;
  const route = api({user:{id:'actual-owner'}}, async (_sql, values) => {
    called++; assert.equal(values[0], 'actual-owner'); assert.equal(values[6], 'mine');
    return {rows:[{report:{selectionFound:true,current:{plays:7}}}]};
  });
  const res = await route.GET(request('range=7d&track=mine&userId=victim'));
  assert.equal(res.status, 200); assert.equal(called, 1);
  const body = await res.json();
  assert.equal(body.current.plays, 7); assert.equal(body.period.days, 7);
  assert.equal(body.selectionFound, undefined);
  assert.equal(res.headers.get('Vary'), 'Cookie, Authorization');
});

test('creator API refuses foreign tracks instead of silently showing all tracks', async () => {
  const route = api({user:{id:'owner'}}, async () => ({rows:[{report:{selectionFound:false}}]}));
  assert.equal((await route.GET(request('track=foreign'))).status, 404);
});

test('creator API returns an explicit safe error, never zeros or internal SQL details', async () => {
  for (const db of [async () => {throw new Error('postgres://private-password SQL');},async () => ({rows:[]})]) {
    const res = await api({user:{id:'owner'}}, db).GET(request());
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.match(body.error, /indisponibles/); assert.equal(body.current, undefined);
    assert.doesNotMatch(JSON.stringify(body), /postgres|password|SQL/);
  }
});

// Execute the actual hook in an isolated React lifecycle harness. Requests can
// resolve even after abort, deliberately testing a transport ignoring cancellation.
function hookHarness() {
  let cursor = 0, states = [], deps = [], cleanups = [], pending = [];
  const requests = [], timers = new Map(); let timerId = 0;
  const react = {
    useState(initial) { const i=cursor++; if (!(i in states)) states[i]=initial; return [states[i], v=>{states[i]=typeof v==='function'?v(states[i]):v;}]; },
    useRef(initial) { const i=cursor++; if (!(i in states)) states[i]={current:initial}; return states[i]; },
    useEffect(effect, next) { const i=cursor++; if(!deps[i]||next.some((v,k)=>!Object.is(v,deps[i][k]))) {pending.push(()=>{cleanups[i]?.();cleanups[i]=effect();});deps[i]=next;} },
  };
  const hook = compile(read('components/analytics/useCreatorAnalytics.ts'), {react}, {
    AbortController,
    fetch:(url, options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),
    setTimeout: fn=>{timers.set(++timerId,fn);return timerId;}, clearTimeout:id=>timers.delete(id),
  }).useCreatorAnalytics;
  return {requests,timers,render(...args) {cursor=0;const result=hook(...args);const effects=pending;pending=[];effects.forEach(e=>e());return result;}};
}
const tick = async () => {for(let i=0;i<12;i++) await Promise.resolve();};
const reply = (request, body, ok=true) => request.resolve({ok,json:async()=>body});

test('creator client aborts/ignores stale filters and prevents cross-account leakage', async () => {
  const h=hookHarness();
  h.render('a','range=7d',0); h.render('a','range=90d',0);
  assert.ok(h.requests[0].options.signal.aborted);
  reply(h.requests[1],{marker:'new'});await tick();
  assert.equal(h.render('a','range=90d',0).data.marker,'new');
  reply(h.requests[0],{marker:'stale'});await tick();
  assert.equal(h.render('a','range=90d',0).data.marker,'new');
  assert.equal(h.render('b','range=90d',0).data,null);
  assert.equal(h.render(null,'range=90d',0).data,null);
  reply(h.requests[2],{marker:'account-b'});await tick();
  assert.equal(h.render(null,'range=90d',0).data,null);
});

test('creator client has no inactive UI refetch, but explicit refresh works; demo never queries', () => {
  const h=hookHarness();
  h.render(null,'range=7d',0); assert.equal(h.requests.length,0);
  const demo={current:{plays:20}};
  assert.equal(h.render('a','range=7d',0,demo).data,demo);assert.equal(h.requests.length,0);
  h.render('a','range=7d',0); h.render('a','range=7d',0); assert.equal(h.requests.length,1);
  h.render('a','range=7d',1);assert.equal(h.requests.length,2);
  assert.equal(h.requests[0].options.cache,'no-store');
});

test('creator client shows server failures and timeouts instead of false zero reports', async () => {
  const h=hookHarness();h.render('a','range=7d',0);
  reply(h.requests[0],{error:'Indisponible'},false);await tick();
  assert.equal(h.render('a','range=7d',0).error,'Indisponible');
  assert.equal(h.render('a','range=7d',0).data,null);
  h.render('a','range=7d',1);[...h.timers.values()][0]();
  h.requests[1].reject(new Error('AbortError'));await tick();
  assert.match(h.render('a','range=7d',1).error,/trop de temps/);
});

test('creator preview cannot run in production or masquerade as real account data', () => {
  assert.match(read('app/dev/stats/page.tsx'), /process.env.NODE_ENV === "production"/);
  assert.match(read('app/dev/stats/page.tsx'), /notFound\(\)/);
  assert.doesNotMatch(read('app/stats/page.tsx'), /demoFactory|fixture|demoAnalytics/);
  assert.match(read('components/analytics/CreatorAnalytics.tsx'), /données de démonstration/);
  const empty=fixture.demoAnalytics('range=7d',true);
  assert.equal(empty.current.plays,0);assert.equal(empty.daily.length,7);assert.equal(empty.tracks.length,0);
});

test('creator charts retain honest shared scales, accessible values and reduced motion', () => {
  const chart=read('components/analytics/AnalyticsChart.tsx'), ui=read('components/analytics/CreatorAnalytics.tsx');
  assert.match(chart,/oldValues\.map/);assert.match(chart,/v === null/);
  assert.match(chart,/type="range"/);assert.match(chart,/Voir les valeurs jour par jour/);
  assert.match(ui,/aria-label="Exporter les statistiques en CSV"/);
  assert.match(read('components/analytics/creator-analytics.css'),/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(ui,/setQueueAndPlay|new Audio\(|\.play\(/);
});

test('momentum ranks absolute gains and losses, not flattering small-denominator percentages', () => {
  const rows=[{id:'a',plays:100,previousPlays:50},{id:'b',plays:30,previousPlays:0},{id:'c',plays:4,previousPlays:40},{id:'d',plays:10,previousPlays:20}];
  assert.deepEqual(plain(insights.movingTracks(rows,'up').map(t=>t.id)),['a','b']);
  assert.deepEqual(plain(insights.movingTracks(rows,'down').map(t=>t.id)),['c','d']);
  assert.deepEqual(rows.map(t=>t.id),['a','b','c','d']);
});

test('catalogue signals retain zero days and use the full period denominator, even with capped rows', () => {
  const empty=fixture.demoAnalytics('range=7d',true);
  assert.equal(insights.catalogueSignals(empty).topThreeShare,null);
  assert.equal(insights.catalogueSignals(empty).activeDays,0);
  const report={...empty,current:{...empty.current,plays:100},tracks:[{plays:30},{plays:20},{plays:10},{plays:5}],daily:[{plays:100},{plays:0}]};
  assert.equal(insights.catalogueSignals(report).topThreeShare,60);
  assert.equal(insights.catalogueSignals(report).averageDaily,100/7);
});

test('comparison queries preserve period, replace selection and never mutate the original query', () => {
  const input='range=custom&from=2026-09-20&to=2026-09-22&track=old&format=ai';
  const result=new URLSearchParams(insights.comparisonQuery(input,"track'&id"));
  assert.equal(result.get('track'),"track'&id");assert.equal(result.get('format'),'all');
  assert.equal(result.get('from'),'2026-09-20');assert.equal(result.get('to'),'2026-09-22');
});

test('comparison exports align dates, protect formulas and reject different periods', () => {
  const a=fixture.demoAnalytics('range=7d&track=demo-0'),b=fixture.demoAnalytics('range=7d&track=demo-1');
  const csv=insights.comparisonCsv(a,b,'=formula','Titre B');
  assert.equal(csv.split('\r\n').length,8);assert.ok(csv.includes('"\'=formula"'));
  assert.throws(()=>insights.comparisonCsv(a,{...b,period:{...b.period,start:'different'}},'A','B'),/Périodes/);
});

test('demo track rows exactly match independent comparisons and have both directions', () => {
  const all=fixture.demoAnalytics('range=28d',false,clock);
  for(const track of all.tracks) {
    const single=fixture.demoAnalytics('range=28d&track='+track.id,false,clock);
    for(const field of ['plays','likes','listeners','sessions','completed'])assert.equal(track[field],single.current[field],`${track.id}:${field}`);
  }
  assert.equal(all.tracks.reduce((n,t)=>n+t.plays,0),all.current.plays);
  assert.ok(insights.movingTracks(all.tracks,'down').length>0);
  assert.equal(all.audience.returning+all.audience.notSeenPreviously,all.current.listeners);
});

test('comparison reads are mounted on demand and unavailable for a missing/same selection', () => {
  const page=read('components/analytics/CreatorAnalytics.tsx'),compare=read('components/analytics/AnalyticsComparison.tsx');
  assert.match(page,/tab === "compare" &&/);
  assert.match(compare,/first && second \? owner : null/);
  assert.match(compare,/t.id !== first\??.id/);
  assert.match(compare.replace(/\s+/g,' '),/Aucun chiffre manquant n’est remplacé par zéro/);
  assert.match(read('components/analytics/AnalyticsInsights.tsx').replace(/\s+/g,' '),/pas nouveaux utilisateurs/);
});
