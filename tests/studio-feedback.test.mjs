import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, read } from './helpers/recommendation-fixtures.mjs';
import * as feedback from '../lib/studio/feedback.ts';
import { normalizeStudioResult, studioProviderRequest, StudioProviderRejected } from '../lib/studio/provider.ts';

test('failure reasons distinguish transport uncertainty, cancellation, save failure and provider rejection', () => {
  assert.equal(feedback.feedbackFailure('Polling timeout: offline').state, 'uncertain');
  assert.equal(feedback.feedbackFailure('SAVE_COMPLETED_FAILED').state, 'warning');
  assert.equal(feedback.feedbackFailure(new DOMException('cancel', 'AbortError')).state, 'cancelled');
  assert.equal(feedback.feedbackFailure('SENSITIVE_WORD_ERROR').state, 'failed');
  assert.match(feedback.feedbackFailure('ERROR').message, /sans en préciser/);
  assert.doesNotMatch(feedback.feedbackFailure('', { status: 429 }).message, /Crédits insuffisants/);
  assert.equal(feedback.feedbackFailure('Gateway timeout', { uncertain:true }).state, 'uncertain');
});
test('journal masks credentials and URLs, deduplicates unchanged polls and keeps only recent bounded history', () => {
  const result=feedback.safeFeedbackText('https://secret.test/file?token=secret Bearer hidden api_key=hidden user@example.com');
  assert.doesNotMatch(result,/secret\.test|hidden|user@example/);
  const item={id:'a',kind:'upload',stage:'Envoi',state:'failed',message:'Envoi impossible',startedAt:100,updatedAt:200};
  const first=feedback.mergeFeedback([],item,200);
  assert.equal(feedback.mergeFeedback(first,{...item,updatedAt:300},300),first);
  assert.equal(feedback.mergeFeedback(first,{...item,state:'success',message:'OK',updatedAt:400},400)[0].startedAt,100);
  const many=Array.from({length:45},(_,i)=>({...item,id:`old-${i}`}));
  assert.equal(feedback.mergeFeedback(many,item,300).length,40);
  assert.equal(feedback.mergeFeedback(first,{...item,id:'b',updatedAt:31*86400000},31*86400000).length,1);
});
test('actual activity store persists by owner, stays usable without storage and never makes requests', () => {
  const storage=new Map(); let blocked=false, updates=0;
  const module=compile(read('lib/studio/clientActivity.ts'),{'./feedback':feedback},{window:{},crypto:{randomUUID:()=>`id-${++updates}`},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>{if(blocked)throw Error('full');storage.set(key,value);}}});
  const off=module.subscribeStudioActivity(()=>updates++);
  module.reportStudioActivity('A',{kind:'upload',stage:'Envoi',state:'failed',message:'Erreur A',id:'a'});
  assert.equal(module.getStudioActivity('B').length,0);
  assert.equal(JSON.parse(storage.get('synaura.studio.activity.v1.A'))[0].message,'Erreur A');
  module.acknowledgeStudioActivity('A','a'); assert.equal(module.getStudioActivity('A')[0].acknowledged,true);
  blocked=true; module.reportStudioActivity('A',{kind:'upload',stage:'Envoi',state:'success',message:'Terminé',id:'a'});
  assert.equal(module.getStudioActivity('A')[0].state,'success'); off();
  assert.doesNotMatch(read('lib/studio/clientActivity.ts'),/fetch\(|XMLHttpRequest/);
});
test('provider-specific reasons survive music and style normalization without raw payloads', async () => {
  const music=normalizeStudioResult('extend',{data:{status:'GENERATE_AUDIO_FAILED',errorMessage:'Audio refusé https://private.test/token',param:'private prompt'}});
  assert.equal(music.state,'failed'); assert.match(music.result.warning,/Audio refusé/); assert.doesNotMatch(music.result.warning,/private.test/);
  const style=normalizeStudioResult('style',{data:{successFlag:2,errorMessage:'Style trop long'}});
  assert.equal(style.result.warning,'Style trop long');
  const old=process.env.SUNO_API_KEY;process.env.SUNO_API_KEY='test-only';
  try { await assert.rejects(()=>studioProviderRequest('/fixture',{},async()=>({ok:false,status:400,json:async()=>({code:400,msg:'Audio trop court'})})), error=>error instanceof StudioProviderRejected && error.message==='Audio trop court'); }
  finally { if(old===undefined)delete process.env.SUNO_API_KEY;else process.env.SUNO_API_KEY=old; }
});
test('status route returns documented failure fields only after owner verification', async () => {
  let owned=false,calls=0;
  const chain={select(){return this},eq(){return this},async maybeSingle(){return {data:owned?{id:'mine'}:null}}};
  const route=compile(read('app/api/suno/status/route.ts'),{'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},'@/lib/getApiSession':{getApiSession:async()=>({user:{id:'A'}})},'@/lib/database':{dbAdmin:{from:()=>chain}},'@/lib/suno-normalize':{normalizeSunoItem:x=>x},'@/lib/studio/feedback':feedback,'@/lib/security/requestSecurity':{enforceRequestRateLimit:()=>null,isSafeOpaqueIdentifier:()=>true}},{process:{env:{SUNO_API_KEY:'fixture'}},AbortController,setTimeout,clearTimeout,fetch:async()=>{calls++;return {ok:true,json:async()=>({code:200,data:{status:'SENSITIVE_WORD_ERROR',errorCode:'POLICY',errorMessage:'Refus du contenu',param:'private',secret:'do-not-return'}})}}});
  const req={nextUrl:new URL('https://example.test/status?taskId=mine')};
  assert.equal((await route.GET(req)).status,404);assert.equal(calls,0);
  owned=true;const response=await route.GET(req);assert.equal(response.body.errorMessage,'Refus du contenu');assert.equal(response.body.errorCode,'POLICY');assert.equal(response.body.providerStatus,'SENSITIVE_WORD_ERROR');assert.equal(response.body.param,undefined);assert.equal(response.body.secret,undefined);
});
test('safe status-only recovery and persistent UI never submit a paid retry', () => {
  const view=read('components/ai-studio/StudioActivity.tsx');
  for(const text of ['Activité du Studio','<time','Référence et détail technique','sans regénérer','checkGeneration(item.taskId!)'])assert.ok(view.includes(text),text);
  assert.doesNotMatch(view,/fetch\(|generation\.submit|\/generate/);
  assert.match(read('components/ai-studio/RemixDropzone.tsx'),/onDropRejected/);
  assert.match(read('components/ai-studio/StudioTextLibrary.tsx'),/instrumental.set\(false\)/);
  assert.match(read('app/ai-generator/page.tsx'),/const sourceLyrics = track.lyrics \|\| '';/);
});
