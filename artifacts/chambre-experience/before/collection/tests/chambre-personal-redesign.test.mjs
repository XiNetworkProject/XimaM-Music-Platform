import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const css = read('components/v2/personal-v2.css');
const chambreCss = css.slice(css.indexOf('/* Chambre Sonore ·'));

export const PERSONAL_ROUTES = [
  ['app/library/LibraryClient.tsx', 'library'],
  ['app/search/page.tsx', 'search'],
  ['app/messages/page.tsx', 'inbox'],
  ['app/messages/[conversationId]/page.tsx', 'conversation'],
  ['app/notifications/page.tsx', 'activity'],
  ['app/community/page.tsx', 'clubs'],
  ['app/community/[club]/page.tsx', 'club'],
  ['app/community/forum/page.tsx', 'forum'],
  ['app/community/forum/[id]/page.tsx', 'thread'],
  ['app/community/forum/new/page.tsx', 'new-thread'],
  ['app/community/faq/page.tsx', 'faq'],
  ['app/posts/page.tsx', 'posts'],
  ['app/posts/[id]/page.tsx', 'post'],
  ['app/settings/SettingsClient.tsx', 'settings'],
  ['app/stats/page.tsx', 'stats'],
  ['app/subscriptions/page.tsx', 'subscriptions'],
  ['app/subscriptions/success/page.tsx', 'subscription-success'],
  ['app/boosters/BoostersClient.tsx', 'boosters'],
  ['app/challenges/[id]/page.tsx', 'challenge'],
  ['components/city/SynauraCityPage.tsx', 'city'],
  ['app/support/page.tsx', 'support'],
  ['app/support/SupportForm.tsx', 'support-form'],
  ['app/legal/page.tsx', 'legal'],
  ['app/legal/cgu/page.tsx', 'cgu'],
  ['app/legal/cgv/page.tsx', 'cgv'],
  ['app/legal/cookies/page.tsx', 'cookies'],
  ['app/legal/confidentialite/page.tsx', 'privacy'],
  ['app/legal/mentions-legales/page.tsx', 'legal-notice'],
  ['app/legal/rgpd/page.tsx', 'rgpd'],
  ['app/download/page.tsx', 'download'],
  ['app/partnerships/page.tsx', 'partnerships'],
  ['app/join/[code]/page.tsx', 'invitation'],
  ['app/reset-password/page.tsx', 'reset-code'],
  ['app/auth/layout.tsx', 'auth-frame'],
  ['app/auth/signin/page.tsx', 'sign-in'],
  ['app/auth/signup/page.tsx', 'sign-up'],
  ['app/auth/forgot-password/page.tsx', 'forgot-password'],
  ['app/auth/reset-password/page.tsx', 'reset-token'],
  ['app/auth/error/page.tsx', 'auth-error'],
  ['components/onboarding/OnboardingFlow.tsx', 'onboarding'],
];

const parse = (path, source = read(path)) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });

// Presentation-only comparison for the uncommitted local candidate. It preserves
// all non-JSX statements plus every behavioral JSX expression/event handler.
// Backups are optional local evidence, never required to run the committed suite.
export function behaviorFingerprint(source, fileName) {
  const file = parse(fileName, source);
  const expressions = [];
  const presentationAttribute = (node) => ts.isJsxAttribute(node) && /^(className|style|aria-|data-|id$|htmlFor$|fill$|stroke$|stopColor$)/.test(node.name.getText(file));
  const normalize = (node) => {
    const result = ts.transform(node, [(context) => {
      const visit = (current) => {
        if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current)) return ts.factory.createNull();
        return ts.visitEachChild(current, visit, context);
      };
      return visit;
    }]);
    const text = printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], file);
    result.dispose();
    return text;
  };
  const visit = (node) => {
    if (presentationAttribute(node)) return;
    if (ts.isJsxExpression(node) && node.expression) expressions.push(normalize(node.expression));
    ts.forEachChild(node, visit);
  };
  visit(file);
  return createHash('sha256').update(JSON.stringify([normalize(file), expressions])).digest('hex');
}

test('personal/social/service coverage keeps all 40 existing UI entry points', () => {
  assert.equal(PERSONAL_ROUTES.length, 40);
  for (const [path] of PERSONAL_ROUTES) {
    assert.ok(existsSync(new URL(path, root)), path);
    assert.ok(!path.includes('/api/') && !path.startsWith('native/'), path);
    const file = parse(path);
    assert.deepEqual(file.parseDiagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')), [], path);
  }
});

test('Chambre CSS is parseable and isolated from the approved entry/prototype', () => {
  assert.ok(chambreCss.startsWith('/* Chambre Sonore ·'));
  postcss.parse(chambreCss).walkRules((rule) => {
    assert.ok(rule.selector.trim().startsWith('.synaura-chambre'), rule.selector);
  });
  assert.doesNotMatch(chambreCss, /\.chamber-product|\.chamber-material|\.chamber-listening|prototypes\//);
  assert.match(chambreCss, /prefers-reduced-motion: reduce/);
  assert.match(chambreCss, /focus-visible/);
  assert.match(chambreCss, /max-width: 359px/);
});

test('library retains all five collections and explicit playback/mutation owners', () => {
  const source = read('app/library/LibraryClient.tsx');
  for (const tab of ['playlists', 'favorites', 'recent', 'downloads', 'queue']) assert.match(source, new RegExp(`setTab\\('${tab}'\\)`));
  for (const marker of ['playTracks(recentTracks, 0', 'selectedPlaylist.isPublic', 'deletePlaylist(', 'openEditPlaylist(', 'OFFLINE_TRACKS_EVENT', 'trackActions.open(']) assert.ok(source.includes(marker), marker);
  assert.match(source, /chambre-library-detail-actions/);
});

test('search keeps tracks, posts, profiles, playlists and real profile/actions hooks', () => {
  const source = read('app/search/page.tsx');
  for (const kind of ['tracks', 'posts', 'artists', 'playlists']) assert.ok(source.includes(`results.${kind}`), kind);
  assert.match(source, /openProfilePeek\(artist\.username/);
  assert.match(source, /<TrackActionButton track=\{track\} origin="search"/);
  assert.match(source, /chambre-search-command/);
  assert.match(source, /controller\.abort\(\)/);
});

test('messages retain requests, groups, rooms, attachments and return origin', () => {
  const inbox = read('app/messages/page.tsx');
  const conversation = read('app/messages/[conversationId]/page.tsx');
  for (const marker of ['receivedRequests', 'contacts', 'setGroupOpen(true)', 'mutateRequest']) assert.ok(inbox.includes(marker), marker);
  for (const marker of ['messageOriginReturn()', 'conversation.rooms.map', 'selectRoom(room.id)', 'setRoomCreatorOpen(true)', 'updateConversation(', 'MediaRecorder', 'setCustomizeOpen(true)']) assert.ok(conversation.includes(marker), marker);
  assert.match(conversation, /env\(safe-area-inset-bottom\)/);
  assert.match(conversation, /ref=\{scrollRef\}/);
});

test('mobile notifications preserve named bulk action and category/clear/read contracts', () => {
  const source = read('app/notifications/page.tsx');
  assert.match(source, /onClick=\{markAllRead\}[\s\S]{0,90}aria-label="Tout lire"/);
  for (const marker of ['markRead(item.id)', 'deleteNotification(item.id)', 'onClick={clearAll}', 'setCategory(item.key)', 'setUnreadOnly', 'aria-selected={category === item.key}']) assert.ok(source.includes(marker), marker);
  assert.match(chambreCss, /v2-activity-heading button \{ min-height: 44px; min-width: 44px;/);
});

test('message counters, selected contacts and recording stop use an AA-safe filled accent', () => {
  const inbox = read('app/messages/page.tsx');
  const conversation = read('app/messages/[conversationId]/page.tsx');
  assert.match(inbox, /active\s*\? "bg-\[var\(--v2-accent-fill\)\] text-white"/);
  assert.match(inbox, /\? "border-syn-accent bg-\[var\(--v2-accent-fill\)\] text-white"/);
  assert.match(conversation, /onClick=\{stopRecording\}[\s\S]{0,220}bg-\[var\(--v2-accent-fill\)\] text-white[\s\S]{0,80}aria-label="Arrêter"/);
  const token = read('app/v2.css').match(/--v2-accent-fill:\s*#([\da-f]{6})/i)?.[1];
  assert.ok(token, 'The filled accent is an explicit shared RGB token.');
  const linear = token.match(/../g).map((channel) => parseInt(channel, 16) / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  assert.ok(1.05 / (luminance + .05) >= 4.5, 'White text/essential icons retain AA contrast on the filled accent.');
});

test('Community taxonomy remains sourced from the existing club contract', () => {
  const landing = read('app/community/page.tsx');
  assert.match(landing, /import \{ COMMUNITY_CLUBS, type ClubConfig \} from '@\/lib\/communityClubs'/);
  assert.match(landing, /fetch\('\/api\/community\/clubs'/);
  assert.match(landing, /La première discussion reste à écrire/);
  for (const path of ['app/community/forum/page.tsx', 'app/community/forum/[id]/page.tsx', 'app/community/forum/new/page.tsx']) {
    assert.doesNotMatch(read(path), /ALTER TABLE|UPDATE community_posts|CREATE TABLE/);
  }
});

test('stats presentation retains true data-quality limitations and chart distinction', () => {
  const source = read('app/stats/page.tsx');
  for (const marker of ['listenHoursEstimated', 'avgRetentionEstimated', 'dataQuality', 'insufficient', 'Pas assez de données']) assert.ok(source.includes(marker), marker);
  assert.match(source, /stroke="var\(--v2-accent\)"/);
  assert.match(source, /stroke="var\(--v2-muted\)" strokeDasharray="8 8"/);
  for (const dimension of ['range', 'view', 'metric']) assert.ok(source.includes(`aria-pressed={${dimension} === item.key}`));
});

test('plans and quotas remain canonical, no invented pricing or checkout action', () => {
  const source = read('app/subscriptions/page.tsx');
  for (const marker of ['PLANS.free', 'PLANS.starter', 'PLANS.pro', 'cancelSubscription', 'downgradeToFree', 'setShowBuyCredits(true)', 'choosePlan(priceMap.Starter[period])', '/api/billing/retry-payment']) assert.ok(source.includes(marker), marker);
  assert.match(source, /data-plan-active=\{Boolean\(active\)\}/);
  assert.match(source, /disabled=\{!onChoose\}/);
});

test('booster and City mutation controls retain current inventory/event owners', () => {
  const boosters = read('app/boosters/BoostersClient.tsx');
  for (const marker of ['useBoosters()', 'openDaily', 'useOnTrack', 'useOnArtist', 'filteredInventory.map', 'aria-label="Filtrer les boosters"']) assert.ok(boosters.includes(marker), marker);
  const city = read('components/city/SynauraCityPage.tsx');
  for (const marker of ['void claim(event)', 'openParticipate(event)', 'onVote={vote}', 'city.hallOfFame', 'city.listenerBadges']) assert.ok(city.includes(marker), marker);
  assert.match(chambreCss, /chambre-booster-card \[class\*="h-7"\] \{ height: auto; min-height: 44px;/);
});

test('support form labels target the actual unchanged fields', () => {
  const source = read('app/support/SupportForm.tsx');
  for (const field of ['email', 'subject', 'message', 'url']) {
    assert.ok(source.includes(`htmlFor="chambre-support-${field}"`));
    assert.ok(source.includes(`id="chambre-support-${field}"`));
    assert.ok(source.includes(`fields.${field}`));
  }
  assert.match(source, /onSubmit=\{handleSubmit\}/);
});

test('auth preserves redirects, provider paths, registration restrictions and recovery', () => {
  const signIn = read('app/auth/signin/page.tsx');
  const signUp = read('app/auth/signup/page.tsx');
  for (const source of [signIn, signUp]) {
    assert.match(source, /safeEntryTarget\(/);
    assert.match(source, /buildMemberContinueUrl\(/);
    assert.match(source, /signIn\('google'/);
    assert.match(source, /router\.replace\(continueUrl\)/);
  }
  assert.match(signIn, /signIn\('credentials'/);
  assert.match(signUp, /!userCount\.canRegister/);
  assert.match(signUp, /referralCode/);
  for (const file of ['forgot-password', 'reset-password']) assert.match(read(`app/auth/${file}/page.tsx`), /<h1 className="chambre-recovery-title">/);
});

test('onboarding retains every universe/intention, editing and optional skipping', () => {
  const source = read('components/onboarding/OnboardingFlow.tsx');
  for (const marker of ['ONBOARDING_UNIVERSES.map', 'CREATOR_INTENTIONS.map', 'save(true)', 'save(false)', 'isEdit', 'Aucune fonction ne sera cachée', 'aria-pressed={active}']) assert.ok(source.includes(marker), marker);
  assert.match(source, /data-chambre-step=\{step\}/);
});

test('local pre-edit snapshots prove non-presentation code and event expressions unchanged', (context) => {
  const backupRoot = new URL('artifacts/chambre-full-redesign/before/personal/', root);
  if (!existsSync(backupRoot)) return context.skip('Optional local pre-edit evidence absent; no runtime/visual claim inferred.');
  for (const [path] of PERSONAL_ROUTES) {
    const before = readFileSync(new URL(path, backupRoot), 'utf8');
    // Signature pass adds exactly one pure decorative component to Support.
    // Keep every other import, statement and behavioral expression protected.
    let current = path === 'app/support/page.tsx'
      ? read(path).replace("import ChambreResonance from '@/components/v2/ChambreResonance';", '')
      : read(path);
    if (path === 'app/search/page.tsx') {
      // Three new static navigation shortcuts must not prefetch destinations.
      // Only those three false expressions are new; the existing search stays protected.
      current = current.replace(/<nav className="chambre-signature-search-index"[\s\S]*?<\/nav>/, block => {
        assert.deepEqual([...block.matchAll(/href="([^"]+)" prefetch=\{false\}/g)].map(match => match[1]), ['/discover', '/radar', '/community']);
        assert.equal((block.match(/\{/g) || []).length, 3);
        return block.replaceAll(' prefetch={false}', '');
      });
    }
    assert.equal(behaviorFingerprint(current, path), behaviorFingerprint(before, path), path);
  }
});

test('local legal source snapshots retain every document word and existing destination', (context) => {
  const backupRoot = new URL('artifacts/chambre-full-redesign/before/personal/', root);
  if (!existsSync(backupRoot)) return context.skip('Optional local pre-edit evidence absent.');
  const legalText = (source, path) => {
    const file = parse(path, source);
    const pieces = [];
    const visit = (node) => {
      if (ts.isJsxText(node)) pieces.push(node.text.replace(/\s+/g, ' ').trim());
      if (ts.isJsxAttribute(node) && node.name.getText(file) === 'href') pieces.push(printer.printNode(ts.EmitHint.Unspecified, node, file));
      ts.forEachChild(node, visit);
    };
    visit(file);
    return pieces.filter(Boolean);
  };
  for (const [path] of PERSONAL_ROUTES.filter(([path]) => path.startsWith('app/legal/'))) {
    assert.deepEqual(legalText(read(path), path), legalText(readFileSync(new URL(path, backupRoot), 'utf8'), path), path);
  }
});
