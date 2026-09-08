import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioCore, AUDIO_SESSION_STORAGE_KEY } from '../lib/audio/AudioCore.ts';

class FakeScheduler {
  nowValue = 10_000;
  nextId = 1;
  tasks = new Map();
  now = () => this.nowValue;
  setTimeout = (callback, delay) => this.add(callback, delay, 0);
  clearTimeout = (id) => this.tasks.delete(id);
  setInterval = (callback, delay) => this.add(callback, delay, delay);
  clearInterval = (id) => this.tasks.delete(id);
  add(callback, delay, repeat) {
    const id = this.nextId++;
    this.tasks.set(id, { callback, at: this.nowValue + delay, repeat });
    return id;
  }
  tick(ms) {
    const target = this.nowValue + ms;
    let guard = 0;
    while (guard++ < 10_000) {
      const next = [...this.tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) break;
      const [id, task] = next;
      this.nowValue = task.at;
      if (task.repeat) task.at += task.repeat;
      else this.tasks.delete(id);
      task.callback();
    }
    this.nowValue = target;
  }
}

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

class MockAudio extends EventTarget {
  _src = '';
  currentSrc = '';
  currentTime = 0;
  duration = 120;
  volume = 1;
  muted = false;
  playbackRate = 1;
  paused = true;
  ended = false;
  error = null;
  preload = '';
  crossOrigin = '';
  buffered = { length: 0, end: () => 0 };
  playCount = 0;
  loadCount = 0;
  listeners = new Map();
  playBehaviors = [];
  set src(value) { this._src = value; this.currentSrc = value; }
  get src() { return this._src; }
  setAttribute() {}
  removeAttribute(name) { if (name === 'src') { this._src = ''; this.currentSrc = ''; } }
  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
    this.listeners.set(type, (this.listeners.get(type) || 0) + 1);
  }
  removeEventListener(type, listener, options) {
    super.removeEventListener(type, listener, options);
    this.listeners.set(type, Math.max(0, (this.listeners.get(type) || 0) - 1));
  }
  load() { this.loadCount += 1; }
  async play() {
    this.playCount += 1;
    const behavior = this.playBehaviors.shift();
    if (behavior instanceof Error) throw behavior;
    if (behavior) await behavior;
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event('play'));
    this.dispatchEvent(new Event('playing'));
  }
  pause() {
    const notify = !this.paused;
    this.paused = true;
    if (notify) this.dispatchEvent(new Event('pause'));
  }
  ready(duration = this.duration) {
    this.duration = duration;
    this.dispatchEvent(new Event('loadedmetadata'));
    this.dispatchEvent(new Event('canplay'));
  }
  fail(code) {
    this.error = { code };
    this.dispatchEvent(new Event('error'));
  }
}

const artist = { _id: 'artist-1', name: 'Ari', username: 'ari' };
const track = (id, extra = {}) => ({
  _id: id,
  title: `Track ${id}`,
  artist,
  audioUrl: `https://media.synaura.test/${id}.mp3`,
  duration: 120,
  likes: [],
  comments: [],
  plays: 0,
  ...extra,
});

function setup(options = {}) {
  const audio = new MockAudio();
  const scheduler = new FakeScheduler();
  const storage = options.storage || new MemoryStorage();
  const core = new AudioCore({ audioFactory: () => audio, scheduler, storage, ...options });
  core.initialize();
  return { core, audio, scheduler, storage };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('initialisation unique, commandes et nettoyage des listeners', async () => {
  const { core, audio } = setup();
  core.initialize();
  assert.match(core.getDiagnostics().instanceId, /^audio-core-\d+$/);
  assert.equal(core.getDiagnostics().musicalAudioElements, 1);
  assert.equal(core.getDiagnostics().watchdogActive, true);
  assert.equal(core.getDiagnostics().listeners, 14);
  assert.equal([...audio.listeners.values()].reduce((sum, value) => sum + value, 0), 14);
  await core.playTrack(track('a'));
  assert.equal(core.getSnapshot().playbackState, 'playing');
  core.seek(42);
  assert.equal(core.getTimeSnapshot().currentTime, 42);
  core.pause();
  assert.equal(core.getSnapshot().playbackState, 'paused');
  await core.toggle();
  assert.equal(core.getSnapshot().isPlaying, true);
  core.destroy();
  assert.equal([...audio.listeners.values()].reduce((sum, value) => sum + value, 0), 0);
});

test('une résolution tardive de A ne remplace jamais B', async () => {
  const { core, audio } = setup();
  let resolveA;
  audio.playBehaviors.push(new Promise((resolve) => { resolveA = resolve; }));
  const playingA = core.playTrack(track('a'));
  const playingB = core.playTrack(track('b'));
  await playingB;
  resolveA();
  await playingA;
  assert.equal(core.getSnapshot().currentTrack?._id, 'b');
  assert.equal(core.getSnapshot().generation, 2);
  assert.equal(core.getSnapshot().isPlaying, true);
});

test('pause et stop neutralisent une promesse play encore en vol', async () => {
  const paused = setup();
  let resolvePause;
  paused.audio.playBehaviors.push(new Promise((resolve) => { resolvePause = resolve; }));
  const pendingPause = paused.core.playTrack(track('pause'));
  paused.core.pause();
  resolvePause();
  await pendingPause;
  assert.equal(paused.core.getSnapshot().isPlaying, false);
  assert.equal(paused.audio.paused, true);

  const stopped = setup();
  let resolveStop;
  stopped.audio.playBehaviors.push(new Promise((resolve) => { resolveStop = resolve; }));
  const pendingStop = stopped.core.playTrack(track('stop'));
  stopped.core.stop();
  resolveStop();
  await pendingStop;
  assert.equal(stopped.core.getSnapshot().currentTrack, null);
  assert.equal(stopped.core.getSnapshot().playbackState, 'idle');
  assert.equal(stopped.audio.paused, true);
});

test('un événement média portant encore la source A est ignoré après A vers B', async () => {
  const { core, audio } = setup();
  await core.playTrack(track('a'));
  await core.playTrack(track('b'));
  const sourceB = audio.currentSrc;
  audio.currentSrc = 'https://media.synaura.test/a.mp3';
  audio.fail(2);
  audio.currentSrc = sourceB;
  assert.equal(core.getSnapshot().currentTrack?._id, 'b');
  assert.equal(core.getSnapshot().error, null);
  assert.equal(core.getSnapshot().isPlaying, true);
});

test('les retries de A sont annulés quand B devient courant', async () => {
  const { core, audio, scheduler } = setup();
  audio.playBehaviors.push(new Error('network unavailable'));
  await core.playTrack(track('a'));
  assert.equal(core.getSnapshot().error?.kind, 'network');
  assert.equal(core.getDiagnostics().pendingRetries, 4);
  await core.playTrack(track('b'));
  const countAfterB = audio.playCount;
  scheduler.tick(7_000);
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'b');
  assert.equal(audio.playCount, countAfterB);
  assert.equal(core.getDiagnostics().pendingRetries, 0);
});

test('fallback source et chargement asynchrone restent attachés à la génération', async () => {
  const { core, audio } = setup();
  const loading = core.loadTrack(track('a', { backupAudioUrls: ['https://media.synaura.test/a-backup.mp3'] }));
  audio.fail(4);
  assert.match(audio.src, /a-backup\.mp3$/);
  audio.ready(99);
  await loading;
  assert.equal(core.getSnapshot().duration, 99);
  assert.equal(core.getSnapshot().error, null);
});

test('queue, next, previous et repeat one/all ont une seule autorité', async () => {
  const { core, audio } = setup();
  const queue = [track('a'), track('b'), track('c')];
  core.setQueue(queue, 0);
  await core.playTrack(queue[0]);
  core.next();
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'b');
  core.previous();
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'a');
  core.setRepeat('one');
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'a');
  core.setRepeat('all');
  await core.playTrack(queue[2]);
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'a');
});

test('ajout, suppression, reorder, fin de queue et continuation recommandée', async () => {
  const { core, audio } = setup();
  const a = track('a');
  const b = track('b');
  const c = track('c');
  const recommended = track('recommended');
  core.setQueue([a, b], 0);
  await core.playTrack(a);
  core.addToQueue(c, 'next');
  assert.deepEqual(core.getSnapshot().queue.map((item) => item._id), ['a', 'c', 'b']);
  core.removeFromQueue('b');
  assert.deepEqual(core.getSnapshot().queue.map((item) => item._id), ['a', 'c']);
  core.reorderQueue([c, a]);
  assert.deepEqual(core.getSnapshot().queue.map((item) => item._id), ['c', 'a']);
  assert.equal(core.getSnapshot().currentIndex, 1);
  core.setCallbacks({ onQueueEnd: () => recommended });
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'recommended');

  core.setCallbacks({ onQueueEnd: () => null });
  audio.ended = true;
  audio.dispatchEvent(new Event('ended'));
  await flush();
  assert.equal(core.getSnapshot().playbackState, 'ended');
});

test('shuffle ne détruit jamais l’ordre canonique', async () => {
  const { core } = setup({ random: () => 0 });
  const queue = [track('a'), track('b'), track('c')];
  core.setQueue(queue, 0);
  await core.playTrack(queue[0]);
  core.setShuffle(true);
  core.next();
  await flush();
  assert.deepEqual(core.getSnapshot().queue.map((item) => item._id), ['a', 'b', 'c']);
  core.setShuffle(false);
  assert.deepEqual(core.getSnapshot().queue.map((item) => item._id), ['a', 'b', 'c']);
});

test('persistance versionnée restaurée sans autoplay et entrée invalide purgée', async () => {
  const storage = new MemoryStorage();
  const first = setup({ storage });
  await first.core.playTrack(track('a'));
  first.core.seek(37);
  first.core.pause();
  first.core.persistNow();
  assert.equal(JSON.parse(storage.getItem(AUDIO_SESSION_STORAGE_KEY)).version, 1);

  const second = setup({ storage });
  const restoring = second.core.restoreSession();
  second.audio.ready(120);
  assert.equal(await restoring, true);
  assert.equal(second.core.getSnapshot().currentTrack?._id, 'a');
  assert.equal(second.core.getTimeSnapshot().currentTime, 37);
  assert.equal(second.core.getSnapshot().isPlaying, false);

  const invalidStorage = new MemoryStorage();
  invalidStorage.setItem(AUDIO_SESSION_STORAGE_KEY, '{bad json');
  const invalid = setup({ storage: invalidStorage });
  assert.equal(await invalid.core.restoreSession(), false);
  assert.equal(invalidStorage.getItem(AUDIO_SESSION_STORAGE_KEY), null);
});

test('une piste expirée ou introuvable est écartée à la restauration', async () => {
  const storage = new MemoryStorage();
  storage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify({
    version: 1,
    savedAt: 10_000,
    currentTrackId: 'expired',
    position: 10,
    wasPlaying: true,
    queue: [track('expired')],
    volume: 1,
    muted: false,
    repeat: 'none',
    shuffle: false,
  }));
  const { core } = setup({ storage, isTrackRestorable: () => false });
  assert.equal(await core.restoreSession(), false);
  assert.equal(storage.getItem(AUDIO_SESSION_STORAGE_KEY), null);
});

test('la queue et une URL fraîche sont restaurées par identifiant', async () => {
  const storage = new MemoryStorage();
  storage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify({
    version: 1,
    savedAt: 10_000,
    currentTrackId: 'b',
    position: 19,
    wasPlaying: true,
    queue: [track('a'), track('b', { audioUrl: 'https://old.invalid/b.mp3' })],
    volume: 0.7,
    muted: false,
    repeat: 'all',
    shuffle: false,
  }));
  const refreshed = track('b', { audioUrl: 'https://media.synaura.test/b-fresh.mp3', title: 'Fresh B' });
  const { core, audio } = setup({ storage, refreshPersistedTrack: async () => refreshed });
  const restoring = core.restoreSession();
  await flush();
  audio.ready(120);
  assert.equal(await restoring, true);
  assert.deepEqual(core.getSnapshot().queue.map((item) => item._id), ['a', 'b']);
  assert.equal(core.getSnapshot().currentTrack?.audioUrl, refreshed.audioUrl);
  assert.equal(core.getTimeSnapshot().currentTime, 19);
  assert.equal(core.getSnapshot().isPlaying, false);
});

test('une piste supprimée, une session ancienne et un schéma inconnu sont ignorés', async () => {
  const makeSession = (overrides = {}) => ({
    version: 1,
    savedAt: 10_000,
    currentTrackId: 'a',
    position: 4,
    wasPlaying: false,
    queue: [track('a')],
    volume: 1,
    muted: false,
    repeat: 'none',
    shuffle: false,
    ...overrides,
  });

  const deletedStorage = new MemoryStorage();
  deletedStorage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify(makeSession()));
  const deleted = setup({ storage: deletedStorage, refreshPersistedTrack: async () => null });
  assert.equal(await deleted.core.restoreSession(), false);
  assert.equal(deletedStorage.getItem(AUDIO_SESSION_STORAGE_KEY), null);

  const expiredStorage = new MemoryStorage();
  expiredStorage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify(makeSession({ savedAt: 1 })));
  const expired = setup({ storage: expiredStorage, sessionMaxAgeMs: 100 });
  assert.equal(await expired.core.restoreSession(), false);

  const schemaStorage = new MemoryStorage();
  schemaStorage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify(makeSession({ version: 2 })));
  const schema = setup({ storage: schemaStorage });
  assert.equal(await schema.core.restoreSession(), false);
});

test('un lecteur secondaire pause puis reprend, sans reprise obsolète', async () => {
  const { core, audio } = setup();
  await core.playTrack(track('a'));
  const release = core.beginSecondaryPlayback('voice-message');
  assert.equal(core.getSnapshot().isPlaying, false);
  release();
  await flush();
  assert.equal(core.getSnapshot().isPlaying, true);

  const staleRelease = core.beginSecondaryPlayback('preview');
  await core.playTrack(track('b'));
  assert.equal(core.getSnapshot().currentTrack?._id, 'b');
  assert.equal(core.getSnapshot().isPlaying, false);
  const countBeforeRelease = audio.playCount;
  staleRelease();
  await flush();
  assert.equal(core.getSnapshot().currentTrack?._id, 'b');
  assert.equal(core.getSnapshot().isPlaying, true);
  assert.equal(audio.playCount, countBeforeRelease + 1);
});

test('une pause explicite pendant un lecteur secondaire annule la reprise', async () => {
  const { core } = setup();
  await core.playTrack(track('a'));
  const release = core.beginSecondaryPlayback('voice-message');
  core.pause();
  release();
  await flush();
  assert.equal(core.getSnapshot().isPlaying, false);
});

test('preview et message ne jouent jamais avec le global et les leases se nettoient', async () => {
  const { core, audio } = setup();
  await core.playTrack(track('a'));
  const preview = new MockAudio();
  const message = new MockAudio();
  const cleanupPreview = core.coordinateSecondaryElement(preview, 'preview');
  const cleanupMessage = core.coordinateSecondaryElement(message, 'voice-message');

  await preview.play();
  assert.equal(audio.paused, true);
  assert.equal(core.getDiagnostics().activeSecondaryPlayers, 1);
  preview.pause();
  await flush();
  assert.equal(core.getSnapshot().isPlaying, true);

  await message.play();
  assert.equal(audio.paused, true);
  message.pause();
  await flush();
  assert.equal(core.getSnapshot().isPlaying, true);

  cleanupPreview();
  cleanupMessage();
  assert.equal(core.getDiagnostics().activeSecondaryPlayers, 0);
});

test('preview A vers B et message A vers B libèrent la lease précédente', async () => {
  const { core } = setup();
  for (const kind of ['preview', 'voice-message']) {
    const first = new MockAudio();
    const second = new MockAudio();
    const cleanupFirst = core.coordinateSecondaryElement(first, kind);
    const cleanupSecond = core.coordinateSecondaryElement(second, kind);
    await first.play();
    assert.equal(core.getDiagnostics().activeSecondaryPlayers, 1);
    first.pause();
    await second.play();
    assert.equal(core.getDiagnostics().activeSecondaryPlayers, 1);
    second.pause();
    cleanupFirst();
    cleanupSecond();
    assert.equal(core.getDiagnostics().activeSecondaryPlayers, 0);
  }
});

test('un chevauchement de leases secondaires est signalé en développement', async () => {
  const { core } = setup();
  const previousEnvironment = process.env.NODE_ENV;
  const previousWarn = console.warn;
  const warnings = [];
  process.env.NODE_ENV = 'development';
  console.warn = (...args) => warnings.push(args);
  try {
    const releaseA = core.beginSecondaryPlayback('preview');
    const releaseB = core.beginSecondaryPlayback('preview');
    assert.equal(core.getDiagnostics().activeSecondaryPlayers, 2);
    assert.deepEqual(core.getDiagnostics().secondaryContexts, ['preview', 'preview']);
    assert.equal(warnings.length, 1);
    releaseA();
    assert.equal(core.getDiagnostics().activeSecondaryPlayers, 1);
    releaseB();
    assert.equal(core.getDiagnostics().activeSecondaryPlayers, 0);
  } finally {
    console.warn = previousWarn;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('un lecteur secondaire ne reprend pas un global déjà en pause', async () => {
  const { core } = setup();
  await core.playTrack(track('a'));
  core.pause();
  const release = core.beginSecondaryPlayback('preview');
  release();
  await flush();
  assert.equal(core.getSnapshot().isPlaying, false);
});

test('les erreurs globales et secondaires publient un événement nettoyable', async () => {
  const { core } = setup();
  const observations = [];
  core.setCallbacks({ onError: (observation) => observations.push(observation) });
  await core.playTrack(track('missing', { audioUrl: '' }));
  assert.equal(observations[0].event, 'invalid-track');
  assert.equal(observations[0].context, 'global');

  const secondary = new MockAudio();
  const cleanup = core.coordinateSecondaryElement(secondary, 'voice-message');
  secondary.fail(3);
  assert.equal(observations[1].event, 'secondary-media-error');
  assert.equal(observations[1].context, 'voice-message');
  assert.equal(observations[1].error.kind, 'decode');
  cleanup();
});

test('le temps notifie uniquement le store spécialisé et les erreurs sont typées', async () => {
  const { core, audio, scheduler } = setup();
  await core.playTrack(track('a'));
  let stateNotifications = 0;
  let timeNotifications = 0;
  core.subscribe(() => { stateNotifications += 1; });
  core.subscribeTime(() => { timeNotifications += 1; });
  scheduler.tick(300);
  audio.currentTime = 12;
  audio.dispatchEvent(new Event('timeupdate'));
  assert.equal(stateNotifications, 0);
  assert.equal(timeNotifications, 1);

  core.stop();
  const blocked = new Error('play not allowed');
  blocked.name = 'NotAllowedError';
  audio.playBehaviors.push(blocked);
  await core.playTrack(track('blocked'));
  assert.equal(core.getSnapshot().error?.kind, 'autoplay-blocked');
  assert.equal(core.getDiagnostics().pendingRetries, 0);
  await core.playTrack(track('missing', { audioUrl: '' }));
  assert.equal(core.getSnapshot().error?.kind, 'missing-file');
});
