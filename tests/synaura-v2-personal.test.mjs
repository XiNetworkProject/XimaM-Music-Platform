import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('V2 personal route boundaries own presentation, not data or a second player', () => {
  for (const path of ['components/v2/PersonalRouteFrame.tsx', 'components/v2/ServiceFrame.tsx']) {
    const source = read(path);
    assert.doesNotMatch(source, /fetch\(|useSession\(|new Audio|<audio|setQueueAndPlay/);
    assert.match(source, /children/);
  }
});

test('V2 Library retains every collection and the existing organization and playback owners', () => {
  const source = read('app/library/LibraryClient.tsx');
  for (const tab of ['playlists', 'favorites', 'recent', 'downloads', 'queue']) {
    assert.ok(source.includes(`setTab('${tab}')`), tab);
  }
  for (const owner of ['useTrackActions', 'useFavoriteActions', 'forgetOfflineTrack', 'createPlaylist', 'library-resume']) {
    assert.ok(source.includes(owner), owner);
  }
  assert.match(source, /v2-library-layout/);
  assert.match(source, /aria-label="Rechercher dans ta bibliothèque"/);
});

test('V2 Search retains Profile Peek, Track Actions and cancellation', () => {
  const source = read('app/search/page.tsx');
  assert.match(source, /useProfilePeek\('search'\)/);
  assert.match(source, /<TrackActionButton track=\{track\} origin="search"/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /role="search"/);
  for (const result of ['tracks', 'posts', 'artists', 'playlists']) assert.ok(source.includes(`results.${result}`));
});

test('V2 mobile Notifications keeps its accessible mark-all control', () => {
  const source = read('app/notifications/page.tsx');
  assert.match(source, /onClick=\{markAllRead\}[\s\S]{0,80}aria-label="Tout lire"/);
  assert.match(source, /router\.push\(item\.action_url, \{ scroll: false \}\)/);
  assert.match(source, /v2-activity-layout/);
});

test('V2 messaging keeps inbox categories, return and secondary audio coordination', () => {
  const inbox = read('app/messages/page.tsx');
  const thread = read('app/messages/[conversationId]/page.tsx');
  for (const tab of ['conversations', 'requests', 'contacts']) assert.ok(inbox.includes(`"${tab}"`));
  assert.match(thread, /coordinateSecondaryAudioElement/);
  assert.match(thread, /messageOriginReturn\(\)/);
  assert.match(thread, /ref=\{scrollRef\}/);
});

test('V2 Community uses real aggregates and retains every configured club', () => {
  const source = read('app/community/page.tsx');
  assert.match(source, /orderedClubs\.map/);
  assert.match(source, /aggregate\?\.latestPost/);
  assert.match(source, /\/api\/community\/clubs/);
  assert.doesNotMatch(source, /personnes en ligne|auditeurs simultanés/);
});

test('V2 Clip remains the clip destination with explicit source navigation', () => {
  const source = read('app/clips/[id]/page.tsx');
  assert.match(source, /getPublicClip\(params\.id\)/);
  assert.match(source, /src=\{clip\.videoUrl\}/);
  assert.match(source, /href=\{clip\.sourceTrack\.trackUrl\}/);
  assert.doesNotMatch(source, /redirect\(/);
});

test('V2 personal responsive scopes include tablet, mobile and reduced motion', () => {
  const source = read('components/v2/personal-v2.css');
  assert.match(source, /min-width: 768px/);
  assert.match(source, /max-width: 767px/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /:focus-visible/);
  assert.doesNotMatch(source, /\[style\*="transform"\]/);
});

test('V2 invitation preserves referral validation, storage and both account destinations', () => {
  const source = read('app/join/[code]/page.tsx');
  assert.match(source, /fetch\(`\/api\/referral\/validate\?code=\$\{encodeURIComponent\(code\)\}`\)/);
  assert.match(source, /localStorage\.setItem\('synaura_referral_code', code\)/);
  assert.match(source, /href=\{signupHref\}/);
  assert.match(source, /href=\{signinHref\}/);
  assert.match(source, /valid && referrerName/);
  assert.match(source, /<SynauraLogo/);
  assert.doesNotMatch(source, /repeat: Infinity|Un nouveau commentaire|Un son reposté/);
});

test('V2 Android landing delegates the release and installation contract unchanged', () => {
  const source = read('app/download/page.tsx');
  assert.match(source, /<AndroidDownloadCard \/>/);
  assert.match(source, /screenshots\.map/);
  assert.match(source, /featureCards\.map/);
  assert.match(source, /id="download"/);
  assert.match(source, /id="screens"/);
  assert.match(source, /<SynauraLogo/);
  assert.doesNotMatch(source, /synaura-symbol-2026|fetch\(|versionCode:/);
});

test('V2 secondary account recovery retains payload and associates every form label', () => {
  const source = read('app/reset-password/page.tsx');
  assert.match(source, /fetch\('\/api\/auth\/reset-password'/);
  assert.match(source, /JSON\.stringify\(\{ token, code: code\.trim\(\), password, email: email\.trim\(\) \}\)/);
  for (const id of ['reset-email', 'reset-code', 'reset-password']) {
    assert.ok(source.includes(`htmlFor="${id}"`));
    assert.ok(source.includes(`id="${id}"`));
  }
  assert.match(source, /role="alert"/);
  assert.match(source, /<ServiceFrame>/);
});

test('V2 external partnerships preserves eligibility and the real contact mechanism', () => {
  const source = read('app/partnerships/page.tsx');
  assert.match(source, /NOT_AVAILABLE\.map/);
  assert.match(source, /ELIGIBLE\.map/);
  assert.match(source, /<RevealEmailButton \/>/);
  assert.match(source, /href="\/publish"/);
  assert.match(source, /v2-partnership-contact/);
});

test('V2 Radar preserves actual ranking, compact discovery and explicit playback', () => {
  const source = read('components/radar/RadarSection.tsx');
  const page = read('app/radar/page.tsx');
  assert.match(page, /getRadarTracks\(30\)/);
  assert.match(page, /attachLikedFlag\(radarRaw, userId\)/);
  assert.match(source, /setQueueAndPlay\(playable as any, start >= 0 \? start : 0\)/);
  assert.match(source, /useLikeSystem/);
  assert.match(source, /tracks\.slice\(0, 8\)/);
  assert.match(source, /showViewAll/);
  assert.match(source, /v2-radar-card--featured/);
  assert.match(source, /aria-pressed=\{isLiked\}/);
});

test('V2 embedded player remains autonomous with one existing audio and explicit handlers', () => {
  const source = read('app/embed/[trackId]/EmbedPlayerClient.tsx');
  assert.equal((source.match(/<audio\b/g) || []).length, 1);
  assert.match(source, /<audio ref=\{audioRef\} src=\{track\.audioUrl\} preload="metadata"/);
  assert.match(source, /onClick=\{togglePlay\}/);
  assert.match(source, /onClick=\{seek\}/);
  assert.match(source, /audio\.currentTime = pct \* audio\.duration/);
  assert.match(source, /<SynauraLogo/);
  assert.doesNotMatch(source, /useAudioPlayer|setQueueAndPlay|new Audio/);
});

test('V2 confirmed selection contrast and historical placeholder regressions stay closed', () => {
  const notifications = read('app/notifications/page.tsx');
  const onboarding = read('components/onboarding/OnboardingFlow.tsx');
  const stats = read('app/stats/page.tsx');
  const css = read('components/v2/personal-v2.css');
  assert.doesNotMatch(notifications + onboarding, /bg-\[var\(--syn-accent\)\] text-white/);
  assert.match(notifications, /bg-\[var\(--v2-accent-fill\)\] text-white/);
  assert.match(stats, /metric === item.key \? 'bg-\[var\(--v2-accent-fill\)\] text-white'/);
  assert.doesNotMatch(read('app/challenges/[id]/page.tsx') + stats, /synaura-symbol-2026/);
  assert.ok(css.includes('[class~="bg-white/72"]'));
  assert.ok(css.includes(':is(input,textarea,select).bg-white'));
});

test('V2 active secondary web logos use the shared exact identity', () => {
  for (const path of ['components/mobile/AndroidAppPrompt.tsx', 'components/home/HomeFlowPrelude.tsx', 'components/DailySpinModal.tsx', 'components/BoosterOpenModal.tsx', 'components/synaura/SynauraCountdownBanner.tsx']) {
    const source = read(path);
    assert.match(source, /<SynauraLogo/);
    assert.doesNotMatch(source, /\/brand\/2026\/synaura-symbol-2026\.png/);
  }
  assert.match(read('components/mobile/AndroidAppPrompt.tsx'), /href=\{release.apkUrl\} download onClick=\{close\}/);
  assert.match(read('components/home/HomeFlowPrelude.tsx'), /onClick=\{enterFlow\}/);
  assert.match(read('components/synaura/SynauraCountdownBanner.tsx'), /onClick=\{onNotify\}/);
});

test('V2 error recovery keeps actions and a fully autonomous global fallback', () => {
  const local = read('app/error.tsx');
  const global = read('app/global-error.tsx');
  const missing = read('app/not-found.tsx');
  assert.match(local, /console\.error\('Page error:', error\)/);
  for (const source of [local, global]) {
    assert.match(source, /onClick=\{\(\) => reset\(\)\}/);
    assert.match(source, /href="\/"/);
    assert.match(source, /<details/);
    assert.match(source, /error\?\.stack/);
  }
  assert.match(global, /<html lang="fr">/);
  assert.match(global, /<body style=/);
  assert.match(global, /\/brand\/v2\/reference-symbol\.svg/);
  assert.doesNotMatch(global, /\bimport\s|useSession|useAudioPlayer|className=|var\(--/);
  assert.match(missing, /<h1/);
  assert.match(missing, /href="\/"/);
});
