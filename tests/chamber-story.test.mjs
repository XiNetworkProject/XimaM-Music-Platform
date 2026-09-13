import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHAMBER_CHAPTERS, LAST_CHAMBER_CHAPTER, chapterAtScroll, progressAtScroll } from '../components/chamber/chamberStory.ts';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const ids = ['ressentir', 'synaura', 'explorer', 'creer', 'rencontrer', 'ecouter'];
const labels = ['Ressentir', 'Synaura', 'Explorer', 'Créer', 'Rencontrer', 'Écouter'];

test('Story has exactly five introductory chapters followed by the listening room', () => {
  assert.equal(CHAMBER_CHAPTERS.length, 6);
  assert.equal(LAST_CHAMBER_CHAPTER, 5);
  assert.deepEqual(CHAMBER_CHAPTERS.map(chapter => chapter.id), ids);
  assert.deepEqual(CHAMBER_CHAPTERS.map(chapter => chapter.label), labels);
  assert.equal(new Set(CHAMBER_CHAPTERS.map(chapter => chapter.id)).size, 6);
  assert.deepEqual(CHAMBER_CHAPTERS.slice(0, 5).map(chapter => chapter.id), ids.slice(0, 5));
  assert.equal(CHAMBER_CHAPTERS[5].id, 'ecouter');
});

test('Chapter positions map consistently at desktop and mobile viewport heights', () => {
  for (const height of [360, 390, 844, 900, 1080]) {
    for (let index = 0; index < 6; index++) {
      assert.equal(chapterAtScroll(index * height, height), index, `height ${height}, chapter ${index}`);
      assert.ok(Math.abs(progressAtScroll(index * height, height) - index / 5) < 1e-12);
    }
  }
});

test('Active chapter follows the nearest viewport while progress remains continuous', () => {
  const height = 800;
  assert.equal(chapterAtScroll(height * .49, height), 0);
  assert.equal(chapterAtScroll(height * .51, height), 1);
  assert.equal(chapterAtScroll(height * 4.49, height), 4);
  assert.equal(chapterAtScroll(height * 4.51, height), 5);
  assert.equal(progressAtScroll(height * 2.5, height), .5);
});

test('Native free scrolling beyond the last slide keeps chapter six and saturated progress', () => {
  for (const position of [5000, 7000, 20000, Number.MAX_SAFE_INTEGER]) {
    assert.equal(chapterAtScroll(position, 1000), 5);
    assert.equal(progressAtScroll(position, 1000), 1);
  }
});

test('Invalid, overscrolled and unmeasured coordinates remain finite and safe', () => {
  const invalidCases = [
    [-1, 800], [-Infinity, 800], [Infinity, 800], [NaN, 800],
    [100, 0], [100, -800], [100, Infinity], [100, NaN],
    [0, 0], [undefined, undefined], [null, null],
  ];
  for (const [position, height] of invalidCases) {
    assert.equal(chapterAtScroll(position, height), 0, `${String(position)} / ${String(height)}`);
    assert.equal(progressAtScroll(position, height), 0, `${String(position)} / ${String(height)}`);
  }
});

test('Story progress is monotonic, bounded and yields only valid chapter indices', () => {
  let previous = 0;
  for (let position = 0; position <= 7000; position += 17) {
    const progress = progressAtScroll(position, 844);
    const chapter = chapterAtScroll(position, 844);
    assert.ok(progress >= previous && progress >= 0 && progress <= 1);
    assert.ok(Number.isInteger(chapter) && chapter >= 0 && chapter <= 5);
    previous = progress;
  }
});

test('Story navigation neither hijacks wheel/touch gestures nor mutates musical playback', async () => {
  const source = await read('components/chamber/ChamberProduct.tsx');
  assert.doesNotMatch(source, /addEventListener\(\s*['"](?:wheel|touchstart|touchmove|touchend)['"]/);
  assert.doesNotMatch(source, /onWheel=|onTouchMove=|onTouchStart=/);
  assert.doesNotMatch(source, /preventDefault\s*\(/);
  assert.doesNotMatch(source, /<audio\b|new\s+(?:Audio|AudioContext|AudioCore)\s*\(|\.play\(|\.pause\(|\.seek\(|setQueueAndPlay|setQueueOnly/);
  assert.match(source, /addEventListener\('scroll',[\s\S]*?passive: true/);
});

test('Story preserves the listening component and its activated-query latch on return to intro', async () => {
  const source = await read('components/chamber/ChamberProduct.tsx');
  assert.equal((source.match(/<ChamberListening\b/g) || []).length, 1);
  assert.match(source, /<ChamberListening enabled=\{entered\}/);
  assert.doesNotMatch(source, /setEntered\(false\)/);
  assert.doesNotMatch(source, /(?:entered|chapter|activeChapter)\s*&&\s*<ChamberListening/);
  assert.doesNotMatch(source, /<ChamberListening[^>]*\bkey=/);
  assert.match(source, /chapterAtScroll\(/);
  assert.match(source, /progressAtScroll\(/);
});

test('Direct listening and skip controls remain available without forcing the five-slide tour', async () => {
  const source = await read('components/chamber/ChamberProduct.tsx');
  assert.match(source, /Aller directement aux morceaux/);
  assert.match(source, /goToChapter\(LAST_CHAMBER_CHAPTER\)/);
  assert.match(source, /id="chamber-listening"/);
  assert.match(source, /aria-label="Navigation Synaura"/);
  assert.match(source, /aria-current=/);
});

test('Native snap story has an accessible reduced-motion path', async () => {
  const [source, baseCss, storyCss] = await Promise.all([read('components/chamber/ChamberProduct.tsx'), read('components/chamber/chamber-product.css'), read('components/chamber/chamber-story.css')]);
  const css = baseCss + '\n' + storyCss;
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /behavior:\s*paused\s*\?\s*'instant'\s*:\s*'smooth'/);
  assert.match(css, /scroll-snap-type\s*:\s*y\s+(?:mandatory|proximity)/);
  assert.match(css, /scroll-snap-align\s*:\s*start/);
  assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(css, /scroll-behavior\s*:\s*auto/);
});

test('Native sections declare the six intended IDs in order, with keyboard focus destinations', async () => {
  const source = await read('components/chamber/ChamberProduct.tsx');
  const sections = [...source.matchAll(/<section\b[^\r\n]*id="(chamber-[^"]+)"[^\r\n]*>/g)];
  assert.deepEqual(sections.map(match => match[1]), ['chamber-ressentir', 'chamber-synaura', 'chamber-explorer', 'chamber-creer', 'chamber-rencontrer', 'chamber-listening']);
  for (const match of sections) assert.match(match[0], /tabIndex=\{-1\}/);
  assert.match(source, /panel\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /CHAMBER_CHAPTERS\.map\(\(item, index\)/);
});

test('Catalog activation comes only from reaching or explicitly targeting the final chapter', async () => {
  const source = await read('components/chamber/ChamberProduct.tsx');
  assert.match(source, /if \(nextChapter === LAST_CHAMBER_CHAPTER\) setEntered\(true\)/);
  assert.match(source, /if \(next === LAST_CHAMBER_CHAPTER\) setEntered\(true\)/);
  assert.match(source, /href="#chamber-listening" onClick=\{\(\) => setEntered\(true\)\}/);
  assert.equal((source.match(/setEntered\(true\)/g) || []).length, 3);
});

test('Scroll positions use actual section offsets and are recalculated on resize', async () => {
  const source = await read('components/chamber/ChamberProduct.tsx');
  assert.match(source, /const start = panels\[lower\]\?\.offsetTop/);
  assert.match(source, /const end = panels\[lower \+ 1\]\?\.offsetTop/);
  assert.match(source, /new ResizeObserver\(onScroll\)/);
  assert.match(source, /observer\.observe\(root\)/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.doesNotMatch(source, /root\.scrollTop\s*\/\s*root\.clientHeight/);
});

test('Introductory typography cannot override the existing sixth-chapter listening layout', async () => {
  const css = await read('components/chamber/chamber-story.css');
  assert.doesNotMatch(css, /\.cp-story-panel\s+(?:h2|\.cp-eyebrow)\b/, 'Story type rules must explicitly exclude .cp-listening-section.');
});
