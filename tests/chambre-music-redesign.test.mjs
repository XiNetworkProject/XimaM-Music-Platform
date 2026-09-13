import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const musicSources = [
  'app/discover/DiscoverClient.tsx', 'app/discover/DiscoverMoodTiles.tsx',
  'app/track/[id]/TrackPageClient.tsx', 'app/profile/[username]/page.tsx',
  'app/playlists/[id]/page.tsx', 'app/album/[id]/page.tsx',
  'components/home/SynauraScroll.tsx', 'components/home/ScrollPostSlide.tsx',
  'components/TikTokPlayer.tsx', 'components/FullScreenPlayer.tsx', 'components/TrackCover.tsx',
  'components/profile/ProfilePeekSurface.tsx', 'components/comments/CommentsSurface.tsx',
  'components/actions/ActionsSurface.tsx', 'components/radar/RadarSection.tsx',
  'app/for-you/page.tsx', 'app/trending/page.tsx',
];

test('every musical presentation remains parse-clean TSX, without another audio or GPU authority', async () => {
  for (const path of musicSources) {
    const text = await read(path);
    const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(ast.parseDiagnostics.length, 0, `${path}: ${ast.parseDiagnostics.map(d => d.messageText).join(', ')}`);
    assert.doesNotMatch(text, /new\s+(?:Audio|AudioContext|WebGLRenderer)\s*\(|<audio\b|from\s+['"]three['"]/, path);
  }
});

test('Discovery presents approved Chambre identity and retains every real-content section', async () => {
  const source = await read('app/discover/DiscoverClient.tsx');
  assert.match(source, /data-chambre-music="discover"/);
  // The requested full experience redesign supersedes the former opening copy.
  assert.match(source, /Le prochain<br \/><em>déclic\.<\/em>/);
  assert.ok(source.indexOf('experience-discover-navigation') < source.indexOf('className="v2-discover-opening"'), 'listening paths appear before the editorial opening');
  for (const section of ['orderedMoods.map', 'moodPreviews[mood.id]', 'RadarSection', 'newestTracks', 'hiddenTracks', 'popularTracks', 'CollectionSpotlight playlists={collections}', 'artists.map', 'COMMUNITY_CLUBS.map']) assert.ok(source.includes(section), section);
  assert.match(source, /MoodResultsView moodId=\{activeMoodConfig.id\} onBack=\{closeMood\}/);
});

test('mood portals retain real cover art, preference meaning and accessible native actions', async () => {
  const source = await read('app/discover/DiscoverMoodTiles.tsx');
  assert.match(source, /type="button"\s+onClick=\{onOpen\}/);
  assert.match(source, /aria-label=\{`Explorer l’ambiance \$\{mood.label\}/);
  assert.match(source, /data-highlighted=\{highlighted\}/);
  assert.match(source, /covers.slice\(0, 4\).map/);
  assert.doesNotMatch(source, /mood.gradient/);
  assert.match(source, /useProfilePeek\('discover'\)/);
  assert.match(source, /if \(!artist.track\?\.audioUrl\) return/);
});

test('record stages use isolated decoration and keep native responsive reading planes', async () => {
  const css = await read('components/v2/music-v2.css');
  assert.match(css, /LA CHAMBRE SONORE/);
  assert.match(css, /membrane-cobalt\.png/);
  for (const plane of ['.v2-discover-opening','.v2-track-identity-grid','.v2-profile-person','.v2-playlist-identity-grid','.v2-album-tracklist','.v2-live-track-scene','.v2-expanded-grid','.v2-radar-card--featured']) assert.ok(css.includes(plane), plane);
  assert.match(css, /\.v2-discover-opening::before \{[^}]*pointer-events:none/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /@media\(max-height:600px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css.slice(css.indexOf('/* LA CHAMBRE SONORE')), /animation:[^;]*infinite/);
});

test('creator and collection pages retain all content and musical mutations behind existing handlers', async () => {
  const [profile, playlist, album] = await Promise.all(['app/profile/[username]/page.tsx','app/playlists/[id]/page.tsx','app/album/[id]/page.tsx'].map(read));
  for (const tab of ['sons','clips','variations','playlists','posts']) assert.ok(profile.includes(`['${tab}',`), tab);
  assert.match(profile, /aria-label="Modifier la bannière du profil"/);
  for (const action of ['playTracks(data.tracks, 0)','shufflePlay','queueTrack(track)','toggleLike(track)','setCommentTrack(track)']) assert.ok(playlist.includes(action), action);
  for (const action of ['playAlbum(idx)','shuffleAlbum','addAllToQueue','shareAlbum']) assert.ok(album.includes(action), action);
  assert.match(album, /L’ordre du voyage/);
});

test('context redesign does not replace existing keyboard, history, query and viewport ownership', async () => {
  const [profile, comments, actions] = await Promise.all(['components/profile/ProfilePeekSurface.tsx','components/comments/CommentsSurface.tsx','components/actions/ActionsSurface.tsx'].map(read));
  assert.match(profile, /h-\[82dvh\]/);
  assert.match(profile, /pb-\[calc\(9rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(profile, /data-context-surface-initial-focus tabIndex=\{-1\}/);
  for (const source of [comments, actions]) {
    assert.match(source, /viewport\?\.removeEventListener\('resize', update\)/);
    assert.match(source, /data-context-surface-initial-focus/);
  }
  assert.match(comments, /onSeek=\{explicitSeek\}/);
  assert.match(comments, /onScroll=\{e => \{ draftRef.current = \{ \.\.\.draftRef.current, scrollTop: e.currentTarget.scrollTop \}/);
  assert.match(actions, /role="menuitem" tabIndex=\{i \? -1 : 0\}/);
  assert.match(actions, /entry.surface === 'queue' && <QueueContent/);
  assert.match(actions, /ready && entry.surface !== 'queue' && track.coverUrl/);
});

test('contexts retain readable author identity, genuine focus-visible and no new sizing overrides', async () => {
  const css = await read('components/v2/contexts-v2.css');
  assert.match(css, /white-space:normal; overflow-wrap:anywhere; text-overflow:clip/);
  assert.match(css, /:focus-visible \{ outline:2px solid var\(--v2-focus\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /(?:^|[;{\s])(?:height|max-height|min-height):[^;}]*vh/);
});

test('cover fallback is presentation-only and keeps actual media playback ownership', async () => {
  const source = await read('components/TrackCover.tsx');
  assert.match(source, /chambre-cover-placeholder/);
  assert.match(source, /muted\s+loop\s+playsInline/);
  assert.match(source, /autoPlay=\{shouldPlayVideo\}/);
  assert.match(source, /if \(!shouldPlayVideo\) videoRef.current\?\.pause\(\)/);
});

test('legacy For You and Trending remain real collections with keyboard-native track actions', async () => {
  for (const [route, endpoint] of [['for-you','/api/ranking/feed?limit=100&ai=1'],['trending','/api/tracks/trending?limit=100']]) {
    const source = await read(`app/${route}/page.tsx`);
    assert.ok(source.includes(`data-chambre-music="${route}"`));
    assert.ok(source.includes(`fetch('${endpoint}')`));
    assert.match(source, /<button\s+key=\{track._id\}\s+type="button"\s+aria-label=\{`Écouter \$\{track.title\}`\}\s+onClick=\{\(\) => handlePlayTrack\(track\)\}/);
    assert.match(source, /setAudioTracks\(tracks\);\s+setCurrentTrackIndex\(trackIndex >= 0 \? trackIndex : 0\);\s+playTrack\(track\)/);
    assert.match(source, /aria-label="Lire la sélection"/);
    assert.match(source, /aria-label="Retour"/);
  }
});

test('420 UI handlers and 212 protected calls match pre-redesign AST, allowing only reviewed loader and keyboard guards', async () => {
  // Captured from the exact before/music snapshots, not from candidate output.
  // The snapshots themselves are local artifacts and are not a test dependency.
  const expectedEvents = '5e1fd19a4916863ca202138560a80ca9626d1b977ffbb3c4e9cb79d2b382a036';
  const expectedCalls = 'a70f71fde790cf2b6da2d38540eac33240e1fbc9733265e597cf678935033cea';
  const printer = ts.createPrinter({ removeComments: true });
  const eventAudit = [];
  const callAudit = [];
  let exceptions = 0;
  const allowedCleanup = `return () => {
      mounted = false;
      // StrictMode replays setup after cleanup. Only a completed request owns
      // this cache key; an abandoned request must allow the next setup to load.
      if (!settled && requestId === loadRequestRef.current && feedLoadedRef.current === loadKey) {
        feedLoadedRef.current = '';
      }
    };`;
  for (const path of musicSources) {
    let text = (await read(path)).replaceAll('\r\n', '\n');
    if (path === 'components/FullScreenPlayer.tsx') {
      // V6 Studio correction: one keyboard dispatch, not a change to playback.
      // Both exact guards are asserted here; their behavior is executed in suno-v6-models.
      const eventGuard = '      if (event.defaultPrevented || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;\n';
      const targetGuard = `if (target && (target.isContentEditable || target.closest('input, textarea, select, button, a, [role="button"], [role="slider"], [role="tab"], [role="textbox"], [role="combobox"]'))) return;`;
      assert.equal(text.split(eventGuard).length, 2);
      assert.equal(text.split(targetGuard).length, 2);
      text = text.replace(eventGuard, '').replace(targetGuard, `if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;`);
    }
    const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const events = [];
    const calls = [];
    function visit(node) {
      if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.text)) events.push(printer.printNode(ts.EmitHint.Unspecified, node, ast));
      if (ts.isCallExpression(node) && /^(useEffect|useLayoutEffect|useQuery|useInfiniteQuery|fetch|setQueueAndPlay|setQueueOnly|setAudioTracks|setCurrentTrackIndex|seek|playTrack|play|pause|useTrackWaveform|useMomentComments|useSharedFollowState|useProfilePeekData)$/.test(node.expression.getText(ast))) {
        let printed = printer.printNode(ts.EmitHint.Unspecified, node, ast);
        if (path === 'components/TikTokPlayer.tsx' && node.expression.getText(ast) === 'useEffect'
            && node.getText(ast).includes('await fetchFeedChunk(feedMode, 0, feedSeedGenre)')) {
          const current = node.getText(ast);
          assert.equal((current.match(/let settled = false;/g) || []).length, 1);
          assert.equal((current.match(/settled = true;/g) || []).length, 2);
          assert.ok(current.includes(allowedCleanup), 'only this guarded pending-request cleanup is permitted');
          const beforeFix = current.replace(/^\s*let settled = false;\n/m, '')
            .replace(/^\s*settled = true;\n/gm, '')
            .replace(allowedCleanup, 'return () => { mounted = false; };');
          assert.doesNotMatch(beforeFix, /\bsettled\b/);
          const restored = ts.createSourceFile(path, beforeFix, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
          assert.equal(restored.parseDiagnostics.length, 0);
          printed = printer.printNode(ts.EmitHint.Unspecified, restored.statements[0].expression, restored);
          exceptions += 1;
        }
        calls.push(printed);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    eventAudit.push({ path, events });
    callAudit.push({ path, calls });
  }
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(exceptions, 1);
  assert.equal(eventAudit.reduce((n, row) => n + row.events.length, 0), 420);
  assert.equal(callAudit.reduce((n, row) => n + row.calls.length, 0), 212);
  assert.equal(digest(eventAudit), expectedEvents, 'an existing event handler changed');
  assert.equal(digest(callAudit), expectedCalls, 'a protected call changed beyond the exact documented loader fix');
});
