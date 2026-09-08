import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioRecommendations } from './useAudioRecommendations';
import { sendTrackEvents } from '@/lib/analyticsClient';
import { getCdnUrl } from '@/lib/cdn';
import { isLikelyExpiredAIProviderUrl } from '@/lib/media-url-health';
import { getEntitlements } from '@/lib/entitlements';
import {
  AUDIO_SESSION_STORAGE_KEY,
  EMPTY_AUDIO_CORE_SNAPSHOT,
  EMPTY_AUDIO_TIME_SNAPSHOT,
  getBrowserAudioCore,
  type AudioCoreTrack,
  type AudioRepeatMode,
} from '@/lib/audio/AudioCore';

type Track = AudioCoreTrack;

function trackId(track: Track | null | undefined) {
  return String(track?._id || '');
}

function isDevelopmentHarnessTrack(track: Track | null | undefined) {
  return process.env.NODE_ENV !== 'production' && trackId(track).startsWith('audio-harness-');
}

function queueEquals(left: Track[], right: Track[]) {
  return left.length === right.length && left.every((track, index) => trackId(track) === trackId(right[index]));
}

function readRecentlyPlayed() {
  try {
    const parsed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    if (!Array.isArray(parsed)) return [] as Array<{ id: string; at: number; count: number }>;
    return parsed
      .map((entry: unknown) => {
        if (typeof entry === 'string') return { id: entry, at: Date.now(), count: 1 };
        const value = entry as { id?: string; _id?: string; at?: number; count?: number };
        return {
          id: String(value?.id || value?._id || ''),
          at: Number(value?.at || Date.now()),
          count: Math.max(1, Number(value?.count || 1)),
        };
      })
      .filter((entry) => entry.id);
  } catch {
    return [] as Array<{ id: string; at: number; count: number }>;
  }
}

function writeRecentlyPlayed(id: string) {
  if (!id) return;
  try {
    const now = Date.now();
    const existing = readRecentlyPlayed().filter((entry) => now - entry.at < 7 * 24 * 60 * 60 * 1000);
    const previous = existing.find((entry) => entry.id === id);
    const next = [
      ...existing.filter((entry) => entry.id !== id),
      { id, at: now, count: (previous?.count || 0) + 1 },
    ].slice(-40);
    localStorage.setItem('recentlyPlayed', JSON.stringify(next));
  } catch {}
}

function migrateLegacySession() {
  if (typeof window === 'undefined' || localStorage.getItem(AUDIO_SESSION_STORAGE_KEY)) return;
  try {
    const legacyStateRaw = localStorage.getItem('audioPlayerState');
    const legacyLastRaw = localStorage.getItem('synaura.lastTrack');
    const legacyState = legacyStateRaw ? JSON.parse(legacyStateRaw) : null;
    const legacyLast = legacyLastRaw ? JSON.parse(legacyLastRaw) : null;
    const tracks = Array.isArray(legacyState?.tracks)
      ? legacyState.tracks
      : Array.isArray(legacyLast?.queue)
      ? legacyLast.queue
      : legacyLast?.track
      ? [legacyLast.track]
      : [];
    const queue = tracks
      .filter((track: Track) => track?._id && /^https?:\/\//i.test(String(track?.audioUrl || '')))
      .filter((track: Track) => !isLikelyExpiredAIProviderUrl(track.audioUrl, track.createdAt))
      .slice(0, 100);
    if (!queue.length) return;
    const fallbackIndex = Math.max(0, Math.min(Number(legacyState?.currentTrackIndex || legacyLast?.currentTrackIndex || 0), queue.length - 1));
    const currentTrackId = String(legacyState?.currentTrackId || legacyLast?.track?._id || queue[fallbackIndex]?._id || '');
    const savedAt = Number(legacyState?.savedAt || legacyLast?.timestamp || Date.now());
    if (Date.now() - savedAt > 7 * 24 * 60 * 60 * 1000) return;
    localStorage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      savedAt,
      currentTrackId,
      position: Math.max(0, Number(legacyState?.currentTime || legacyLast?.position || 0)),
      wasPlaying: Boolean(legacyState?.isPlaying || legacyLast?.wasPlaying),
      queue,
      volume: Math.max(0, Math.min(1, Number(legacyState?.volume ?? 1))),
      muted: Boolean(legacyState?.isMuted),
      repeat: legacyState?.repeat === 'one' || legacyState?.repeat === 'all' ? legacyState.repeat : 'none',
      shuffle: Boolean(legacyState?.shuffle),
    }));
  } catch {}
}

export function useAudioCoreTime() {
  const core = getBrowserAudioCore();
  return useSyncExternalStore(
    core?.subscribeTime ?? (() => () => {}),
    core?.getTimeSnapshot ?? (() => EMPTY_AUDIO_TIME_SNAPSHOT),
    () => EMPTY_AUDIO_TIME_SNAPSHOT,
  );
}

export const useAudioService = (options: { authority?: boolean } = {}) => {
  const isAuthority = options.authority === true;
  const { data: session } = useSession();
  const recommendations = useAudioRecommendations();
  const core = getBrowserAudioCore();
  const snapshot = useSyncExternalStore(
    core?.subscribe ?? (() => () => {}),
    core?.getSnapshot ?? (() => EMPTY_AUDIO_CORE_SNAPSHOT),
    () => EMPTY_AUDIO_CORE_SNAPSHOT,
  );
  const [allTracks, setAllTracksState] = useState<Track[]>([]);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isFirstPlay, setIsFirstPlay] = useState(true);
  const allTracksRef = useRef<Track[]>([]);
  const sessionUserIdRef = useRef<string | null>(session?.user?.id || null);
  const playThrottleRef = useRef(new Map<string, number>());
  const startedGenerationRef = useRef(-1);
  const milestoneRef = useRef<{ generation: number; value: number }>({ generation: -1, value: 0 });
  const autoPlayEnabledRef = useRef(autoPlayEnabled);
  const adFreeRef = useRef(false);
  const pendingAfterAdRef = useRef<Track | null>(null);
  const tracksSinceLastAdRef = useRef(0);
  const lastAudioAdAtRef = useRef(0);
  const audioAdUrlRef = useRef(String(process.env.NEXT_PUBLIC_AUDIO_AD_URL || '').trim());

  allTracksRef.current = allTracks;
  sessionUserIdRef.current = session?.user?.id || null;
  autoPlayEnabledRef.current = autoPlayEnabled;

  const persistAudioAdState = useCallback(() => {
    try {
      localStorage.setItem('ads.audio.lastAt', String(lastAudioAdAtRef.current));
      localStorage.setItem('ads.audio.tracksSince', String(tracksSinceLastAdRef.current));
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthority) return;
    try {
      lastAudioAdAtRef.current = Number(localStorage.getItem('ads.audio.lastAt') || 0) || 0;
      tracksSinceLastAdRef.current = Number(localStorage.getItem('ads.audio.tracksSince') || 0) || 0;
    } catch {}
  }, [isAuthority]);

  useEffect(() => {
    if (!isAuthority) return;
    let active = true;
    if (!session?.user?.id) {
      adFreeRef.current = false;
      return () => { active = false; };
    }
    fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        const raw = String(payload?.subscription?.name || 'free').toLowerCase();
        const plan = raw.includes('pro') || raw.includes('enterprise') ? 'pro' : raw.includes('starter') ? 'starter' : 'free';
        adFreeRef.current = Boolean(getEntitlements(plan).features.adFree);
      })
      .catch(() => { if (active) adFreeRef.current = false; });
    return () => { active = false; };
  }, [isAuthority, session?.user?.id]);

  const updatePlayCount = useCallback(async (id: string) => {
    if (!id || id.startsWith('ad-audio-')) return;
    const now = Date.now();
    if (now - (playThrottleRef.current.get(id) || 0) < 2000) return;
    playThrottleRef.current.set(id, now);
    try {
      await fetch(`/api/tracks/${encodeURIComponent(id)}/plays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {}
  }, []);

  const pickContinuation = useCallback((current: Track | null) => {
    if (!autoPlayEnabledRef.current || !allTracksRef.current.length) return null;
    const recent = readRecentlyPlayed().map((entry) => entry.id);
    const recommended = current
      ? recommendations.getAutoPlayNext(current, snapshot.queue, allTracksRef.current)
      : allTracksRef.current[0];
    if (recommended && recommended._id !== current?._id) return recommended as Track;
    return allTracksRef.current.find((track) => track._id !== current?._id && !recent.includes(track._id)) ||
      allTracksRef.current.find((track) => track._id !== current?._id) || null;
  }, [recommendations, snapshot.queue]);

  const updateNotification = useCallback(() => {
    const track = core?.getSnapshot().currentTrack;
    if (!track || notificationPermission !== 'granted' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((registration) => registration.showNotification('Synaura', {
      body: `Lecture de ${track.title} par ${track.artist?.name || track.artist?.username}`,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      tag: 'synaura-track',
      requireInteraction: false,
      silent: true,
    })).catch(() => {});
  }, [core, notificationPermission]);

  useEffect(() => {
    if (!core || !isAuthority) return;
    core.setSourceResolver((url) => getCdnUrl(url) || url);
    core.setTrackRestorable((track) => !isLikelyExpiredAIProviderUrl(track.audioUrl, track.createdAt));
    core.initialize();
    migrateLegacySession();
    void core.restoreSession();
    if ('Notification' in window) setNotificationPermission(Notification.permission);
    if (process.env.NODE_ENV !== 'production') {
      (window as typeof window & { __synauraAudioCore?: () => unknown }).__synauraAudioCore = () => core.getDiagnostics();
    } else {
      delete (window as typeof window & { __synauraAudioCore?: () => unknown }).__synauraAudioCore;
    }
  }, [core, isAuthority]);

  useEffect(() => {
    if (!core || !isAuthority) return;
    core.setCallbacks({
      onTrackChanged: (track) => {
        milestoneRef.current = { generation: core.getSnapshot().generation, value: 0 };
        startedGenerationRef.current = -1;
        if (isDevelopmentHarnessTrack(track)) return;
        writeRecentlyPlayed(track._id);
        if (sessionUserIdRef.current) void updatePlayCount(track._id);
        try {
          window.dispatchEvent(new CustomEvent('trackChanged', { detail: { trackId: track._id } }));
        } catch {}
      },
      onPlaybackStarted: (track, position, duration) => {
        const generation = core.getSnapshot().generation;
        if (startedGenerationRef.current === generation || track._id.startsWith('ad-audio-') || isDevelopmentHarnessTrack(track)) return;
        startedGenerationRef.current = generation;
        setIsFirstPlay(false);
        sendTrackEvents(track._id, {
          event_type: 'play_start',
          position_ms: Math.round(position * 1000),
          duration_ms: Math.round(duration * 1000),
          is_ai_track: track._id.startsWith('ai-'),
          source: 'audio-core',
        });
      },
      onProgress: (track, position, duration) => {
        if (!duration || track._id.startsWith('ad-audio-') || isDevelopmentHarnessTrack(track)) return;
        const generation = core.getSnapshot().generation;
        if (milestoneRef.current.generation !== generation) milestoneRef.current = { generation, value: 0 };
        const progress = (position / duration) * 100;
        for (const value of [25, 50, 75, 98]) {
          if (progress < value || milestoneRef.current.value >= value) continue;
          milestoneRef.current.value = value;
          sendTrackEvents(track._id, {
            event_type: value === 98 ? 'play_complete' : 'play_progress',
            ...(value === 98 ? {} : { progress_pct: value }),
            position_ms: Math.round(position * 1000),
            duration_ms: Math.round(duration * 1000),
            is_ai_track: track._id.startsWith('ai-'),
            source: 'audio-core',
          });
        }
      },
      onQueueEnd: pickContinuation,
      onBeforeAutomaticAdvance: (current, next) => {
        if (current?._id.startsWith('ad-audio-')) {
          const pending = pendingAfterAdRef.current;
          pendingAfterAdRef.current = null;
          const queue = core.getSnapshot().queue.filter((track) => !track._id.startsWith('ad-audio-'));
          const index = pending ? queue.findIndex((track) => track._id === pending._id) : -1;
          core.setQueue(queue, index >= 0 ? index : 0);
          return pending || next;
        }
        tracksSinceLastAdRef.current += 1;
        persistAudioAdState();
        const adUrl = audioAdUrlRef.current;
        if (!next || !adUrl || adFreeRef.current) return next;
        const now = Date.now();
        if (now - lastAudioAdAtRef.current < 8 * 60 * 1000 || tracksSinceLastAdRef.current < 4) return next;
        pendingAfterAdRef.current = next;
        lastAudioAdAtRef.current = now;
        tracksSinceLastAdRef.current = 0;
        persistAudioAdState();
        return {
          _id: `ad-audio-${now}`,
          title: 'Publicité',
          artist: { _id: 'sponsor', name: 'Sponsor', username: 'sponsor' },
          audioUrl: adUrl,
          coverUrl: '/brand/2026/synaura-symbol-2026-white.png',
          duration: 30,
          likes: [],
          comments: [],
          plays: 0,
          genre: ['ad'],
        };
      },
    });
    return () => core.setCallbacks({});
  }, [core, isAuthority, persistAudioAdState, pickContinuation, updatePlayCount]);

  useEffect(() => {
    if (!core || !isAuthority || !snapshot.currentTrack) return;
    updateNotification();
  }, [core, isAuthority, snapshot.currentTrack?._id, snapshot.isPlaying, updateNotification]);

  useEffect(() => {
    if (!isAuthority || typeof document === 'undefined') return;
    const queue = snapshot.queue;
    const index = snapshot.currentIndex;
    if (!queue.length || index < 0) return;
    const next = queue[index + 1] || (snapshot.repeat === 'all' ? queue[0] : null);
    document.getElementById('synaura-audio-preload')?.remove();
    if (!next?.audioUrl || next.audioUrl.toLowerCase().includes('.m3u8')) return;
    const link = document.createElement('link');
    link.id = 'synaura-audio-preload';
    link.rel = 'preload';
    link.as = 'audio';
    link.href = getCdnUrl(next.audioUrl) || next.audioUrl;
    document.head.appendChild(link);
    return () => link.remove();
  }, [isAuthority, snapshot.currentIndex, snapshot.queue, snapshot.repeat]);

  useEffect(() => {
    if (!isAuthority || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'AUDIO_CONTROL') return;
      if (event.data.action === 'play') void core?.play();
      if (event.data.action === 'pause') core?.pause();
      if (event.data.action === 'next') core?.next();
      if (event.data.action === 'previous') core?.previous();
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [core, isAuthority]);

  const loadAllTracks = useCallback(async () => {
    const endpoints = [
      '/api/ranking/feed?limit=80&ai=1&strategy=reco',
      '/api/tracks/popular?limit=40',
    ];
    const results = await Promise.all(endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
        if (!response.ok) return [];
        const payload = await response.json();
        const items = Array.isArray(payload.items) ? payload.items.map((item: { track?: Track }) => item?.track).filter(Boolean) : [];
        return [
          ...(Array.isArray(payload.tracks) ? payload.tracks : []),
          ...(Array.isArray(payload.dailyMix) ? payload.dailyMix : []),
          ...(Array.isArray(payload.weeklyTop) ? payload.weeklyTop : []),
          ...items,
        ];
      } catch {
        return [];
      }
    }));
    const unique = new Map<string, Track>();
    results.flat().forEach((raw: Record<string, unknown>) => {
      const id = String(raw?._id || raw?.id || '');
      const audioUrl = String(raw?.audioUrl || raw?.audio_url || '');
      if (!id || !audioUrl || isLikelyExpiredAIProviderUrl(audioUrl, String(raw?.createdAt || raw?.created_at || ''))) return;
      unique.set(id, {
        ...raw,
        _id: id,
        title: String(raw?.title || 'Sans titre'),
        artist: (raw?.artist || { _id: '', name: 'Artiste', username: 'artiste' }) as Track['artist'],
        audioUrl,
        coverUrl: String(raw?.coverUrl || raw?.cover_url || '') || undefined,
        duration: Number(raw?.duration || 0),
        likes: Array.isArray(raw?.likes) ? raw.likes as string[] : [],
        comments: Array.isArray(raw?.comments) ? raw.comments as string[] : [],
        plays: Number(raw?.plays || raw?.play_count || 0),
      });
    });
    const tracks = Array.from(unique.values());
    setAllTracksState((previous) => queueEquals(previous, tracks) ? previous : tracks);
    return tracks;
  }, []);

  const setAllTracks = useCallback((tracks: Track[] | ((previous: Track[]) => Track[])) => {
    setAllTracksState((previous) => {
      const next = typeof tracks === 'function' ? tracks(previous) : tracks;
      return queueEquals(previous, next) ? previous : next;
    });
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window) || Notification.permission === 'denied') return false;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch {
      return false;
    }
  }, []);

  const actions = useMemo(() => ({
    play: (track?: Track) => track ? core?.playTrack(track) ?? Promise.resolve() : core?.play() ?? Promise.resolve(),
    playImmediate: (track: Track) => { void core?.playTrack(track); },
    pause: () => core?.pause(),
    stop: () => core?.stop(),
    seek: (time: number) => core?.seek(time),
    setVolume: (volume: number) => core?.setVolume(volume),
    toggleMute: () => core?.toggleMute(),
    setPlaybackRate: (rate: number) => core?.setPlaybackRate(rate),
    nextTrack: () => core?.next(),
    previousTrack: () => core?.previous(),
    loadTrack: (track: Track) => core?.loadTrack(track) ?? Promise.reject(new Error('Audio Core indisponible')),
    setQueueAndPlay: (tracks: Track[], index = 0) => core?.setQueueAndPlay(tracks, index),
    setQueueOnly: (tracks: Track[], index = 0) => core?.setQueue(tracks, index),
    toggleShuffle: () => core?.toggleShuffle(),
    cycleRepeat: () => core?.cycleRepeat(),
    setShuffleMode: (enabled: boolean) => core?.setShuffle(enabled),
    setRepeatMode: (mode: AudioRepeatMode) => core?.setRepeat(mode),
    setUpNextEnabled: (enabled: boolean) => core?.setUpNextEnabled(enabled),
    setUpNextQueue: (tracks: Track[]) => core?.setUpNextQueue(tracks),
    autoPlayNext: () => core?.next(),
    setAllTracks,
    setAutoPlayEnabled,
    getSimilarTracks: (limit = 10) => snapshot.currentTrack ? recommendations.getSimilarTracks(snapshot.currentTrack, allTracksRef.current, limit) : [],
    getRecommendedTracks: (limit = 10) => recommendations.getRecommendedTracks(allTracksRef.current, limit),
    getMoodBasedRecommendations: (mood: string, limit = 10) => recommendations.getMoodBasedRecommendations(mood, allTracksRef.current, limit),
    loadAllTracks,
    reloadAllTracks: loadAllTracks,
    updateNotification,
    forceUpdateNotification: updateNotification,
    requestNotificationPermission,
  }), [core, loadAllTracks, recommendations, requestNotificationPermission, setAllTracks, snapshot.currentTrack, updateNotification]);

  const time = core?.getTimeSnapshot() ?? EMPTY_AUDIO_TIME_SNAPSHOT;
  return useMemo(() => ({
    state: {
      currentTrack: snapshot.currentTrack,
      isPlaying: snapshot.isPlaying,
      volume: snapshot.volume,
      currentTime: time.currentTime,
      duration: snapshot.duration,
      isLoading: snapshot.isLoading,
      error: snapshot.error?.message || null,
      errorKind: snapshot.error?.kind || null,
      isMuted: snapshot.isMuted,
      playbackRate: snapshot.playbackRate,
      playbackState: snapshot.playbackState,
      buffered: snapshot.buffered,
      generation: snapshot.generation,
    },
    queue: snapshot.queue,
    currentIndex: snapshot.currentIndex,
    shuffle: snapshot.shuffle,
    repeat: snapshot.repeat,
    allTracks,
    autoPlayEnabled,
    notificationPermission,
    isFirstPlay,
    get audioElement() { return core?.getAudioElement() || null; },
    actions,
  }), [actions, allTracks, autoPlayEnabled, core, isFirstPlay, notificationPermission, snapshot, time.currentTime]);
};
