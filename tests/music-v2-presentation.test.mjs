import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('V2 Track keeps one musical authority and queries only the global current native track', async () => {
  const source = await read('app/track/[id]/TrackPageClient.tsx');
  assert.match(source, /waveformTrackId = isCurrentTrack && track && !track\.isAI \? track\.id : undefined/);
  assert.match(source, /useTrackWaveform\(waveformTrackId/);
  assert.match(source, /useMomentComments\(waveformTrackId\)/);
  assert.match(source, /onSeek=\{seek\}/);
  assert.doesNotMatch(source, /onMarkerSeek=\{[^\n]*=> seek\(/);
  assert.doesNotMatch(source, /new Audio\(|<audio|AudioContext|setQueueAndPlay/);
  assert.equal((source.match(/onClick=\{handlePlay\}/g) || []).length, 1);
  assert.match(source, /setShowPlayer\(true\); setIsMinimized\(false\)/);
  assert.match(source, /disabled=\{!currentTrack\}[^\n]+window.dispatchEvent\(new Event\('synaura:open-full-player'\)\)/);
});

test('V2 music keeps real-content exploration and every creator content section', async () => {
  const [discover, profile, live] = await Promise.all([
    read('app/discover/DiscoverClient.tsx'), read('app/profile/[username]/page.tsx'), read('components/home/SynauraScroll.tsx'),
  ]);
  assert.match(discover, /orderedMoods\.map/);
  assert.match(discover, /artists\.map/);
  assert.match(discover, /CollectionSpotlight playlists=\{collections\}/);
  for (const tab of ['sons', 'clips', 'variations', 'playlists', 'posts']) assert.ok(profile.includes(`['${tab}',`));
  assert.match(live, /resolveStatus=\{index === activeIndex\}/);
  assert.match(live, /RENDER_BUFFER = 5/);
  assert.match(live, /SynauraLogo variant="wordmark"/);
});

test('V2 music has independent narrow and tablet layouts with reduced-motion support', async () => {
  const css = await read('components/v2/music-v2.css');
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /@media\(min-width:768px\) and \(max-width:1199px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /v2-live-track-scene/);
  assert.match(css, /v2-album-tracklist/);
  assert.match(css, /v2-playlist-track-row/);
});

test('V2 player keeps all secondary actions reachable at every viewport without adding audio authorities', async () => {
  const [mini, expanded, css] = await Promise.all([
    read('components/FullScreenPlayer.tsx'), read('components/TikTokPlayer.tsx'), read('components/v2/music-v2.css'),
  ]);
  assert.match(mini, /<details className="v2-mini-menu"/);
  assert.match(mini, /if \(event.key === ' '\) event.stopPropagation\(\)/);
  assert.match(mini, /querySelector\('summary'\)\?\.focus\(\)/);
  for (const action of ['trackActions.share', 'setShowTikTok(true)', 'setShowTaste', 'setShowQueue', 'addToUpNext', 'category=feedback', 'category=remix', 'TrackCreateRemixActions']) assert.ok(mini.includes(action), action);
  assert.match(css, /\.v2-mini-menu-panel > :is\(a,button,div\) \{ display:flex!important/);
  assert.match(css, /\.v2-mini-desktop > :not\(details\) \{ display:none/);
  assert.match(css, /\.v2-mini-menu-panel :is\(a,button\) \{ min-height:44px; min-width:44px;/);
  assert.match(mini, /bottom-\[var\(--synaura-primary-dock-space\)\] z-\[60\] lg:bottom-0/);
  assert.doesNotMatch(mini, /sm:bottom-0/);
  assert.doesNotMatch(mini, /new Audio\(|<audio|AudioContext/);
  assert.doesNotMatch(expanded, /new Audio\(|<audio|AudioContext/);
  assert.match(expanded, /waveformPeaks=\{isThis \? trackWaveform.peaks : null\}/);
  assert.match(expanded, /onSeek=\{seek\}/);
  assert.match(expanded, /alignExpandedPlayerQueue\(audioState, merged as any, startIndex, \{ setQueueOnly, setQueueAndPlay \}\)/);
  assert.match(expanded, /SynauraLogo variant="wordmark"/);
  assert.match(expanded, /aria-label="Réduire le lecteur"/);
  assert.match(css, /grid-template:'art meta' minmax\(0,1fr\) 'art actions'/);
});
