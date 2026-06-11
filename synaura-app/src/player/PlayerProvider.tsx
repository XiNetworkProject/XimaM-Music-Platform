import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
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
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
let playerReady = false;
const PLAYER_STATE_KEY = 'synaura.player.state.v2';

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function isPlayableTrack(track: Track | null | undefined) {
  return Boolean(track?.audioUrl && !track._id.startsWith('radio-'));
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

  const playbackState = usePlaybackState();
  const activeTrack = useActiveTrack();

  const runPlayerCommand = useCallback(<T,>(command: () => Promise<T>): Promise<T> => {
    const next = commandChainRef.current
      .catch(() => undefined)
      .then(command);
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
      } finally {
        restoredRef.current = true;
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
      void recordTrackEvent(track._id, 'play_start');
    }
    const nextIndex = queue.findIndex((item) => item._id === track._id);
    if (nextIndex >= 0) setCurrentIndex(nextIndex);
  }, [activeTrack?.id, addRecent, queue]);

  // Auto-advance & evenements: react-native-track-player gere deja l'enchainement
  // mais on s'assure que le PlaybackQueueEnded ne laisse pas le state en pause "fantome"
  // et que les erreurs de lecture sautent au titre suivant.
  useTrackPlayerEvents(
    [Event.PlaybackQueueEnded, Event.PlaybackError, Event.PlaybackActiveTrackChanged],
    async (event) => {
      try {
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
          const trackIndex = (event as any).index;
          if (typeof trackIndex === 'number' && trackIndex >= 0) {
            setCurrentIndex(trackIndex);
          }
        }
      } catch {
        // ignore
      }
    },
  );

  const setQueueAndPlay = useCallback(async (tracks: Track[], startIndex: number) => runPlayerCommand(async () => {
    const playable = tracks.filter(isPlayableTrack);
    if (!playable.length) return;
    const index = Math.max(0, Math.min(playable.length - 1, startIndex || 0));
    await setupPlayer();

    byIdRef.current.clear();
    playable.forEach((track) => byIdRef.current.set(track._id, track));
    setQueue(playable);
    setCurrentIndex(index);
    setCurrent(playable[index]);
    currentRef.current = playable[index];
    addRecent(playable[index]);

    await TrackPlayer.reset();
    await TrackPlayer.add(playable.map(toNativeTrack));
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  }), [addRecent, runPlayerCommand]);

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
    const previousPosition = await TrackPlayer.getProgress().then((value) => value.position).catch(() => 0);
    const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
    const nativeIds = nativeQueue.map((item) => String(item.id));
    const desiredIds = playable.map((track) => track._id);

    setQueue(playable);
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
        return;
      }
    }

    await TrackPlayer.reset();
    await TrackPlayer.add(playable.map(toNativeTrack));
    await TrackPlayer.skip(index);
    if (previousId && previousId === playable[index]._id) {
      if (previousPosition > 0) await TrackPlayer.seekTo(previousPosition).catch(() => {});
      if (previousState === State.Playing) await TrackPlayer.play().catch(() => {});
    }
  }), [runPlayerCommand]);

  const playTrack = useCallback(async (track: Track) => {
    if (!isPlayableTrack(track)) return;
    if (currentRef.current?._id === track._id) {
      await TrackPlayer.play();
      return;
    }
    const existingIndex = queue.findIndex((item) => item._id === track._id);
    if (existingIndex >= 0) {
      await setQueueAndPlay(queue, existingIndex);
      return;
    }
    await setQueueAndPlay([track], 0);
  }, [queue, setQueueAndPlay]);

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

  const playQueueIndex = useCallback(async (index: number) => runPlayerCommand(async () => {
    if (index < 0 || index >= queue.length) return;
    await setupPlayer();
    const targetId = queue[index]?._id;
    const nativeQueue = await TrackPlayer.getQueue().catch(() => []);
    const nativeIndex = targetId ? nativeQueue.findIndex((item) => String(item.id) === targetId) : -1;
    await TrackPlayer.skip(nativeIndex >= 0 ? nativeIndex : index);
    await TrackPlayer.play();
  }), [queue, runPlayerCommand]);

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

  const togglePlayPause = useCallback(async () => runPlayerCommand(async () => {
    if (!currentRef.current) return;
    const currentState = await TrackPlayer.getPlaybackState().then((value) => value.state).catch(() => State.None);
    if (currentState === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }), [runPlayerCommand]);

  const next = useCallback(async () => runPlayerCommand(async () => {
    if (currentRef.current) void recordTrackEvent(currentRef.current._id, 'next');
    await TrackPlayer.skipToNext().catch(() => {});
  }), [runPlayerCommand]);

  const previous = useCallback(async () => runPlayerCommand(async () => {
    if (currentRef.current) void recordTrackEvent(currentRef.current._id, 'prev');
    await TrackPlayer.skipToPrevious().catch(() => {});
  }), [runPlayerCommand]);

  const seekTo = useCallback(async (seconds: number) => runPlayerCommand(async () => {
    await TrackPlayer.seekTo(Math.max(0, seconds));
  }), [runPlayerCommand]);

  const value = useMemo<PlayerContextValue>(() => ({
    current,
    queue,
    currentIndex,
    isPlaying: !!current && playbackState.state === State.Playing,
    isLoading: !!current && (playbackState.state === State.Loading || playbackState.state === State.Buffering),
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
    togglePlayPause,
    seekTo,
    next,
    previous,
    setSleepTimer,
  }), [addNext, current, currentIndex, cycleRepeatMode, moveInQueue, next, playQueueIndex, playTrack, playbackState.state, previous, queue, removeFromQueue, repeatMode, seekTo, setQueueAndPlay, setQueueOnly, setSleepTimer, shuffleEnabled, sleepTimerEnd, togglePlayPause, toggleShuffle]);

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
