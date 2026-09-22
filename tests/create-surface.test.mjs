import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { getCreateSurfaceInput, getCreateRouteHref, withCreateSurfaceContext, CREATE_TOOLS, CREATE_OTHER_TOOLS } from '../lib/createSurface.ts';
import { createContextSurfaceEntry, pushContextSurface, withContextSurfaceHistory, reconcileContextSurfaceHistory } from '../lib/contextSurfaces.ts';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Create opens one bottom sheet without changing the origin URL', () => {
  for (const [path, origin] of [['/live','live'],['/v2/live','live'],['/discover','discover'],['/search','search'],['/library','other']]) {
    const input = getCreateSurfaceInput('/create', path);
    assert.equal(input.surface, 'create'); assert.equal(input.presentation, 'sheet'); assert.equal(input.origin, origin);
    const entry = createContextSurfaceEntry(input, () => 'create-test');
    const stack = pushContextSurface([], entry).stack;
    const state = withContextSurfaceHistory({ retained: 1 }, stack, path);
    assert.equal(state.retained, 1);
    assert.deepEqual(reconcileContextSurfaceHistory(stack, state, path).stack, stack);
    assert.deepEqual(reconcileContextSurfaceHistory(stack, { retained: 1 }, path).stack, []);
    assert.equal(pushContextSurface(stack, entry).stack.length, 1);
  }
});

test('only normal launcher links are intercepted; source-bound and foreign URLs remain ordinary navigation', () => {
  for (const href of ['/create/variation','/create?intent=clip&sourceTrackId=a','/create?sourceTrack=a','/create?unrecognised=1','/create#section','//evil.test/create','https://evil.test/create','/\\evil.test/create','/create\n','/create?challengeId='+'a'.repeat(241)]) assert.equal(getCreateSurfaceInput(href,'/live'), null, href);
  const source = read('components/navigation/HandoffLink.tsx');
  assert.ok(source.indexOf('event.defaultPrevented') < source.indexOf('getCreateSurfaceInput(next'));
  for (const guard of ['event.metaKey','event.ctrlKey','event.shiftKey','event.altKey',"props.target === '_blank'",'props.download']) assert.ok(source.includes(guard));
  assert.match(source, /openSurface\(create, \{ trigger: event.currentTarget \}\)/);
  assert.match(source, /aria-haspopup=\{createLauncher \? 'dialog'/);
});

test('challenge and Live return context follow every selected tool', () => {
  const input = getCreateSurfaceInput('/create?challengeId=challenge-1&liveReturn=live-test-123','/live');
  assert.equal(input.entityId, 'challenge-1');
  for (const tool of [...CREATE_TOOLS, ...CREATE_OTHER_TOOLS]) {
    const url = new URL(withCreateSurfaceContext(tool.href, input), 'https://synaura.fr');
    assert.equal(url.searchParams.get('challengeId'), 'challenge-1');
    assert.equal(url.searchParams.get('liveReturn'), 'live-test-123');
    if (tool.href.includes('category=')) assert.equal(url.searchParams.get('category'), new URL(tool.href,'https://synaura.fr').searchParams.get('category'));
  }
  assert.equal(getCreateSurfaceInput('/create?liveReturn=not-a-token','/live').returnSnapshotId, null);
});

test('cold /create links open over Live; explicit Clip/remix sources are still routed directly', () => {
  assert.equal(getCreateRouteHref({}), '/live?create=1');
  const target = new URL(getCreateRouteHref({ challengeId:'abc', liveReturn:'live-valid', pilotReview:'1' }), 'https://synaura.fr');
  assert.equal(target.searchParams.get('createChallengeId'),'abc'); assert.equal(target.searchParams.get('liveReturn'),'live-valid'); assert.equal(target.searchParams.get('pilotReview'),'1');
  for (const [intent, path, key] of [['variation','/ai-generator','sourceTrackId'],['clip','/clips/new','trackId']]) {
    const url = new URL(getCreateRouteHref({ intent, sourceTrack:'a & b',sourceTrackType:'ai', challengeId:'c', liveReturn:'live-valid' }), 'https://synaura.fr');
    assert.equal(url.pathname,path); assert.equal(url.searchParams.get(key),'a & b'); assert.equal(url.searchParams.get('challengeId'),'c');
  }
  assert.equal(getCreateRouteHref({liveReturn:'https://evil.test'}),'/live?create=1');
  const registration = read('components/create/CreateRegistration.tsx');
  assert.match(registration, /window.history.replaceState\(window.history.state/);
  assert.match(registration, /if \(url.searchParams.get\('create'\) !== '1'\) return/);
  assert.match(registration, /window.requestAnimationFrame/);
  assert.match(registration, /window.cancelAnimationFrame\(frame\)/);
  assert.match(registration, /if \(url.pathname !== pathname\) return/);
  assert.ok(registration.indexOf('window.requestAnimationFrame') < registration.indexOf('openSurface(input)'));
});

test('direct tools and secondary destinations remain available without media or data side effects', () => {
  assert.deepEqual(CREATE_TOOLS.map(tool=>tool.href),['/studio','/upload','/clips/new','/community?compose=true&category=collab']);
  assert.deepEqual(CREATE_OTHER_TOOLS.map(tool=>tool.href),['/create/variation','/posts?compose=true','/community?compose=true&category=feedback','/community?compose=true&category=remix']);
  const source = read('components/create/CreateSurface.tsx');
  assert.match(source, /replace prefetch=\{false\} data-live-route-intent/);
  assert.match(source, /SynauraOverlayTitle/); assert.match(source, /data-context-surface-initial-focus/);
  for (const file of ['components/create/CreateSurface.tsx','components/create/CreateRegistration.tsx','lib/createSurface.ts']) assert.doesNotMatch(read(file), /fetch\(|useAudioPlayer|AudioCore|new Audio|setQueueAndPlay|\.play\(|\.pause\(/);
});

test('sheet styling is contained, safe-area aware, reduced-motion aware and scrollable only inside its body', () => {
  const source = read('components/create/create-surface.css');
  postcss.parse(source).walkRules(rule => assert.ok(rule.selectors.every(selector=>selector.includes('.create-sheet')||selector.includes('[data-context-surface="create"]')),rule.selector));
  for (const marker of ['safe-area-inset-bottom','prefers-reduced-motion','focus-visible','overflow-y:auto','max-height:82dvh']) assert.ok(source.includes(marker));
  assert.doesNotMatch(source,/backdrop-filter|animation:[^;]*infinite/);
});

test('creation light remains bounded decoration using the shared motion preference', () => {
  const source = read('components/create/CreateSurface.tsx');
  assert.match(source, /<ExperienceMotionFrame className="create-sheet">/);
  assert.match(source, /const id = useId\(\)/);
  assert.match(source, /length: 21/);
  assert.match(source, /className="create-sheet-light"[^>]*aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame|<canvas|WebGL|Math\.random/);
  const css = read('components/create/create-surface.css');
  assert.match(css, /\.create-sheet\[data-motion="true"\] \.create-sheet-light/);
  assert.match(css, /\.create-sheet-header p:not\(\.sr-only\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
