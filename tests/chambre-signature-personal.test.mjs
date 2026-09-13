import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';
import { behaviorFingerprint } from './chambre-personal-redesign.test.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const paths = ['app/community/page.tsx', 'app/library/LibraryClient.tsx', 'app/notifications/page.tsx'];
const [community, library, activity] = paths.map(read);
const css = read('components/v2/personal-v2.css');
const marker = '/* Chambre signature: three distinct personal/social compositions, no state ownership. */';
const signature = css.slice(css.indexOf(marker));
const parsedCss = postcss.parse(signature);
const backupRoot = new URL('artifacts/chambre-signature/before/personal/', root);

function rule(selector, media = null) {
  const matches = [];
  parsedCss.walkRules(selector, (candidate) => {
    if (media === null && candidate.parent.type === 'root') matches.push(candidate);
    else if (candidate.parent.type === 'atrule' && candidate.parent.params === media) matches.push(candidate);
  });
  assert.ok(matches.length, `${selector} / ${media ?? 'base'}`);
  return Object.fromEntries(matches.flatMap((candidate) => candidate.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value])));
}

test('signature personal JSX parses and each CSS selector stays in the local Chambre boundary', () => {
  for (const path of paths) {
    const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(source.parseDiagnostics, [], path);
  }
  assert.ok(signature.startsWith(marker));
  parsedCss.walkRules((candidate) => assert.ok(candidate.selectors.every((selector) => selector.startsWith('.synaura-chambre')), candidate.selector));
  assert.doesNotMatch(signature, /\.chamber-product|\.chamber-material|\.chamber-listening|\.chambre-pack|\.chambre-reward|\.chambre-spin/);
});

test('strict unmodified AST helper proves identical imports, state, guards, requests and event expressions', (context) => {
  if (!existsSync(backupRoot)) return context.skip('Local before snapshots absent; behavioral preservation is not inferred.');
  for (const path of paths) {
    assert.equal(behaviorFingerprint(read(path), path), behaviorFingerprint(readFileSync(new URL(path, backupRoot), 'utf8'), path), path);
  }
  const beforeCss = readFileSync(new URL('components/v2/personal-v2.css', backupRoot), 'utf8');
  assert.equal(css.slice(0, css.indexOf(marker)).trimEnd(), beforeCss.trimEnd(), 'All previous personal/rewards styles remain unchanged.');
});

test('Community destinations still use canonical clubs and genuine aggregate/latest-author data', () => {
  for (const fragment of [
    "import { COMMUNITY_CLUBS, type ClubConfig } from '@/lib/communityClubs'",
    "fetch('/api/community/clubs', { cache: 'no-store' })",
    "fetch('/api/user/preferences', { cache: 'no-store' })",
    "if (status !== 'authenticated') return",
    'return [...COMMUNITY_CLUBS].sort((a, b) =>',
    'orderedClubs.map((club, index)',
    'aggregate={aggregates[club.slug]}',
    'latestPost.author?.avatar', 'latestPost.author?.username',
    "{latestPost.title || 'Discussion'}", "{latestPost.author?.name || 'Créateur Synaura'}",
    "{postsCount} post{postsCount > 1 ? 's' : ''}",
    'La première discussion reste à écrire.',
  ]) assert.ok(community.includes(fragment), fragment);
  assert.match(community, /<article className="[^"]*signature-club"[^>]*data-club=\{club.slug\}/);
  for (const href of ['/community/forum', '/city', '/community/faq', '/posts', '/partnerships']) assert.ok(community.includes(`href="${href}"`), href);
  assert.match(community, /href=\{latestPost.id \? `\/community\/forum\/\$\{latestPost.id\}` : `\/community\/\$\{club.slug\}`\}/);
});

test('Community layout has distinct indexed destinations with visible mobile entry links', () => {
  assert.equal(rule('.synaura-chambre .signature-club-grid')['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(rule('.synaura-chambre .signature-club > .signature-club-content', '(max-width: 767px)')['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(rule('.synaura-chambre .signature-club-enter')['min-height'], '44px');
  assert.equal(rule('.synaura-chambre .signature-club-enter', '(max-width: 767px)').width, '100%');
  for (const slug of ['collab', 'remix', 'ai']) assert.ok(signature.includes(`.signature-club[data-club="${slug}"] .signature-club-field span`));
  assert.equal(rule('.synaura-chambre .signature-club > .signature-club-field')['pointer-events'], 'none');
});

test('Library collection includes five actual tabs, real recent resume and explicit Play in both views', () => {
  const header = library.slice(library.indexOf('const nativeLibraryHeader'), library.indexOf('if (status ==='));
  for (const tab of ['playlists', 'favorites', 'recent', 'downloads', 'queue']) assert.ok(header.includes(`setTab('${tab}')`), tab);
  for (const fragment of ['data-library-tab={tab}', 'resumeTrack ?', "playTracks(recentTracks, 0, 'library-resume')", '{resumeTrack.title}', 'value={search}', 'setSearch(event.target.value)', 'value={trackSort}', 'value={genreFilter}']) assert.ok(header.includes(fragment), fragment);
  const playlistCard = library.slice(library.indexOf('function PlaylistCard'), library.indexOf('function TrackRow'));
  assert.equal((playlistCard.match(/className="chambre-library-play /g) || []).length, 2);
  assert.doesNotMatch(playlistCard, /opacity-0|group-hover:opacity/);
  assert.match(playlistCard, /signature-library-list-record/);
  assert.match(playlistCard, /signature-library-record-cover/);
  assert.match(library, /data-track-active=\{isActive\}/);
  assert.match(library, /data-track-disabled=\{disabled\}/);
});

test('Library grid, track controls and existing scrollable dialogs remain mobile usable by source', () => {
  assert.equal(rule('.synaura-chambre .signature-library-records--grid', '(max-width: 767px)')['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  assert.equal(rule('.synaura-chambre .signature-library-records--grid', '(max-width: 359px)')['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(rule('.synaura-chambre .signature-collection-header .v2-library-categories', '(max-width: 767px)')['flex-wrap'], 'wrap');
  assert.equal(rule('.synaura-chambre .signature-library-track > .min-w-0 > div:first-child')['overflow-wrap'], 'anywhere');
  assert.equal((library.match(/className="chambre-library-dialog-body /g) || []).length, 3);
  assert.equal((library.match(/className="chambre-library-dialog-footer"/g) || []).length, 3);
  assert.match(css, /\.chambre-library-dialog-body \{[^}]*overflow-y: auto/);
  assert.match(css, /\.chambre-library-dialog-footer \{[^}]*safe-area-inset-bottom/);
});

test('Activity journal keeps actual dates/messages, named mobile actions and original navigation/deletion', () => {
  for (const fragment of ['groupedItems.map((group)', '{group.label}', 'group.items.map((item)', '{item.title}', '{item.message}', '{timeAgo(item.created_at)}', 'data-read={item.is_read}', 'aria-label="Non lue"', 'aria-label="Supprimer"', 'event.stopPropagation()', 'deleteNotification(item.id)', 'markRead(item.id)', 'router.push(item.action_url, { scroll: false })', 'load(page + 1, true)', 'onClick={clearAll}', 'setCategory(item.key)', 'aria-selected={category === item.key}']) assert.ok(activity.includes(fragment), fragment);
  assert.match(activity, /onClick=\{markAllRead\}[\s\S]{0,90}aria-label="Tout lire"/);
  assert.match(activity, /role="button"\s+tabIndex=\{0\}\s+onKeyDown=/);
  assert.match(activity, /items.length === 0 \? \([\s\S]*Aucune notification/);
  assert.equal(rule('.synaura-chambre .signature-activity-delete').height, '44px');
  assert.equal(rule('.synaura-chambre .signature-activity .signature-activity-index', '(max-width: 767px)').position, 'static');
  assert.equal(rule('.synaura-chambre .signature-activity-index [role="tablist"]', '(max-width: 767px)')['flex-wrap'], 'wrap');
});

test('Guest compositions keep real guards and existing sign-in destinations, without fixture content', () => {
  const guestLibrary = library.slice(library.indexOf('  if (!userId) {', library.indexOf('const nativeLibraryHeader')), library.indexOf('  if (error)'));
  assert.match(guestLibrary, /signature-library-guest/);
  assert.match(guestLibrary, /onClick=\{\(\) => router.push\('\/auth'\)\}/);
  assert.match(guestLibrary, /<SynauraTopBar/);
  assert.match(guestLibrary, /<SynauraRouteNav/);
  const guestActivity = activity.slice(activity.lastIndexOf("if (sessionStatus === 'unauthenticated')"), activity.indexOf('className="v2-activity-layout'));
  assert.match(guestActivity, /signature-activity-guest/);
  assert.match(guestActivity, /href="\/auth\/signin\?callbackUrl=%2Fnotifications"/);
  assert.match(guestActivity, /<SynauraTopBar/);
  for (const guest of [guestLibrary, guestActivity]) assert.doesNotMatch(guest, /setSession|mock|fixture|demo|fetch\(/i);
  assert.equal(rule('.synaura-chambre .signature-library-guest', '(max-width: 767px)')['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(rule('.synaura-chambre .signature-activity-guest', '(max-width: 767px)')['grid-template-columns'], 'minmax(0, 1fr)');
});

test('Signature styles use existing tokens and do not hide controls or animate under reduced motion', () => {
  assert.doesNotMatch(signature, /#[\da-f]{3,8}\b/i);
  parsedCss.walkDecls((declaration) => {
    assert.ok(!(declaration.prop === 'display' && declaration.value === 'none'), declaration.parent.selector);
    assert.ok(!(declaration.prop === 'visibility' && declaration.value === 'hidden'), declaration.parent.selector);
  });
  assert.match(signature, /:focus-visible \{ outline: 2px solid var\(--v2-focus\); outline-offset: 4px;/);
  const reduced = [];
  parsedCss.walkAtRules('media', (media) => { if (media.params === '(prefers-reduced-motion: reduce)') reduced.push(media.toString()); });
  assert.equal(reduced.length, 1);
  assert.match(reduced[0], /animation: none!important; transition: none!important; scroll-behavior: auto!important/);
  assert.match(reduced[0], /signature-library-record:hover[\s\S]*transform: none/);
});

test('New filled primary action keeps AA contrast with white text through the shared token', () => {
  const primary = rule('.synaura-chambre .signature-personal-primary');
  assert.equal(primary.background, 'var(--v2-accent-fill)');
  assert.equal(primary.color, 'white');
  assert.equal(primary['min-height'], '48px');
  const hex = read('app/v2.css').match(/--v2-accent-fill:\s*#([\da-f]{6})/i)?.[1];
  assert.ok(hex);
  const linear = hex.match(/../g).map((part) => parseInt(part, 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  assert.ok(1.05 / (.2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2] + .05) >= 4.5);
});
