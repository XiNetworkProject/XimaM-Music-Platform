import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import type { Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';
import { recordTrackEvent } from '@/api/client';

export type PlayerRepeatMode = 'off' | 'one' | 'all';

type PlayerContextValue = {
  current: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  repeatMode: PlayerRepeatMode;
  shuffleEnabled: boolean;
  sleepTimerEnd: number | null;
  playTrack: (track: Track) => Promise<void>;
  addNext: (track: Track) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
  removeFromQueue: (index: number) => Promise<void>;
  moveInQueue: (fromIndex: number, toIndex: number) => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  setQueueAndPlay: (tracks: Track[], startIndex: number) => Promise<void>;
  setQueueOnly: (tracks: Track[], startIndex: number) => Promise<void>;
  mergeQueue: (tracks: Track[]) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
let playerReady = false;
const PLAYER_STATE_KEY = 'synaura.player.state.v3';

type PlaybackTelemetry = {
  trackId: string;
  maxPosition: number;
  duration: number;
  milestones: Set<number>;
  completed: boolean;
};

function emptyPlaybackTelemetry(trackId = '', duration = 0): PlaybackTelemetry {
  return { trackId, maxPosition: 0, duration, milestones: new Set(), completed: false };
}

function emitRecommendationSignal(trackId: string, type: string, weight = 1) {
  if (!trackId || trackId.startsWith('radio-')) return;
  DeviceEventEmitter.emit('synaura:recommendation-signal', { trackId, type, weight });
}

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function isPlayableTrack(track: Track | null | undefined) {
  return Boolean(
    typeof track?._id === 'string'
    && track._id.length > 0
    && typeof track.audioUrl === 'string'
    && track.audioUrl.length > 0
    && !track._id.startsWith('radio-'),
  );
}

function toNativeTrack(track: Track) {
  return {
    id: track._id,
    url: track.audioUrl,
    title: track.title || 'Sans titre',
    artist: artistName(track),
    artwork: track.coverUrl || undefined,
    duration: track.duration || 0,
    album: track.album || 'Synaura',
    genre: track.genre?.join(', ') || undefined,
  };
}

async function setupPlayer() {
  if (playerReady) return;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
  } catch (error) {
    if (!/already|initialized/i.test(String(error))) throw error;
  }
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 1,
  });
  await TrackPlayer.setRepeatMode(RepeatMode.Off);
  playerReady = true;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const library = useLibrary();
  const addRecent = library.addRecent;
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatMode, setRepeatModeState] = useState<PlayerRepeatMode>('off');
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const byIdRef = useRef<Map<string, Track>>(new Map());
  const currentRef = useRef<Track | null>(null);
  const lastRecordedTrackIdRef = useRef<string | null>(null);
  const commandChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);
  const restoreStartedRef = useRef(false);
  const queueRef = useRef<Track[]>([]);
  const currentIndexRef = useRef(0);
  const repeatModeRef = useRef<PlayerRepeatMode>('off');
  const shuffleRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const playbackTelemetryRef = useRef<PlaybackTelemetry>(emptyPlaybackTelemetry());
  const explicitNavigationAtRef = useRef(0);
  const lastActivationRef = useRef<{ trackId: string; at: number }>({ trackId: '', at: 0 });
  const activationEpochRef = useRef(0);
  const restoreGateRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (!restoreGateRef.current) {
    let resolve = () => {};
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    restoreGateRef.current = { promise, resolve };
  }

  const playbackState = usePlaybackState();
  const activeTrack = useActiveTrack();

  const runPlayerCommand = useCallback(<T,>(command: () => Promise<T>): Promise<T> => {
    const next = commandChainRef.current
      .catch(() => undefined)
      .then(async () => {
        await restoreGateRef.current?.promise;
        return command();
      });
    commandChainRef.current = next.catch((error) => {
      console.warn('[SynauraPlayer] command failed', error);
    });
    return next;
  }, []);

  useEffect(() => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;
    let cancelled = false;
    const restore = async () => {
      try {
        await setupPlayer();
        const raw = await AsyncStorage.getItem(PLAYER_STATE_KEY);
        if (!raw || cancelled) return;
        const saved = JSON.parse(raw) as {
          queue?: Track[];
          currentIndex?: number;
          position?: number;
          wasPlaying?: boolean;
          repeatMode?: PlayerRepeatMode;
          shuffleEnabled?: boolean;
        };
        const savedQueue = Array.isArray(saved.queue) ? saved.queue.filter(isPlayableTrack) : [];
        if (!savedQueue.length) {
          await TrackPlayer.reset().catch(() => {});
          return;
        }
        const savedIndex = Math.max(0, Math.min(savedQueue.length - 1, Number(saved.currentIndex || 0)));
        const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
        const nativeIndex = await TrackPlayer.getActiveTrackIndex().catch(() => undefined);
        const nativeTrackId = typeof nativeIndex === 'number' && nativeIndex >= 0
          ? String(nativeQueue[nativeIndex]?.id || '')
          : '';
        const matchingNativeIndex = nativeTrackId
          ? savedQueue.findIndex((track) => track._id === nativeTrackId)
          : -1;
        const restoredIndex = matchingNativeIndex >= 0 ? matchingNativeIndex : savedIndex;
        byIdRef.current.clear();
        savedQueue.forEach((track) => byIdRef.current.set(track._id, track));
        queueRef.current = savedQueue;
        currentIndexRef.current = restoredIndex;
        currentRef.current = savedQueue[restoredIndex];
        setQueue(savedQueue);
        setCurrentIndex(restoredIndex);
        setCurrent(savedQueue[restoredIndex]);
        setRepeatModeState(saved.repeatMode || 'off');
        setShuffleEnabled(Boolean(saved.shuffleEnabled));

        if (matchingNativeIndex < 0) {
          await TrackPlayer.reset();
          await TrackPlayer.add(savedQueue.map(toNativeTrack));
          await TrackPlayer.skip(savedIndex);
          if (Number(saved.position || 0) > 0) await TrackPlayer.seekTo(Number(saved.position)).catch(() => {});
        }
        await TrackPlayer.setRepeatMode(saved.repeatMode === 'one' ? RepeatMode.Track : saved.repeatMode === 'all' ? RepeatMode.Queue : RepeatMode.Off);
        if (matchingNativeIndex < 0) {
          if (saved.wasPlaying) await TrackPlayer.play().catch(() => {});
          else await TrackPlayer.pause().catch(() => {});
        }
      } catch (error) {
        console.warn('[SynauraPlayer] restore failed', error);
        await AsyncStorage.removeItem(PLAYER_STATE_KEY).catch(() => {});
        await TrackPlayer.reset().catch(() => {});
        byIdRef.current.clear();
        queueRef.current = [];
        currentRef.current = null;
        setQueue([]);
        setCurrent(null);
        setCurrentIndex(0);
      } finally {
        restoredRef.current = true;
        setIsReady(true);
        restoreGateRef.current?.resolve();
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleRef.current = shuffleEnabled; }, [shuffleEnabled]);
  useEffect(() => { wasPlayingRef.current = playbackState.state === State.Playing; }, [playbackState.state]);

  useEffect(() => {
    const persist = async () => {
      if (!restoredRef.current || !queueRef.current.length) return;
      const position = await TrackPlayer.getProgress().then((value) => value.position).catch(() => 0);
      await AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify({
        queue: queueRef.current,
        currentIndex: currentIndexRef.current,
        position,
        wasPlaying: wasPlayingRef.current,
        repeatMode: repeatModeRef.current,
        shuffleEnabled: shuffleRef.current,
        savedAt: Date.now(),
      }));
    };
    const interval = setInterval(() => void persist(), 4000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void persist();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
      void persist();
    };
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    if (!minutes || minutes <= 0) {
      setSleepTimerEnd(null);
      return;
    }
    const end = Date.now() + minutes * 60_000;
    setSleepTimerEnd(end);
    sleepTimerRef.current = setTimeout(() => {
      TrackPlayer.pause().catch(() => {});
      setSleepTimerEnd(null);
      sleepTimerRef.current = null;
    }, minutes * 60_000);
  }, []);

  useEffect(() => () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
  }, []);

  useEffect(() => {
    const id = activeTrack?.id ? String(activeTrack.id) : '';
    if (!id) return;
    const track = byIdRef.current.get(id);
    if (!track) return;
    currentRef.current = track;
    setCurrent(track);
    addRecent(track);
    if (lastRecordedTrackIdRef.current !== track._id) {
      lastRecordedTrackIdRef.current = track._id;
      playbackTelemetryRef.current = emptyPlaybackTelemetry(track._id, Number(track.duration || 0));
      void recordTrackEvent(track._id, 'play_start', undefined, { durationSeconds: Number(track.duration || 0) });
      emitRecommendationSignal(track._id, 'play_start', 1);
    }
    const nextIndex = queue.findIndex((item) => item._id === track._id);
    if (nextIndex >= 0) setCurrentIndex(nextIndex);
  }, [activeTrack?.id, addRecent, queue]);

  // Auto-advance & evenements: react-native-track-player gere deja l'enchainement
  // mais on s'assure que le PlaybackQueueEnded ne laisse pas le state en pause "fantome"
  // et que les erreurs de lecture sautent au titre suivant.
  useTrackPlayerEvents(
    [Event.PlaybackQueueEnded, Event.PlaybackError, Event.PlaybackActiveTrackChanged, Event.PlaybackProgressUpdated],
    async (event) => {
      try {
        if (event.type === Event.PlaybackProgressUpdated) {
          const payload = event as any;
          const track = currentRef.current;
          if (!track) return;
          const position = Math.max(0, Number(payload.position || 0));
          const duration = Math.max(0, Number(payload.duration || track.duration || 0));
          let telemetry = playbackTelemetryRef.current;
          if (telemetry.trackId !== track._id) {
            telemetry = emptyPlaybackTelemetry(track._id, duration);
            playbackTelemetryRef.current = telemetry;
          }
          telemetry.maxPosition = Math.max(telemetry.maxPosition, position);
          telemetry.duration = Math.max(telemetry.duration, duration);
          const progress = telemetry.duration > 0 ? telemetry.maxPosition / telemetry.duration : 0;
          for (const milestone of [25, 65]) {
            if (progress * 100 < milestone || telemetry.milestones.has(milestone)) continue;
            telemetry.milestones.add(milestone);
            void recordTrackEvent(track._id, 'play_progress', { milestone }, {
              positionSeconds: telemetry.maxPosition,
              durationSeconds: telemetry.duration,
              progressPct: progress * 100,
            });
            emitRecommendationSignal(track._id, `play_progress_${milestone}`, milestone >= 65 ? 2 : 1);
          }
          if (progress >= 0.9 && !telemetry.completed) {
            telemetry.completed = true;
            void recordTrackEvent(track._id, 'play_complete', undefined, {
              positionSeconds: telemetry.maxPosition,
              durationSeconds: telemetry.duration,
              progressPct: Math.min(100, progress * 100),
            });
            emitRecommendationSignal(track._id, 'play_complete', 4);
          }
          return;
        }
        if (event.type === Event.PlaybackQueueEnded) {
          // En mode repeat 'all', on revient au debut. Sinon on stoppe proprement.
          if (currentRef.current) void recordTrackEvent(currentRef.current._id, 'queue_end');
          return;
        }
        if (event.type === Event.PlaybackError) {
          await TrackPlayer.skipToNext().catch(() => {});
          return;
        }
        if (event.type === Event.PlaybackActiveTrackChanged) {
          const payload = event as any;
          const previous = playbackTelemetryRef.current;
          const nextTrackId = String(payload.track?.id || '');
          if (previous.trackId && previous.trackId !== nextTrackId && previous.duration > 0) {
            const progress = Math.min(1, previous.maxPosition / previous.duration);
            if (!previous.completed && progress >= 0.9) {
              previous.completed = true;
              void recordTrackEvent(previous.trackId, 'play_complete', undefined, {
                positionSeconds: previous.maxPosition,
                durationSeconds: previous.duration,
                progressPct: progress * 100,
              });
              emitRecommendationSignal(previous.trackId, 'play_complete', 4);
            } else if (!previous.completed && progress < 0.35 && Date.now() - explicitNavigationAtRef.current > 1500) {
              void recordTrackEvent(previous.trackId, 'skip', { transition: 'track_change' }, {
                positionSeconds: previous.maxPosition,
                durationSeconds: previous.duration,
                progressPct: progress * 100,
              });
              emitRecommendationSignal(previous.trackId, 'skip', 3);
            }
          }
          playbackTelemetryRef.current = emptyPlaybackTelemetry(nextTrackId, Number(payload.track?.duration || 0));
          const trackIndex = payload.index;
          if (typeof trackIndex === 'number' && trackIndex >= 0) {
            setCurrentIndex(trackIndex);
          }
        }
      } catch {
        // ignore
      }
    },
  );

  const setQueueAndPlay = useCallback((tracks: Track[], startIndex: number) => {
    const activationEpoch = ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      const playable = tracks.filter(isPlayableTrack);
      if (!playable.length || activationEpoch !== activationEpochRef.current) return;
      const index = Math.max(0, Math.min(playable.length - 1, startIndex || 0));
      await setupPlayer();
      if (activationEpoch !== activationEpochRef.current) return;

      byIdRef.current.clear();
      playable.forEach((track) => byIdRef.current.set(track._id, track));
      queueRef.current = playable;
      setQueue(playable);
      setCurrentIndex(index);
      setCurrent(playable[index]);
      currentRef.current = playable[index];
      addRecent(playable[index]);

      await TrackPlayer.reset();
      if (activationEpoch !== activationEpochRef.current) return;
      await TrackPlayer.add(playable.map(toNativeTrack));
      await TrackPlayer.skip(index);
      if (activationEpoch !== activationEpochRef.current) return;
      await TrackPlayer.play();
      lastActivationRef.current = { trackId: playable[index]._id, at: Date.now() };
    });
  }, [addRecent, runPlayerCommand]);

  /**
   * Replace la queue native sans relancer la lecture si le track courant est preserve.
   * Utile pour synchroniser le SwipeScreen avec un feed elargi sans interrompre l'audio.
   */
  const setQueueOnly = useCallback(async (tracks: Track[], startIndex: number) => runPlayerCommand(async () => {
    const playable = tracks.filter(isPlayableTrack);
    if (!playable.length) return;
    const index = Math.max(0, Math.min(playable.length - 1, startIndex || 0));
    await setupPlayer();

    byIdRef.current.clear();
    playable.forEach((track) => byIdRef.current.set(track._id, track));

    const previousId = currentRef.current?._id || null;
    const previousState = await TrackPlayer.getPlaybackState().then((value) => value.state).catch(() => State.None);
    const shouldResumePlayback = previousState === State.Playing
      || previousState === State.Buffering
      || previousState === State.Loading;
    const previousPosition = await TrackPlayer.getProgress().then((value) => value.position).catch(() => 0);
    const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
    const nativeIds = nativeQueue.map((item) => String(item.id));
    const desiredIds = playable.map((track) => track._id);

    setQueue(playable);
    queueRef.current = playable;
    setCurrentIndex(index);
    setCurrent(playable[index]);
    currentRef.current = playable[index];

    // Infinite feeds only append tracks most of the time. Keep the current
    // native queue and playback untouched instead of rebuilding ExoPlayer.
    if (
      previousId === playable[index]._id &&
      nativeIds.length > 0 &&
      nativeIds.every((id, nativeIndex) => desiredIds[nativeIndex] === id)
    ) {
      const missing = playable.slice(nativeIds.length);
      if (missing.length) await TrackPlayer.add(missing.map(toNativeTrack));
      return;
    }

    // Le Swipe place toujours le titre actif en tete de sa file. Quand il est
    // deja lu par le moteur natif, on reconstruit le reste autour de lui sans
    // reset : aucune micro-coupure, aucune bascule pause/play en entrant.
    const nativeCurrentIndex = previousId ? nativeIds.indexOf(previousId) : -1;
    if (previousId === playable[index]._id && nativeCurrentIndex >= 0) {
      const removable = nativeIds
        .map((_, nativeIndex) => nativeIndex)
        .filter((nativeIndex) => nativeIndex !== nativeCurrentIndex)
        .sort((a, b) => b - a);
      for (const nativeIndex of removable) {
        await TrackPlayer.remove(nativeIndex).catch(() => {});
      }
      const remaining = await TrackPlayer.getQueue().catch(() => []);
      if (remaining.length) {
        const nextTracks = playable.filter((track) => track._id !== previousId);
        if (nextTracks.length) await TrackPlayer.add(nextTracks.map(toNativeTrack));
        // ExoPlayer can transiently pause when queue entries surrounding the
        // active track are removed. Restore the state captured before the
        // rebuild so opening Flow/Clips never stops the current sound.
        if (shouldResumePlayback) await TrackPlayer.play().catch(() => {});
        return;
      }
    }

    await TrackPlayer.reset();
    await TrackPlayer.add(playable.map(toNativeTrack));
    await TrackPlayer.skip(index);
    if (previousId && previousId === playable[index]._id) {
      if (previousPosition > 0) await TrackPlayer.seekTo(previousPosition).catch(() => {});
      if (shouldResumePlayback) await TrackPlayer.play().catch(() => {});
    }
  }), [runPlayerCommand]);

  /**
   * Ajoute les nouveaux morceaux du Flow sans reconstruire la file native. Le
   * classement peut ainsi évoluer pendant une écoute sans micro-coupure.
   */
  const mergeQueue = useCallback((tracks: Track[]) => runPlayerCommand(async () => {
    const playable = tracks.filter(isPlayableTrack);
    if (!playable.length) return;
    await setupPlayer();

    const desiredById = new Map(playable.map((track) => [track._id, track]));
    playable.forEach((track) => byIdRef.current.set(track._id, track));
    let nativeQueue = await TrackPlayer.getQueue().catch(() => []);
    const nativeIds = new Set(nativeQueue.map((item) => String(item.id)));
    const additions = playable.filter((track) => !nativeIds.has(track._id));
    if (additions.length) {
      await TrackPlayer.add(additions.map(toNativeTrack));
      nativeQueue = await TrackPlayer.getQueue().catch(() => nativeQueue);
    }

    const merged = nativeQueue.flatMap((item) => {
      const id = String(item.id || '');
      const track = desiredById.get(id) || byIdRef.current.get(id);
      return track ? [track] : [];
    });
    if (!merged.length) return;
    queueRef.current = merged;
    setQueue(merged);
    const currentId = currentRef.current?._id || '';
    const nextIndex = merged.findIndex((track) => track._id === currentId);
    if (nextIndex >= 0) {
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
    }
  }), [runPlayerCommand]);

  const playTrack = useCallback((track: Track) => {
    const activationEpoch = ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      if (!isPlayableTrack(track) || activationEpoch !== activationEpochRef.current) return;
      await setupPlayer();
      if (activationEpoch !== activationEpochRef.current) return;
      const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
      const nativeIndex = nativeQueue.findIndex((item) => String(item.id) === track._id);
      if (currentRef.current?._id === track._id && nativeIndex >= 0) {
        await TrackPlayer.play();
        lastActivationRef.current = { trackId: track._id, at: Date.now() };
        return;
      }

      const logicalQueue = queueRef.current;
      const logicalIndex = logicalQueue.findIndex((item) => item._id === track._id);
      if (nativeIndex >= 0 && logicalIndex >= 0) {
        currentRef.current = track;
        currentIndexRef.current = logicalIndex;
        setCurrent(track);
        setCurrentIndex(logicalIndex);
        addRecent(track);
        await TrackPlayer.skip(nativeIndex);
        if (activationEpoch !== activationEpochRef.current) return;
        await TrackPlayer.play();
        lastActivationRef.current = { trackId: track._id, at: Date.now() };
        return;
      }

      byIdRef.current.clear();
      byIdRef.current.set(track._id, track);
      queueRef.current = [track];
      currentRef.current = track;
      currentIndexRef.current = 0;
      setQueue([track]);
      setCurrent(track);
      setCurrentIndex(0);
      addRecent(track);
      await TrackPlayer.reset();
      if (activationEpoch !== activationEpochRef.current) return;
      await TrackPlayer.add(toNativeTrack(track));
      if (activationEpoch !== activationEpochRef.current) return;
      await TrackPlayer.play();
      lastActivationRef.current = { trackId: track._id, at: Date.now() };
    });
  }, [addRecent, runPlayerCommand]);

  const addNext = useCallback(async (track: Track) => {
    if (!isPlayableTrack(track)) return;
    await setupPlayer();
    byIdRef.current.set(track._id, track);
    await TrackPlayer.add(toNativeTrack(track), Math.min(queue.length, currentIndex + 1));
    setQueue((currentQueue) => {
      const withoutDuplicate = currentQueue.filter((item) => item._id !== track._id);
      const insertionIndex = Math.min(withoutDuplicate.length, currentIndex + 1);
      return [
        ...withoutDuplicate.slice(0, insertionIndex),
        track,
        ...withoutDuplicate.slice(insertionIndex),
      ];
    });
  }, [currentIndex, queue.length]);

  const playQueueIndex = useCallback((index: number) => {
    const activationEpoch = ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      const logicalQueue = queueRef.current;
      if (index < 0 || index >= logicalQueue.length || activationEpoch !== activationEpochRef.current) return;
      await setupPlayer();
      const targetId = logicalQueue[index]?._id;
      const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
      const nativeIndex = targetId ? nativeQueue.findIndex((item) => String(item.id) === targetId) : -1;
      await TrackPlayer.skip(nativeIndex >= 0 ? nativeIndex : index);
      if (activationEpoch !== activationEpochRef.current) return;
      await TrackPlayer.play();
      lastActivationRef.current = { trackId: targetId || '', at: Date.now() };
    });
  }, [runPlayerCommand]);

  const removeFromQueue = useCallback(async (index: number) => runPlayerCommand(async () => {
    if (index < 0 || index >= queue.length || index === currentIndex) return;
    const targetId = queue[index]?._id;
    const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
    const nativeIndex = targetId ? nativeQueue.findIndex((item) => String(item.id) === targetId) : -1;
    if (nativeIndex < 0) return;
    await TrackPlayer.remove(nativeIndex);
    setQueue((currentQueue) => currentQueue.filter((_, itemIndex) => itemIndex !== index));
    if (index < currentIndex) setCurrentIndex((value) => Math.max(0, value - 1));
  }), [currentIndex, queue.length, runPlayerCommand]);

  const moveInQueue = useCallback(async (fromIndex: number, toIndex: number) => runPlayerCommand(async () => {
    if (fromIndex === currentIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= queue.length || toIndex >= queue.length) return;
    const sourceId = queue[fromIndex]?._id;
    const targetId = queue[toIndex]?._id;
    const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
    const nativeFrom = sourceId ? nativeQueue.findIndex((item) => String(item.id) === sourceId) : -1;
    const nativeTo = targetId ? nativeQueue.findIndex((item) => String(item.id) === targetId) : -1;
    if (nativeFrom < 0 || nativeTo < 0) return;
    await TrackPlayer.move(nativeFrom, nativeTo);
    setQueue((currentQueue) => {
      const nextQueue = [...currentQueue];
      const [moved] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, moved);
      return nextQueue;
    });
  }), [currentIndex, queue.length, runPlayerCommand]);

  const cycleRepeatMode = useCallback(async () => runPlayerCommand(async () => {
    const next: PlayerRepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatModeState(next);
    await TrackPlayer.setRepeatMode(next === 'one' ? RepeatMode.Track : next === 'all' ? RepeatMode.Queue : RepeatMode.Off);
  }), [repeatMode, runPlayerCommand]);

  const toggleShuffle = useCallback(async () => {
    if (queue.length < 2) return;
    const position = await TrackPlayer.getProgress().then((value) => value.position).catch(() => 0);
    const wasPlaying = playbackState.state === State.Playing;
    const nextEnabled = !shuffleEnabled;
    setShuffleEnabled(nextEnabled);
    const currentTrack = queue[currentIndex];
    const rest = queue.filter((_, index) => index !== currentIndex);
    const reordered = nextEnabled
      ? [currentTrack, ...rest.sort(() => Math.random() - 0.5)]
      : [currentTrack, ...rest];
    await setQueueAndPlay(reordered, 0);
    if (position > 0) await TrackPlayer.seekTo(position);
    if (!wasPlaying) await TrackPlayer.pause();
  }, [currentIndex, playbackState.state, queue, setQueueAndPlay, shuffleEnabled]);

  const togglePlayPause = useCallback(() => {
    const activationEpoch = ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      if (!currentRef.current || activationEpoch !== activationEpochRef.current) return;
      const currentState = await TrackPlayer.getPlaybackState().then((value) => value.state).catch(() => State.None);
      const recentlyActivated = lastActivationRef.current.trackId === currentRef.current._id
        && Date.now() - lastActivationRef.current.at < 550;
      if (currentState === State.Loading || currentState === State.Buffering || recentlyActivated) {
        await TrackPlayer.play();
        return;
      }
      if (currentState === State.Playing) await TrackPlayer.pause();
      else await TrackPlayer.play();
    });
  }, [runPlayerCommand]);

  const play = useCallback(() => {
    const activationEpoch = ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      if (!currentRef.current || activationEpoch !== activationEpochRef.current) return;
      await TrackPlayer.play();
    });
  }, [runPlayerCommand]);

  const pause = useCallback(() => {
    ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      await TrackPlayer.pause();
    });
  }, [runPlayerCommand]);

  const next = useCallback(async () => {
    ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      explicitNavigationAtRef.current = Date.now();
      if (currentRef.current) {
        const telemetry = playbackTelemetryRef.current;
        const progress = telemetry.duration > 0 ? telemetry.maxPosition / telemetry.duration : 0;
        void recordTrackEvent(currentRef.current._id, 'next', undefined, {
          positionSeconds: telemetry.maxPosition,
          durationSeconds: telemetry.duration,
          progressPct: progress * 100,
        });
        emitRecommendationSignal(currentRef.current._id, 'next', 3);
      }
      await TrackPlayer.skipToNext().catch(() => {});
    });
  }, [runPlayerCommand]);

  const previous = useCallback(async () => {
    ++activationEpochRef.current;
    return runPlayerCommand(async () => {
      explicitNavigationAtRef.current = Date.now();
      if (currentRef.current) {
        const telemetry = playbackTelemetryRef.current;
        const progress = telemetry.duration > 0 ? telemetry.maxPosition / telemetry.duration : 0;
        void recordTrackEvent(currentRef.current._id, 'prev', undefined, {
          positionSeconds: telemetry.maxPosition,
          durationSeconds: telemetry.duration,
          progressPct: progress * 100,
        });
        emitRecommendationSignal(currentRef.current._id, 'prev', 2);
      }
      await TrackPlayer.skipToPrevious().catch(() => {});
    });
  }, [runPlayerCommand]);

  const seekTo = useCallback(async (seconds: number) => runPlayerCommand(async () => {
    await TrackPlayer.seekTo(Math.max(0, seconds));
  }), [runPlayerCommand]);

  const value = useMemo<PlayerContextValue>(() => ({
    current,
    queue,
    currentIndex,
    isPlaying: !!current && (
      playbackState.state === State.Playing
      || playbackState.state === State.Loading
      || playbackState.state === State.Buffering
    ),
    isLoading: !!current && (playbackState.state === State.Loading || playbackState.state === State.Buffering),
    isReady,
    repeatMode,
    shuffleEnabled,
    sleepTimerEnd,
    playTrack,
    addNext,
    playQueueIndex,
    removeFromQueue,
    moveInQueue,
    cycleRepeatMode,
    toggleShuffle,
    setQueueAndPlay,
    setQueueOnly,
    mergeQueue,
    play,
    pause,
    togglePlayPause,
    seekTo,
    next,
    previous,
    setSleepTimer,
  }), [addNext, current, currentIndex, cycleRepeatMode, isReady, mergeQueue, moveInQueue, next, pause, play, playQueueIndex, playTrack, playbackState.state, previous, queue, removeFromQueue, repeatMode, seekTo, setQueueAndPlay, setQueueOnly, setSleepTimer, shuffleEnabled, sleepTimerEnd, togglePlayPause, toggleShuffle]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

export function usePlayerProgress(updateInterval = 500) {
  const progress = useProgress(updateInterval);
  return {
    positionSec: Math.max(0, progress.position || 0),
    durationSec: Math.max(0, progress.duration || 0),
    bufferedSec: Math.max(0, progress.buffered || 0),
  };
}
