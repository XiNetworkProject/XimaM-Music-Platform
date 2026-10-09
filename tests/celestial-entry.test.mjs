import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import postcss from 'postcss';
import { createRequire } from 'node:module';
import ts from 'typescript';
const read=file=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const require=createRequire(import.meta.url);

test('sprite runtime creates no animation timer when paused, hidden or inactive; cleans up on unmount',()=>{
 const code=ts.transpileModule(read('components/celestial/FennecSprite.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 for(const scenario of [{enabled:true,visible:true,active:true,expected:1},{enabled:false,visible:true,active:true,expected:0},{enabled:true,visible:false,active:true,expected:0},{enabled:true,visible:true,active:false,expected:0}]) {
  const effects=[],module={exports:{}};let state=0,timers=0,cleared=0,disconnected=0;
  const mocks={react:{useRef:()=>({current:{}}),useState:value=>[state++===0?scenario.visible:value,()=>{}],useEffect:fn=>effects.push(fn)},'@/components/ambient/useLivingMotion':{useLivingMotion:()=>({enabled:scenario.enabled})},'@/public/companions/fennec/atlas.json':JSON.parse(read('public/companions/fennec/atlas.json')),'@/public/companions/fennec/animations.json':JSON.parse(read('public/companions/fennec/animations.json'))};
  new Function('require','exports','module','IntersectionObserver','setInterval','clearInterval',code)(id=>id in mocks?mocks[id]:require(id),module.exports,module,class{observe(){} disconnect(){disconnected++}},()=>++timers,()=>cleared++);
  const output=module.exports.default({pose:'tail',active:scenario.active});
  assert.equal(output.props['aria-hidden'],'true');
  const cleanup=effects.map(fn=>fn());assert.equal(timers,scenario.expected);
  cleanup.forEach(fn=>fn?.());assert.equal(cleared,scenario.expected);assert.equal(disconnected,1);
 }
});

test('celestial cameos use the original sprite atlas and suspend when invisible or motion is off',()=>{
 const sprite=read('components/celestial/FennecSprite.tsx');
 assert.match(sprite,/@\/public\/companions\/fennec\/animations.json/);
 assert.match(sprite,/url\(\/companions\/fennec\/atlas.webp\)/);
 assert.match(sprite,/IntersectionObserver/);
 assert.match(sprite,/!enabled \|\| !visible \|\| !active/);
 assert.match(sprite,/clearInterval\(timer\)/);
 assert.match(sprite,/observer.disconnect\(\)/);
 assert.match(sprite,/aria-hidden="true"/);
});

test('decor and guides never read credentials, fetch data, mutate audio or auto-navigate',()=>{
 for(const file of ['CelestialHome','CelestialWorld','FennecSprite','FennecGuide']) {
  const code=read(`components/celestial/${file}.tsx`);
  assert.doesNotMatch(code,/fetch\(|new Audio|AudioContext|signIn\(|\/api\/|router\.(push|replace)/,file);
 }
 const auth=read('components/enter/EntryFrame.tsx');
 assert.match(auth,/event.target.type === 'password'/);
 assert.doesNotMatch(auth,/target.value|FormData|fetch\(/);
 const companion=read('components/companion/FennecCompanion.tsx');
 assert.match(companion,/\[data-fennec-host\]/);
 assert.match(companion,/synaura:companion-open/);
});

test('new sanctuary is a bounded web asset; all styles parse with responsive and motion fallbacks',()=>{
 assert.ok(statSync(new URL('../public/brand/celestial/sanctuary-v1.webp',import.meta.url)).size<250000);
 for(const name of ['celestial','celestial-story','celestial-live','celestial-onboarding']) {
  const css=read(`components/celestial/${name}.css`);
  assert.doesNotThrow(()=>postcss.parse(css));
  assert.match(css,/@media/);
 }
 const css=read('components/celestial/celestial.css');
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
 assert.match(css,/data-moving=false/);
});

test('home offers a direct entry and a separate skippable tour with safe callback',()=>{
 const home=read('components/celestial/CelestialHome.tsx');
 assert.match(home,/href="\/enter"/);
 assert.match(home,/href="\/auth\/signin"/);
 const story=read('components/enter/SynauraPresentation.tsx');
 assert.match(story,/Passer la présentation/);
 assert.match(story,/encodeURIComponent\(callbackUrl\)/);
 assert.match(story,/slide.inert = index !== active/);
 assert.match(story,/ResizeObserver/);
 assert.doesNotMatch(story,/setInterval|setTimeout|new Audio/);
 assert.match(read('app/landing/presentation/page.tsx'),/safeEntryTarget/);
});

test('Live still uses the same feed anchor and guide is read-only',()=>{
 const entry=read('components/pilot/PilotLiveEntry.tsx');
 assert.match(entry,/model.items\[model.activeIndex\]/);
 assert.match(entry,/model.playIndex\(model.activeIndex\)/);
 assert.match(entry,/const enter = \(\) => model.enterFeed\(\)/);
 assert.match(entry,/FennecGuide compact help/);
 assert.doesNotMatch(entry,/setQueue|new Audio|<audio|fetch\(/);
 assert.match(read('components/pilot/PilotLive.tsx'),/index === model.activeIndex && !model.entryOpen/);
});
