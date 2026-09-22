import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';

const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const items=[{id:'foryou',name:'Pour vous'},{id:'new',name:'Nouveaux'},{id:'clips',name:'Clips'},{id:'creators',name:'Artistes'},{id:'challenges',name:'Défis'}];
function setup(animated=true){
  const effects=[],calls=[],scrolls=[],focused=[],captures=new Set();
  const module={exports:{}};
  const output=ts.transpileModule(read('components/pilot/LiveFilters.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const mocks={react:{useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)}};
  new Function('require','module','exports',output)(id=>mocks[id]||require(id),module,module.exports);
  const tree=module.exports.default({items,active:'clips',onSelect:id=>calls.push(id),animated});
  const buttons=items.map((item,index)=>({offsetLeft:16+index*85,offsetWidth:65,focus:options=>focused.push([index,options])}));
  const rail={clientWidth:300,scrollWidth:460,scrollLeft:0,dataset:{},scrollTo:options=>scrolls.push(options),querySelector:()=>buttons[2],querySelectorAll:()=>buttons,setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),removeAttribute:()=>{delete rail.dataset.dragging;}};
  tree.ref.current=rail;
  const event=(extra={})=>({pointerId:1,pointerType:'mouse',button:0,clientX:100,clientY:20,currentTarget:rail,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra});
  return {tree,rail,buttons,calls,scrolls,focused,captures,event,effects};
}

test('filter rail preserves explicit selection and accessible labels, not a new data controller',()=>{
  const s=setup();const buttons=s.tree.props.children;
  assert.equal(s.tree.props['aria-label'],'Choisir le fil Live');assert.equal(buttons.length,5);
  assert.deepEqual(buttons.map(b=>b.props['aria-pressed']),[false,false,true,false,false]);assert.deepEqual(s.calls,[]);
  buttons[3].props.onClick();assert.deepEqual(s.calls,['creators']);
  assert.doesNotMatch(read('components/pilot/LiveFilters.tsx'),/fetch\(|AudioCore|onTouchStart|onTouchEnd|\.play\(|\.pause\(|\.seek\(/);
});

test('mouse drag moves only the filter rail and suppresses the release click',()=>{
  const s=setup();s.tree.props.onPointerDown(s.event());
  s.tree.props.children[1].props.onFocus({currentTarget:s.buttons[1]});assert.equal(s.scrolls.length,0,'pointer focus must not recenter beneath a drag');
  const move=s.event({clientX:40});s.tree.props.onPointerMove(move);assert.equal(s.rail.scrollLeft,60);assert.equal(move.prevented,true);assert.equal(s.captures.size,1);
  s.tree.props.onPointerUp(s.event({clientX:40}));assert.equal(s.captures.size,0);
  const click=s.event({detail:1});s.tree.props.onClickCapture(click);assert.equal(click.prevented,true);assert.equal(click.stopped,true);assert.deepEqual(s.calls,[]);
  s.tree.props.onPointerDown(s.event());s.tree.props.onPointerMove(s.event({clientX:102}));s.tree.props.onPointerUp(s.event({clientX:102}));
  const tap=s.event({detail:1});s.tree.props.onClickCapture(tap);assert.equal(tap.stopped,undefined);s.tree.props.children[1].props.onClick();assert.deepEqual(s.calls,['new']);
});

test('native touch scroll and vertical gestures are not intercepted; cancellation releases capture',()=>{
  for(const pointerType of ['touch','pen']){
    const s=setup();s.tree.props.onPointerDown(s.event({pointerType}));const move=s.event({pointerType,clientX:25});s.tree.props.onPointerMove(move);
    assert.equal(move.prevented,undefined);assert.equal(s.rail.scrollLeft,0);assert.equal(s.captures.size,0);assert.deepEqual(s.calls,[]);
  }
  const s=setup();s.tree.props.onPointerDown(s.event());const vertical=s.event({clientX:103,clientY:60});s.tree.props.onPointerMove(vertical);assert.equal(vertical.prevented,undefined);assert.equal(s.rail.scrollLeft,0);
  s.tree.props.onPointerDown(s.event());s.tree.props.onPointerMove(s.event({clientX:35}));s.tree.props.onPointerCancel(s.event());assert.equal(s.captures.size,0);assert.equal(s.rail.dataset.dragging,undefined);
});

test('keyboard reveals all filters without changing the feed until activation, reduced motion uses auto',()=>{
  const s=setup(false);s.effects[0]();assert.equal(s.scrolls.at(-1).behavior,'auto');
  const arrow=s.event({key:'ArrowRight',target:s.buttons[2]});s.tree.props.onKeyDown(arrow);assert.equal(arrow.prevented,true);assert.equal(s.focused.at(-1)[0],3);assert.deepEqual(s.calls,[]);
  s.tree.props.onKeyDown(s.event({key:'End',target:s.buttons[3]}));assert.equal(s.focused.at(-1)[0],4);assert.equal(s.scrolls.at(-1).left,160);
  s.tree.props.onKeyDown(s.event({key:'Home',target:s.buttons[4]}));assert.equal(s.focused.at(-1)[0],0);assert.equal(s.scrolls.at(-1).left,0);
  s.tree.props.children[0].props.onClick();assert.deepEqual(s.calls,['foryou']);
});

test('blur rasters escape the global width clamp; only the horizontal filter rail can scroll',()=>{
  const ast=postcss.parse(read('components/pilot/live-ambience.css'));
  const overscan=[];ast.walkDecls('max-width',decl=>{if(decl.value==='none')overscan.push(decl.parent.selector);});
  for(const layer of ['.live-cover-world','.live-cover-aura','.live-swipe-bloom'])assert.ok(overscan.some(selector=>selector.includes(layer)),layer);
  const rules=[];ast.walkRules(rule=>{if(rule.selector?.includes('.live-filters')&&rule.nodes.some(n=>n.prop==='overflow-x'))rules.push(rule);});
  assert.equal(rules.length,1);assert.ok(rules[0].nodes.some(n=>n.prop==='overflow-x'&&n.value==='auto'));assert.ok(rules[0].nodes.some(n=>n.prop==='overflow-y'&&n.value==='hidden'));
  assert.match(read('components/pilot/live-ambience.css'),/inset:calc\(-2 \* var\(--live-cover-blur,60px\) - 24px\)/);
  assert.match(read('components/pilot/live-ambience.css'),/\.live-filters button::before \{ content:none; \}/);
});
