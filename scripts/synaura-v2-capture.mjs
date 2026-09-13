/**
 * LOCAL ONLY — explicitly identified, non-persistent browser fixtures.
 * Does not load .env, sign in, set cookies, connect to SQL or bypass SSR auth.
 * All non-GET/HEAD requests are stopped at the browser network boundary.
 * This is visual/interaction QA, NOT a real-account, DB, NVDA or OS-keyboard gate.
 * Review this file before opting in with SYNAURA_V2_CAPTURE=1.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

assert.equal(process.env.SYNAURA_V2_CAPTURE, '1', 'Review the runner, then explicitly set SYNAURA_V2_CAPTURE=1.');
const origin = new URL(process.env.SYNAURA_V2_BASE || 'http://localhost:3000');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Only a loopback candidate is allowed.');
assert.equal(origin.protocol, 'http:', 'Use the ordinary local HTTP development server.');
assert(!origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash);
const base = origin.origin;
const outputRoot = path.resolve('artifacts/synaura-v2');
const output = path.join(outputRoot, new Date().toISOString().replace(/[:.]/g, '-'));
assert(output.startsWith(outputRoot + path.sep));
const selected = new Set((process.env.SYNAURA_V2_SURFACES || '').split(',').filter(Boolean));
const selectedWidths = new Set((process.env.SYNAURA_V2_WIDTHS || '').split(',').filter(Boolean).map(Number));
const sizes = [[1440, 900], [1920, 1080], [768, 1024], [360, 800], [390, 844], [430, 932], ...(process.env.SYNAURA_V2_TABLET_LANDSCAPE === '1' ? [[1024, 768]] : [])].filter(([w]) => !selectedWidths.size || selectedWidths.has(w));
assert(sizes.length > 0, 'Choose one of the specified QA widths.');
const publicReads = process.env.SYNAURA_V2_PUBLIC_READS === '1';
const publicSource = new URL(process.env.SYNAURA_V2_PUBLIC_SOURCE || base);
assert(publicSource.origin === base || publicSource.origin === 'https://synaura.fr', 'Public metadata source must be this loopback candidate or exactly https://synaura.fr.');
assert(!publicSource.username && !publicSource.password && publicSource.pathname === '/' && !publicSource.search && !publicSource.hash);
const user = { id: 'qa-v2-local-viewer', _id: 'qa-v2-local-viewer', username: 'qa-v2-local', name: 'Fixture QA · Synaura V2', email: 'fixture-v2@example.invalid', image: null, avatar: null, role: 'user', isArtist: true };
const result = { base, startedAt: new Date().toISOString(), status: 'NOT_RUN', fixture: { label: 'FIXTURE QA — LOCAL / NON PERSISTANTE', session: 'Browser response only; no credential, cookie, SQL or SSR bypass', publicReads, publicSource: publicReads ? publicSource.origin : null, audio: 'Synthetic local WAV, including tracks with optional public artwork; not real listening validation' }, captures: [], checks: [], blocked: [], errors: [], console: [], unmapped: [], requests: [], mutations: [], reads: [], limitations: ['Session and private data are fixtures, not authenticated end-to-end validation.', 'SSR-protected routes remain blocked instead of being bypassed.', 'Android/Gboard réel NON TESTÉ.', 'NVDA réel NON TESTÉ.', 'Viewport dimensions do not establish native desktop zoom 200%.', 'Playback is a muted synthetic local WAV in the disposable browser; assertions concern media state/calls, not real media or listening quality.'] };
await fs.mkdir(output, { recursive: true });
result.limitations.push('Share exercises the existing unsupported-Web-Share fallback; native OS sharing sheet is NOT tested.');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const json = body => ({ status: 200, contentType: 'application/json', headers: { 'Cache-Control': 'no-store', 'X-Synaura-QA-Fixture': 'local-nonpersistent' }, body: JSON.stringify(body) });
const fixtureTrack = index => ({ _id: `track_qa_v2_${index}`, id: `track_qa_v2_${index}`, title: `Fixture QA · ${['Une lumière dans le silence', 'Les heures bleues', 'Un autre mouvement'][index - 1]}`, artist: { _id: 'qa-v2-artist', name: 'Artiste · Fixture QA', username: 'qa-v2-artist' }, audioUrl: `${base}/__qa__/audio.wav`, coverUrl: null, duration: 60, genre: ['Fixture QA'], plays: 0, likes: [], comments: [], isPublic: true, createdAt: '2026-09-01T12:00:00Z', lyrics: 'Fixture QA — paroles de test non persistantes.\nUne ligne pour éprouver le rythme.\nUne seconde pour vérifier la lecture.', allowClips: false, allowAiVariation: false, remixVisibility: 'disabled' });
const seedIds = ['track_1773789112971_0egfpy0i2', 'track_1758481606741_trwopq702', 'track_1782517870229_4_vjgv7x3'];
const tracks = await Promise.all(seedIds.map(async (id, index) => {
  if (!publicReads) return fixtureTrack(index + 1);
  try {
    // The reviewed GET route only reads public track data. Redirects are forbidden.
    const response = await fetch(`${publicSource.origin}/api/tracks/${encodeURIComponent(id)}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12000) });
    assert(response.ok); const item = await response.json(); assert(item._id && item.audioUrl && item.isPublic !== false);
    result.reads.push({ path: `/api/tracks/${id}`, origin: publicSource.origin, status: response.status, source: 'read-only public track metadata/artwork; audio replaced with explicit local fixture' });
    return { ...item, audioUrl: `${base}/__qa__/audio.wav`, duration: 60 };
  } catch (error) { result.blocked.push({ phase: 'public-seed', id, reason: String(error.message), fallback: 'explicit synthetic fixture' }); return fixtureTrack(index + 1); }
}));
const artist = { ...user, id: 'qa-v2-artist', _id: 'qa-v2-artist', username: 'qa-v2-artist', name: 'Artiste · Fixture QA', artistName: 'Artiste · Fixture QA', bio: 'Profil de revue locale. Ces informations ne représentent pas un compte réel.', tracks, tracksCount: tracks.length, followerCount: 0, totalPlays: 0, isFollowing: false, isArtist: true };
const playlist = { _id: 'qa-v2-playlist', id: 'qa-v2-playlist', name: 'Fixture QA · Carnet de nuit', description: 'Collection de revue locale, non persistante.', tracks, trackCount: tracks.length, isPublic: false, coverUrl: tracks[0].coverUrl, creator: user, userId: user.id, createdAt: '2026-09-01T12:00:00Z' };
const playlists = [playlist];
const preferences = { onboarding: { onboardingCompleted: true, completed: true, completedAt: '2026-09-01T12:00:00Z', creatorIntentions: ['create_ai'] } };
const notifications = [{ id: 'qa-v2-notification', title: 'Fixture QA · Une nouvelle écoute à découvrir', message: 'Notification de revue non persistante.', type: 'new_track', category: 'music', read: false, is_read: false, action_url: `/track/${tracks[0]._id}`, created_at: '2026-09-01T12:00:00Z' }];
const favorites = new Set();
const commentList = tracks.map(track => ({ trackId: track._id, comments: [{ id: `qa-v2-comment-${track._id}`, _id: `qa-v2-comment-${track._id}`, content: 'Fixture QA · À cet instant, le morceau change de lumière.', timestamp_seconds: 12, timestampSeconds: 12, created_at: '2026-09-01T12:00:00Z', createdAt: '2026-09-01T12:00:00Z', user: artist, author: artist, user_id: artist.id, userId: artist.id, likes: 0, likesCount: 0, isLiked: false, replies: [] }] }));
const aiTracks = tracks.map((track, i) => ({ id: `qa-v2-ai-${i}`, generation_id: 'qa-v2-generation', title: `Fixture QA · Version ${i + 1}`, audio_url: track.audioUrl, stream_audio_url: track.audioUrl, image_url: track.coverUrl, duration: track.duration, created_at: '2026-09-01T12:00:00Z', is_public: false, is_favorite: false, lyrics: track.lyrics, tags: ['Fixture QA'], source_links: '{}' }));
const generations = [{ id: 'qa-v2-generation', user_id: user.id, prompt: 'Fixture QA · Une intention musicale de revue, jamais générée sur le serveur.', model: 'V5', status: 'completed', created_at: '2026-09-01T12:00:00Z', is_public: false, tracks: aiTracks, metadata: {} }];
let sessionFixtureEnabled = true;

function fixtureGet(url) {
  const p = url.pathname;
  if (p === '/api/auth/session') return sessionFixtureEnabled ? { user, expires: new Date(Date.now() + 3600000).toISOString() } : {};
  if (p === '/api/user/preferences') return { preferences };
  if (p === '/api/ranking/feed') return { tracks, hasMore: false, nextCursor: tracks.length, engineVersion: 'discovery-v5', sessionId: 'fixture-qa-local' };
  if (p === '/api/tracks') return { tracks, total: tracks.length, hasMore: false };
  // Response contracts: featured/route.ts, recommendation/serverFeed.ts,
  // genres/route.ts and messages/unread/route.ts. Not generic API fallbacks.
  if (p === '/api/tracks/featured') return { tracks };
  if (['/api/tracks/trending', '/api/tracks/popular', '/api/tracks/recent', '/api/tracks/recommended', '/api/tracks/following'].includes(p)) return { tracks, nextCursor: tracks.length, hasMore: false, engineVersion: 'discovery-v2', sessionId: 'fixture-qa-local' };
  if (p === '/api/genres') return { genres: [{ name: 'Fixture QA', emoji: '♪', color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', count: tracks.length, plays: 0, likes: 0, description: 'Genre de revue locale non persistant.' }], totalGenres: 1, totalTracks: tracks.length, timestamp: '2026-09-01T12:00:00Z' };
  if (p === '/api/playlists') return { playlists };
  if (p === '/api/playlists/qa-v2-playlist') return playlist;
  if (p === '/api/notifications') return { notifications, total: notifications.length, unread: notifications.filter(n => !n.read).length, page: 1, limit: 30, source: 'fixture-qa', syncedAt: '2026-09-01T12:00:00Z' };
  if (p === '/api/notifications/preferences') return { preferences: {}, email: {}, push: {} };
  if (p === '/api/notifications/boost') return { notifications: [] };
  if (p === '/api/messages/conversations') return { conversations: [], total: 0, unread: 0 };
  if (p === '/api/messages/unread') return { messages: 0, requests: 0, total: 0 };
  if (p === '/api/messages/requests') return { received: [], sent: [], requests: [], counts: { received: 0, sent: 0 } };
  if (p === '/api/messages/blocks') return { blocks: [] };
  if (p === '/api/messages/contacts') return { contacts: [] };
  if (p === '/api/subscriptions/my-subscription') return { hasSubscription: false, subscription: { id: '', name: 'Free', price: 0, currency: 'EUR', interval: 'month' }, userSubscription: { status: 'none', currentPeriodEnd: null } };
  if (p === '/api/subscriptions/usage') return { plan: 'free', tracks: { used: 0, limit: 10, percentage: 0 }, playlists: { used: 1, limit: 5, percentage: 20 } };
  if (p === '/api/ai/quota') return { id: 'qa-v2-quota', user_id: user.id, plan_type: 'free', monthly_limit: 0, used_this_month: 0, remaining: 0, reset_date: '2026-10-01T00:00:00Z', aiGenerationEnabled: true, monthlyCredits: 0, creditBalance: 0, availableModels: ['V4_5'] };
  if (p === '/api/ai/credits' || p === '/api/suno/credits') return { balance: 0, credits: 0, source: 'fixture-qa' };
  if (p === '/api/ai/library') return { generations, pagination: { limit: 50, offset: 0, total: generations.length } };
  if (p === '/api/ai/library/tracks') return { tracks: aiTracks.map(track => ({ ...track, is_liked: false, generation: { ...generations[0], tracks: undefined, is_favorite: false, is_trashed: false } })), pagination: { limit: Number(url.searchParams.get('limit') || 100), offset: 0, total: aiTracks.length } };
  if (p === '/api/ai/tags/suggestions') return { tags: [], suggestions: [] };
  if (p === '/api/music-clips') return { clips: [], hasMore: false };
  if (p === '/api/music-clips/sources') return { sources: [] };
  if (p === '/api/recommendations/mixed') return { items: [], posts: [], hasMore: false };
  if (p === '/api/recommendations/taste') return { taste: {}, genres: [], moods: [] };
  if (p === '/api/users/popular') return { users: [artist], artists: [artist] };
  if (p === '/api/editorial-collections/featured') return { collections: [] };
  if (p === '/api/challenges') return { challenges: [] };
  if (p === '/api/city') return { events: [], challenges: [], blocks: [] };
  if (p === '/api/community/posts') return { posts: [], total: 0, hasMore: false };
  if (p === '/api/posts') return { posts: [], nextCursor: null, hasMore: false };
  if (p === '/api/tracks/similar') return { tracks: [], sourceTitle: tracks.find(track => track._id === url.searchParams.get('trackId'))?.title || '', contextLabel: '' };
  if (p === '/api/remixes/sources') return { sources: [] };
  if (p === '/api/search') return { tracks, users: [artist], profiles: [artist], artists: [artist], playlists, posts: [], total: tracks.length + 2 };
  if (/^\/api\/users\/[^/]+\/follow$/.test(p)) return { isFollowing: false, followerCount: 0 };
  if (/^\/api\/users\/[^/]+$/.test(p)) return { ...artist, username: decodeURIComponent(p.split('/').at(-1)) };
  if (/^\/api\/tracks\/[^/]+\/like$/.test(p)) return { liked: favorites.has(p), likesCount: favorites.has(p) ? 1 : 0 };
  if (/^\/api\/tracks\/[^/]+\/waveform$/.test(p)) return { duration: tracks.find(t => p.includes(t._id))?.duration || 60, peaks: Array.from({ length: 240 }, (_, i) => .18 + .6 * Math.abs(Math.sin(i * .23) * Math.cos(i * .071))), cached: true, canWrite: false, source: 'fixture-qa-not-measured' };
  if (/^\/api\/tracks\/[^/]+\/comments$/.test(p)) { const comments = commentList.find(c => p.includes(c.trackId))?.comments || []; return { comments, total: comments.length, commentsCount: comments.length, hasMore: false, nextCursor: null }; }
  if (/^\/api\/tracks\/[^/]+\/reactions$/.test(p)) return { reactions: [], moments: [], counts: {}, buckets: [] };
  if (/^\/api\/tracks\/[^/]+\/comments\/moderation$/.test(p)) { const comments = commentList.find(c => p.includes(c.trackId))?.comments || []; const limit = Number(url.searchParams.get('limit') || 30); return { comments, total: comments.length, limit, offset: 0, hasMore: false, nextOffset: limit, permissions: { canModerate: false, canDelete: false, canFlag: false } }; }
  const track = tracks.find(t => p === `/api/tracks/${t._id}`);
  if (track) return track;
  return undefined;
}

function wav() {
  const sampleRate = 8000, samples = sampleRate * 60, buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(250 * Math.sin(2 * Math.PI * 165 * i / sampleRate)), 44 + i * 2);
  return buffer;
}
const audioFixture = wav();
const lowMemory = process.env.SYNAURA_V2_LOW_MEMORY === '1';
if (lowMemory) result.limitations.push('Low-memory runner: one renderer, GPU disabled, explicit garbage collection between routes. These screenshots do not validate GPU intro rendering or production performance.');
const browser = await puppeteer.launch({ headless: true, pipe: true, args: ['--mute-audio', ...(lowMemory ? ['--disable-gpu', '--renderer-process-limit=1'] : [])] });
let phase = 'setup';
let page;
async function setupQaPage(context) {
const page = await context.newPage();
await page.setBypassServiceWorker(true);
page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(45000);
page.on('pageerror', error => result.errors.push({ phase, message: error.message }));
page.on('console', message => { if (message.type() === 'error') result.console.push({ phase, message: message.text().replace(/https?:\/\/\S+/g, '[URL]').slice(0, 300) }); });
await page.setRequestInterception(true);
page.on('request', async request => {
  try {
    const url = new URL(request.url()), p = url.pathname, method = request.method();
    if (!['http:', 'https:'].includes(url.protocol)) return await request.continue();
    if (!['GET', 'HEAD'].includes(method)) {
      result.mutations.push({ phase, path: p, method, disposition: 'intercepted-never-sent' });
      if (url.origin !== base) return await request.abort('blockedbyclient');
      if (p === '/api/notifications') { notifications.forEach(n => { n.read = true; n.is_read = true; }); return await request.respond(json({ ok: true, fixture: true })); }
      if (p === '/api/user/preferences') return await request.respond(json({ preferences, fixture: true }));
      if (/\/like$/.test(p)) { method === 'DELETE' ? favorites.delete(p) : favorites.add(p); return await request.respond(json({ liked: favorites.has(p), isLiked: favorites.has(p), likesCount: favorites.has(p) ? 1 : 0, fixture: true })); }
      if (/\/(events|plays|impressions|read|waveform)$/.test(p)) return await request.respond(json({ accepted: true, fixture: true }));
      // No generic fake success for generation/publication/payment/message writes.
      return await request.respond({ ...json({ error: 'Fixture QA : mutation désactivée, aucune donnée envoyée.' }), status: 409 });
    }
    if (url.origin === base) {
      if (p === '/__qa__/audio.wav') return await request.respond({ status: 200, contentType: 'audio/wav', headers: { 'Accept-Ranges': 'bytes' }, body: audioFixture });
      if (p.startsWith('/api/')) {
        result.requests.push({ phase, method, path: p });
        const body = fixtureGet(url);
        if (body !== undefined) return await request.respond(json(body));
        result.unmapped.push({ phase, path: p });
        return await request.respond({ ...json({ error: 'Fixture QA absente pour cette lecture ; requête bloquée.' }), status: 503 });
      }
      return await request.continue(); // Local document/static assets only; SSR auth is untouched.
    }
    // This exact public cover was reviewed in the QA report; Chromium classifies
    // its image preload as `other`. Do not open a generic `other` escape hatch.
    if (publicReads && url.hostname === 'media.synaura.fr' && p === '/cloudinary/image/ximam/images/cover_1773789109011_riioc4hp9.png' && request.resourceType() === 'other' && !url.username && !url.password) return await request.continue();
    // Optional public artwork/audio only. Never allow a remote API, fetch, document or worker.
    if (publicReads && ['image', 'media', 'font'].includes(request.resourceType()) && !url.username && !url.password && ['res.cloudinary.com', 'cdn.synaura.fr', 'media.synaura.fr'].includes(url.hostname)) return await request.continue();
    result.blocked.push({ phase, reason: 'Remote network request blocked', host: url.hostname, path: p, type: request.resourceType() });
    return await request.abort('blockedbyclient');
  } catch (error) { result.errors.push({ phase, message: `Interception: ${error.message}` }); if (!request.isInterceptResolutionHandled()) await request.abort('blockedbyclient'); }
});
await page.evaluateOnNewDocument(() => {
  const audit = window.__v2Capture = { documentId: `${performance.timeOrigin}`, calls: [], elements: [], seen: [], observing: false, blockedTransports: [] };
  // Exercise the existing in-app fallback, not an invisible OS sharing sheet.
  // Native Web Share remains explicitly outside this browser-fixture gate.
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  // No socket or worker is used by the reviewed journeys. Stop alternate network
  // channels explicitly, so no write can escape ordinary HTTP interception.
  // Next dev owns a local HMR socket. An inert closed substitute keeps its
  // hook mount valid without allowing any socket connection or outbound send.
  class ClosedQaSocket extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    CONNECTING = 0; OPEN = 1; CLOSING = 2; CLOSED = 3; readyState = 3; bufferedAmount = 0; protocol = ''; extensions = ''; binaryType = 'blob';
    onopen = null; onmessage = null; onclose = null; onerror = null;
    constructor(raw) {
      super(); const url = new URL(String(raw), location.href); this.url = url.href;
      if (url.host !== location.host || !['ws:', 'wss:'].includes(url.protocol) || url.pathname !== '/_next/webpack-hmr') throw new Error('Fixture QA: application WebSocket is disabled.');
      audit.blockedTransports.push('local Next HMR socket suppressed');
    }
    send() {} close() {}
  }
  Object.defineProperty(window, 'WebSocket', { configurable: true, value: ClosedQaSocket });
  for (const name of ['WebTransport', 'Worker', 'SharedWorker']) {
    if (name in window) Object.defineProperty(window, name, { configurable: true, value: class { constructor() { audit.blockedTransports.push(name); throw new Error(`Fixture QA: ${name} is disabled in this isolated runner.`); } } });
  }
  const identify = element => { let id = audit.elements.indexOf(element); if (id < 0) id = audit.elements.push(element) - 1; return id; };
  for (const method of ['play', 'pause', 'load']) { const original = HTMLMediaElement.prototype[method]; HTMLMediaElement.prototype[method] = function (...args) { if (this.tagName === 'AUDIO') audit.calls.push({ id: identify(this), method }); return original.apply(this, args); }; }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { ...descriptor, set(value) { if (this.tagName === 'AUDIO') audit.calls.push({ id: identify(this), method: 'seek' }); descriptor.set.call(this, value); } });
  addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('div'); badge.id = 'v2-qa-fixture-badge'; badge.textContent = 'FIXTURE QA · LOCAL · NON PERSISTANTE';
    badge.setAttribute('role', 'note'); badge.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:2147483000;pointer-events:none;background:#171f2b;color:#e7edf6;border:1px solid #58677c;border-radius:4px;padding:4px 8px;font:9px/1.2 system-ui;white-space:nowrap'; document.body.append(badge);
    new MutationObserver(() => { if (audit.observing) { const active = document.querySelector('[data-active="true"][data-feed-item-id]'); if (active) audit.seen.push(active.dataset.feedItemId); } }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-active'] });
  });
});
return page;
}
const visible = async selector => page.waitForFunction(selector => [...document.querySelectorAll(selector)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]'); }), {}, selector);
const click = async selector => { await visible(selector); const handle = await page.evaluateHandle(selector => [...document.querySelectorAll(selector)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert],[aria-hidden="true"]'); }), selector); await handle.asElement().click(); await handle.dispose(); };
const clickText = async label => { const handle = await page.waitForFunction(label => [...document.querySelectorAll('button')].find(e => { const r = e.getBoundingClientRect(); return e.textContent.trim() === label && r.width > 0 && r.height > 0 && !e.closest('[inert],[aria-hidden="true"]'); }), {}, label); await handle.asElement().click(); await handle.dispose(); };
const active = '[data-active="true"][data-feed-item-id]';
const snapshot = () => page.evaluate(() => ({ documentId: window.__v2Capture.documentId, calls: [...window.__v2Capture.calls], audio: window.__v2Capture.elements.map((e, id) => ({ id, src: e.currentSrc || e.src, paused: e.paused, time: e.currentTime })), item: document.querySelector('[data-active="true"][data-feed-item-id]')?.dataset.feedItemId, filters: [...document.querySelectorAll('[data-testid="synaura-scroll-feed"] button[aria-pressed="true"]')].map(e => e.textContent.trim()), queue: window.__synauraAudioCore?.().queueIds || null, seen: [...window.__v2Capture.seen] }));
const check = (name, ok, detail) => { result.checks.push({ phase, name, ok: Boolean(ok), detail }); assert(ok, name); };
const noAudioMutation = (name, before, after) => {
  const primary = before.audio.find(a => a.src && !a.paused) || before.audio.find(a => a.src);
  if (!primary) { result.blocked.push({ phase, reason: `${name}: no loaded primary audio; invariant not proven` }); return; }
  const end = after.audio.find(a => a.id === primary.id);
  check(name, before.documentId === after.documentId && end?.src === primary.src && end.paused === primary.paused && after.calls.slice(before.calls.length).filter(c => c.id === primary.id).length === 0, { before: primary.id, end: end?.id });
  if (before.queue && after.queue) check(`${name}: same queue`, JSON.stringify(before.queue) === JSON.stringify(after.queue));
  check(`${name}: no additional loaded musical element`, after.audio.filter(a => a.src).every(a => before.audio.some(b => b.id === a.id && b.src === a.src)));
  check(`${name}: no second active musical element`, after.audio.filter(a => a.src && !a.paused).length <= 1);
};
const capture = async (surface, width, height, status = 'CAPTURED') => {
  await page.evaluate(() => document.fonts.ready); await wait(220);
  const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, dialogs: [...document.querySelectorAll('[role="dialog"]')].map(e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; }), fixtureBadge: !!document.querySelector('#v2-qa-fixture-badge') }));
  const file = `${surface.replace(/[^a-z0-9-]/gi, '-')}-${width}.png`; await page.screenshot({ path: path.join(output, file) });
  result.captures.push({ surface, width, height, file, status, route: new URL(page.url()).pathname, ...geometry });
  check(`${surface} fits ${width}`, geometry.documentWidth <= width + 1 && geometry.bodyWidth <= width + 1 && geometry.dialogs.every(d => d.left >= -1 && d.right <= width + 1), geometry);
  check(`${surface} identifies fixture`, geometry.fixtureBadge);
};
const navigate = async route => {
  const requestedPath = new URL(route, base).pathname;
  sessionFixtureEnabled = requestedPath !== '/' && !requestedPath.startsWith('/auth/');
  const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  await wait(700);
  const pathname = new URL(page.url()).pathname;
  if ((pathname.startsWith('/auth/') && !route.startsWith('/auth/')) || response?.status() === 401 || response?.status() === 403) throw new Error(`BLOCKED_SSR_AUTH: ${route} → ${pathname}`);
  if (response?.status() >= 400) throw new Error(`HTTP ${response.status()} for ${route}`);
  await page.waitForFunction(() => !document.body.innerText.includes('Synaura te reconnaît…'), { timeout: 12000 });
  const finalPath = new URL(page.url()).pathname;
  if (finalPath !== requestedPath) throw new Error(`BLOCKED_REDIRECT: ${requestedPath} → ${finalPath}; requested screen not captured`);
};
const closeContexts = async () => { for (let i = 0; i < 3 && await page.$('[data-profile-peek-state],[data-comments-state],[data-organization-surface]'); i++) { await page.keyboard.press('Escape'); await wait(250); } };
const routes = [ ['entry', '/'], ['auth', '/auth/signin'], ['live', '/live'], ['discover', '/discover'], ['track', `/track/${tracks[0]._id}`], ['profile', '/profile/qa-v2-artist'], ['search', '/search?q=fixture'], ['library', '/library'], ['playlist', '/playlists/qa-v2-playlist'], ['create', '/create'], ['ai', '/ai-generator'], ['ai-library', '/ai-library'], ['studio', '/studio'], ['upload', '/upload'], ['clip-create', '/clips/new'], ['publish', '/publish'], ['community', '/community'], ['messages', '/messages'], ['notifications', '/notifications'], ['settings', '/settings'] ];
routes.push(['component-live', '/dev/v2?surface=live'], ['component-discover', '/dev/v2?surface=discover'], ['component-track', '/dev/v2?surface=track']);
for (const name of ['ai', 'studio', 'upload', 'library', 'messages', 'settings']) routes.push([`component-${name}`, `/dev/v2?surface=${name}`]);
async function entryChapters(width, height) {
  phase = `entry-prompt-${width}`;
  // Later viewport runs reuse only this disposable QA browser. Reopen the
  // actual replay affordance instead of writing the app's localStorage flag.
  const intro = '[role="dialog"][aria-labelledby="sonic-intro-title"]';
  if (!await page.$(intro)) await click('button[aria-label="Rejouer la signature Synaura"]');
  await visible(`${intro}[data-phase="prompt"]`); await capture('entry-prompt', width, height);
  await clickText('Passer'); await page.waitForFunction(selector => !document.querySelector(selector), {}, intro);
  if (await page.$('.v2-entry[data-full-experience="false"]')) await clickText('Revivre la découverte');
  await visible('.v2-entry[data-full-experience="true"] [data-chapter="0"]');
  const before = await snapshot();
  for (const [index, name] of ['seuil', 'musique', 'decouverte', 'creation', 'social', 'entrer'].entries()) {
    phase = `entry-${index + 1}-${name}-${width}`;
    if (index === 1) {
      const step = await page.evaluate(() => { const root = document.querySelector('.v2-entry'); const stage = root.querySelector('[data-chapter]'); return (root.offsetHeight - stage.offsetHeight) / 6; });
      await page.mouse.move(width / 2, height / 2); await page.mouse.wheel({ deltaY: Math.ceil(step * 1.1) });
    } else if (index > 1) await click(`nav[aria-label="Chapitres de l’entrée"] button[aria-label^="${index + 1}."]`);
    await visible(`.v2-entry [data-chapter="${index}"]`); await wait(700);
    check(`Entry chapter ${index + 1} active`, await page.$eval('.v2-entry [data-chapter]', (e, index) => e.dataset.chapter === String(index), index));
    await capture(`entry-${index + 1}-${name}`, width, height);
  }
  const after = await snapshot();
  check('Entry native chapter navigation does not play or seek', after.calls.slice(before.calls.length).every(c => !['play', 'seek'].includes(c.method)));
}
async function golden(width, height, componentOnly = false) {
  const prefix = componentOnly ? 'component-' : '';
  await navigate(componentOnly ? '/dev/v2?surface=live' : '/live'); await visible(active);
  const openFlow = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(e => { const r = e.getBoundingClientRect(); return /^(Ouvrir le Flow|Voir en plein écran)$/.test(e.textContent.trim()) && r.width > 0 && r.height > 0 && !e.closest('[inert],[aria-hidden="true"]'); }));
  if (openFlow.asElement()) { await openFlow.asElement().click(); await wait(300); } await openFlow.dispose();
  if (componentOnly) await capture('component-live-flow', width, height, 'COMPONENT COMPOSITION ONLY');
  const play = `${active} .live-track-artwork button[aria-label^="Écouter"]`;
  if (await page.$(play)) await click(play);
  await page.waitForFunction(() => window.__v2Capture.elements.some(e => !e.paused && (e.currentSrc || e.src)), { timeout: 12000 });
  if (!(await snapshot()).queue) result.blocked.push({ phase: `golden-${width}`, reason: 'AudioCore queue diagnostic is not exposed. Media calls/identity are tested, internal queue identity is not claimed.' });
  for (const [name, trigger, ready] of [ ['profile-peek', `${active} [data-context-surface-trigger-key^="live-track-profile-"]`, '[data-profile-peek-state="loaded"]'], ['comments', `${active} button[aria-label^="Commentaires de "]`, '[data-comments-state="loaded"]'], ['options', `${active} button[aria-label^="Options de "]`, '[data-organization-state="loaded"]'] ]) {
    phase = `${prefix}golden-${name}-${width}`; const before = await snapshot(); await click(trigger); await visible(ready); noAudioMutation(`${name} open`, before, await snapshot()); await capture(`${prefix}${name}`, width, height);
    if (name === 'comments') {
      if (width < 600) {
        const scroll = await page.$eval('#comments-panel', panel => { const r = panel.getBoundingClientRect(); const p = panel.querySelector('[data-comment-id] p.whitespace-pre-wrap')?.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, delta: p ? p.bottom - r.bottom + 2 : 0 }; });
        await page.mouse.move(scroll.x, scroll.y); await page.mouse.wheel({ deltaY: Math.max(1, Math.ceil(scroll.delta)) }); await wait(300);
        const reading = await page.$eval('#comments-panel', panel => { const r = panel.getBoundingClientRect(); const p = panel.querySelector('[data-comment-id] p.whitespace-pre-wrap')?.getBoundingClientRect(); return { panelHeight: r.height, scrollTop: panel.scrollTop, wholeParagraphVisible: p ? p.top >= r.top - 1 && p.bottom <= r.bottom + 1 : false, lastLineVisible: p ? p.bottom >= r.top + 20 && p.bottom <= r.bottom + 1 : false }; });
        check('Mobile conversation last line can scroll above composer', reading.lastLineVisible, reading);
        await capture(`${prefix}comments-scrolled`, width, height);
      }
      await click('#comments-tab-moments'); await visible('[data-musical-waveform]'); await capture(`${prefix}moments`, width, height); noAudioMutation('Moments tab', before, await snapshot());
    }
    if (name === 'options') {
      for (const [label, id] of [['playlist-picker', 'playlist-picker'], ['queue', 'queue'], ['lyrics', 'lyrics'], ['details', 'track-details'], ['share', 'track-share']]) {
        if (!await page.$('[data-organization-surface="track-options"]')) { await closeContexts(); await click(trigger); await visible('[data-organization-state="loaded"]'); }
        await click(`[data-track-action="${id === 'track-share' ? 'share' : id}"]`); await visible(`[data-organization-surface="${id}"][data-organization-state="loaded"]`); await capture(`${prefix}${label}`, width, height); noAudioMutation(`${label} open`, before, await snapshot());
      }
    }
    await closeContexts(); const after = await snapshot(); noAudioMutation(`${name} close`, before, after); check(`${name} returns same Live item`, before.item === after.item);
  }
  if (componentOnly) {
    result.limitations.push(`Component contexts ${width}: only /dev/v2 composition/media-call checks; canonical SSR, pathname-specific continuity and route handoffs are NOT validated.`);
    return;
  }
  // Route handoffs use actual rendered links; no router/store/history fabrication.
  for (const [label, href] of [['create', '/create'], ['ai', '/ai-generator'], ['studio', '/studio']]) {
    phase = `handoff-${label}-${width}`; const before = await snapshot();
    await page.evaluate(() => { window.__v2Capture.seen = []; window.__v2Capture.observing = true; });
    try {
      const createLink = 'a[href="/create"],a[href^="/create?"]';
      const hasCreateLink = await page.evaluate(selector => [...document.querySelectorAll(selector)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[inert],[aria-hidden="true"]'); }), createLink);
      if (hasCreateLink) await click(createLink);
      else {
        await click('button[aria-label="Ouvrir le menu Créer"]');
        const hubButton = await page.waitForFunction(() => [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Tous les outils de création' && e.getBoundingClientRect().width > 0));
        await hubButton.asElement().click(); await hubButton.dispose();
      }
      await page.waitForFunction(() => location.pathname === '/create');
      if (href !== '/create') await click(`a[href="${href}"],a[href^="${href}?"]`);
      await page.waitForFunction(href => location.pathname === href, {}, href); await visible('[data-handoff-return]'); await click('[data-handoff-return]'); await visible(active);
      const after = await snapshot(); noAudioMutation(`${label} round trip`, before, after); check(`${label} same item and no transient zero`, before.item === after.item && after.seen.every(id => id === before.item));
      check(`${label} same Live filter`, JSON.stringify(before.filters) === JSON.stringify(after.filters));
    }
    catch (error) { result.blocked.push({ phase, reason: error.message }); await navigate('/live'); await visible(active); }
    await page.evaluate(() => { window.__v2Capture.observing = false; });
  }
}
try {
  for (const [width, height] of sizes) {
    const qaContext = await browser.createBrowserContext();
    page = await setupQaPage(qaContext);
    await page.setViewport({ width, height, isMobile: width < 600, hasTouch: width < 600, deviceScaleFactor: 1 });
    for (const [name, route] of routes) {
      if (selected.size && !selected.has(name)) continue;
      phase = `${name}-${width}`;
      try {
        await navigate(route); await visible('h1,[data-testid="synaura-scroll-feed"]');
        if (name === 'entry') await entryChapters(width, height);
        else await capture(name, width, height, name.startsWith('component-') ? 'COMPONENT COMPOSITION ONLY' : 'CAPTURED');
        if (name === 'component-ai' && width < 1024) {
          await clickText('Créer');
          await page.waitForFunction(() => { const e = document.querySelector('.v2-ai-composer'); return e && e.getBoundingClientRect().top < innerHeight - 80 && getComputedStyle(e).pointerEvents !== 'none'; });
          await capture('component-ai-composer', width, height, 'COMPONENT COMPOSITION ONLY');
          await click('button[aria-label="Fermer le composer"]');
        }
        if (name === 'component-studio' && width < 1024) {
          await clickText('Construire'); await visible('.v2-studio-workbench');
          await capture('component-studio-construct', width, height, 'COMPONENT COMPOSITION ONLY');
          await clickText('Créations');
        }
      }
      catch (error) { if (!browser.connected) throw error; result.blocked.push({ phase, route, reason: error.message }); await capture(`blocked-${name}`, width, height, 'BLOCKED').catch(() => {}); }
      if (lowMemory && browser.connected) { const cdp = await page.createCDPSession(); await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); await cdp.detach(); }
    }
    if (!selected.size || selected.has('golden')) {
      try { await golden(width, height); } catch (error) { if (!browser.connected) throw error; result.blocked.push({ phase, reason: error.message }); await capture('blocked-golden', width, height, 'BLOCKED').catch(() => {}); }
    }
    if (selected.has('component-golden')) {
      try { await golden(width, height, true); } catch (error) { if (!browser.connected) throw error; result.blocked.push({ phase, reason: error.message, scope: 'component-only-not-canonical-routes' }); await capture('blocked-component-golden', width, height, 'BLOCKED').catch(() => {}); }
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
    await qaContext.close();
  }
  result.status = result.errors.length || result.checks.some(c => !c.ok) ? 'FAIL' : result.blocked.length || result.unmapped.length ? 'PARTIAL — BLOCKED/UNMAPPED' : result.console.length ? 'PARTIAL — CONSOLE ERRORS REQUIRE REVIEW' : 'PASS — FIXTURE QA ONLY';
} catch (error) {
  result.status = 'FAIL — RUNNER TERMINATED';
  result.errors.push({ phase, message: error.message });
} finally {
  result.completedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const figures = result.captures.map(c => `<figure data-width="${c.width}"><figcaption>${escape(c.surface)} · ${c.width}×${c.height} · ${escape(c.status)}</figcaption><a href="${escape(c.file)}"><img loading="lazy" src="${escape(c.file)}" alt="${escape(c.surface)} — Fixture QA locale"></a></figure>`).join('');
  await fs.writeFile(path.join(output, 'review.html'), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synaura V2 · Revue locale</title><style>body{margin:0;padding:28px;background:#06080e;color:#eff1f8;font:14px/1.6 system-ui}h1{font-weight:400}p{max-width:90ch;color:#b0b8ca}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}figure{margin:0;border:1px solid #30384a;padding:12px}img{display:block;width:100%;height:auto}figcaption{margin-bottom:12px}a{color:#b9a3eb}</style><h1>Synaura V2 · ${escape(result.status)}</h1><p>FIXTURE QA — session et données privées simulées dans un navigateur jetable, sans persistance. Les captures BLOCKED ne valident pas leur écran. Aucun contournement de l’authentification serveur. Android/Gboard et NVDA réels non testés.</p><p>${result.captures.length} captures · ${result.blocked.length} réserves · ${result.unmapped.length} lectures non mappées · ${result.mutations.length} écritures interceptées. <a href="results.json">Rapport complet</a></p><main>${figures}</main></html>`);
  await browser.close().catch(() => {});
  console.log(JSON.stringify({ status: result.status, gallery: path.join(output, 'review.html'), captures: result.captures.length, blocked: result.blocked.length, unmapped: result.unmapped.length }));
  if (!result.status.startsWith('PASS')) process.exitCode = 1;
}
