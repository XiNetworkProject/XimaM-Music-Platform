import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createLiveDoubleTap } from '../lib/liveDoubleTap.ts';

const point=(timeStamp,extra={})=>({timeStamp,clientX:100,clientY:100,pointerId:1,pointerType:'touch',button:0,isPrimary:true,...extra});
function tap(gesture,time,extra={}) { gesture.start(point(time,extra),true);gesture.end(point(time+45,extra)); }
test('double tap/double click fires once, single tap and third tap do not toggle again',()=>{
  for(const pointerType of ['touch','mouse','pen']) {
    let count=0;const g=createLiveDoubleTap(()=>count++);
    tap(g,0,{pointerType});assert.equal(count,0);tap(g,170,{pointerType});assert.equal(count,1);
    tap(g,300,{pointerType});assert.equal(count,1);
    tap(g,470,{pointerType});assert.equal(count,2,'a subsequent pair can remove the like');
  }
});
test('swipe, pinch, controls, cancellation, long press, distance and late taps never like',()=>{
  let count=0;const g=createLiveDoubleTap(()=>count++);
  tap(g,0);g.start(point(170),true);g.move(point(190,{clientY:120}));g.end(point(200,{clientY:100}));assert.equal(count,0);
  tap(g,1000);g.start(point(1160,{isPrimary:false,pointerId:2}),true);g.end(point(1200,{isPrimary:false,pointerId:2}));assert.equal(count,0);
  tap(g,2000);g.start(point(2150),false);g.end(point(2200));assert.equal(count,0);
  tap(g,3000);g.start(point(3150),true);g.reset();g.end(point(3200));assert.equal(count,0);
  tap(g,4000);g.start(point(4150),true);g.end(point(4600));assert.equal(count,0);
  tap(g,5000);tap(g,5190,{clientX:160});assert.equal(count,0);
  g.reset();tap(g,6000);tap(g,6500);assert.equal(count,0);
});

const require=createRequire(import.meta.url);
test('artwork delegates to the existing visible like, not audio or a second mutation',()=>{
  const calls=[],effects=[],states=[],timers=new Map();let observer=null,nextTimer=0;
  const button={disabled:false,pressed:'false',getAttribute(){return this.pressed;},click(){calls.push('click');this.disabled=true;}};
  const dom={closest:()=>({querySelector:()=>button})};
  class Observer {constructor(fn){this.fn=fn;observer=this;}observe(){calls.push('observe');}disconnect(){calls.push('disconnect');}}
  const mocks={
    react:{useRef:v=>({current:v}),useState:v=>[v,next=>states.push(next)],useEffect:fn=>effects.push(fn)},
    'lucide-react':{Heart:()=>null},
    '@/components/ambient/useLivingMotion':{useLivingMotion:()=>({enabled:true})},
    '@/lib/liveDoubleTap':{createLiveDoubleTap},
  };
  const source=readFileSync(new URL('../components/pilot/LiveArtwork.tsx',import.meta.url),'utf8');
  const module={exports:{}};
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','MutationObserver','setTimeout','clearTimeout',compiled)(id=>mocks[id]||require(id),module,module.exports,Observer,fn=>{timers.set(++nextTimer,fn);return nextTimer;},id=>timers.delete(id));
  const tree=module.exports.default({active:true,children:null});tree.ref.current=dom;
  const interact=(time,control=false)=>{const target={closest:()=>control?{}:null};tree.props.onPointerDown({...point(time),target});tree.props.onPointerUp({...point(time+40),target});};
  interact(0);interact(170);assert.equal(calls.filter(c=>c==='click').length,1);assert.deepEqual(states,[],'no fake success before state changes');
  interact(400);interact(560);assert.equal(calls.filter(c=>c==='click').length,1,'pending locks the shortcut');
  button.pressed='true';button.disabled=false;observer.fn();assert.equal(states.at(-1),true);
  interact(1000);interact(1170);button.pressed='false';button.disabled=false;observer.fn();assert.equal(states.at(-1),false);
  const before=calls.filter(c=>c==='click').length;interact(2000,true);interact(2170,true);assert.equal(calls.filter(c=>c==='click').length,before);
  const cleanup=effects[0]();cleanup();assert.equal(timers.size,0);
  assert.doesNotMatch(source,/fetch\(|new Audio|\.play\(|\.pause\(|\.seek\(|preventDefault\(|stopPropagation\(/);
});
