import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import ts from 'typescript';
import vm from 'node:vm';
import {secondaryPaths, secondaryBehavior} from './helpers/secondary-presentation.mjs';
import {usesUnifiedNavigation} from '../lib/unifiedNavigation.ts';
import {cityControllerFingerprint} from './helpers/city-controller.mjs';

const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Recorded from pre-edit files, including existing user changes, not the candidate.
const baselines=JSON.parse(read('tests/helpers/secondary-presentation-baseline.json'));

// The Library LF digest was recomputed from its archived PRE-edit source, not
// accepted from the candidate. The old 62e62a4b... included raw CRLF in a CSS
// template literal. Preserve semantic checks across Windows/Linux checkouts.
test('Library behavioral fingerprint ignores only line endings, not actions',()=>{
  const path='app/library/LibraryClient.tsx', source=read(path).replaceAll('\r\n','\n');
  assert.equal(secondaryBehavior(path,source),secondaryBehavior(path,source.replaceAll('\n','\r\n')));
  assert.ok(source.includes("setTab('queue')"));
  assert.notEqual(secondaryBehavior(path,source),secondaryBehavior(path,source.replace("setTab('queue')","setTab('recent')")));
});
test('challenge detail uses the existing shared navigation, not the old dock',()=>{
  assert.equal(usesUnifiedNavigation('/challenges/defi-open-carte-blanche'),true);
  assert.equal(usesUnifiedNavigation('/challenges-extra'),false);
  assert.equal(usesUnifiedNavigation('/'),false);
});
for (const path of secondaryPaths) {
  test(`secondary visual redraw preserves business code, actions and destinations: ${path}`,()=>{
    // City was subsequently recomposed at the user's request. Its committed
    // pre-redesign controller fingerprint and executable UI tests replace the
    // obsolete presentation-order assertion for this one route only.
    if (path === 'components/city/SynauraCityPage.tsx') {
      assert.equal(cityControllerFingerprint(read(path)), read('tests/helpers/city-controller-before.sha256').trim());
      return;
    }
    // User-requested Boosters functional redesign has executable policy and
    // PostgreSQL transaction fixtures instead of the obsolete visual-only hash.
    if (path === 'app/boosters/BoostersClient.tsx') {
      const source = read(path);
      for (const marker of ['useBoosters()', 'useOnTrack', 'useOnArtist', 'Confirmer l’activation', 'state?.eligible']) assert.ok(source.includes(marker), marker);
      return;
    }
    assert.equal(secondaryBehavior(path,read(path)),baselines[path]);
  });
}

test('secondary CSS is scoped and never introduces a second scrolling viewport',()=>{
  const css=postcss.parse(read('components/experience/secondary-experience.css'));
  css.walkRules(rule=>{
    if(rule.parent.type==='atrule' && rule.parent.name==='keyframes') return;
    for (const selector of rule.selectors) assert.ok(selector.includes('.experience-refresh'),selector);
  });
  css.walkDecls(d=>{
    if(d.prop==='overflow-y') assert.ok(!['scroll','auto'].includes(d.value));
    if(d.prop==='position') assert.notEqual(d.value,'fixed');
  });
});

test('room decoration responds to global pause, reduced motion and lifecycle constraints',()=>{
  const css=read('components/experience/secondary-experience.css');
  assert.match(css,/animation-play-state: paused/);
  assert.match(css,/body:has\(\.living-ambience\[data-moving="true"\]\)/);
  assert.match(css,/body:has\(\.living-ambience\[data-moving="false"\]\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css,/url\(|@import|100vh/);
  const layout=read('app/layout.tsx');
  assert.equal(layout.split("import '@/components/experience/secondary-experience.css';").length,2);
});

test('public clip respects intrinsic framing, metadata and explicit native playback',()=>{
  const source=read('app/clips/[id]/page.tsx');
  const css=read('components/experience/secondary-experience.css');
  assert.match(source,/src=\{clip\.videoUrl\}/);
  assert.match(source,/poster=\{clip\.posterUrl/);
  assert.match(source,/controls\s+playsInline\s+preload="metadata"/);
  const video=source.match(/<PublicClipVideo\b[\s\S]*?\/>/)?.[0];
  assert.ok(video);
  assert.doesNotMatch(video,/autoPlay|\bmuted\b|aspect-\[9\/16\]|object-cover/);
  assert.doesNotMatch(source,/new Audio/);
  assert.match(css,/video\.clip-refresh-video[^}]+height: auto[^}]+object-fit: contain !important; aspect-ratio: var\(--clip-source-ratio, auto\) !important/s);
});

function nativeVideo(props) {
  const source=read('components/clips/PublicClipVideo.tsx');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:name=>{
    assert.equal(name,'react/jsx-runtime');
    return {jsx:(type,props)=>({type,props})};
  }});
  return exports.default(props);
}

test('clip sizing adapter keeps one native video and all playback props',()=>{
  const props={src:'/example.mp4',poster:'/poster.jpg',controls:true,playsInline:true,preload:'metadata'};
  const video=nativeVideo(props);
  assert.equal(video.type,'video');
  for(const [key,value] of Object.entries(props)) assert.equal(video.props[key],value);
  assert.equal(video.props.autoPlay,undefined);
  assert.equal(video.props.muted,undefined);
  assert.doesNotMatch(read('components/clips/PublicClipVideo.tsx'),/fetch\(|new Audio|\.play\(|\.pause\(|currentTime|useEffect|setInterval/);
});

test('vertical, horizontal and rotated clip metadata size the element without audio mutation',()=>{
  const video=nativeVideo({controls:true});
  const ratios=[];
  const element={videoWidth:720,videoHeight:1280,style:{setProperty:(name,value)=>ratios.push([name,value])}};
  video.props.ref(element);
  element.videoWidth=1280; element.videoHeight=720;
  video.props.onLoadedMetadata({currentTarget:element});
  element.videoWidth=1080; element.videoHeight=1080;
  video.props.onResize({currentTarget:element});
  assert.deepEqual(ratios,[['--clip-source-ratio','720 / 1280'],['--clip-source-ratio','1280 / 720'],['--clip-source-ratio','1080 / 1080']]);
});

test('missing or invalid clip dimensions leave the safe CSS fallback unchanged',()=>{
  const video=nativeVideo({});
  video.props.ref(null);
  for(const [w,h] of [[0,0],[-1,720],[720,NaN],[Infinity,720]]) {
    video.props.ref({videoWidth:w,videoHeight:h,style:{setProperty:()=>assert.fail('invalid ratio')}});
  }
});

test('composer controls expose their intention and inputs without submitting',()=>{
  const source=read('app/community/forum/new/page.tsx');
  assert.match(source,/aria-pressed=\{active\}/);
  assert.match(source,/aria-label="Titre de la discussion"/);
  assert.match(source,/aria-label="Texte de la discussion"/);
  assert.match(source,/<DraftRecovery/);
  assert.match(source,/if \(submitLock.current\) return/);
});

test('publication keeps gated steps and contextual events optional',()=>{
  const source=read('app/upload/page.tsx');
  assert.match(source,/<details className="upload-extra"><summary>Publier pour un événement/);
  assert.match(source,/disabled=\{!enabled\}/);
  assert.match(source,/aria-current=\{active \? 'step'/);
  assert.match(source,/aria-label="Choisir le fichier audio"/);
  assert.match(source,/aria-pressed=\{releaseType === type\}/);
});
