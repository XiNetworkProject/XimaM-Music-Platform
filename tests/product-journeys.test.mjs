import assert from 'node:assert/strict';
import { test } from 'node:test';
import {compile,read,plain} from './helpers/recommendation-fixtures.mjs';
const {PlaybackMeasurement}=compile(read('lib/playbackMeasurement.ts'));
const draft=compile(read('lib/textDraft.ts'));
const confirmation=compile(read('lib/subscriptionConfirmation.ts'));

test('playback observation excludes seek gaps and deduplicates replayed buckets without media controls',()=>{
 const events=[], m=new PlaybackMeasurement((id,extra)=>events.push({id,extra}));
 const start=m.begin('A','test',0,100,0);assert.equal(start.playbackId,'test');
 for(let i=1;i<=6;i++)m.observe('A',i,100,i*1000);
 m.observe('A',95,100,7000);m.observe('A',96,100,8000);m.flush();
 assert.deepEqual(plain(events.at(-1).extra.heardBuckets),[0,1,19]);
 assert.ok(!events.at(-1).extra.heardBuckets.includes(10));
 m.observe('A',0,100,9000);m.observe('A',1,100,10000);m.flush();
 assert.equal(events.at(-1).extra.heardBuckets.filter(i=>i===0).length,1);
 m.begin('B','second',0,100,11000);m.observe('A',20,100,12000);m.flush();
 assert.equal(events.filter(e=>e.id==='B').length,0);
});
test('pause, invalid values, long observation gaps and an unstarted play do not create retention',()=>{
 const events=[],m=new PlaybackMeasurement((id,e)=>events.push(e));
 m.observe('A',5,100,1000);m.begin('A','id',0,100,0);
 m.observe('A',0,100,1000);m.observe('A',40,100,20000);m.observe('A',NaN,100,21000);m.flush();
 assert.equal(events.length,0);m.observe('A',41,100,21000);m.end();assert.equal(events.length,1);m.flush();assert.equal(events.length,1);
});
test('drafts are account and scope isolated, bounded, versioned, expiring and allowlisted',()=>{
 const now=1000000000;
 assert.notEqual(draft.draftKey('A','studio'),draft.draftKey('B','studio'));
 assert.notEqual(draft.draftKey('A','studio'),draft.draftKey('A','community'));
 const raw=JSON.stringify({version:1,savedAt:now,fields:{title:'Hello',token:'not accepted'}});
 assert.deepEqual(plain(draft.decodeDraft(raw,['title'],now).fields),{title:'Hello'});
 for(const raw of ['{',null,JSON.stringify({version:1,savedAt:now-draft.DRAFT_TTL-1,fields:{title:'old'}}),JSON.stringify({version:2,savedAt:now,fields:{title:'unknown'}})])assert.equal(draft.decodeDraft(raw,['title'],now),null);
});
test('native short seeks, paused media and rate changes never bridge an observed interval',()=>{
 const events=[],m=new PlaybackMeasurement((id,e)=>events.push(e));
 m.begin('A','id',0,100,0);m.interrupt();m.observe('A',2,100,1000);m.flush();assert.equal(events.length,0);
 m.observe('A',4,100,2000,{playing:false,seeking:false,rate:1});m.flush();assert.equal(events.length,0);
 m.observe('A',6,100,3000,{playing:true,seeking:true,rate:1});m.flush();assert.equal(events.length,0);
 m.interrupt();m.observe('A',8,100,4000,{playing:true,seeking:false,rate:2});m.flush();assert.equal(events.length,0);
 m.observe('A',10,100,5000,{playing:true,seeking:false,rate:2});m.flush();assert.deepEqual(plain(events.at(-1).heardBuckets),[1]);
});
test('checkout confirmation fails closed for failed verification, unknown plan and unpaid states',()=>{
 for(const status of ['past_due','unpaid','none',undefined])assert.equal(confirmation.subscriptionConfirmed(true,{hasSubscription:true,userSubscription:{status}}),false);
 assert.equal(confirmation.subscriptionConfirmed(false,{hasSubscription:true,userSubscription:{status:'active'}}),false);
 assert.equal(confirmation.subscriptionConfirmed(true,{hasSubscription:false,userSubscription:{status:'active'}}),false);
 assert.equal(confirmation.subscriptionConfirmed(true,{hasSubscription:true,userSubscription:{status:'active'}}),true);
});
test('foreign or unbound checkout cannot update a profile',async()=>{
 let writes=0;
 const mod=compile(read('app/api/billing/verify-checkout/route.ts'),{'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},'@/lib/getApiSession':{getApiSession:async()=>({user:{id:'A'}})},'@/lib/stripe':{stripe:{checkout:{sessions:{retrieve:async()=>({mode:'subscription',payment_status:'paid',subscription:{metadata:{userId:'B'}}})}}}},'@/lib/database':{dbAdmin:{from:()=>{writes++;throw new Error('must not write');}}}});
 const result=await mod.POST({json:async()=>({sessionId:'cs_test'})});assert.equal(result.status,403);assert.equal(writes,0);
});
test('clip upload abort before start never transfers bytes',async()=>{
 let constructors=0;
 const mod=compile(read('lib/clientMediaUpload.ts'),{}, {XMLHttpRequest:class{constructor(){constructors++;}},DOMException});
 await assert.rejects(mod.uploadLocalMedia({},'clip-video',{signal:{aborted:true}}),{name:'AbortError'});assert.equal(constructors,0);
});
test('recovery never automatically replays paid creation or a failed media write',()=>{
 assert.doesNotMatch(read('lib/clientClipUploadQueue.ts'),/for \(let attempt/);
 const hook=read('hooks/useBackgroundGeneration.ts');
 const resume=hook.slice(hook.indexOf('const resumeBackgroundGeneration'),hook.indexOf('// Reprendre automatiquement'));
 assert.match(resume,/startPolling\(taskId\)/);assert.doesNotMatch(resume,/generate'|startBackgroundGeneration\(/);
 assert.match(hook,/epoch!==ownerEpoch.current/);
 assert.match(read('components/clips/ClipUploadIndicator.tsx'),/task.status !== 'failed'/);
});
