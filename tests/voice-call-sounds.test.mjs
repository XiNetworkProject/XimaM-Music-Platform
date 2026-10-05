import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { CallSounds, CALL_SOUNDS, remoteEndCue } from '../lib/voice/callSounds.ts';

function setup(t, blocked = false) {
  const audios = [], blockedEvents = [];
  const channel = new CallSounds(() => {
    const audio = { dataset: {}, plays: 0, pauses: 0, loads: 0,
      play() { this.plays++; return blocked ? Promise.reject(Object.assign(new Error('Gesture required'), { name: 'NotAllowedError' })) : Promise.resolve(); },
      pause() { this.pauses++; }, removeAttribute() { this.src = ''; }, load() { this.loads++; },
    };
    audios.push(audio);return audio;
  }, value => blockedEvents.push(value));
  t.after(() => channel.stop());
  return { channel, audios, blockedEvents, unblock: () => { blocked = false; } };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

test('six web assets exactly match the supplied native call recordings', () => {
  const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(Object.keys(CALL_SOUNDS).length, 6);
  for (const [cue, sound] of Object.entries(CALL_SOUNDS)) {
    assert.equal(digest(new URL('../public' + sound.src, import.meta.url)), digest(new URL('../synaura-app/src/assets/calls/' + cue + '.mp3', import.meta.url)));
    assert.equal(sound.loop, ['incoming', 'outgoing'].includes(cue));
  }
});
test('idle does not create audio; polling the same invitation does not restart ringing', t => {
  const f = setup(t); assert.equal(f.audios.length, 0);
  f.channel.play('incoming', 'a'); f.channel.play('incoming', 'a');
  assert.equal(f.audios.length, 1); assert.equal(f.audios[0].plays, 1);
  assert.equal(f.audios[0].loop, true); assert.equal(f.audios[0].dataset.synauraAudioPolicy, 'independent');
});
test('answer replaces ringing with one connected cue, then end releases the audio resource', t => {
  const f = setup(t); f.channel.play('outgoing', 'a'); f.channel.play('connected', 'a');
  assert.equal(f.audios[0].pauses, 1);assert.equal(f.audios[0].src, '');assert.equal(f.audios[1].loop, false);
  f.audios[1].onended(); f.channel.play('connected', 'a'); assert.equal(f.audios.length, 2);
  f.channel.play('ended', 'a'); f.channel.stop();
  assert.ok(f.audios.every(audio => audio.pauses === 1 && audio.loads === 1));
});
test('autoplay refusal can retry only the currently blocked loop after a gesture', async t => {
  const f=setup(t,true);f.channel.play('incoming','a');await tick();assert.equal(f.blockedEvents.at(-1),true);
  f.unblock();f.channel.retry();await tick();assert.equal(f.audios[0].plays,2);assert.equal(f.blockedEvents.at(-1),false);
  f.channel.stop(); f.channel.retry(); assert.equal(f.audios[0].plays,2);
});
test('missed and ended cues cannot be replayed unexpectedly on the next click', async t => {
  const f=setup(t,true);f.channel.play('missed','a');await tick();f.channel.retry();
  assert.equal(f.audios[0].plays,1);assert.equal(f.blockedEvents.at(-1),false);
});
test('late playback rejection cannot revive a cancelled ringtone', async t => {
  const f=setup(t,true);f.channel.play('incoming','a');f.channel.stop();await tick();
  assert.equal(f.blockedEvents.at(-1),false);f.channel.retry();assert.equal(f.audios[0].plays,1);
});
test('ringing expires once and stale invitations do not restart it', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 });
  const f=setup(t);f.channel.play('incoming','a',2000);t.mock.timers.tick(1001);
  assert.equal(f.audios[0].pauses,1);f.channel.play('incoming','a',2000);assert.equal(f.audios.length,1);
  f.channel.play('incoming','expired',500);assert.equal(f.audios.length,1);
});
test('remote termination does not invent a refusal reason', () => {
  assert.equal(remoteEndCue(false),'missed');assert.equal(remoteEndCue(true),'ended');
  const provider=fs.readFileSync(new URL('../components/messaging/VoiceCallProvider.tsx',import.meta.url),'utf8');
  assert.match(provider,/room\.remoteParticipants\.size > 0/);
  assert.match(provider,/stop\(true, null\)/);
  assert.match(provider,/window\.removeEventListener\('pointerdown', retry\)/);
  assert.match(provider,/Activer la sonnerie/);
});
