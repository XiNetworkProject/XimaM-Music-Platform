import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import postcss from 'postcss';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const load = path => {
  const module = {exports:{}};
  const code = ts.transpileModule(read(path), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  new Function('require','module','exports',code)(id => id === '@/components/celestial/FennecMark' ? load('components/celestial/FennecMark.tsx') : require(id), module, module.exports);
  return module.exports;
};

test('shared vector brand renders at each size with its accessible contract', () => {
  const Logo = load('components/brand/SynauraLogo.tsx').default;
  for (const variant of ['symbol','wordmark','lockup']) for (const size of [24,35,48]) {
    const html = renderToStaticMarkup(React.createElement(Logo,{variant,size}));
    assert.match(html,/role="img" aria-label="Synaura"/);
    assert.match(html,/viewBox="0 0 48 48"/);
    assert.doesNotMatch(html,/NaN|<img|base64/);
    if (variant !== 'symbol') assert.match(html,/Georgia/);
  }
  const hidden = renderToStaticMarkup(React.createElement(Logo,{decorative:true}));
  assert.match(hidden,/aria-hidden="true"/);
  assert.doesNotMatch(hidden,/aria-label/);
});

test('one global design sheet includes every page family without changing structural scroll rules', () => {
  const css = read('components/celestial/celestial-system.css');
  const tree = postcss.parse(css);
  for (const scope of ['syn-app-nav','synaura-pilot','discovery','experience-collection-header','profile-identity-scene','unified-studio','community-hub','city-stage','boost-stage','sx-search','analytics-header','ms-thread','experience-settings-heading','signature-activity-heading','experience-membership-heading','create-sheet','context-surface-panel','listening-dock','recovery-refresh']) assert.ok(css.includes(scope),scope);
  tree.walkDecls(decl => assert.ok(!['touch-action','scroll-snap-type','overscroll-behavior','overflow-y'].includes(decl.prop), `${decl.prop} should remain owned by each product component`));
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/data-moving=false/);
  assert.equal(read('app/layout.tsx').split("import '@/components/celestial/celestial-system.css';").length,2);
  assert.match(read('app/layout.tsx'),/synaura-chambre synaura-celestial/);
});

const luminance = color => {
  const rgb = color.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
test('celestial small text and solid primary buttons meet AA contrast', () => {
  for (const [text,bg] of [['#f6ecdc','#111c2e'],['#bac3d3','#19273c'],['#a0aec4','#19273c'],['#e6c697','#111c2e'],['#172235','#e6c697'],['#ffffff','#745c3e']]) {
    const values = [luminance(text),luminance(bg)].sort((a,b)=>b-a);
    assert.ok((values[0]+.05)/(values[1]+.05)>=4.5,`${text} on ${bg}`);
  }
});

test('home keeps interactive sky, account/tour routes and bounded original sprite cameos', () => {
  const home = read('components/chamber/ChamberProduct.tsx');
  assert.match(home,/!celestial && <ChamberMaterial/);
  assert.match(home,/<AuroraBackdrop paused=\{paused \|\| listening\} pulse=\{pulse\} interactive/);
  assert.equal((home.match(/<FennecGuide/g)||[]).length,4);
  assert.match(home,/active=\{chapter === 2 && !paused\}/);
  assert.match(read('components/chamber/chamber-celestial.css'),/\.cp-celestial \.cp-chapter-friend \{ position:static/);
  assert.match(read('components/enter/PublicChamberEntry.tsx'),/presentationHref="\/landing\/presentation" celestial/);
});

test('decorative assets stay cheap and do not add data, microphone or audio access', () => {
  for (const path of ['components/brand/SynauraLogo.tsx','components/celestial/FennecMark.tsx','components/celestial/CelestialLandmark.tsx','components/v2/ChambreResonance.tsx']) {
    assert.doesNotMatch(read(path),/fetch\(|\/api\/|new Audio|AudioContext|getUserMedia|setInterval|setTimeout/,path);
  }
  assert.ok(statSync(new URL('../public/brand/celestial/sanctuary-v1.webp',import.meta.url)).size<250000);
  assert.match(read('components/ambient/LivingAmbience.tsx'),/pathname === '\/live'/);
  assert.match(read('components/ambient/LivingAmbience.tsx'),/document.hidden/);
  assert.match(read('components/ambient/useLivingMotion.ts'),/prefers-reduced-motion: reduce/);
});

test('web installation keeps its identity while icons and sharing adopt the same signature', async () => {
  const manifest = JSON.parse(read('public/manifest.json'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.theme_color, '#080e1c');
  const sharp = require('sharp');
  for (const size of [180,192,512]) {
    const meta = await sharp(`public/brand/celestial/fennec-${size}.png`).metadata();
    assert.equal(meta.width,size); assert.equal(meta.height,size);
  }
  assert.match(read('app/opengraph-image.tsx'),/FennecMark/);
  assert.doesNotMatch(read('app/opengraph-image.tsx'),/SYNAURA_V2_REFERENCE|fetch\(/);
  assert.match(read('app/layout.tsx'),/apple: '\/brand\/celestial\/fennec-180.png'/);
});
