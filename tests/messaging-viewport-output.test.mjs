import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { voiceOutputDevices, voiceOutputError } from '../lib/voice/audioOutput.ts';
import { messagingViewport } from '../lib/messagingViewport.ts';
import ts from 'typescript';
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('voice output list only exposes real authorized outputs and one honest system default', () => {
  assert.deepEqual(voiceOutputDevices([]), [{deviceId:'',label:'Sortie système'}]);
  const devices = voiceOutputDevices([
    {kind:'audioinput',deviceId:'mic',label:'Micro'},
    {kind:'audiooutput',deviceId:'default',label:'Default'},
    {kind:'audiooutput',deviceId:'speakers',label:'Haut-parleurs USB'},
    {kind:'audiooutput',deviceId:'speakers',label:'Duplicate'},
    {kind:'audiooutput',deviceId:'headset',label:''},
  ]);
  assert.deepEqual(devices.map(d=>d.deviceId), ['', 'speakers', 'headset']);
  assert.equal(devices[1].label, 'Haut-parleurs USB');
  assert.equal(devices[2].label, 'Sortie audio 2');
});
test('output failures stay actionable and never display provider errors', () => {
  assert.match(voiceOutputError(Object.assign(new Error('private'),{name:'NotAllowedError'})), /pas autorisée/);
  assert.match(voiceOutputError(Object.assign(new Error('private'),{name:'NotFoundError'})), /plus disponible/);
  assert.match(voiceOutputError(new Error('secret-provider-error')), /L’appel continue/);
  assert.doesNotMatch(voiceOutputError(new Error('secret-provider-error')), /secret-provider/);
});
test('conversation uses available viewport for desktop, mobile keyboard, pan and rotation', () => {
  assert.deepEqual(messagingViewport(900,94), {height:806,offset:0});
  assert.deepEqual(messagingViewport(844,70), {height:774,offset:0});
  assert.deepEqual(messagingViewport(420,70,24), {height:350,offset:24});
  assert.deepEqual(messagingViewport(390,70), {height:320,offset:0});
  assert.deepEqual(messagingViewport(20,70), {height:0,offset:0});
});
test('output selection changes only the live room, never capture or musical AudioCore', () => {
  const code = source('components/messaging/VoiceAudioOutput.tsx');
  assert.match(code, /switchActiveDevice\('audiooutput', id\)/);
  assert.match(code, /HTMLMediaElement.prototype.setSinkId/);
  assert.match(code, /ne peut pas forcer le haut-parleur/);
  assert.match(code, /generation.current !== version/);
  assert.match(code, /removeEventListener\('devicechange'/);
  assert.doesNotMatch(code, /getUserMedia|AudioCore|localStorage|sessionStorage|\.disconnect\(/);
});
test('conversation viewport watches keyboard pan and resize and releases all listeners', () => {
  const hook = source('hooks/useMessagingViewport.ts');
  assert.match(hook, /viewport\?\.addEventListener\('scroll'/);
  assert.match(hook, /viewport\?\.removeEventListener\('scroll'/);
  assert.match(hook, /viewport\?\.removeEventListener\('resize'/);
  assert.match(hook, /observer.disconnect\(\)/);
  assert.match(source('components/messaging/messaging-experience.css'), /\.syn-unified-app:has\(\.ms-thread\) \{ padding-bottom:0;/);
  assert.doesNotMatch(source('app/messages/[conversationId]/page.tsx'), /ms-viewport-height/);
});

function outputHandler(switchActiveDevice) {
  const tree = ts.createSourceFile('output.tsx', source('components/messaging/VoiceAudioOutput.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'choose') callback = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(callback);
  const state = { selected:'', pending:false, notice:'', devices:[], generation:{current:1}, changing:{current:false} };
  const compile = ts.transpileModule(`return (${callback.getText(tree)});`, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const choose = new Function('room','ready','supported','changing','generation','setPending','setNotice','setSelected','setDevices','voiceOutputError',compile)(
    {switchActiveDevice}, true, true, state.changing, state.generation,
    value => {state.pending=value;}, value => {state.notice=value;}, value => {state.selected=value;},
    update => {state.devices=update(state.devices);}, voiceOutputError,
  );
  return {choose,state};
}

test('output control updates only after success and refuses concurrent switching', async () => {
  let finish;
  const calls=[];
  const {choose,state}=outputHandler((...args)=>{calls.push(args);return new Promise(resolve=>{finish=resolve;});});
  const first=choose('speakers');
  assert.equal(state.pending,true);
  assert.equal(state.selected,'');
  await choose('headphones');
  assert.deepEqual(calls,[['audiooutput','speakers']]);
  finish(true); await first;
  assert.equal(state.selected,'speakers');
  assert.equal(state.pending,false);
  assert.equal(state.changing.current,false);
});

test('failed output keeps the previous choice; a completed old room cannot update a new call', async () => {
  const failed=outputHandler(async()=>false);
  failed.state.selected='headphones';
  await failed.choose('speakers');
  assert.equal(failed.state.selected,'headphones');
  assert.match(failed.state.notice,/L’appel continue/);
  assert.equal(failed.state.pending,false);
  let finish;
  const stale=outputHandler(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=stale.choose('speakers');
  stale.state.generation.current++;
  finish(true); await pending;
  assert.equal(stale.state.selected,'');
  assert.equal(stale.state.notice,'');
});
