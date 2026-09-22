import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { resolveLiveAutomaticAdvance } from '../lib/livePlaybackContinuity.ts';
import { isClipDurationValid, MUSIC_CLIP_MAX_BYTES } from '../lib/clipLimits.ts';
import { composeScrollFeed } from '../lib/scrollFeed.ts';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const base = {endedItemId:'track-a', endedTrackId:'a', endedQueueIndex:0, currentTrackId:'b', activeItemId:'track-a', feedItemIds:['track-a','post','track-b'], queueTrackIds:['a','b'], playerQueueIds:['a','b'], playerQueueIndex:1, queueFeedIndices:[0,2]};
test('ended follows the actual queue occurrence, including nonmusical gaps', () => {
  assert.equal(resolveLiveAutomaticAdvance(base),2);
  assert.equal(resolveLiveAutomaticAdvance({...base,activeItemId:'another-user-swipe'}),null);
  assert.equal(resolveLiveAutomaticAdvance({...base,playerQueueIds:['b','a']}),null);
  assert.equal(resolveLiveAutomaticAdvance({...base,currentTrackId:'a',playerQueueIndex:0}),null);
  assert.equal(resolveLiveAutomaticAdvance({...base,currentTrackId:'a',queueTrackIds:['a','a'],playerQueueIds:['a','a']}),2);
});
test('4 minutes is inclusive; invalid metadata and values above the limit fail closed', () => {
  for(const duration of [15,60,180,239.99,240]) assert.equal(isClipDurationValid(duration),true);
  for(const duration of [0,14.99,240.01,NaN,Infinity,'240',null]) assert.equal(isClipDurationValid(duration),false);
  assert.equal(MUSIC_CLIP_MAX_BYTES,250*1024*1024);
  assert.match(read('database/migrations/20260921120000_music_clips_four_minutes.sql'),/BETWEEN 15 AND 240/);
  assert.match(read('lib/localMediaStorage.ts'),/kind === 'clip-video' && !isClipDurationValid\(probe.duration\)/);
  assert.match(read('app/api/music-clips/[id]/route.ts'),/await inspectOwnedClipVideo\(body.videoPublicId, userId\)/);
});
test('default feed includes a real clip among the first four items; short and clips-only feeds work', () => {
  const tracks = Array.from({length:14},(_,i)=>({_id:`t${i}`,audioUrl:`https://test/${i}.mp3`}));
  const clip = {id:'c',videoUrl:'https://test/c.mp4',sourceTrack:tracks[0]};
  const full = composeScrollFeed({tracks,clips:[clip,clip]});
  assert.equal(full[0].id,'track-t0'); assert.equal(full[3].id,'clip-c');
  assert.equal(full.filter(x=>x.type==='clip').length,1);
  assert.equal(composeScrollFeed({tracks:tracks.slice(0,3),clips:[clip]})[3].id,'clip-c');
  assert.equal(composeScrollFeed({tracks:[],clips:[clip]})[0].id,'clip-c');
  assert.deepEqual(composeScrollFeed({tracks:[],clips:[{...clip,videoUrl:null}]}),[]);
});

function uploadHarness({failPublish=false}={}) {
  const requests=[], notices=[], progress=[], timers=[]; let release;
  const upload = new Promise(resolve=>{release=resolve;});
  const module={exports:{}};
  const mocks={
    '@/lib/analyticsClient':{recordClipFunnelEvent:()=>{}},
    '@/lib/clientMediaUpload':{uploadLocalMedia:(_file,_kind,options)=>{progress.push(options);return upload;}},
    '@/lib/ui/notifications':{notify:{success:(...a)=>notices.push(['success',...a]),error:(...a)=>notices.push(['error',...a])}},
  };
  const fetch=async(url,options)=>{requests.push([url,JSON.parse(options.body)]);const draft=options.method==='POST';return {ok:draft||!failPublish,json:async()=>draft?{clip:{id:'draft-1'}}:failPublish?{error:'Publication refusée'}:{clip:{id:'draft-1'}}};};
  const js=ts.transpileModule(read('lib/clientClipUploadQueue.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','fetch','window',js)(id=>mocks[id]||require(id),module,module.exports,fetch,{dispatchEvent:()=>{},setTimeout:fn=>timers.push(fn)});
  return {queue:module.exports,requests,notices,progress,timers,release};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const input={file:{size:1200},source:{_id:'a',sourceTrackId:'a',sourceTrackType:'track'},duration:120,offset:0,caption:'test',tags:[]};
test('a remounted Live feed aligns its restored card without interrupting later swipes',()=>{
  const source=read('components/pilot/PilotLive.tsx');
  const effect=source.match(/useLayoutEffect\(\(\) => \{([\s\S]*?)\n  \}, \[activeIndex, loading, ready, scrollSnap.containerRef, scrollSnap.scrollTo\]\)/)?.[1];
  assert.ok(effect,'mount alignment effect is present');
  const calls=[], mountedFeed={current:null}, scrollSnap={containerRef:{current:null},scrollTo:(...args)=>calls.push(args)};
  const run=new Function('scrollSnap','mountedFeed','activeIndex',effect);
  run(scrollSnap,mountedFeed,6); assert.equal(calls.length,0);
  scrollSnap.containerRef.current={}; run(scrollSnap,mountedFeed,6); assert.deepEqual(calls,[[6,'auto']]);
  run(scrollSnap,mountedFeed,7); assert.equal(calls.length,1);
  scrollSnap.containerRef.current=null; run(scrollSnap,mountedFeed,7);
  scrollSnap.containerRef.current={}; run(scrollSnap,mountedFeed,7); assert.deepEqual(calls,[[6,'auto'],[7,'auto']]);
});

test('upload tracks real bytes then processing/publication, blocks overwrite and notifies success',async()=>{
  const h=uploadHarness();assert.equal(h.queue.enqueueClientClipUpload(input),true);await tick();
  assert.equal(h.queue.enqueueClientClipUpload({...input,caption:'other'}),false);
  h.progress[0].onProgress(.37);assert.equal(h.queue.getClientClipUploadSnapshot().progress,.37);
  h.progress[0].onTransferred();assert.equal(h.queue.getClientClipUploadSnapshot().status,'processing');
  h.release({secure_url:'https://test/v.mp4',public_id:'owned-id',poster_url:'https://test/poster.jpg',duration:120,bytes:1200});await tick();
  assert.equal(h.requests[1][1].caption,'test');assert.equal(h.queue.getClientClipUploadSnapshot().status,'completed');assert.equal(h.notices[0][0],'success');
  h.timers[0]();assert.equal(h.queue.getClientClipUploadSnapshot().status,'idle');
});
test('failed publication keeps the owned upload for retry, never creates another draft or false success',async()=>{
  const h=uploadHarness({failPublish:true});h.queue.enqueueClientClipUpload(input);await tick();h.release({secure_url:'https://test/v.mp4',public_id:'owned-id'});await tick();
  assert.equal(h.queue.getClientClipUploadSnapshot().status,'failed');assert.equal(h.notices[0][0],'error');
  assert.equal(h.queue.enqueueClientClipUpload(input),false);h.queue.retryClientClipUpload();await tick();
  assert.equal(h.progress.length,1);assert.equal(h.requests.filter(x=>x[0]==='/api/music-clips').length,1);
  assert.equal(h.requests.filter(x=>x[0]==='/api/music-clips/draft-1').length,2);
  h.queue.dismissClientClipUpload();assert.equal(h.queue.getClientClipUploadSnapshot().status,'idle');
});
test('badge is mounted once globally, outside page transitions; composer leaves after enqueue only',()=>{
  const root=read('app/layout.tsx'),feed=read('components/home/SynauraScroll.tsx'),page=read('app/clips/new/page.tsx');
  assert.equal(root.split('<ClipUploadIndicator />').length,2);assert.doesNotMatch(feed,/<ClipUploadIndicator/);
  assert.match(page,/const accepted = enqueueClientClipUpload/);assert.match(page,/if \(!accepted\)/);assert.match(page,/currentHandoffReturn\('\/live'\)/);
  assert.match(page,/onDrop=/);assert.match(page,/request !== fileRequest.current/);assert.match(page,/isClipDurationValid\(duration\)/);
  assert.match(read('components/pilot/LiveClipVideo.tsx'),/audio.currentTime - offset/);
  assert.match(read('components/pilot/LiveClipVideo.tsx'),/muted playsInline/);
  assert.doesNotMatch(read('components/pilot/LiveClipVideo.tsx'),/new Audio|new AudioContext|autoPlay|\bloop\b.*preload/);
});
