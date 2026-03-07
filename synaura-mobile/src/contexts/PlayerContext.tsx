import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  AppKilledPlaybackBehavior,
  RepeatMode,
} from 'react-native-track-player';
import type { ApiTrack } from '../services/api';

type PlayerContextValue = {
  current: ApiTrack | null;
  queue: ApiTrack[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionSec: number;
  durationSec: number;
  playTrack: (track: ApiTrack) => Promise<void>;
  setQueueAndPlay: (tracks: ApiTrack[], startIndex: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (sec: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  stop: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

let playerReady = false;

function apiTrackToRNTP(track: ApiTrack, index?: number) {
  const artistName = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste inconnu';
  return {
    id: track._id,
    url: track.audioUrl,
    title: track.title || 'Sans titre',
    artist: artistName,
    artwork: track.coverUrl || undefined,
    duration: track.duration || 0,
    genre: track.genre?.join(', ') || undefined,
    album: track.album || undefined,
  };
}

async function setupPlayer() {
  if (playerReady) return;
  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
        Capability.PlayFromId,
        Capability.PlayFromSearch,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
    });
    await TrackPlayer.setRepeatMode(RepeatMode.Off);
    playerReady = true;
  } catch (e) {
    console.warn('[PlayerContext] setupPlayer failed:', e);
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ApiTrack | null>(null);
  const currentRef = useRef<ApiTrack | null>(null);
  const [queue, setQueue] = useState<ApiTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const queueMapRef = useRef<Map<string, ApiTrack>>(new Map());

  const playbackState = usePlaybackState();
  const progress = useProgress(250);
  const activeTrack = useActiveTrack();

  useEffect(() => {
    setupPlayer();
  }, []);

  // Sync current track from RNTP active track
  useEffect(() => {
    if (activeTrack?.id && queueMapRef.current.has(activeTrack.id)) {
      const apiTrack = queueMapRef.current.get(activeTrack.id)!;
      if (currentRef.current?._id !== apiTrack._id) {
        currentRef.current = apiTrack;
        setCurrent(apiTrack);
        const idx = queue.findIndex(t => t._id === apiTrack._id);
        if (idx >= 0) setCurrentIndex(idx);
      }
    }
  }, [activeTrack?.id, queue]);

  const playTrack = useCallback(async (track: ApiTrack) => {
    if (!track?.audioUrl) return;
    await setupPlayer();

    if (current?._id === track._id) {
      const state = playbackState.state;
      if (state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
      return;
    }

    currentRef.current = track;
    setCurrent(track);
    setQueue([track]);
    setCurrentIndex(0);

    queueMapRef.current.clear();
    queueMapRef.current.set(track._id, track);

    await TrackPlayer.reset();
    await TrackPlayer.add(apiTrackToRNTP(track));
    await TrackPlayer.play();
  }, [current?._id, playbackState.state]);

  const setQueueAndPlay = useCallback(async (tracks: ApiTrack[], startIndex: number) => {
    const list = Array.isArray(tracks) ? tracks.filter(t => t?.audioUrl) : [];
    if (!list.length) return;
    await setupPlayer();

    const idx = Math.max(0, Math.min(list.length - 1, Math.floor(startIndex || 0)));
    setQueue(list);
    setCurrentIndex(idx);

    const t = list[idx];
    currentRef.current = t;
    setCurrent(t);

    queueMapRef.current.clear();
    list.forEach(tr => queueMapRef.current.set(tr._id, tr));

    await TrackPlayer.reset();
    const rntpTracks = list.map((tr, i) => apiTrackToRNTP(tr, i));
    await TrackPlayer.add(rntpTracks);
    await TrackPlayer.skip(idx);
    await TrackPlayer.play();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!currentRef.current) return;
    const state = playbackState.state;
    if (state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [playbackState.state]);

  const seekTo = useCallback(async (sec: number) => {
    const s = Number.isFinite(sec) ? Math.max(0, sec) : 0;
    await TrackPlayer.seekTo(s);
  }, []);

  const next = useCallback(async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {}
  }, []);

  const previous = useCallback(async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {}
  }, []);

  const stop = useCallback(async () => {
    await TrackPlayer.reset();
    currentRef.current = null;
    setCurrent(null);
    setQueue([]);
    setCurrentIndex(0);
    queueMapRef.current.clear();
  }, []);

  const state = playbackState.state;
  const isPlaying = !!current && state === State.Playing;
  const isLoading = !!current && (state === State.Buffering || state === State.Loading);
  const positionSec = Math.max(0, progress.position || 0);
  const durationSec = Math.max(0, progress.duration || 0);

  const value = useMemo<PlayerContextValue>(() => ({
    current,
    queue,
    currentIndex,
    isPlaying,
    isLoading,
    positionSec,
    durationSec,
    playTrack,
    setQueueAndPlay,
    togglePlayPause,
    seekTo,
    next,
    previous,
    stop,
  }), [current, queue, currentIndex, isPlaying, isLoading, positionSec, durationSec, playTrack, setQueueAndPlay, togglePlayPause, seekTo, next, previous, stop]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans <PlayerProvider>');
  return ctx;
}
