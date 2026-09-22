import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import postcss from 'postcss';
import { DEFAULT_LIVE_AMBIENCE, normalizeLiveAmbience, liveItemCover, liveParticlePaths } from '../lib/liveAmbience.ts';

const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function compile(path,mocks,globals={}) {
  const module={exports:{}};
  const output=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',...Object.keys(globals),output)(id=>mocks[id]||require(id),module,module.exports,...Object.values(globals));
  return module.exports;
}

test('ambience preferences reject corrupt storage and bound every customizable cost',()=>{
  for(const value of [null,undefined,'bad',[],{halo:NaN,pulse:Infinity,blur:'80'}]) assert.deepEqual(normalizeLiveAmbience(value),DEFAULT_LIVE_AMBIENCE);
  assert.deepEqual(normalizeLiveAmbience({halo:200,blur:0,darkness:100,pulse:-20,transition:1000,particles:300,parallax:false}),{...DEFAULT_LIVE_AMBIENCE,halo:100,blur:24,darkness:85,pulse:0,transition:650,particles:16,parallax:false});
  assert.equal(normalizeLiveAmbience({particles:3.8}).particles,4);
  const settings=normalizeLiveAmbience({musicParticles:1000,particleSpeed:-10,particleSize:500,particleLight:NaN,sensitivity:200});
  assert.equal(settings.musicParticles,16);assert.equal(settings.particleSpeed,0);assert.equal(settings.particleSize,100);assert.equal(settings.particleLight,DEFAULT_LIVE_AMBIENCE.particleLight);assert.equal(settings.sensitivity,100);
});

test('ambience uses the visible entity artwork, including clip and post identities',()=>{
  const track={coverUrl:'/track.jpg'};
  assert.equal(liveItemCover({type:'track',track}),'/track.jpg');
  assert.equal(liveItemCover({type:'clip',track,clip:{posterUrl:'/clip.jpg'}}),'/clip.jpg');
  assert.equal(liveItemCover({type:'post',post:{image_url:'/post.jpg',track:{cover_url:'/source.jpg'}}}),'/post.jpg');
  assert.equal(liveItemCover({type:'post',post:{track:{cover_url:'/source.jpg'}}}),'/source.jpg');
  assert.equal(liveItemCover({type:'artist_spotlight',artist:{avatar:'/artist.jpg'},track}),'/artist.jpg');
  assert.equal(liveItemCover({type:'collection',collection:{bannerUrl:'/collection.jpg'}}),'/collection.jpg');
  assert.equal(liveItemCover({type:'announcement'}),null);assert.equal(liveItemCover(),null);
});

const {measureLiveAudio,LiveAudioAnalyser}=compile('lib/audio/LiveAudioAnalyser.ts',{});
test('real PCM and FFT detect bass, dynamics and silence without waveform approximation',()=>{
  const pcm=new Float32Array(1024),fft=new Float32Array(512).fill(-Infinity);
  assert.deepEqual(measureLiveAudio(pcm,fft,48000),{energy:0,bass:0,rms:0});
  pcm.fill(.1);const quiet=measureLiveAudio(pcm,fft,48000);assert.ok(quiet.energy>0);
  fft[2]=-12;const bass=measureLiveAudio(pcm,fft,48000);assert.ok(bass.energy>quiet.energy);assert.ok(bass.bass>0);
  pcm.fill(.3);assert.ok(measureLiveAudio(pcm,fft,48000).energy>bass.energy);
  pcm.fill(0);assert.equal(measureLiveAudio(pcm,fft,48000).energy,0,'stale FFT cannot pulse during silence');
  pcm.fill(NaN);assert.equal(measureLiveAudio(pcm,fft,48000).energy,0);
});

test('stream tap never routes to speakers and cleans up pause, source switches and disposal',async()=>{
  const frames=[],statuses=[],queue=new Map(),connections=[];let seq=0,stops=0,closed=0,captures=0,amplitude=.2;
  const analyser={disconnect(){},getFloatTimeDomainData:a=>a.fill(amplitude),getFloatFrequencyData:a=>a.fill(-24)};
  const context=Object.assign(new EventTarget(),{state:'suspended',sampleRate:48000,createAnalyser:()=>analyser,resume:async()=>{context.state='running';},close:async()=>{closed++;},createMediaStreamSource:()=>({connect:target=>connections.push(target),disconnect(){}})});
  const media=Object.assign(new EventTarget(),{readyState:4,captureStream:()=>{captures++;const track={readyState:'live',stop(){stops++;}};return Object.assign(new EventTarget(),{getAudioTracks:()=>[track],getTracks:()=>[track]});}});
  const tap=new LiveAudioAnalyser(value=>frames.push(value),status=>statuses.push(status),{context:()=>context,request:fn=>{queue.set(++seq,fn);return seq;},cancel:id=>queue.delete(id)});
  const tick=time=>{const [id,fn]=[...queue][0];queue.delete(id);fn(time);};
  tap.setMedia(media);tap.setActive(true);assert.equal(captures,0);assert.equal(statuses.at(-1),'waiting');
  tap.activate();await Promise.resolve();assert.equal(captures,1);assert.equal(statuses.at(-1),'listening');assert.deepEqual(connections,[analyser]);
  tick(16);const first=frames.at(-1).energy;assert.ok(first>0);amplitude=.4;tick(32);assert.ok(frames.at(-1).energy>first);
  amplitude=0;tick(48);assert.equal(frames.at(-1).energy,0);
  media.dispatchEvent(new Event('emptied'));assert.equal(queue.size,0);assert.equal(stops,1);
  media.dispatchEvent(new Event('loadeddata'));assert.equal(captures,2);assert.equal(queue.size,1);
  tap.setActive(false);assert.equal(queue.size,0);assert.equal(frames.at(-1).energy,0);assert.equal(stops,2);
  tap.setActive(true);assert.equal(captures,3);tap.dispose();assert.equal(queue.size,0);assert.equal(stops,3);assert.equal(closed,1);
  media.dispatchEvent(new Event('playing'));assert.equal(captures,3,'all media listeners removed');
  assert.doesNotMatch(read('lib/audio/LiveAudioAnalyser.ts'),/createMediaElementSource|connect\([^)]*destination|new Audio\(|getUserMedia|fetch\(|\.play\(|\.pause\(|\.seek\(/);
});

test('unsupported or blocked capture is explicit and never disrupts the music',async()=>{
  const statuses=[],values=[];let created=0;
  const tap=new LiveAudioAnalyser(v=>values.push(v),s=>statuses.push(s),{context:()=>{created++;throw new Error('blocked');},request:()=>1,cancel:()=>{}});
  tap.setMedia(Object.assign(new EventTarget(),{readyState:4}));tap.setActive(true);tap.activate();assert.equal(created,0);assert.equal(statuses.at(-1),'unavailable');
  tap.setMedia(Object.assign(new EventTarget(),{readyState:4,captureStream:()=>{}}));tap.activate();assert.equal(created,1);assert.equal(statuses.at(-1),'unavailable');tap.dispose();assert.equal(values.at(-1).energy,0);
});

test('visual hook gates exact identity, mute, volume and pause without musical mutations',()=>{
  const source=read('components/pilot/useLiveAudioPulse.ts');
  for(const guard of ['state.currentTrack?._id===settings.trackId',"state.playbackState==='playing'",'!state.isMuted','state.volume>0','settings.enabled','analyser.dispose()'])assert.ok(source.includes(guard),guard);
  assert.doesNotMatch(source,/waveform|peaks|fetch\(|\.play\(|\.pause\(|\.seek\(|setQueue/);
  const css=read('components/pilot/live-ambience.css');assert.match(css,/data-music-playing="true"/);assert.match(css,/animation-play-state:paused/);
});

test('particle paths are deterministic per flight and bounded regardless of input',()=>{
  const first=liveParticlePaths('A:1',10);assert.equal(first.length,10);assert.deepEqual(first,liveParticlePaths('A:1',10));assert.notDeepEqual(first,liveParticlePaths('B:2',10));
  assert.equal(liveParticlePaths('A',10000).length,16);assert.equal(liveParticlePaths('A',-1).length,0);
  for(const p of first){assert.ok(p.x>=20&&p.x<=80);assert.ok(p.y>=18&&p.y<=82);assert.ok(p.size>=3&&p.size<=9);assert.ok(p.delay<35);}
});

test('swipe decoration never runs on mount, replaces rapid flights and removes all timers',()=>{
  const slots=[],effects=[],timers=new Map();let cursor=0,sequence=0,cleanup;
  const useRef=value=>{const i=cursor++;return slots[i]??(slots[i]={current:value});};
  const useState=value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{slots[i]=next;}];};
  const {default:Flight}=compile('components/pilot/LiveSwipeLight.tsx',{react:{useRef,useState,useEffect:fn=>effects.push(fn)},'@/lib/liveAmbience':{liveParticlePaths},'./PilotImage':{default:()=>null}}, {setTimeout:(fn,ms)=>{timers.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>timers.delete(id)});
  const render=(id,enabled=true,duration=260)=>{cursor=0;return Flight({id,cover:'/real.jpg',enabled,duration,count:100});};
  const flush=()=>{cleanup?.();cleanup=effects.pop()();effects.length=0;};
  assert.equal(render('A'),null);flush();assert.equal(timers.size,0);
  render('B');flush();let tree=render('B');assert.equal(tree.props['aria-hidden'],'true');assert.equal(tree.props.children[2].length,16);assert.equal(timers.size,1);
  render('C');flush();tree=render('C');assert.equal(timers.size,1);assert.equal(tree.key,'2');
  [...timers.values()][0].fn();assert.equal(render('C'),null);
  render('D',false);flush();assert.equal(render('D',false),null);assert.equal(timers.size,0);
  render('E',true,0);flush();assert.equal(render('E',true,0),null);
  assert.doesNotMatch(read('components/pilot/LiveSwipeLight.tsx'),/preventDefault|stopPropagation|fetch\(|\.play\(|\.pause\(|\.seek\(/);
});

test('immersive styles preserve scroll ownership and gate all decorative movement',()=>{
  const css=read('components/pilot/live-ambience.css');postcss.parse(css);
  assert.match(css,/pointer-events:none/);assert.match(css,/prefers-reduced-motion:reduce/);
  postcss.parse(css).walkDecls('overflow-y',decl=>{if(/auto|scroll/.test(decl.value))assert.ok(decl.parent.selector.includes('live-ambience-panel'));});
  assert.match(read('components/navigation/AppNavigation.tsx'),/pathname !== '\/live'/);
  assert.match(read('components/pilot/PilotLive.tsx'),/onTouchStart=\{scrollSnap.onTouchStart\}/);
  assert.doesNotMatch(read('components/pilot/LiveAtmosphere.tsx'),/<audio|<canvas|Math.random|requestAnimationFrame|useEffect/);
});
