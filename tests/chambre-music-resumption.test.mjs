import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('expanded Chambre keeps actual Aura media gates and has a noninteractive material composition', async () => {
  const source = await read('components/TikTokPlayer.tsx');
  const aura = source.slice(source.indexOf('function AuraVisualLayer('), source.indexOf('function insertRadioTracks('));
  assert.match(aura, /data-aura-enabled=\{visualEnabled\} data-aura-moving=\{animated\} aria-hidden="true"/);
  assert.match(aura, /const visualEnabled = enabled && track.auraVisualEnabled !== false/);
  assert.match(aura, /const animated = visualEnabled && playing && active && !reduceMotion/);
  assert.match(aura, /visualEnabled && shouldRenderVideo && visual/);
  assert.match(aura, /src=\{visual\}[\s\S]*active=\{active\}[\s\S]*playing=\{playing\}/);
  assert.match(aura, /visualEnabled && \(cover \|\| poster\)/);
  assert.match(aura, /className="chambre-aura-membrane"/);
  assert.doesNotMatch(aura, /onClick|onPointer|new Audio|AudioContext|WebGLRenderer/);
  assert.match(source, /className="chambre-player-room-label" aria-hidden="true"/);
  assert.match(source, /className="chambre-player-base absolute inset-0 -z-10 overflow-hidden" aria-hidden="true"/);
});

test('new room CSS is parse-clean, source hues cannot recreate legacy backdrop, and Aura off remains off', async () => {
  const css = await read('components/v2/music-v2.css');
  assert.doesNotThrow(() => postcss.parse(css));
  const resumed = css.slice(css.indexOf('/* CHAMBRE RESUMPTION'));
  assert.match(resumed, /\.chambre-player-base > \* \{ display:none; \}/);
  assert.match(resumed, /\.v2-expanded-player \.chambre-aura-source \{[^}]*filter:grayscale\(1\)/);
  assert.match(resumed, /\.chambre-aura-light-a \{ background:radial-gradient\([^}]*!important/);
  assert.match(resumed, /data-aura-enabled="false"[^}]*opacity:0/);
  assert.match(resumed, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(resumed, /animation:[^;}]*infinite|backdrop-filter:blur|blur-\[/);
});

test('Aura drift never overrides the subtle source opacity while preserving its exact movement and timing', async () => {
  const source = await read('components/TikTokPlayer.tsx');
  const style = source.match(/<style>\{`([\s\S]*?@keyframes synauraAuraDrift[\s\S]*?)`\}<\/style>/)?.[1];
  assert.ok(style, 'the actual player animation style must exist');
  const stylesheet = postcss.parse(style);
  const drift = [];
  stylesheet.walkAtRules('keyframes', rule => {
    if (rule.params === 'synauraAuraDrift') drift.push(rule);
  });
  assert.equal(drift.length, 1);
  assert.deepEqual(drift[0].nodes.map(rule => ({
    selector: rule.selector,
    declarations: rule.nodes.map(declaration => [declaration.prop, declaration.value]),
  })), [
    { selector: '0%, 100%', declarations: [['transform', 'scale(1.18) translate3d(0,0,0)']] },
    { selector: '50%', declarations: [['transform', 'scale(1.26) translate3d(-1.5%,1.2%,0)']] },
  ]);
  const animation = [];
  stylesheet.walkRules('.synaura-aura-drift', rule => rule.walkDecls('animation', declaration => animation.push(declaration.value)));
  assert.deepEqual(animation, ['synauraAuraDrift 14s ease-in-out infinite']);
});

test('mobile Track and Discovery reuse the same native play actions in compact first-screen compositions', async () => {
  const [track, discover, css] = await Promise.all([
    read('app/track/[id]/TrackPageClient.tsx'), read('app/discover/DiscoverClient.tsx'), read('components/v2/music-v2.css'),
  ]);
  assert.equal((track.match(/onClick=\{handlePlay\}/g) || []).length, 1);
  assert.equal((discover.match(/onClick=\{toggle\}/g) || []).length, 1);
  assert.match(track, /className="track-artist"/);
  assert.match(track, /className="track-main-actions flex flex-wrap"/);
  const resumed = css.slice(css.indexOf('/* CHAMBRE RESUMPTION'));
  assert.match(resumed, /\.v2-discover-lead \{ display:grid; grid-template-columns:minmax\(102px,\.72fr\) minmax\(0,1.28fr\)/);
  assert.match(resumed, /\.v2-track-identity-grid \{ display:grid; grid-template-columns:minmax\(108px,\.75fr\) minmax\(0,1.25fr\)/);
  assert.match(resumed, /\[data-track-actions-row\] \{ grid-column:1\/-1/);
  assert.doesNotMatch(resumed, /(?:\.v2-track|\.v2-discover)[^}]+display:none/);
});
