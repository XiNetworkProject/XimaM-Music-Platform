export type AudioPlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export type AudioErrorKind =
  | 'network'
  | 'media-unsupported'
  | 'missing-file'
  | 'decode'
  | 'timeout'
  | 'autoplay-blocked'
  | 'aborted'
  | 'stale'
  | 'unknown';

export type AudioRepeatMode = 'none' | 'one' | 'all';

export interface AudioCoreTrack {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  backupAudioUrls?: string[];
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  createdAt?: string;
  album?: string | null;
}

export interface AudioCoreError {
  kind: AudioErrorKind;
  message: string;
  trackId: string | null;
  generation: number;
  recoverable: boolean;
}

export interface AudioCoreSnapshot {
  currentTrack: AudioCoreTrack | null;
  playbackState: AudioPlaybackState;
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  queue: AudioCoreTrack[];
  currentIndex: number;
  repeat: AudioRepeatMode;
  shuffle: boolean;
  error: AudioCoreError | null;
  generation: number;
}

export interface AudioTimeSnapshot {
  currentTime: number;
  duration: number;
  buffered: number;
}

export interface AudioCoreDiagnostics {
  trackId: string | null;
  playbackState: AudioPlaybackState;
  position: number;
  duration: number;
  queueIds: string[];
  currentIndex: number;
  generation: number;
  listeners: number;
  pendingRetries: number;
  activeSecondaryPlayers: number;
}

type CoreListener = () => void;
type TimerHandle = ReturnType<typeof setTimeout>;

interface AudioCoreScheduler {
  now: () => number;
  setTimeout: (callback: () => void, delay: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
  setInterval: (callback: () => void, delay: number) => TimerHandle;
  clearInterval: (handle: TimerHandle) => void;
}

interface AudioCoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface AudioCoreCallbacks {
  onTrackChanged?: (track: AudioCoreTrack) => void;
  onPlaybackStarted?: (track: AudioCoreTrack, position: number, duration: number) => void;
  onProgress?: (track: AudioCoreTrack, position: number, duration: number) => void;
  onQueueEnd?: (track: AudioCoreTrack | null) => AudioCoreTrack | null | undefined;
  onBeforeAutomaticAdvance?: (current: AudioCoreTrack | null, next: AudioCoreTrack | null) => AudioCoreTrack | null;
}

interface PersistedAudioSessionV1 {
  version: 1;
  savedAt: number;
  currentTrackId: string | null;
  position: number;
  wasPlaying: boolean;
  queue: AudioCoreTrack[];
  volume: number;
  muted: boolean;
  repeat: AudioRepeatMode;
  shuffle: boolean;
}

interface PendingLoad {
  generation: number;
  source: string;
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: TimerHandle;
}

interface AudioCoreOptions {
  audioFactory: () => HTMLAudioElement;
  storage?: AudioCoreStorage | null;
  scheduler?: AudioCoreScheduler;
  resolveSource?: (url: string) => string;
  isTrackRestorable?: (track: AudioCoreTrack) => boolean;
  random?: () => number;
  retryDelays?: number[];
  retryDeadlineMs?: number;
  watchdogIntervalMs?: number;
  sessionMaxAgeMs?: number;
}

const SESSION_KEY = 'synaura.audioSession:v1';
const DEFAULT_SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAIN_AUDIO_EVENTS: Array<keyof HTMLMediaElementEventMap> = [
  'play',
  'playing',
  'pause',
  'timeupdate',
  'progress',
  'durationchange',
  'loadedmetadata',
  'canplay',
  'waiting',
  'stalled',
  'ended',
  'error',
  'volumechange',
  'ratechange',
];

const defaultScheduler: AudioCoreScheduler = {
  now: () => Date.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (handle) => clearTimeout(handle),
  setInterval: (callback, delay) => setInterval(callback, delay),
  clearInterval: (handle) => clearInterval(handle),
};

export const EMPTY_AUDIO_CORE_SNAPSHOT: AudioCoreSnapshot = {
  currentTrack: null,
  playbackState: 'idle',
  isPlaying: false,
  isLoading: false,
  duration: 0,
  buffered: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  queue: [],
  currentIndex: -1,
  repeat: 'none',
  shuffle: false,
  error: null,
  generation: 0,
};

export const EMPTY_AUDIO_TIME_SNAPSHOT: AudioTimeSnapshot = {
  currentTime: 0,
  duration: 0,
  buffered: 0,
};

function trackId(track: AudioCoreTrack | null | undefined) {
  return String(track?._id || '');
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isValidSource(value: unknown) {
  return typeof value === 'string' && /^(?:https?:|blob:)/i.test(value.trim());
}

function normalizeSource(value: string) {
  try {
    return new URL(value, typeof window !== 'undefined' ? window.location.href : 'https://synaura.invalid').href;
  } catch {
    return value;
  }
}

function minimalTrack(track: AudioCoreTrack): AudioCoreTrack {
  return {
    _id: track._id,
    title: track.title,
    artist: {
      _id: String(track.artist?._id || ''),
      name: String(track.artist?.name || ''),
      username: String(track.artist?.username || ''),
      ...(track.artist?.avatar ? { avatar: track.artist.avatar } : {}),
    },
    audioUrl: track.audioUrl,
    ...(Array.isArray(track.backupAudioUrls) && track.backupAudioUrls.length
      ? { backupAudioUrls: track.backupAudioUrls.slice(0, 3) }
      : {}),
    ...(track.coverUrl ? { coverUrl: track.coverUrl } : {}),
    duration: Math.max(0, safeNumber(track.duration)),
    likes: [],
    comments: [],
    plays: Math.max(0, safeNumber(track.plays)),
    ...(Array.isArray(track.genre) ? { genre: track.genre.slice(0, 5) } : {}),
    ...(track.createdAt ? { createdAt: track.createdAt } : {}),
    ...(track.album ? { album: track.album } : {}),
  };
}

function classifyMediaError(error: MediaError | null, fallback?: unknown): AudioCoreError['kind'] {
  if (error?.code === 1) return 'aborted';
  if (error?.code === 2) return 'network';
  if (error?.code === 3) return 'decode';
  if (error?.code === 4) return 'media-unsupported';
  const name = String((fallback as { name?: string } | null)?.name || '');
  const message = String((fallback as { message?: string } | null)?.message || fallback || '').toLowerCase();
  if (name === 'NotAllowedError' || message.includes('not allowed')) return 'autoplay-blocked';
  if (name === 'NotSupportedError' || message.includes('not supported')) return 'media-unsupported';
  if (name === 'AbortError') return 'aborted';
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('404') || message.includes('missing')) return 'missing-file';
  if (message.includes('network')) return 'network';
  return 'unknown';
}

export class AudioCore {
  private readonly audioFactory: () => HTMLAudioElement;
  private readonly storage: AudioCoreStorage | null;
  private readonly scheduler: AudioCoreScheduler;
  private resolveSource: (url: string) => string;
  private isTrackRestorable: (track: AudioCoreTrack) => boolean;
  private readonly random: () => number;
  private readonly retryDelays: number[];
  private readonly retryDeadlineMs: number;
  private readonly watchdogIntervalMs: number;
  private readonly sessionMaxAgeMs: number;
  private readonly listeners = new Set<CoreListener>();
  private readonly timeListeners = new Set<CoreListener>();
  private readonly retryTimers = new Set<TimerHandle>();
  private readonly eventHandlers = new Map<keyof HTMLMediaElementEventMap, EventListener>();
  private readonly secondaryLeases = new Set<number>();
  private readonly secondaryElements = new WeakMap<HTMLMediaElement, () => void>();
  private callbacks: AudioCoreCallbacks = {};
  private snapshot: AudioCoreSnapshot = EMPTY_AUDIO_CORE_SNAPSHOT;
  private timeSnapshot: AudioTimeSnapshot = EMPTY_AUDIO_TIME_SNAPSHOT;
  private audio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private pendingLoad: PendingLoad | null = null;
  private watchdogTimer: TimerHandle | null = null;
  private persistenceTimer: TimerHandle | null = null;
  private generation = 0;
  private candidates: string[] = [];
  private candidateIndex = 0;
  private expectedSource = '';
  private intentToPlay = false;
  private shuffledIds: string[] = [];
  private upNextEnabled = false;
  private upNextQueue: AudioCoreTrack[] = [];
  private lastWatchdogTime = -1;
  private lastTimeNotificationAt = 0;
  private initialized = false;
  private restored = false;
  private nextSecondaryLeaseId = 1;
  private secondaryResumeRequested = false;
  private secondaryGeneration = 0;
  private documentPlayHandler: EventListener | null = null;
  private pageHideHandler: EventListener | null = null;
  private visibilityHandler: EventListener | null = null;

  constructor(options: AudioCoreOptions) {
    this.audioFactory = options.audioFactory;
    this.storage = options.storage ?? null;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.resolveSource = options.resolveSource ?? ((url) => url);
    this.isTrackRestorable = options.isTrackRestorable ?? (() => true);
    this.random = options.random ?? Math.random;
    this.retryDelays = options.retryDelays ?? [250, 1200, 3000];
    this.retryDeadlineMs = options.retryDeadlineMs ?? 6000;
    this.watchdogIntervalMs = options.watchdogIntervalMs ?? 3000;
    this.sessionMaxAgeMs = options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE;
  }

  initialize() {
    if (this.initialized) return;
    const audio = this.audioFactory();
    this.audio = audio;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.setAttribute?.('playsinline', 'true');
    audio.setAttribute?.('webkit-playsinline', 'true');
    audio.setAttribute?.('x-webkit-airplay', 'allow');
    this.attachMainListeners(audio);
    this.attachLifecycleListeners();
    this.startWatchdog();
    this.initialized = true;
  }

  destroy() {
    this.invalidateOperation('aborted');
    this.stopWatchdog();
    this.stopPersistenceTimer();
    this.detachLifecycleListeners();
    const audio = this.audio;
    if (audio) {
      this.eventHandlers.forEach((handler, event) => audio.removeEventListener(event, handler));
      try { audio.pause(); } catch {}
      try { audio.removeAttribute('src'); audio.load(); } catch {}
    }
    this.eventHandlers.clear();
    this.audio = null;
    this.initialized = false;
    this.restored = false;
    this.snapshot = EMPTY_AUDIO_CORE_SNAPSHOT;
    this.timeSnapshot = EMPTY_AUDIO_TIME_SNAPSHOT;
    this.listeners.clear();
    this.timeListeners.clear();
    this.secondaryLeases.clear();
  }

  setCallbacks(callbacks: AudioCoreCallbacks) {
    this.callbacks = callbacks;
  }

  setSourceResolver(resolveSource: (url: string) => string) {
    this.resolveSource = resolveSource;
  }

  setTrackRestorable(predicate: (track: AudioCoreTrack) => boolean) {
    this.isTrackRestorable = predicate;
  }

  subscribe = (listener: CoreListener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  subscribeTime = (listener: CoreListener) => {
    this.timeListeners.add(listener);
    return () => this.timeListeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;
  getTimeSnapshot = () => this.timeSnapshot;
  getAudioElement = () => this.audio;

  getDiagnostics(): AudioCoreDiagnostics {
    return {
      trackId: trackId(this.snapshot.currentTrack) || null,
      playbackState: this.snapshot.playbackState,
      position: this.timeSnapshot.currentTime,
      duration: this.timeSnapshot.duration,
      queueIds: this.snapshot.queue.map(trackId),
      currentIndex: this.snapshot.currentIndex,
      generation: this.generation,
      listeners: this.eventHandlers.size,
      pendingRetries: this.retryTimers.size,
      activeSecondaryPlayers: this.secondaryLeases.size,
    };
  }

  async restoreSession() {
    if (this.restored) return Boolean(this.snapshot.currentTrack);
    this.restored = true;
    if (!this.storage) return false;
    let parsed: PersistedAudioSessionV1;
    try {
      const raw = this.storage.getItem(SESSION_KEY);
      if (!raw) return false;
      parsed = JSON.parse(raw) as PersistedAudioSessionV1;
    } catch {
      this.discardPersistedSession();
      return false;
    }
    if (
      parsed?.version !== 1 ||
      !Number.isFinite(parsed.savedAt) ||
      this.scheduler.now() - parsed.savedAt > this.sessionMaxAgeMs ||
      !Array.isArray(parsed.queue)
    ) {
      this.discardPersistedSession();
      return false;
    }
    const queue = parsed.queue
      .filter((item) => this.isValidTrack(item) && this.isTrackRestorable(item))
      .slice(0, 100)
      .map(minimalTrack);
    const index = queue.findIndex((item) => item._id === parsed.currentTrackId);
    if (!queue.length || index < 0) {
      this.discardPersistedSession();
      return false;
    }
    this.setVolume(clamp(safeNumber(parsed.volume, 1), 0, 1));
    this.setMuted(Boolean(parsed.muted));
    this.setRepeat(parsed.repeat === 'one' || parsed.repeat === 'all' ? parsed.repeat : 'none');
    this.setQueue(queue, index);
    this.setShuffle(Boolean(parsed.shuffle));
    try {
      await this.loadTrack(queue[index]);
      const duration = this.snapshot.duration || queue[index].duration || 0;
      const position = clamp(safeNumber(parsed.position), 0, Math.max(0, duration ? duration - 1 : parsed.position));
      if (position > 0) this.seek(position);
      return true;
    } catch {
      this.discardPersistedSession();
      return false;
    }
  }

  persistNow() {
    if (!this.storage) return;
    const current = this.snapshot.currentTrack;
    if (!current) return;
    if (current._id.startsWith('ad-audio-')) return;
    const session: PersistedAudioSessionV1 = {
      version: 1,
      savedAt: this.scheduler.now(),
      currentTrackId: current._id,
      position: this.timeSnapshot.currentTime,
      wasPlaying: this.snapshot.isPlaying,
      queue: this.snapshot.queue.filter((track) => this.isValidTrack(track)).slice(0, 100).map(minimalTrack),
      volume: this.snapshot.volume,
      muted: this.snapshot.isMuted,
      repeat: this.snapshot.repeat,
      shuffle: this.snapshot.shuffle,
    };
    try { this.storage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  }

  async loadTrack(track: AudioCoreTrack) {
    this.ensureInitialized();
    if (!this.isValidTrack(track)) {
      const error = this.makeError('missing-file', 'Source audio manquante ou invalide', trackId(track) || null, false);
      this.patch({ playbackState: 'error', isLoading: false, isPlaying: false, error });
      throw new Error(error.message);
    }
    const generation = this.beginOperation(track, false);
    const source = this.assignCandidate(0);
    if (!source) throw new Error('Aucune source audio valide');
    return new Promise<void>((resolve, reject) => {
      const timeout = this.scheduler.setTimeout(() => {
        if (!this.isCurrent(generation)) return;
        this.pendingLoad = null;
        const error = this.makeError('timeout', 'Timeout de chargement audio', track._id, true);
        this.patch({ playbackState: 'error', isLoading: false, error });
        reject(new Error(error.message));
      }, 8000);
      this.pendingLoad = { generation, source, resolve, reject, timeout };
    });
  }

  async playTrack(track: AudioCoreTrack) {
    this.ensureInitialized();
    if (!this.isValidTrack(track)) {
      const error = this.makeError('missing-file', 'Source audio manquante ou invalide', trackId(track) || null, false);
      this.patch({ playbackState: 'error', isLoading: false, isPlaying: false, error });
      return;
    }
    const generation = this.beginOperation(track, true);
    if (!this.assignCandidate(0)) return;
    if (this.secondaryLeases.size > 0) {
      this.intentToPlay = false;
      this.secondaryGeneration = generation;
      this.secondaryResumeRequested = true;
      this.patch({ playbackState: 'paused', isPlaying: false, isLoading: false });
      return;
    }
    this.scheduleRetries(generation);
    await this.attemptPlay(generation);
  }

  async play() {
    this.ensureInitialized();
    if (!this.audio || !this.snapshot.currentTrack) return;
    if (this.secondaryLeases.size > 0) {
      this.secondaryGeneration = this.generation;
      this.secondaryResumeRequested = true;
      return;
    }
    this.intentToPlay = true;
    const generation = this.generation;
    this.scheduleRetries(generation);
    await this.attemptPlay(generation);
  }

  pause() {
    this.intentToPlay = false;
    this.secondaryResumeRequested = false;
    this.clearRetryTimers();
    try { this.audio?.pause(); } catch {}
    this.patch({ playbackState: this.snapshot.currentTrack ? 'paused' : 'idle', isPlaying: false, isLoading: false });
    this.stopPersistenceTimer();
    this.persistNow();
  }

  stop() {
    this.intentToPlay = false;
    this.secondaryResumeRequested = false;
    this.invalidateOperation('aborted');
    this.generation += 1;
    try {
      this.audio?.pause();
      if (this.audio) this.audio.currentTime = 0;
    } catch {}
    this.expectedSource = '';
    this.patch({
      currentTrack: null,
      currentIndex: -1,
      playbackState: 'idle',
      isPlaying: false,
      isLoading: false,
      duration: 0,
      buffered: 0,
      error: null,
      generation: this.generation,
    });
    this.updateTime(0, 0, 0, true);
  }

  toggle() {
    return this.snapshot.isPlaying ? (this.pause(), Promise.resolve()) : this.play();
  }

  seek(time: number) {
    if (!this.audio) return;
    const duration = safeNumber(this.audio.duration, this.snapshot.duration || Number.MAX_SAFE_INTEGER);
    const next = clamp(safeNumber(time), 0, duration > 0 ? duration : Number.MAX_SAFE_INTEGER);
    try { this.audio.currentTime = next; } catch {}
    this.updateTime(next, this.snapshot.duration, this.snapshot.buffered, true);
  }

  setVolume(volume: number) {
    const next = clamp(safeNumber(volume, 1), 0, 1);
    if (this.audio) this.audio.volume = next;
    this.patch({ volume: next, isMuted: next === 0 ? true : this.snapshot.isMuted });
  }

  setMuted(muted: boolean) {
    if (this.audio) this.audio.muted = muted;
    this.patch({ isMuted: muted });
  }

  toggleMute() {
    this.setMuted(!this.snapshot.isMuted);
  }

  setPlaybackRate(rate: number) {
    const next = clamp(safeNumber(rate, 1), 0.25, 4);
    if (this.audio) this.audio.playbackRate = next;
    this.patch({ playbackRate: next });
  }

  setQueue(tracks: AudioCoreTrack[], startIndex = 0) {
    const queue = Array.isArray(tracks) ? tracks.filter((track) => this.isValidTrack(track)).slice(0, 500) : [];
    const currentId = trackId(this.snapshot.currentTrack);
    const currentIndex = queue.length ? clamp(Math.trunc(startIndex), 0, queue.length - 1) : -1;
    this.patch({ queue, currentIndex });
    if (this.snapshot.shuffle) this.rebuildShuffleOrder(currentId || queue[currentIndex]?._id);
    this.persistNow();
  }

  setQueueAndPlay(tracks: AudioCoreTrack[], startIndex = 0) {
    this.setQueue(tracks, startIndex);
    const track = this.snapshot.queue[clamp(startIndex, 0, Math.max(0, this.snapshot.queue.length - 1))];
    if (track) void this.playTrack(track);
  }

  addToQueue(track: AudioCoreTrack, mode: 'next' | 'end' = 'end') {
    if (!this.isValidTrack(track)) return;
    const queue = this.snapshot.queue.filter((item) => item._id !== track._id);
    const index = Math.max(0, this.snapshot.currentIndex);
    if (mode === 'next') queue.splice(index + 1, 0, track);
    else queue.push(track);
    this.setQueue(queue, index);
  }

  removeFromQueue(id: string) {
    const currentId = trackId(this.snapshot.currentTrack);
    const queue = this.snapshot.queue.filter((track) => track._id !== id);
    const index = currentId ? queue.findIndex((track) => track._id === currentId) : -1;
    this.setQueue(queue, index >= 0 ? index : 0);
  }

  reorderQueue(tracks: AudioCoreTrack[]) {
    const currentId = trackId(this.snapshot.currentTrack);
    const index = currentId ? tracks.findIndex((track) => track._id === currentId) : this.snapshot.currentIndex;
    this.setQueue(tracks, index >= 0 ? index : 0);
  }

  setShuffle(enabled: boolean) {
    if (enabled === this.snapshot.shuffle) return;
    if (enabled) this.rebuildShuffleOrder(trackId(this.snapshot.currentTrack));
    else this.shuffledIds = [];
    this.patch({ shuffle: enabled });
    this.persistNow();
  }

  toggleShuffle() {
    this.setShuffle(!this.snapshot.shuffle);
  }

  setRepeat(mode: AudioRepeatMode) {
    const repeat = mode === 'one' || mode === 'all' ? mode : 'none';
    this.patch({ repeat });
    this.persistNow();
  }

  cycleRepeat() {
    this.setRepeat(this.snapshot.repeat === 'none' ? 'one' : this.snapshot.repeat === 'one' ? 'all' : 'none');
  }

  setUpNextEnabled(enabled: boolean) {
    this.upNextEnabled = Boolean(enabled);
  }

  setUpNextQueue(tracks: AudioCoreTrack[]) {
    this.upNextQueue = Array.isArray(tracks) ? tracks.filter((track) => this.isValidTrack(track)) : [];
  }

  next() {
    void this.advance('manual-next');
  }

  previous() {
    if (this.timeSnapshot.currentTime > 3) {
      this.seek(0);
      return;
    }
    const effective = this.effectiveQueue();
    if (!effective.length) return;
    const currentId = trackId(this.snapshot.currentTrack);
    const index = Math.max(0, effective.findIndex((track) => track._id === currentId));
    const previous = index > 0 ? effective[index - 1] : this.snapshot.repeat === 'all' ? effective[effective.length - 1] : null;
    if (previous) void this.playTrack(previous);
  }

  beginSecondaryPlayback(_kind: 'voice-message' | 'preview' | 'ui' | 'studio' | 'other' = 'other') {
    const leaseId = this.nextSecondaryLeaseId++;
    if (this.secondaryLeases.size === 0) {
      this.secondaryGeneration = this.generation;
      this.secondaryResumeRequested = this.snapshot.isPlaying;
      if (this.snapshot.isPlaying) {
        this.intentToPlay = false;
        this.clearRetryTimers();
        try { this.audio?.pause(); } catch {}
        this.patch({ playbackState: 'paused', isPlaying: false, isLoading: false });
      }
    }
    this.secondaryLeases.add(leaseId);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.secondaryLeases.delete(leaseId);
      if (this.secondaryLeases.size > 0) return;
      const shouldResume =
        this.secondaryResumeRequested &&
        this.secondaryGeneration === this.generation &&
        Boolean(this.snapshot.currentTrack) &&
        !this.snapshot.isPlaying;
      this.secondaryResumeRequested = false;
      if (shouldResume) void this.play();
    };
  }

  coordinateSecondaryElement(element: HTMLMediaElement, kind: 'voice-message' | 'preview' | 'ui' | 'studio' | 'other' = 'other') {
    let release: (() => void) | null = null;
    const onPlay = () => {
      release?.();
      release = this.beginSecondaryPlayback(kind);
    };
    const onStop = () => {
      release?.();
      release = null;
    };
    element.addEventListener('play', onPlay);
    element.addEventListener('pause', onStop);
    element.addEventListener('ended', onStop);
    element.addEventListener('error', onStop);
    // A document-level capture listener observes `play` after the media element
    // has already transitioned. Acquire the lease immediately in that case.
    if (!element.paused && !element.ended) onPlay();
    return () => {
      onStop();
      element.removeEventListener('play', onPlay);
      element.removeEventListener('pause', onStop);
      element.removeEventListener('ended', onStop);
      element.removeEventListener('error', onStop);
    };
  }

  private ensureInitialized() {
    if (!this.initialized) this.initialize();
  }

  private isValidTrack(track: AudioCoreTrack | null | undefined) {
    return Boolean(track && track._id && isValidSource(track.audioUrl));
  }

  private sourcesFor(track: AudioCoreTrack) {
    return Array.from(new Set([track.audioUrl, ...(track.backupAudioUrls || [])]
      .filter(isValidSource)
      .map((url) => this.resolveSource(String(url).trim()))
      .filter(Boolean)));
  }

  private beginOperation(track: AudioCoreTrack, intentToPlay: boolean) {
    this.invalidateOperation('stale');
    this.generation += 1;
    this.abortController = new AbortController();
    this.intentToPlay = intentToPlay;
    this.candidates = this.sourcesFor(track);
    this.candidateIndex = 0;
    this.expectedSource = '';
    this.secondaryResumeRequested = false;
    try { this.audio?.pause(); } catch {}
    try { if (this.audio) this.audio.currentTime = 0; } catch {}
    const queueIndex = this.snapshot.queue.findIndex((item) => item._id === track._id);
    const queue = queueIndex >= 0
      ? this.snapshot.queue.map((item, index) => index === queueIndex ? track : item)
      : [...this.snapshot.queue, track];
    const currentIndex = queueIndex >= 0 ? queueIndex : queue.length - 1;
    this.patch({
      currentTrack: track,
      queue,
      currentIndex,
      playbackState: 'loading',
      isPlaying: false,
      isLoading: true,
      duration: Math.max(0, safeNumber(track.duration)),
      buffered: 0,
      error: null,
      generation: this.generation,
    });
    this.updateTime(0, Math.max(0, safeNumber(track.duration)), 0, true);
    this.callbacks.onTrackChanged?.(track);
    return this.generation;
  }

  private assignCandidate(index: number) {
    const audio = this.audio;
    const source = this.candidates[index];
    if (!audio || !source) return '';
    this.candidateIndex = index;
    this.expectedSource = normalizeSource(source);
    if (this.pendingLoad?.generation === this.generation) {
      this.pendingLoad.source = this.expectedSource;
    }
    try {
      audio.src = source;
      audio.load();
    } catch (cause) {
      this.handleFailure(cause);
      return '';
    }
    return this.expectedSource;
  }

  private async attemptPlay(generation: number) {
    const audio = this.audio;
    if (!audio || !this.isCurrent(generation) || !this.intentToPlay) return;
    try {
      await audio.play();
      if (!this.isCurrent(generation) || !this.intentToPlay) {
        if (!this.intentToPlay) try { audio.pause(); } catch {}
        return;
      }
      this.patch({ playbackState: 'playing', isPlaying: true, isLoading: false, error: null });
      this.clearRetryTimers();
      this.startPersistenceTimer();
    } catch (cause) {
      if (!this.isCurrent(generation)) return;
      const kind = classifyMediaError(audio.error, cause);
      if (kind === 'autoplay-blocked') {
        this.intentToPlay = false;
        this.clearRetryTimers();
        this.patch({
          playbackState: 'paused',
          isPlaying: false,
          isLoading: false,
          error: this.makeError(kind, 'Lecture automatique bloquée; une action utilisateur est requise', trackId(this.snapshot.currentTrack), true),
        });
      } else if (kind === 'media-unsupported' && this.tryNextCandidate()) {
        await this.attemptPlay(generation);
      } else {
        this.patch({
          playbackState: 'error',
          isPlaying: false,
          isLoading: false,
          error: this.makeError(kind, this.errorMessage(kind), trackId(this.snapshot.currentTrack), kind === 'network' || kind === 'timeout'),
        });
      }
    }
  }

  private scheduleRetries(generation: number) {
    this.clearRetryTimers();
    this.retryDelays.forEach((delay) => {
      const handle = this.scheduler.setTimeout(() => {
        this.retryTimers.delete(handle);
        const audio = this.audio;
        if (!audio || !this.isCurrent(generation) || !this.intentToPlay || !audio.paused || audio.currentTime > 0.1) return;
        void this.attemptPlay(generation);
      }, delay);
      this.retryTimers.add(handle);
    });
    const deadline = this.scheduler.setTimeout(() => {
      this.retryTimers.delete(deadline);
      const audio = this.audio;
      if (!audio || !this.isCurrent(generation) || !this.intentToPlay || !audio.paused || audio.currentTime > 0.1) return;
      this.intentToPlay = false;
      this.patch({
        playbackState: 'error',
        isPlaying: false,
        isLoading: false,
        error: this.makeError('timeout', 'La lecture audio n’a pas démarré à temps', trackId(this.snapshot.currentTrack), true),
      });
    }, this.retryDeadlineMs);
    this.retryTimers.add(deadline);
  }

  private clearRetryTimers() {
    this.retryTimers.forEach((handle) => this.scheduler.clearTimeout(handle));
    this.retryTimers.clear();
  }

  private invalidateOperation(reason: AudioErrorKind) {
    this.abortController?.abort(reason);
    this.abortController = null;
    this.clearRetryTimers();
    if (this.pendingLoad) {
      this.scheduler.clearTimeout(this.pendingLoad.timeout);
      this.pendingLoad.reject(new Error(reason === 'stale' ? 'Opération audio remplacée' : 'Opération audio annulée'));
      this.pendingLoad = null;
    }
  }

  private isCurrent(generation: number) {
    return generation === this.generation && !this.abortController?.signal.aborted;
  }

  private attachMainListeners(audio: HTMLAudioElement) {
    const handlers: Record<string, EventListener> = {
      play: () => this.onPlaying(),
      playing: () => this.onPlaying(),
      pause: () => this.onPause(),
      timeupdate: () => this.onTimeUpdate(),
      progress: () => this.onTimeUpdate(true),
      durationchange: () => this.onMetadata(),
      loadedmetadata: () => this.onMetadata(),
      canplay: () => this.onCanPlay(),
      waiting: () => this.onBuffering(),
      stalled: () => this.onBuffering(),
      ended: () => this.onEnded(),
      error: (event) => this.onError(event),
      volumechange: () => this.onVolumeChange(),
      ratechange: () => this.onRateChange(),
    };
    MAIN_AUDIO_EVENTS.forEach((event) => {
      const handler = handlers[event];
      this.eventHandlers.set(event, handler);
      audio.addEventListener(event, handler);
    });
  }

  private onPlaying() {
    if (!this.eventMatchesCurrentSource()) return;
    if (!this.intentToPlay) {
      try { this.audio?.pause(); } catch {}
      return;
    }
    this.patch({ playbackState: 'playing', isPlaying: true, isLoading: false, error: null });
    this.clearRetryTimers();
    this.startPersistenceTimer();
    const track = this.snapshot.currentTrack;
    if (track) this.callbacks.onPlaybackStarted?.(track, this.timeSnapshot.currentTime, this.timeSnapshot.duration);
  }

  private onPause() {
    if (!this.eventMatchesCurrentSource() || !this.audio?.paused || this.audio.ended || this.snapshot.playbackState === 'ended') return;
    this.patch({ playbackState: this.snapshot.currentTrack ? 'paused' : 'idle', isPlaying: false, isLoading: false });
    this.stopPersistenceTimer();
  }

  private onTimeUpdate(force = false) {
    const audio = this.audio;
    if (!audio || !this.eventMatchesCurrentSource()) return;
    const duration = safeNumber(audio.duration, this.snapshot.duration);
    const buffered = this.readBuffered(audio);
    if (force && Math.abs(buffered - this.snapshot.buffered) >= 0.1) this.patch({ buffered });
    this.updateTime(safeNumber(audio.currentTime), duration, buffered, force);
    const track = this.snapshot.currentTrack;
    if (track) this.callbacks.onProgress?.(track, safeNumber(audio.currentTime), duration);
  }

  private onMetadata() {
    const audio = this.audio;
    if (!audio || !this.eventMatchesCurrentSource()) return;
    const duration = safeNumber(audio.duration, this.snapshot.currentTrack?.duration || 0);
    this.patch({ duration, isLoading: false, playbackState: this.snapshot.isPlaying ? 'playing' : 'paused' });
    this.updateTime(safeNumber(audio.currentTime), duration, this.readBuffered(audio), true);
    this.resolvePendingLoad();
  }

  private onCanPlay() {
    if (!this.eventMatchesCurrentSource()) return;
    this.patch({ isLoading: false, playbackState: this.snapshot.isPlaying ? 'playing' : 'paused' });
    this.resolvePendingLoad();
  }

  private onBuffering() {
    if (!this.intentToPlay || !this.eventMatchesCurrentSource()) return;
    this.patch({ playbackState: 'buffering', isLoading: true });
  }

  private onEnded() {
    if (!this.eventMatchesCurrentSource()) return;
    this.intentToPlay = false;
    this.clearRetryTimers();
    this.stopPersistenceTimer();
    this.patch({ playbackState: 'ended', isPlaying: false, isLoading: false });
    this.persistNow();
    void this.advance('ended');
  }

  private onError(event: Event) {
    if (!this.eventMatchesCurrentSource()) return;
    if (this.tryNextCandidate()) {
      if (this.intentToPlay) void this.attemptPlay(this.generation);
      return;
    }
    const kind = classifyMediaError(this.audio?.error || null, event);
    const error = this.makeError(kind, this.errorMessage(kind), trackId(this.snapshot.currentTrack), kind === 'network' || kind === 'timeout');
    this.patch({ playbackState: 'error', isPlaying: false, isLoading: false, error });
    this.rejectPendingLoad(new Error(error.message));
  }

  private onVolumeChange() {
    if (!this.audio) return;
    this.patch({ volume: this.audio.volume, isMuted: this.audio.muted });
  }

  private onRateChange() {
    if (!this.audio) return;
    this.patch({ playbackRate: this.audio.playbackRate || 1 });
  }

  private eventMatchesCurrentSource() {
    if (!this.audio || !this.expectedSource) return Boolean(this.snapshot.currentTrack);
    const actual = normalizeSource(this.audio.currentSrc || this.audio.src || '');
    return !actual || actual === this.expectedSource;
  }

  private tryNextCandidate() {
    if (this.candidateIndex >= this.candidates.length - 1) return false;
    return Boolean(this.assignCandidate(this.candidateIndex + 1));
  }

  private resolvePendingLoad() {
    const pending = this.pendingLoad;
    if (!pending || !this.isCurrent(pending.generation) || pending.source !== this.expectedSource) return;
    this.scheduler.clearTimeout(pending.timeout);
    this.pendingLoad = null;
    pending.resolve();
  }

  private rejectPendingLoad(error: Error) {
    const pending = this.pendingLoad;
    if (!pending) return;
    this.scheduler.clearTimeout(pending.timeout);
    this.pendingLoad = null;
    pending.reject(error);
  }

  private async advance(reason: 'ended' | 'manual-next') {
    const current = this.snapshot.currentTrack;
    if (reason === 'ended' && this.snapshot.repeat === 'one' && current) {
      await this.playTrack(current);
      return;
    }
    let next: AudioCoreTrack | null = null;
    if (this.upNextEnabled && this.upNextQueue.length) next = this.upNextQueue.shift() || null;
    const effective = this.effectiveQueue();
    const currentId = trackId(current);
    const index = currentId ? effective.findIndex((track) => track._id === currentId) : -1;
    if (!next) {
      next = index >= 0 && index < effective.length - 1
        ? effective[index + 1]
        : this.snapshot.repeat === 'all' && effective.length
        ? effective[0]
        : null;
    }
    if (!next) {
      const continuation = this.callbacks.onQueueEnd?.(current) || null;
      if (continuation?._id !== currentId) next = continuation;
    }
    if (reason === 'ended' && this.callbacks.onBeforeAutomaticAdvance) {
      next = this.callbacks.onBeforeAutomaticAdvance(current, next);
    }
    if (next) {
      await this.playTrack(next);
      return;
    }
    this.patch({ playbackState: 'ended', isPlaying: false, isLoading: false });
  }

  private effectiveQueue() {
    if (!this.snapshot.shuffle || !this.shuffledIds.length) return this.snapshot.queue;
    const byId = new Map(this.snapshot.queue.map((track) => [track._id, track]));
    return this.shuffledIds.map((id) => byId.get(id)).filter(Boolean) as AudioCoreTrack[];
  }

  private rebuildShuffleOrder(currentId?: string) {
    const ids = this.snapshot.queue.map((track) => track._id);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const target = Math.floor(this.random() * (index + 1));
      [ids[index], ids[target]] = [ids[target], ids[index]];
    }
    if (currentId) {
      const currentIndex = ids.indexOf(currentId);
      if (currentIndex > 0) [ids[0], ids[currentIndex]] = [ids[currentIndex], ids[0]];
    }
    this.shuffledIds = ids;
  }

  private updateTime(currentTime: number, duration: number, buffered: number, force = false) {
    const now = this.scheduler.now();
    if (!force && now - this.lastTimeNotificationAt < 240) return;
    const next = { currentTime, duration, buffered };
    if (
      !force &&
      Math.abs(next.currentTime - this.timeSnapshot.currentTime) < 0.04 &&
      Math.abs(next.duration - this.timeSnapshot.duration) < 0.04 &&
      Math.abs(next.buffered - this.timeSnapshot.buffered) < 0.04
    ) return;
    this.lastTimeNotificationAt = now;
    this.timeSnapshot = next;
    this.timeListeners.forEach((listener) => listener());
  }

  private readBuffered(audio: HTMLAudioElement) {
    try {
      if (!audio.buffered.length) return 0;
      return safeNumber(audio.buffered.end(audio.buffered.length - 1));
    } catch {
      return 0;
    }
  }

  private patch(next: Partial<AudioCoreSnapshot>) {
    const candidate = { ...this.snapshot, ...next };
    const keys = Object.keys(next) as Array<keyof AudioCoreSnapshot>;
    if (keys.every((key) => Object.is(candidate[key], this.snapshot[key]))) return;
    this.snapshot = candidate;
    this.listeners.forEach((listener) => listener());
  }

  private makeError(kind: AudioErrorKind, message: string, id: string | null, recoverable: boolean): AudioCoreError {
    return { kind, message, trackId: id, generation: this.generation, recoverable };
  }

  private errorMessage(kind: AudioErrorKind) {
    if (kind === 'network') return 'Erreur réseau pendant la lecture audio';
    if (kind === 'media-unsupported') return 'Format ou source audio non supporté';
    if (kind === 'decode') return 'Impossible de décoder le fichier audio';
    if (kind === 'missing-file') return 'Fichier audio introuvable';
    if (kind === 'timeout') return 'Timeout de chargement audio';
    if (kind === 'aborted' || kind === 'stale') return 'Opération audio remplacée';
    return 'Erreur de lecture audio';
  }

  private handleFailure(cause: unknown) {
    const kind = classifyMediaError(this.audio?.error || null, cause);
    this.patch({
      playbackState: 'error',
      isPlaying: false,
      isLoading: false,
      error: this.makeError(kind, this.errorMessage(kind), trackId(this.snapshot.currentTrack), false),
    });
  }

  private startWatchdog() {
    if (this.watchdogTimer) return;
    this.watchdogTimer = this.scheduler.setInterval(() => {
      const audio = this.audio;
      if (!audio || !this.intentToPlay || !this.snapshot.currentTrack || this.snapshot.isLoading) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (audio.paused && !audio.ended) {
        void this.attemptPlay(this.generation);
        return;
      }
      const current = safeNumber(audio.currentTime);
      if (!audio.paused && current > 0 && current === this.lastWatchdogTime && current < safeNumber(audio.duration) - 1) {
        const generation = this.generation;
        const handle = this.scheduler.setTimeout(() => {
          this.retryTimers.delete(handle);
          if (!this.isCurrent(generation) || !this.audio || !this.intentToPlay) return;
          try { this.audio.currentTime = current; } catch {}
          void this.attemptPlay(generation);
        }, 100);
        this.retryTimers.add(handle);
      }
      this.lastWatchdogTime = current;
    }, this.watchdogIntervalMs);
  }

  private stopWatchdog() {
    if (!this.watchdogTimer) return;
    this.scheduler.clearInterval(this.watchdogTimer);
    this.watchdogTimer = null;
  }

  private startPersistenceTimer() {
    if (this.persistenceTimer) return;
    this.persistenceTimer = this.scheduler.setInterval(() => this.persistNow(), 3000);
  }

  private stopPersistenceTimer() {
    if (!this.persistenceTimer) return;
    this.scheduler.clearInterval(this.persistenceTimer);
    this.persistenceTimer = null;
  }

  private attachLifecycleListeners() {
    if (typeof window !== 'undefined') {
      this.pageHideHandler = () => this.persistNow();
      window.addEventListener('pagehide', this.pageHideHandler);
    }
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'hidden') this.persistNow();
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.documentPlayHandler = (event) => {
        const element = event.target;
        if (!(element instanceof HTMLMediaElement) || element === this.audio) return;
        if (element.dataset.synauraAudioPolicy === 'independent' || this.secondaryElements.has(element)) return;
        const cleanup = this.coordinateSecondaryElement(element, element.dataset.synauraAudioKind === 'voice-message' ? 'voice-message' : 'preview');
        this.secondaryElements.set(element, cleanup);
        const releaseOnDetach = () => {
          if (element.isConnected) return;
          cleanup();
        };
        element.addEventListener('ended', releaseOnDetach, { once: true });
      };
      document.addEventListener('play', this.documentPlayHandler, true);
    }
  }

  private detachLifecycleListeners() {
    if (typeof window !== 'undefined' && this.pageHideHandler) window.removeEventListener('pagehide', this.pageHideHandler);
    if (typeof document !== 'undefined' && this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (typeof document !== 'undefined' && this.documentPlayHandler) document.removeEventListener('play', this.documentPlayHandler, true);
    this.pageHideHandler = null;
    this.visibilityHandler = null;
    this.documentPlayHandler = null;
  }

  private discardPersistedSession() {
    try { this.storage?.removeItem(SESSION_KEY); } catch {}
  }
}

let browserAudioCore: AudioCore | null = null;

export function getBrowserAudioCore() {
  if (typeof window === 'undefined') return null;
  if (!browserAudioCore) {
    browserAudioCore = new AudioCore({
      audioFactory: () => new Audio(),
      storage: window.localStorage,
    });
  }
  return browserAudioCore;
}

export function coordinateSecondaryAudioElement(
  element: HTMLMediaElement,
  kind: 'voice-message' | 'preview' | 'ui' | 'studio' | 'other' = 'preview',
) {
  const core = getBrowserAudioCore();
  if (!core) return () => {};
  core.initialize();
  return core.coordinateSecondaryElement(element, kind);
}

export const AUDIO_SESSION_STORAGE_KEY = SESSION_KEY;
