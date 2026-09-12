import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {carryHandoff, handoffReturnHref, isLiveReturnToken, localHandoffUrl, safeProfileReturn} from '../lib/creationHandoffs.ts';
import {createLiveSnapshotId, makeLiveNavigationSnapshot, saveLiveNavigationContext, loadLiveNavigationContext, LIVE_HISTORY_STATE_KEY, LIVE_SNAPSHOT_TTL_MS} from '../lib/liveContinuity.ts';
const read=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const token='live-test-123', valid=id=>id===token;
for (const route of ['/create','/create/variation','/ai-generator','/studio','/upload','/clips/new','/messages','/notifications','/community','/community/feedback','/city','/posts']) {
  test(`Live → ${route} → explicit Live return`,()=>{
    const url=carryHandoff(route,'/live',token,valid);
    assert.equal(new URL(url,'https://test').searchParams.get('liveReturn'),token);
    assert.equal(handoffReturnHref(url,valid),'/live?liveReturn='+token);
  });
}
test('source query is exact, unique and never inferred from the Live entity',()=>{
  for(const target of ['/ai-generator?mode=remix&sourceTrackId=track-B&sourceTrackType=ai_track&challengeId=c', '/clips/new?trackId=track-C&trackType=track']) {
    const original=new URL(target,'https://test');
    const actual=new URL(carryHandoff(target,'/create?liveReturn='+token,null,valid),'https://test');
    for(const [key,value] of original.searchParams)assert.deepEqual(actual.searchParams.getAll(key),[value]);
    assert.equal(actual.searchParams.has('clipId'),false);
  }
});
test('explicit wrong/stale context is not silently replaced with origin context',()=>{
  assert.equal(carryHandoff('/ai-generator?liveReturn=live-other&sourceTrackId=B','/live',token,valid),'/ai-generator?sourceTrackId=B');
});
test('malformed, unknown, huge tokens and external destinations fail closed',()=>{
  for(const value of ['', 'live-', 'evil', 'live-'+ 'x'.repeat(91),'live-../../file','live-a&x=y'])assert.equal(isLiveReturnToken(value),false);
  for(const href of ['https://evil.test','//evil.test','/\\evil.test','/\n/evil.test'])assert.equal(localHandoffUrl(href),null);
  assert.equal(handoffReturnHref('/studio?liveReturn=live-unknown',valid),null);
});
test('intentional primary navigation and direct routes do not inherit historical context',()=>{
  for(const route of ['/discover','/library','/profile/me','/settings','/live'])assert.equal(carryHandoff(route,'/live',token,valid),route);
  assert.equal(carryHandoff('/upload','/library',token,valid),'/upload');
  assert.equal(handoffReturnHref('/studio',valid),null);
});
test('Profile → Messages → conversation returns to the originating profile only',()=>{
  const inbox=carryHandoff('/messages?tab=requests','/profile/member',null,valid);
  const conversation=carryHandoff('/messages/conversation-id',inbox,null,valid);
  assert.equal(handoffReturnHref(conversation,valid),'/profile/member');
  assert.equal(carryHandoff('/upload',conversation,null,valid),'/upload');
  for(const path of ['//evil.test','/profile/x/../admin','/profile/x%2fadmin','/profile/x?secret=a'])assert.equal(safeProfileReturn(path),null);
});
test('4B.1 expiry and missing snapshot remain the authority; no audio fields are serialized',()=>{
  const values=new Map();const storage={get length(){return values.size},getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),key:i=>[...values.keys()][i]};
  const now=Date.now(),snapshotId=createLiveSnapshotId(now);
  const items=[{id:'track:A',type:'track',track:{_id:'A'}},{id:'track:B',type:'track',track:{_id:'B'}}];
  const snapshot=makeLiveNavigationSnapshot({snapshotId,historyKey:'key',feedMode:'synaura-scroll',filter:'new',exactItemOrder:items.map(item=>item.id),activeItemId:'track:B',scrollOffsetWithinItem:0,cursors:{tracks:2},hasMore:{tracks:false},frozenSeenBoundary:1,source:{},draftRefs:[],contextSurface:'feed'},now);
  saveLiveNavigationContext(storage,snapshot,items);
  const state={[LIVE_HISTORY_STATE_KEY]:snapshotId};
  assert.equal(loadLiveNavigationContext(state,storage,now).status,'success');
  assert.equal(loadLiveNavigationContext(state,storage,now+LIVE_SNAPSHOT_TTL_MS+1).status,'miss');
  assert.equal(JSON.stringify(snapshot).includes('currentTime'),false);
});
test('handoff modules do not import workspaces, AudioCore, APIs, providers or listeners',async()=>{
  for(const file of ['lib/creationHandoffs.ts','lib/creationHandoffClient.ts','hooks/useHandoffRouter.ts','components/navigation/HandoffLink.tsx','components/navigation/HandoffReturn.tsx','components/navigation/LiveHandoffEntry.tsx']){
    const source=await read(file);
    assert.doesNotMatch(source, /(?:fetch\(|addEventListener\(|new Audio\(|useAudioPlayer|import .*from ['"].*(?:studio\/|ai-generator|AudioCore|providers))/);
  }
});
test('nested Actions route handoff retains the established pop-before-push rule',async()=>{
  const source=await read('components/actions/ActionsSurface.tsx');
  assert.match(source,/history.go\(-controller.depth\)/);
  assert.match(source,/trackHandoffHref/);
});
