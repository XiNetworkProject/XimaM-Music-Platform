import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { activeLyricLine, lyricLines, lyricSegments, validLyricWords } from '../lib/studio/lyricAlignment.ts';
import { CREATE_TOOLS, CREATE_OTHER_TOOLS } from '../lib/createSurface.ts';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('lyric timings reject malformed payloads and retain a legitimate start at zero', () => {
  const good = [{ word:'Encore', startS:4,endS:5 }, { word:'La',startS:0,endS:1 }];
  assert.deepEqual(validLyricWords([null, {}, { word:'bad',startS:-1,endS:1 }, { word:'zero',startS:1,endS:1 }, { word:'nan',startS:NaN,endS:2 }, ...good]), [good[1], good[0]]);
  assert.deepEqual(validLyricWords(null), []);
});

test('one lyric surface preserves every character, follows seeks and never highlights another line during a pause', () => {
  const text='[Couplet]\nLa ville dort.\n\n[Refrain]\nEncore !';
  const words=validLyricWords([{word:'La',startS:0,endS:1},{word:'ville',startS:1,endS:2},{word:'dort',startS:2,endS:3},{word:'Encore',startS:8,endS:9}]);
  const lines=lyricLines(lyricSegments(text,words));
  assert.equal(lines.flatMap(line=>line.parts.map(part=>part.text)).join(''), text);
  assert.equal(lines[0].start, undefined);
  assert.equal(lines[1].start, 0);
  assert.equal(lines[4].start, 8);
  assert.equal(activeLyricLine(lines, 0), 1);
  assert.equal(activeLyricLine(lines, 4), -1);
  assert.equal(activeLyricLine(lines, 8.2), 4);
  assert.equal(activeLyricLine(lines, 1.5), 1);
  assert.equal(activeLyricLine(lines, 9), -1);
});

test('lyrics follow only the active song, seek from keyboard, and yield to manual scrolling', () => {
  const source=read('components/ai-studio/StudioSyncedLyrics.tsx');
  for(const marker of ['sameStudioTrack(track, playback.track)', 'activeLyricLine', 'playback?.seek(line.start)', "['Enter', ' ']", "addEventListener('touchmove'", "addEventListener('wheel'", "setFollow(false)", 'area.scrollTo', "parent === document.body", 'controller.abort()', 'validLyricWords(data.alignedWords)']) assert.ok(source.includes(marker),marker);
  assert.equal((source.match(/aria-label="Paroles du morceau"/g)||[]).length,1);
  assert.doesNotMatch(source,/new Audio|\.play\(|setInterval/);
});

test('multiline stage directions are preserved but never timed as sung lyrics', () => {
  const text='[Drums filter down\nVocoder stacks up]\nWe go';
  const lines=lyricLines(lyricSegments(text,[{word:'Vocoder',startS:0,endS:1},{word:'We',startS:2,endS:3},{word:'go',startS:3,endS:4}]));
  assert.equal(lines.flatMap(line=>line.parts.map(part=>part.text)).join(''),text);
  assert.equal(lines[0].start,undefined); assert.equal(lines[1].start,undefined);
  assert.equal(lines[2].start,2);
});

test('mobile density does not shrink the page or disable user zoom; advanced filters fold away', () => {
  const css=read('components/ai-studio/studio-mobile.css');
  postcss.parse(css);
  assert.doesNotMatch(css, /(?:^|[;{])\s*zoom\s*:|transform:\s*scale/);
  for(const marker of ['max-width:899px', '--syn-nav-height:52px', '--syn-nav-bottom:64px', 'grid-template-columns:54px minmax(0,1fr) 36px', 'data-filters-open=true', 'prefers-reduced-motion']) assert.ok(css.includes(marker), marker);
  assert.match(read('components/ai-studio/StudioLibrary.tsx'), /aria-expanded=\{filtersOpen\}/);
  assert.match(read('components/ai-studio/UnifiedStudio.tsx'), /import '\.\/studio-mobile.css'/);
});

test('menu stays mounted for exit transitions, restores focus, and dismisses submenus first', () => {
  const menu=read('components/ai-studio/StudioSongMenu.tsx');
  for(const marker of ['open={p.open}', '<AnimatePresence>', 'exit={{ opacity: 0', 'closeOnEscape={!group}', 'p.anchor.focus', 'if (mobile || !p.open) return', "useEffect(() => { if (p.open) setGroup(''); }"]) assert.ok(menu.includes(marker),marker);
  assert.match(read('components/ai-studio/StudioLibrary.tsx'), /onClose=\{\(\) => setMenuOpen\(false\)\}/);
});

test('posts are a primary creation with a real composer destination, not buried in more tools', () => {
  assert.equal(CREATE_TOOLS[0].id,'post');
  assert.equal(CREATE_TOOLS[0].href,'/posts?compose=true');
  assert.ok(!CREATE_OTHER_TOOLS.some(tool=>tool.id==='post'));
  assert.match(read('components/create/CreateSurface.tsx'), /Découvrir les posts/);
  assert.match(read('app/posts/page.tsx'), /focusOnOpen=\{composeRequested\}/);
  assert.match(read('components/PostComposer.tsx'), /composeRef.current\?\.focus\(\{ preventScroll: true \}\)/);
});
