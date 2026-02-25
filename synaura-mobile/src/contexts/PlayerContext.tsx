// synaura-mobile/src/contexts/PlayerContext.tsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
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
  stop: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ApiTrack | null>(null);
  const currentRef = useRef<ApiTrack | null>(null);
  const [queue, setQueue] = useState<ApiTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Un seul player global (Expo SDK 54+)
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  // Config audio (iOS silent mode, etc.)
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    }).catch(() => {});
  }, []);

  const playTrack = useCallback(async (track: ApiTrack) => {
    if (!track?.audioUrl) return;
    currentRef.current = track;
    setQueue([track]);
    setCurrentIndex(0);

    // même track → toggle play
    if (current?._id === track._id) {
      if (status.playing) player.pause();
      else player.play();
      return;
    }
    setCurrent(track);

    // Remplacer la source puis jouer
    try {
      player.replace({ uri: track.audioUrl });
      player.play();
    } catch {
      // ignore
    }
  }, [current?._id, player, status.playing]);

  const setQueueAndPlay = useCallback(async (tracks: ApiTrack[], startIndex: number) => {
    const list = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
    if (!list.length) return;
    const idx = Math.max(0, Math.min(list.length - 1, Math.floor(startIndex || 0)));
    setQueue(list);
    setCurrentIndex(idx);
    const t = list[idx];
    if (!t?.audioUrl) return;
    currentRef.current = t;
    // même track → jouer si pause
    if (current?._id === t._id) {
      if (!status.playing) player.play();
      return;
    }
    setCurrent(t);
    try {
      player.replace({ uri: t.audioUrl });
      player.play();
    } catch {}
  }, [current?._id, player, status.playing]);

  const togglePlayPause = useCallback(async () => {
    if (!currentRef.current) return;
    if (status.playing) player.pause();
    else player.play();
  }, [player, status.playing]);

  const seekTo = useCallback(async (sec: number) => {
    const s = Number.isFinite(sec) ? Math.max(0, sec) : 0;
    try {
      await player.seekTo(s);
    } catch {}
  }, [player]);

  const stop = useCallback(async () => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch {}
    currentRef.current = null;
    setCurrent(null);
    setQueue([]);
    setCurrentIndex(0);
  }, [player]);

  const isPlaying = !!current && status.playing;
  const isLoading = !!current && (!status.isLoaded || status.isBuffering);

  // expo-audio status est typé différemment selon versions → lecture défensive
  const positionSec = Math.max(0, Number((status as any)?.currentTime ?? (status as any)?.position ?? 0) || 0);
  const durationSec = Math.max(
    0,
    Number((status as any)?.duration ?? ((status as any)?.durationMillis ? (status as any).durationMillis / 1000 : 0)) || 0
  );

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
    stop,
  }), [current, queue, currentIndex, isPlaying, isLoading, positionSec, durationSec, playTrack, setQueueAndPlay, togglePlayPause, seekTo, stop]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans <PlayerProvider>');
  return ctx;
}

