import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { CALL_CUES, callClock, callEndedCue, callTitle, hasRemoteParticipant, incomingCall } from '../synaura-app/src/calls/callModel.ts';
import { acquireCallAudioLock, isCallAudioLocked, subscribeCallAudioLock } from '../synaura-app/src/calls/callAudioLock.ts';
import { acquireMicrophone } from '../synaura-app/src/calls/microphoneLease.ts';
const read = path => fs.readFileSync(new URL('../synaura-app/' + path, import.meta.url), 'utf8');
const call = { id: 'a', callerId: 'me', conversationId: 'c', status: 'ringing', mine: 'joined', title: 'Le groupe', group: false, members: [{ id: 'me', name: 'Moi' }, { id: 'them', name: 'Artiste' }] };

test('six supplied cues have explicit meanings; only ringing cues loop', () => {
  assert.equal(Object.keys(CALL_CUES).length, 6);
  assert.deepEqual(Object.keys(CALL_CUES).filter(key => CALL_CUES[key].loop), ['incoming', 'outgoing']);
  for (const key of Object.keys(CALL_CUES)) {
    const asset = fs.readFileSync(new URL('../synaura-app/src/assets/calls/' + key + '.mp3', import.meta.url));
    const packaged = fs.readFileSync(new URL('../synaura-app/android/app/src/main/res/raw/' + CALL_CUES[key].resource + '.mp3', import.meta.url));
    assert.ok(asset.length > 1000);
    assert.equal(crypto.createHash('sha256').update(asset).digest('hex'), crypto.createHash('sha256').update(packaged).digest('hex'));
  }
});
test('incoming invitation excludes the local active or ended call', () => {
  assert.equal(incomingCall([call]), null);
  assert.equal(incomingCall([{ ...call, mine: 'invited' }], 'a'), null);
  assert.equal(incomingCall([{ ...call, mine: 'invited', status: 'ended' }]), null);
  assert.equal(incomingCall([{ ...call, mine: 'invited' }]).id, 'a');
});
test('connected sound requires a remote RTC participant, not a signalling flag', () => {
  assert.equal(hasRemoteParticipant(['me'], 'me'), false);
  assert.equal(hasRemoteParticipant(['me', 'them'], 'me'), true);
  assert.equal(callTitle(call, 'me'), 'Artiste');
  assert.equal(callTitle({ ...call, group: true }, 'me'), 'Le groupe');
  assert.equal(callEndedCue(false), 'missed');
  assert.equal(callEndedCue(true), 'ended');
});
test('call timer remains a stable elapsed clock', () => {
  assert.equal(callClock(-1), '0:00');
  assert.equal(callClock(61.9), '1:01');
  assert.equal(callClock(3601), '60:01');
});
test('audio lock is ownership based, observable and idempotently released', () => {
  let notifications = 0;
  const stop = subscribeCallAudioLock(() => notifications++);
  const first = acquireCallAudioLock(); const second = acquireCallAudioLock();
  assert.equal(isCallAudioLocked(), true);
  first(); first(); assert.equal(isCallAudioLocked(), true);
  second(); assert.equal(isCallAudioLocked(), false);
  assert.equal(notifications, 4); stop();
});
test('voice notes and calls cannot acquire the microphone concurrently', () => {
  const note = acquireMicrophone(); assert.ok(note);
  assert.equal(acquireMicrophone(), null);
  note(); const call = acquireMicrophone(); assert.ok(call);
  note(); assert.equal(acquireMicrophone(), null);
  call(); const last = acquireMicrophone(); assert.ok(last); last();
});
test('native call cue playback respects silent mode and never changes the communication route', () => {
  const source = read('plugins/native-messaging/native/SynauraCallAudioModule.kt');
  assert.match(source, /RINGER_MODE_NORMAL/);
  assert.match(source, /USAGE_VOICE_COMMUNICATION_SIGNALLING/);
  assert.doesNotMatch(source, /requestAudioFocus\(|setSpeakerphoneOn\(|setMode\(/);
  assert.match(source, /override fun invalidate/);
});
test('call provider guards entry, obsolete joins and cleanup without logging credentials', () => {
  const source = read('src/calls/NativeCallProvider.tsx');
  assert.match(source, /!auth\.mfaRequired && !auth\.biometricLocked/);
  assert.match(source, /profileComplete !== false/);
  assert.match(source, /attempt === epoch\.current/);
  assert.match(source, /action, device\.current/);
  assert.match(source, /voiceCallAction\('leave', device\.current, \{ callId: data\.call\.id \}\)/);
  assert.match(source, /value\.track\?\.stop\(\)/);
  assert.match(source, /AudioSession\.stopAudioSession/);
  assert.match(source, /acquireMicrophone/);
  assert.doesNotMatch(source, /console\.(log|warn|error)/);
});
test('call route selection and accessible controls are real actions', () => {
  const provider = read('src/calls/NativeCallProvider.tsx');
  const overlay = read('src/calls/NativeCallOverlay.tsx');
  assert.match(provider, /AudioSession\.selectAudioOutput\(value\)/);
  assert.match(provider, /track\.mute\(\)/);
  assert.match(overlay, /Choisir la sortie audio/);
  assert.match(overlay, /Raccrocher/);
  assert.match(overlay, /props\.onAccept/);
});
test('music, clip and voice note paths honour call ownership', () => {
  assert.match(read('src/calls/playMusicOutsideCall.ts'), /if \(isCallAudioLocked\(\)\) return/);
  assert.doesNotMatch(read('src/player/PlayerProvider.tsx'), /TrackPlayer\.play\(\)/);
  assert.doesNotMatch(read('src/player/playbackService.ts'), /TrackPlayer\.play\(\)/);
  assert.match(read('src/components/swipe/ClipSlide.tsx'), /isActive && isPlaying && !callAudioLocked/);
  assert.match(read('src/screens/ConversationScreen.tsx'), /playing=\{!calls\.engaged/);
});
test('player chrome is not mounted over MFA, locked, incomplete accounts or calls', () => {
  const source = read('src/components/NativePlayerChrome.tsx');
  assert.match(source, /auth\.mfaRequired/); assert.match(source, /auth\.biometricLocked/);
  assert.match(source, /profileComplete === false/); assert.match(source, /calls\.engaged/);
  assert.match(source, /if \(blocked\) return null/);
});
