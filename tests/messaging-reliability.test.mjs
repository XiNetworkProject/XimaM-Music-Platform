import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {messagingIso} from '../lib/messagingTime.ts';
import {messageDate} from '../synaura-app/src/messaging/messageTime.ts';
import {CallRegistry,CALL_RING_MS} from '../lib/voice/callRegistry.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function load(path,mocks){
  const code=ts.transpileModule(source(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  new Function('require','module','exports',code)(name=>{if(!(name in mocks))throw Error('Unexpected import '+name);return mocks[name];},module,module.exports);
  return module.exports;
}
test('PostgreSQL timestamps and old Android cache share the same UTC instant',()=>{
  for(const [input,expected] of [
    ['2026-10-05 23:15:16.123456+00','2026-10-05T23:15:16.123Z'],
    ['2026-10-05 23:15:16','2026-10-05T23:15:16.000Z'],
    ['2026-10-06T01:15:16+02:00','2026-10-05T23:15:16.000Z']]){
    assert.equal(messagingIso(input),expected);assert.equal(messageDate(input).toISOString(),expected);
  }
  assert.equal(messagingIso('nonsense'),null);assert.equal(messagingIso(null),null);
});
test('leaving Android cannot repost cached messages or resurrect an avatar notification',()=>{
  const provider=source('synaura-app/src/messaging/ConversationBubbleProvider.tsx');
  assert.doesNotMatch(provider,/getConversationMessages|showConversationBubble|updateConversationBubbleContent/);
  const native=source('synaura-app/plugins/native-messaging/native/SynauraBubbleManager.kt');
  assert.match(native,/visibleGenerations\[conversationId\] == generation/);assert.match(native,/visibleGenerations.remove\(id\)/);
});
test('Android call patch handles app-terminated actions, expiry and end cancellation',()=>{
  const patch=source('synaura-app/patches/expo-notifications+0.32.17.patch');
  for(const value of ['CallStyle.forIncomingCall','decline_call','answer_call','setTimeoutAfter','call_ended'])assert.ok(patch.includes(value),value);
  assert.match(source('synaura-app/index.ts'),/backgroundNotificationTask/);
  assert.ok(JSON.parse(source('synaura-app/package.json')).expo.autolinking.android.buildFromSource.includes('expo-notifications'),'The patched module must not use the precompiled AAR');
});
test('call notification cold-start intent survives until the right authenticated user consumes it',async()=>{
  const store=new Map(),dismissed=[],events=[];
  const module=load('synaura-app/src/notifications/callNotificationActions.ts',{
    '@react-native-async-storage/async-storage':{getItem:async key=>store.get(key)||null,setItem:async(k,v)=>store.set(k,v),removeItem:async key=>store.delete(key)},
    'expo-notifications':{dismissNotificationAsync:async id=>dismissed.push(id)},'react-native':{DeviceEventEmitter:{emit:name=>events.push(name)}},
    '@/api/client':{API_BASE_URL:'https://fixture.invalid'},'./messageNotificationReply':{getStoredMobileAccessToken:async()=>null}
  });
  const response={actionIdentifier:'answer_call',notification:{request:{identifier:'call-notif',content:{data:{kind:'incoming_call',call_id:'11111111-1111-4111-8111-111111111111',recipient_id:'recipient',expires_at:Date.now()+40000}}}}};
  assert.equal(await module.handleCallNotificationResponse(response),true);
  assert.equal((await module.pendingCallIntent('recipient')).answer,true);assert.equal(events.length,1);assert.deepEqual(dismissed,['call-notif']);
  assert.equal(await module.pendingCallIntent('other'),null);assert.equal(await module.pendingCallIntent('recipient'),null);
  await module.handleCallNotificationResponse(response);assert.equal(await module.pendingCallIntent('recipient'),null,'task + foreground callback must not replay a consumed answer');
  response.notification.request.content.data.expires_at=Date.now()-1;
  await module.handleCallNotificationResponse(response);assert.equal(await module.pendingCallIntent('recipient'),null);
});
test('web push rejects expired ringing and clears ended calls instead of re-alerting',async()=>{
  const listeners=new Map(),shown=[],closed=[];
  const sandbox={self:{location:{origin:'https://fixture.invalid'},addEventListener:(name,fn)=>listeners.set(name,fn),registration:{showNotification:async(...args)=>shown.push(args),getNotifications:async()=>[{close:()=>closed.push(true)}]}},URL,console,Date};
  vm.runInNewContext(source('public/sw.js'),sandbox);
  const push=async(data)=>{const promises=[];listeners.get('push')({data:{json:()=>({title:'Fixture',body:'Fixture',tag:'synaura-call-1',data})},waitUntil:p=>promises.push(p)});await Promise.all(promises);};
  await push({kind:'incoming_call',expires_at:Date.now()-1});assert.equal(shown.length,0);
  await push({kind:'incoming_call',expires_at:Date.now()+10000});assert.equal(shown.length,1);assert.equal(shown[0][1].actions[1].action,'decline-call');
  await push({kind:'call_ended'});assert.equal(shown.length,1);assert.equal(closed.length,1);
});
test('receipts require viewport visibility and never a fetch/cache hydration',()=>{
  const native=source('synaura-app/src/messaging/useVisibleMessageReceipts.ts');
  assert.match(native,/AppState.currentState!=='active'/);assert.match(native,/Date.now\(\)-since>=500/);
  assert.match(source('app/messages/[conversationId]/page.tsx'),/IntersectionObserver/);
  assert.match(source('app/messages/[conversationId]/page.tsx'),/document.hasFocus\(\)/);
  assert.doesNotMatch(source('synaura-app/src/screens/ConversationScreen.tsx'),/markConversationSeen\(conversationId\)/);
});
function routeMocks(user='alice'){
  const queries=[];
  return {queries,mocks:{'next/server':{NextResponse:{json:(data,{status=200}={})=>({data,status})}},'@/lib/getApiSession':{getApiSession:async()=>user?{user:{id:user}}:null},'@/lib/messaging':{requireConversationParticipant:async(id)=>id==='conversation'},'@/lib/postgres':{queryDatabase:async(sql,args)=>{queries.push({sql,args});return{rows:[]};}},'@/lib/security/requestSecurity':{rejectUntrustedMutationOrigin:()=>null,enforceRequestRateLimit:()=>null}}};
}
const request=(body,recipient)=>({headers:{get:()=>recipient||null},text:async()=>JSON.stringify(body)});
test('seen endpoint is account bound, participant bound and ID bounded',async()=>{
  const fixture=routeMocks(),route=load('app/api/messages/[conversationId]/seen/route.ts',fixture.mocks);
  assert.equal((await route.PUT(request({messageIds:[]},'bob'),{params:{conversationId:'conversation'}})).status,403);
  assert.equal((await route.PUT(request({messageIds:[]}),{params:{conversationId:'other'}})).status,403);
  assert.equal((await route.PUT(request({messageIds:['bad/id']}),{params:{conversationId:'conversation'}})).status,400);
  const ids=['11111111-1111-4111-8111-111111111111','legacy_message_123'];
  assert.equal((await route.PUT(request({messageIds:ids}),{params:{conversationId:'conversation'}})).status,200);
  assert.equal(fixture.queries.length,1);assert.deepEqual(fixture.queries[0].args.slice(0,2),['conversation','alice']);assert.deepEqual(fixture.queries[0].args[3],ids);
  assert.match(fixture.queries[0].sql,/conversation_id=\$1 AND sender_id<>\$2/);
  assert.doesNotMatch(fixture.queries[0].sql,/UPDATE.*is_read/s);
  assert.match(fixture.queries[0].sql,/\$4::text\[\]/);
});

test('messaging IDs preserve the production text contract; users and calls remain UUID',()=>{
  const migration=source('database/migrations/20261006100000_messaging_call_history.sql');
  assert.match(migration,/conversation_id text NOT NULL/);
  assert.match(migration,/message_id text NOT NULL/);
  assert.match(migration,/user_id uuid NOT NULL/);
  assert.doesNotMatch(source('lib/messagingReceipts.ts'),/::uuid\[\]/);
  assert.match(source('lib/voice/history.ts'),/\$2::text IS NULL/);
});
test('call registry persists a missed call once and does not count ringing as connected',async()=>{
  let now=1000000;const persisted=[],notified=[];
  const r=new CallRegistry({now:()=>now,id:()=> 'call',access:async()=>({title:'Fixture',group:false,people:[{id:'a',name:'A'},{id:'b',name:'B'}]}),createRoom:async()=>{},deleteRoom:async()=>{},removeMember:async()=>{},persist:async call=>persisted.push(structuredClone(call)),notify:async(call,event)=>notified.push(event),mediaConnectedAt:async()=>undefined});
  const call=await r.start('a','conversation','device');now+=CALL_RING_MS+1;await r.sweep();await r.sweep();
  assert.equal(call.connectedAt,undefined);assert.equal(call.endedAt,now);assert.deepEqual(notified,['incoming','ended']);assert.equal(persisted.at(-1).reason,'timeout');
});
test('connected time needs actual RTC evidence; seconds rounding cannot erase a fast answer',async()=>{
  let now=1000500,rtc;
  const r=new CallRegistry({now:()=>now,id:()=> 'call',access:async()=>({title:'Fixture',group:false,people:[{id:'a',name:'A'},{id:'b',name:'B'}]}),createRoom:async()=>{},deleteRoom:async()=>{},removeMember:async()=>{},mediaConnectedAt:async()=>rtc});
  const call=await r.start('a','conversation','one');await r.action('b',call.id,'two','join');assert.equal(call.connectedAt,undefined);
  rtc=1000000;await r.action('b',call.id,'two','connected');assert.equal(call.connectedAt,1000500);
  now+=12345;await r.action('b',call.id,'two','leave');assert.equal(call.endedAt-call.connectedAt,12345);
});
test('slow push does not block signalling and lifecycle snapshots remain ordered',async()=>{
  let release;const events=[];const blocked=new Promise(resolve=>{release=resolve;});
  const r=new CallRegistry({now:()=>1000000,id:()=> 'call',access:async()=>({title:'Fixture',group:false,people:[{id:'a',name:'A'},{id:'b',name:'B'}]}),createRoom:async()=>{},deleteRoom:async()=>{},removeMember:async()=>{},notify:async(call,event)=>{events.push([event,call.members.find(m=>m.id==='b').state]);if(event==='incoming')await blocked;}});
  const call=await Promise.race([r.start('a','conversation','one'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Push blocked signalling')),100))]);
  await r.action('b',call.id,'two','join');await r.action('b',call.id,'two','leave');
  assert.equal(call.status,'ended');assert.deepEqual(events,[['incoming','invited']]);
  release();await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(events,[['incoming','invited'],['answered','joined'],['ended','left']]);
});
test('history and unread SQL bind the current reader, not the conversation globally',async()=>{
  const queries=[];
  const database={queryDatabase:async(sql,args)=>{queries.push({sql,args});return{rows:[]};}};
  const history=load('lib/voice/history.ts',{'server-only':{},'@/lib/postgres':database,'@/lib/messagingTime':{messagingIso}});
  assert.deepEqual(await history.getCallHistory('reader',null,null),{calls:[],nextCursor:null});
  assert.match(queries[0].sql,/mine.user_id=\$1/);assert.equal(queries[0].args[0],'reader');
  const receipts=load('lib/messagingReceipts.ts',{'server-only':{},'@/lib/postgres':database});
  await receipts.getUnreadMessages('reader',['conversation']);assert.match(queries[1].sql,/r.user_id=\$1/);
});
test('quick reply failures remain pending; retries are idempotent and bound to recipient',async()=>{
  const store=new Map(),sent=[],notices=[],dismissed=[];
  const notifications={dismissNotificationAsync:async id=>dismissed.push(id),scheduleNotificationAsync:async value=>notices.push(value)};
  const module=load('synaura-app/src/notifications/messageNotificationReply.ts',{
    '@react-native-async-storage/async-storage':{getItem:async key=>store.get(key)||null,setItem:async(k,v)=>store.set(k,v),removeItem:async key=>store.delete(key)},
    'expo-notifications':notifications,'expo-secure-store':{getItemAsync:async key=>key==='token'?'test-token':null},'react-native':{DeviceEventEmitter:{emit(){}}},
    '@/api/client':{API_BASE_URL:'https://fixture.invalid'},'@/auth/storageKeys':{MOBILE_AUTH_TOKEN_KEY:'token',MOBILE_AUTH_EXPIRES_AT_KEY:'expires',MOBILE_AUTH_REFRESH_TOKEN_KEY:'refresh',MOBILE_AUTH_SESSION_REFRESHED_EVENT:'refreshed'}
  });
  const original=globalThis.fetch;let online=false;
  globalThis.fetch=async(url,init)=>{sent.push({url,init});if(!online)throw Error('offline');return {ok:true,status:200};};
  try{
    const response={actionIdentifier:'reply_message',userText:'Fixture reply',notification:{request:{identifier:'notif-1',content:{data:{conversation_id:'conv',message_id:'msg',recipient_id:'recipient'}}}}};
    await module.handleMessageNotificationAction(response);assert.equal(notices.length,1);assert.equal(dismissed.includes('notif-1'),false);
    online=true;assert.equal((await module.flushPendingMessageNotificationActions({force:true})).delivered,1);
    assert.equal(sent[1].init.headers['X-Synaura-Notification-User'],'recipient');assert.equal(sent[0].init.body,sent[1].init.body);
    await module.handleMessageNotificationAction(response);assert.equal(sent.length,2);assert.ok(dismissed.includes('notif-1'));
  }finally{globalThis.fetch=original;}
});
