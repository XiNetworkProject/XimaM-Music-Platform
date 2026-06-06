import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';
import type { Track } from '@/api/types';
import { useLibrary } from '@/library/LibraryProvider';

type PlayerContextValue = {
  current: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionSec: number;
  durationSec: number;
  playTrack: (track: Track) => Promise<void>;
  setQueueAndPlay: (tracks: Track[], startIndex: number) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
let playerReady = false;

function artistName(track: Track) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
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
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
  });
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
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const byIdRef = useRef<Map<string, Track>>(new Map());
  const currentRef = useRef<Track | null>(null);

  const playbackState = usePlaybackState();
  const activeTrack = useActiveTrack();
  const progress = useProgress(250);

  useEffect(() => {
    setupPlayer().catch((error) => console.warn('[SynauraPlayer] setup failed', error));
  }, []);

  useEffect(() => {
    const id = activeTrack?.id ? String(activeTrack.id) : '';
    if (!id) return;
    const track = byIdRef.current.get(id);
    if (!track) return;
    currentRef.current = track;
    setCurrent(track);
    library.addRecent(track);
    const nextIndex = queue.findIndex((item) => item._id === track._id);
    if (nextIndex >= 0) setCurrentIndex(nextIndex);
  }, [activeTrack?.id, library, queue]);

  const setQueueAndPlay = useCallback(async (tracks: Track[], startIndex: number) => {
    const playable = tracks.filter((track) => !!track.audioUrl);
    if (!playable.length) return;
    const index = Math.max(0, Math.min(playable.length - 1, startIndex || 0));
    await setupPlayer();

    byIdRef.current.clear();
    playable.forEach((track) => byIdRef.current.set(track._id, track));
    setQueue(playable);
    setCurrentIndex(index);
    setCurrent(playable[index]);
    currentRef.current = playable[index];
    library.addRecent(playable[index]);

    await TrackPlayer.reset();
    await TrackPlayer.add(playable.map(toNativeTrack));
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  }, [library]);

  const playTrack = useCallback(async (track: Track) => {
    if (!track.audioUrl) return;
    const existingIndex = queue.findIndex((item) => item._id === track._id);
    if (existingIndex >= 0) {
      await setQueueAndPlay(queue, existingIndex);
      return;
    }
    await setQueueAndPlay([track], 0);
  }, [queue, setQueueAndPlay]);

  const togglePlayPause = useCallback(async () => {
    if (!currentRef.current) return;
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [playbackState.state]);

  const next = useCallback(async () => {
    await TrackPlayer.skipToNext().catch(() => {});
  }, []);

  const previous = useCallback(async () => {
    await TrackPlayer.skipToPrevious().catch(() => {});
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await TrackPlayer.seekTo(Math.max(0, seconds));
  }, []);

  const value = useMemo<PlayerContextValue>(() => ({
    current,
    queue,
    currentIndex,
    isPlaying: !!current && playbackState.state === State.Playing,
    isLoading: !!current && (playbackState.state === State.Loading || playbackState.state === State.Buffering),
    positionSec: Math.max(0, progress.position || 0),
    durationSec: Math.max(0, progress.duration || current?.duration || 0),
    playTrack,
    setQueueAndPlay,
    togglePlayPause,
    seekTo,
    next,
    previous,
  }), [current, currentIndex, next, playTrack, playbackState.state, previous, progress.duration, progress.position, queue, seekTo, setQueueAndPlay, togglePlayPause]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
