import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sharedMessagePath, voiceRecordingExtension, pauseOtherVoiceMessages } from '../lib/messagingClient.ts';
import { isTrackPublic, isAiTrackPublic } from '../lib/publicTracks.ts';

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('shared messages only navigate to known internal resource routes', () => {
  assert.equal(sharedMessagePath('track', 'track_123'), '/track/track_123');
  assert.equal(sharedMessagePath('playlist', '123'), '/playlists/123');
  assert.equal(sharedMessagePath('clip', '123'), '/clips/123');
  assert.equal(sharedMessagePath('post', '123'), '/posts/123');
  assert.equal(sharedMessagePath('javascript:alert(1)', 'x'), null);
  assert.equal(sharedMessagePath('track', ''), null);
  assert.equal(sharedMessagePath('track', 'x/?q=#'), '/track/x%2F%3Fq%3D%23');
});

test('recording extensions match webm, Safari mp4 and ogg content', () => {
  assert.equal(voiceRecordingExtension('audio/webm;codecs=opus'), 'webm');
  assert.equal(voiceRecordingExtension('audio/mp4'), 'm4a');
  assert.equal(voiceRecordingExtension('audio/ogg;codecs=opus'), 'ogg');
});

test('starting a vocal pauses only other playing voice notes and previews', () => {
  const paused = [];
  const current = { paused: false, pause: () => paused.push('current') };
  const previous = { paused: false, pause: () => paused.push('previous') };
  const inactive = { paused: true, pause: () => paused.push('inactive') };
  const original = globalThis.document;
  globalThis.document = { querySelectorAll: selector => { assert.equal(selector, 'audio[data-synaura-voice]'); return [current, previous, inactive]; } };
  try { pauseOtherVoiceMessages(current); assert.deepEqual(paused, ['previous']); }
  finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
});

test('track share eligibility rejects private and incomplete songs', () => {
  assert.equal(isTrackPublic({ is_public: false, audio_url: 'https://media.example/audio.mp3' }), false);
  assert.equal(isTrackPublic({ is_public: true, audio_url: '' }), false);
  assert.equal(isTrackPublic({ is_public: true, audio_url: 'https://media.example/audio.mp3' }), true);
  const ai = { is_public: true, audio_url: 'https://media.example/audio.mp3', generation: { is_public: true, status: 'completed' } };
  assert.equal(isAiTrackPublic(ai), true);
  assert.equal(isAiTrackPublic({ ...ai, generation: { is_public: false, status: 'completed' } }), false);
  assert.equal(isAiTrackPublic({ ...ai, generation: { is_public: true, status: 'pending' } }), false);
});

test('server validates canonical song metadata and conversation authorization', () => {
  const route = source('app/api/messages/[conversationId]/route.ts');
  assert.match(route, /requireConversationParticipant\(conversationId, session.user.id\)/);
  assert.match(route, /!isTrackPublic\(sharedTrack\)/);
  assert.match(route, /!isAiTrackPublic\(sharedTrack\)/);
  assert.match(route, /metadata = \{ title: sharedTrack.title/);
  assert.match(route, /if \(!await usersAreFriends/);
});

test('permission lookups fail closed on database errors', () => {
  const code = source('lib/messaging.ts');
  for (const name of ['usersAreBlocked', 'getBlockState', 'usersAreFriends', 'requireConversationParticipant', 'getConversationParticipantIds']) {
    const fn = code.split(`export async function ${name}(`)[1]?.split('\nexport ')[0];
    assert.ok(fn, name);
    assert.match(fn, /if \(error\) throw error;/, name);
  }
});

test('client retains failed vocal and isolates room responses and drafts', () => {
  const page = source('app/messages/[conversationId]/page.tsx');
  assert.match(page, /const sent = await uploadAndSend\(file, "audio", recordingSeconds, recordingBlob\);\s+if \(!sent\) return;/);
  assert.match(page, /clientId: pending.clientId/);
  assert.match(page, /pending.source !== retrySource/);
  assert.doesNotMatch(page, /cleanupLocalMediaUploads/);
  assert.match(page, /if \(controller.signal.aborted\) return;/);
  assert.match(page, /targetRoom === activeRoomRef.current/);
  assert.match(page, /roomDrafts.current.set/);
  assert.match(page, /ConversationContent key=\{params.conversationId\}/);
  assert.match(page, /clientId: payload.clientId \|\| crypto.randomUUID\(\)/);
  assert.match(page, /!event.nativeEvent.isComposing/);
});

test('search pickers cancel obsolete lookups and never send on selection', () => {
  const sound = source('components/messaging/SoundPicker.tsx');
  const people = source('components/messaging/PeopleFinder.tsx');
  for (const code of [sound, people]) { assert.match(code, /controller.abort\(\)/); assert.match(code, /encodeURIComponent\(query.trim\(\)\)/); }
  assert.match(sound, /onClick=\{\(\) => setSelected\(sound\)\}/);
  assert.match(sound, /await onSend\(selected\)/);
  assert.match(people, /state === 'outgoing'/);
});
