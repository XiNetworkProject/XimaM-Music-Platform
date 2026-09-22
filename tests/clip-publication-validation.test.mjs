import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as limits from '../lib/clipLimits.ts';

function setup(options={}) {
  const removed=[], writes=[], probes=[];
  const row={id:'clip',creator_id:'author',source_track_id:'track',source_track_type:'track',source_track_offset_seconds:0,source_track_duration_seconds:30,visibility:'draft'};
  const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:{...row,...options.row}}),update:value=>{writes.push(value);return chain;},single:async()=>({data:{...row,...writes[0]},error:options.writeError?new Error('test DB failure'):null})};
  const mocks={
    'next/server':{NextResponse:{json:(body,{status=200}={})=>({status,body})}},
    '@/lib/getApiSession':{getApiSession:async()=>options.signedOut?null:{user:{id:'author'}}},
    '@/lib/database':{dbAdmin:{from:()=>chain}},
    '@/lib/localMediaStorage':{
      deleteLocalMedia:async id=>removed.push(id),isLocalMediaReference:()=>!options.foreign,isLocalMediaOwnedBy:()=>!options.foreign,
      inspectOwnedClipVideo:async(...args)=>{probes.push(args);if(options.invalidFile)throw new Error('Invalid video');return {duration:options.duration??240,bytes:12345};},
    },
    '@/lib/clipLimits':limits,
    '@/lib/musicClips':{...limits,clampClipDuration:Math.round,sanitizeClipOffset:Math.round,sanitizeClipTags:x=>x,legacyVideoPosterUrl:()=>null,formatMusicClips:async rows=>rows,
      assertCanCreateClip:async()=>options.denied?{ok:false,status:403,error:'Source non autorisée'}:{ok:true,source:{duration:options.sourceDuration??300,artist:{_id:'author'}}}},
    '@/lib/notifications':{notifyClipUsedSource:()=>{}},
  };
  const source=readFileSync(new URL('../app/api/music-clips/[id]/route.ts',import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function('require','module','exports',js)(id=>{assert.ok(id in mocks,id);return mocks[id];},module,module.exports);
  const body={videoUrl:'https://media.test/c.mp4',videoPublicId:'owned',posterUrl:'https://media.test/p.jpg',posterPublicId:'owned-poster',sourceTrackDurationSeconds:60,videoDurationSeconds:60,visibility:'published'};
  return {removed,writes,probes,call:(patch={})=>module.exports.PATCH({json:async()=>({...body,...patch})},{params:{id:'clip'}})};
}

test('publication enforces authentication and ownership before file access',async()=>{
  for(const [options,status] of [[{signedOut:true},401],[{row:{creator_id:'other'}},403]]){const h=setup(options);assert.equal((await h.call()).status,status);assert.deepEqual(h.probes,[]);assert.deepEqual(h.writes,[]);}
});
test('untrusted or unowned file references never trigger deletion',async()=>{
  const h=setup({foreign:true});assert.equal((await h.call()).status,422);assert.deepEqual(h.probes,[]);assert.deepEqual(h.removed,[]);assert.deepEqual(h.writes,[]);
});
test('four-minute publication uses server-inspected duration, not the claimed sixty seconds',async()=>{
  const h=setup();assert.equal((await h.call()).status,200);assert.deepEqual(h.probes,[['owned','author']]);assert.equal(h.writes[0].source_track_duration_seconds,240);
});
test('invalid duration, invalid media, short or unauthorized source cannot publish',async()=>{
  const h=setup();assert.equal((await h.call({sourceTrackDurationSeconds:241})).status,422);assert.deepEqual(h.writes,[]);
  for(const options of [{invalidFile:true},{sourceDuration:120},{denied:true}]){const s=setup(options);assert.ok((await s.call()).status>=400);assert.deepEqual(s.writes,[]);}
});
test('a database failure preserves the uploaded file for retry',async()=>{
  const h=setup({writeError:true});assert.equal((await h.call()).status,500);assert.deepEqual(h.removed,[]);
});
