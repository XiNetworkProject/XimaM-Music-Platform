'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useCapacitorMediaSession, type MediaTrack as MSMediaTrack } from '@/hooks/useCapacitorMediaSession';
import { toArtworkList } from '@/lib/mediaArtwork';
import { useSession } from 'next-auth/react';
import { useAudioService } from '@/hooks/useAudioService';
import { LikeProvider, useLikeContext } from '@/contexts/LikeContext';
import { PlaysProvider } from '@/contexts/PlaysContext';
import { usePlaysSync } from '@/hooks/usePlaysSync';
import { PreloadProvider } from '@/contexts/PreloadContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
  album?: string | null;
}

interface AudioPlayerState {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  showPlayer: boolean;
  isMinimized: boolean;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  playbackRate: number;
}

interface AlbumContext {
  id: string;
  name: string;
  coverUrl: string | null;
  totalTracks: number;
}

interface AudioPlayerContextType {
  audioState: AudioPlayerState;
  albumContext: AlbumContext | null;
  setAlbumContext: (ctx: AlbumContext | null) => void;
  // Up Next ("À suivre") – independent list, optionally injected into queue
  upNextEnabled: boolean;
  upNextTracks: Track[];
  setUpNextEnabled: (enabled: boolean) => void;
  toggleUpNextEnabled: () => void;
  addToUpNext: (track: Track, mode?: 'next' | 'end') => void;
  removeFromUpNext: (trackId: string) => void;
  clearUpNext: () => void;
  reorderUpNext: (tracks: Track[]) => void;
  moveUpNext: (trackId: string, direction: 'up' | 'down') => void;
  setTracks: (tracks: Track[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setShowPlayer: (show: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'none' | 'one' | 'all') => void;
  playTrack: (trackIdOrTrack: string | Track) => Promise<void>;
  handleLike: (trackId: string) => void;
  updatePlayCount: (trackId: string) => Promise<void>;
  closePlayer: () => void;
  // Nouvelles méthodes du service audio
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setQueueAndPlay: (tracks: Track[], startIndex?: number) => void;
  setQueueOnly: (tracks: Track[], startIndex?: number) => void;
  requestNotificationPermission: () => Promise<boolean>;
  forceUpdateNotification: () => void;
  getAudioElement: () => HTMLAudioElement | null;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

type AudioTimeState = { currentTime: number; duration: number };
const AudioTimeContext = createContext<AudioTimeState | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const audioService = useAudioService();
  const { syncLikeState: syncLikeCtx } = useLikeContext();
  
  const [audioState, setAudioState] = useState<AudioPlayerState>({
    tracks: [],
    currentTrackIndex: 0,
    isPlaying: false,
    showPlayer: false,
    isMinimized: false,
    shuffle: false,
    repeat: 'none',
    volume: 1,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
    isMuted: false,
    playbackRate: 1,
  });

  // Time state séparé pour éviter de rerender toute l'app à chaque tick
  const [audioTime, setAudioTime] = useState<AudioTimeState>({ currentTime: 0, duration: 0 });

  // Album context: set when playing from an album page
  const [albumContext, setAlbumContext] = useState<AlbumContext | null>(null);

  // Listen for albumContext events from album page
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setAlbumContext({ id: detail.id, name: detail.name, coverUrl: detail.coverUrl, totalTracks: detail.totalTracks });
      }
    };
    window.addEventListener('albumContext', handler);
    return () => window.removeEventListener('albumContext', handler);
  }, []);

  // Auto-clear albumContext when the current track leaves the album
  useEffect(() => {
    if (!albumContext) return;
    const currentTrack = audioState.tracks[audioState.currentTrackIndex];
    if (!currentTrack) return;
    const trackAlbum = (currentTrack as any).album;
    if (trackAlbum && trackAlbum === albumContext.name) return;
    // Current track is not part of the album anymore — clear context
    setAlbumContext(null);
  }, [audioState.currentTrackIndex, audioState.tracks, albumContext]);

  // Up Next ("À suivre") – persisted, independent from the active queue
  const [upNextEnabled, setUpNextEnabled] = useState<boolean>(false);
  const [upNextTracks, setUpNextTracks] = useState<Track[]>([]);
  const baseQueueRef = useRef<{ tracks: Track[]; currentTrackIndex: number } | null>(null);
  const applyingUpNextRef = useRef(false);

  const readUpNextStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem('queue.upnext');
      const enabledRaw = localStorage.getItem('queue.upnext.enabled');
      const list = raw ? JSON.parse(raw) : [];
      const enabled = enabledRaw === '1';
      return { list: Array.isArray(list) ? (list as Track[]) : [], enabled };
    } catch {
      return { list: [], enabled: false };
    }
  }, []);

  // Load persisted upNext on mount
  useEffect(() => {
    try {
      const { list, enabled } = readUpNextStorage();
      setUpNextTracks(list);
      setUpNextEnabled(enabled);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist upNext
  useEffect(() => {
    try {
      localStorage.setItem('queue.upnext', JSON.stringify(upNextTracks || []));
      localStorage.setItem('queue.upnext.enabled', upNextEnabled ? '1' : '0');
    } catch {}
  }, [upNextEnabled, upNextTracks]);

  // Sync Up Next state into the audio service so auto-next always plays the correct list tracks (in order).
  useEffect(() => {
    try {
      (audioService.actions as any).setUpNextEnabled?.(!!upNextEnabled);
      (audioService.actions as any).setUpNextQueue?.(Array.isArray(upNextTracks) ? upNextTracks : []);
    } catch {}
  }, [audioService.actions, upNextEnabled, upNextTracks]);

  // Synchronisation optimisée avec le service audio
  useEffect(() => {
    setAudioState(prev => ({
      ...prev,
      isPlaying: audioService.state.isPlaying,
      volume: audioService.state.volume,
      isLoading: audioService.state.isLoading,
      error: audioService.state.error,
      isMuted: audioService.state.isMuted,
      playbackRate: audioService.state.playbackRate,
      shuffle: audioService.shuffle,
      repeat: audioService.repeat,
    }));
  }, [audioService.state, audioService.shuffle, audioService.repeat]);

  // Temps (currentTime/duration): préférer les events natifs de l'élément audio
  // Objectif: éviter des rerenders ultra fréquents dans toute l'app.
  useEffect(() => {
    const audioEl = ((audioService as any).audioElement ?? null) as HTMLAudioElement | null;
    if (!audioEl) return;

    let lastCommit = 0;
    const THROTTLE_MS = 120; // suffisant pour une UI fluide sans spammer React

    const commit = () => {
      const now = performance.now();
      if (now - lastCommit < THROTTLE_MS) return;
      lastCommit = now;
      const ct = Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
      const dur = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
      setAudioTime(prev => {
        if (Math.abs((prev.currentTime || 0) - ct) < 0.05 && Math.abs((prev.duration || 0) - dur) < 0.05) {
          return prev;
        }
        return { currentTime: ct, duration: dur };
      });
    };

    const onTime = () => commit();
    const onMeta = () => commit();
    const onSeeked = () => commit();

    // Premier commit immédiat
    commit();

    audioEl.addEventListener('timeupdate', onTime);
    audioEl.addEventListener('loadedmetadata', onMeta);
    audioEl.addEventListener('durationchange', onMeta);
    audioEl.addEventListener('seeking', onTime);
    audioEl.addEventListener('seeked', onSeeked);

    return () => {
      audioEl.removeEventListener('timeupdate', onTime);
      audioEl.removeEventListener('loadedmetadata', onMeta);
      audioEl.removeEventListener('durationchange', onMeta);
      audioEl.removeEventListener('seeking', onTime);
      audioEl.removeEventListener('seeked', onSeeked);
    };
  }, [audioService]);

  // Garder audioState.currentTime/duration en sync avec l’élément audio (pour IDE, player UI, etc.)
  useEffect(() => {
    const check = () => {
      const audioEl = ((audioService as any).audioElement ?? null) as HTMLAudioElement | null;
      if (audioEl) {
        const ct = Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
        const dur = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
        setAudioState(prev => {
          if (Math.abs((prev.currentTime ?? 0) - ct) < 0.05 && Math.abs((prev.duration ?? 0) - dur) < 0.05) return prev;
          return { ...prev, currentTime: ct, duration: dur };
        });
      }
    };
    check();
    const interval = setInterval(check, 250);
    return () => clearInterval(interval);
  }, [audioService]);

  const getAudioElement = useCallback(() => {
    return (((audioService as any).audioElement ?? null) as HTMLAudioElement | null);
  }, [audioService]);

  const mergeQueueWithUpNext = useCallback(
    (baseTracks: Track[], baseCurrentId: string | null) => {
      const base = Array.isArray(baseTracks) ? baseTracks : [];
      const up = Array.isArray(upNextTracks) ? upNextTracks : [];
      if (!upNextEnabled || up.length === 0) {
        const idx = baseCurrentId ? base.findIndex((t) => t?._id === baseCurrentId) : -1;
        return { tracks: base, currentIndex: idx >= 0 ? idx : 0 };
      }

      const upIds = new Set(up.map((t) => t?._id).filter(Boolean));
      const cleaned = base.filter((t) => !upIds.has(t?._id));

      const insertAt = baseCurrentId ? Math.max(0, cleaned.findIndex((t) => t?._id === baseCurrentId) + 1) : 0;
      const merged = [...cleaned.slice(0, insertAt), ...up, ...cleaned.slice(insertAt)];
      const currentIndex = baseCurrentId ? merged.findIndex((t) => t?._id === baseCurrentId) : 0;
      return { tracks: merged, currentIndex: currentIndex >= 0 ? currentIndex : 0 };
    },
    [upNextEnabled, upNextTracks],
  );

  // IMPORTANT: keep AudioPlayerContext state (audioState.tracks/currentTrackIndex) in sync with audioService queue actions.
  // Otherwise UI features (Library queue, "À suivre" bubble, etc.) won't reflect changes.
  const rawSetQueueOnly = useCallback(
    (tracks: Track[], startIndex: number = 0) => {
      const safeTracks = Array.isArray(tracks) ? tracks : [];
      const nextIndex = Math.max(0, Math.min(startIndex, Math.max(0, safeTracks.length - 1)));
      // Update UI state first (atomic), then update service
      setAudioState((prev) => ({
        ...prev,
        tracks: safeTracks,
        currentTrackIndex: safeTracks.length ? nextIndex : 0,
      }));
      try {
        (audioService.actions as any).setQueueOnly?.(safeTracks, nextIndex);
      } catch {}
    },
    [audioService.actions],
  );

  const rawSetQueueAndPlay = useCallback(
    (tracks: Track[], startIndex: number = 0) => {
      const safeTracks = Array.isArray(tracks) ? tracks : [];
      const nextIndex = Math.max(0, Math.min(startIndex, Math.max(0, safeTracks.length - 1)));
      setAudioState((prev) => ({
        ...prev,
        tracks: safeTracks,
        currentTrackIndex: safeTracks.length ? nextIndex : 0,
        showPlayer: true,
        isMinimized: false,
      }));
      audioService.actions.setQueueAndPlay(safeTracks, nextIndex);
    },
    [audioService.actions],
  );

  // Public queue setters: inject upNext (if enabled) without being overwritten by feed changes
  const setQueueOnly = useCallback(
    (tracks: Track[], startIndex: number = 0) => {
      if (applyingUpNextRef.current) {
        rawSetQueueOnly(tracks, startIndex);
        return;
      }
      const safeTracks = Array.isArray(tracks) ? tracks : [];
      const baseIndex = Math.max(0, Math.min(startIndex, Math.max(0, safeTracks.length - 1)));
      const baseCurrentId = safeTracks[baseIndex]?._id || null;
      const merged = mergeQueueWithUpNext(safeTracks, baseCurrentId);
      rawSetQueueOnly(merged.tracks, merged.currentIndex);
    },
    [mergeQueueWithUpNext, rawSetQueueOnly],
  );

  const setQueueAndPlay = useCallback(
    (tracks: Track[], startIndex: number = 0) => {
      if (applyingUpNextRef.current) {
        rawSetQueueAndPlay(tracks, startIndex);
        return;
      }
      const safeTracks = Array.isArray(tracks) ? tracks : [];
      const baseIndex = Math.max(0, Math.min(startIndex, Math.max(0, safeTracks.length - 1)));
      const baseCurrentId = safeTracks[baseIndex]?._id || null;
      const merged = mergeQueueWithUpNext(safeTracks, baseCurrentId);
      rawSetQueueAndPlay(merged.tracks, merged.currentIndex);
    },
    [mergeQueueWithUpNext, rawSetQueueAndPlay],
  );

  // Keep audioService internal queue aligned with the UI queue at all times.
  // This is critical for "ended" auto-next to advance through the intended list (incl. À suivre injection),
  // even when playback was started via playTrack() (which does not set the service queue).
  useEffect(() => {
    if (applyingUpNextRef.current) return;
    const tracks = Array.isArray(audioState.tracks) ? audioState.tracks : [];
    if (!tracks.length) return;
    const idx = Math.max(0, Math.min(audioState.currentTrackIndex || 0, tracks.length - 1));
    try {
      (audioService.actions as any).setQueueOnly?.(tracks, idx);
    } catch {}
  }, [audioState.tracks, audioState.currentTrackIndex, audioService.actions]);

  const addToUpNext = useCallback(
    (track: Track, mode: 'next' | 'end' = 'end') => {
      if (!track?._id) return;
      setUpNextTracks((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const without = list.filter((t) => t?._id !== track._id);
        return mode === 'next' ? [track, ...without] : [...without, track];
      });

      // Auto-enable when adding a track
      if (!upNextEnabled) {
        setUpNextEnabled(true);
      }

      // Re-apply merge so the queue updates immediately
      applyingUpNextRef.current = true;
      try {
        const currentId =
          ((audioService.state.currentTrack as any)?._id as string | undefined) ||
          audioState.tracks[audioState.currentTrackIndex]?._id ||
          null;
        const merged = mergeQueueWithUpNext(audioState.tracks, currentId);
        rawSetQueueOnly(merged.tracks, merged.currentIndex);
      } finally {
        applyingUpNextRef.current = false;
      }
    },
    [audioService.state.currentTrack, audioState.currentTrackIndex, audioState.tracks, mergeQueueWithUpNext, rawSetQueueOnly, upNextEnabled],
  );

  const reorderUpNext = useCallback((tracks: Track[]) => {
    setUpNextTracks(Array.isArray(tracks) ? tracks : []);
  }, []);

  const moveUpNext = useCallback((trackId: string, direction: 'up' | 'down') => {
    if (!trackId) return;
    setUpNextTracks((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const i = list.findIndex((t) => t?._id === trackId);
      if (i === -1) return list;
      const j = direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= list.length) return list;
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
      return list;
    });
  }, []);

  const removeFromUpNext = useCallback(
    (trackId: string) => {
      if (!trackId) return;
      setUpNextTracks((prev) => (Array.isArray(prev) ? prev.filter((t) => t?._id !== trackId) : []));
      if (upNextEnabled) {
        applyingUpNextRef.current = true;
        try {
          const currentId =
            ((audioService.state.currentTrack as any)?._id as string | undefined) ||
            audioState.tracks[audioState.currentTrackIndex]?._id ||
            null;
          const merged = mergeQueueWithUpNext(audioState.tracks, currentId);
          rawSetQueueOnly(merged.tracks, merged.currentIndex);
        } finally {
          applyingUpNextRef.current = false;
        }
      }
    },
    [audioService.state.currentTrack, audioState.currentTrackIndex, audioState.tracks, mergeQueueWithUpNext, rawSetQueueOnly, upNextEnabled],
  );

  const clearUpNext = useCallback(() => {
    setUpNextTracks([]);
    if (upNextEnabled) {
      applyingUpNextRef.current = true;
      try {
        const currentId =
          ((audioService.state.currentTrack as any)?._id as string | undefined) ||
          audioState.tracks[audioState.currentTrackIndex]?._id ||
          null;
        const merged = mergeQueueWithUpNext(audioState.tracks, currentId);
        rawSetQueueOnly(merged.tracks, merged.currentIndex);
      } finally {
        applyingUpNextRef.current = false;
      }
    }
  }, [audioService.state.currentTrack, audioState.currentTrackIndex, audioState.tracks, mergeQueueWithUpNext, rawSetQueueOnly, upNextEnabled]);

  const toggleUpNextEnabled = useCallback(() => {
    setUpNextEnabled((prev) => {
      const next = !prev;
      // Save/restore the base queue so you can pause À suivre and continue your feed normally
      if (next) {
        if (!baseQueueRef.current) {
          baseQueueRef.current = { tracks: audioState.tracks, currentTrackIndex: audioState.currentTrackIndex };
        }
        applyingUpNextRef.current = true;
        try {
          const currentId =
            ((audioService.state.currentTrack as any)?._id as string | undefined) ||
            audioState.tracks[audioState.currentTrackIndex]?._id ||
            null;
          const merged = mergeQueueWithUpNext(audioState.tracks, currentId);
          rawSetQueueOnly(merged.tracks, merged.currentIndex);
        } finally {
          applyingUpNextRef.current = false;
        }
      } else {
        const base = baseQueueRef.current;
        baseQueueRef.current = null;
        if (base?.tracks?.length) {
          applyingUpNextRef.current = true;
          try {
            // Restore queue without forcing restart if current track exists in base
            const currentId =
              ((audioService.state.currentTrack as any)?._id as string | undefined) ||
              audioState.tracks[audioState.currentTrackIndex]?._id ||
              null;
            const idx = currentId ? base.tracks.findIndex((t) => t?._id === currentId) : -1;
            rawSetQueueOnly(base.tracks, idx >= 0 ? idx : base.currentTrackIndex || 0);
          } finally {
            applyingUpNextRef.current = false;
          }
        }
      }
      return next;
    });
  }, [audioService.state.currentTrack, audioState.currentTrackIndex, audioState.tracks, mergeQueueWithUpNext, rawSetQueueOnly]);

  // When an UpNext track starts playing, consider it "consumed" from the list (but keep it in queue).
  useEffect(() => {
    if (!upNextEnabled) return;
    const currentId =
      ((audioService.state.currentTrack as any)?._id as string | undefined) ||
      audioState.tracks[audioState.currentTrackIndex]?._id;
    if (!currentId) return;
    if (upNextTracks.some((t) => t?._id === currentId)) {
      setUpNextTracks((prev) => prev.filter((t) => t?._id !== currentId));
    }
  }, [audioService.state.currentTrack, audioState.currentTrackIndex, audioState.tracks, upNextEnabled, upNextTracks]);
  // Media Session: mapping piste courante -> métadonnées Media Session
  const mediaSessionTrack: MSMediaTrack | null = useMemo(() => {
    const t = audioService.state.currentTrack as any;
    if (!t) return null;
    return {
      id: String(t._id),
      title: t.title,
      artist: t.artist?.name || t.artist?.username || 'Unknown',
      album: (t as any).album || 'Synaura',
      artwork: toArtworkList(t.coverUrl),
      duration: typeof audioService.state.duration === 'number' ? audioService.state.duration : undefined,
      url: t.audioUrl,
    };
  }, [audioService.state.currentTrack, audioService.state.duration]);

  // Media Session unifiée : Web (navigator.mediaSession) + Android/iOS natif via @jofr/capacitor-media-session
  useCapacitorMediaSession(
    (audioService as any).audioElement ?? null,
    mediaSessionTrack,
    {
      play: () => audioService.actions.play(),
      pause: () => audioService.actions.pause(),
      next: () => audioService.actions.nextTrack(),
      prev: () => audioService.actions.previousTrack(),
      seekTo: (s: number) => audioService.actions.seek(s),
      seekBy: (offset: number) => {
        const a = (audioService as any).audioElement as HTMLAudioElement | null;
        if (!a) return;
        const duration = Number.isFinite(a.duration) ? a.duration : a.currentTime + offset;
        const target = Math.max(0, Math.min(duration, a.currentTime + offset));
        audioService.actions.seek(target);
      },
      stop: () => audioService.actions.stop(),
    },
    !!audioService.state.isPlaying
  );

  // Synchronisation de la piste courante (ne jamais pousser currentTrackIndex à -1)
  // NOTE: on garde la version plus sûre plus bas (avec guard trackIndex !== -1).
  // Cet ancien effet pouvait provoquer un clignotement (currentTrack undefined) lors de mises à jour fréquentes (ex: radios).

  // Synchronisation des pistes avec le service audio
  useEffect(() => {
    if (audioState.tracks.length > 0) {
      audioService.actions.setAllTracks(audioState.tracks);
    }
  }, [audioState.tracks, audioService.actions]);

  // Synchronisation automatique des pistes avec le player
  useEffect(() => {
    if (audioService.allTracks.length > 0 && audioState.tracks.length === 0) {
      // Synchronisation automatique des pistes avec le player
      setAudioState(prev => ({ ...prev, tracks: audioService.allTracks }));
    }
  }, [audioService.allTracks, audioState.tracks.length]);

  const setTracks = useCallback((tracks: Track[]) => {
    const tracksWithLikes = tracks.map(track => ({
      ...track,
      isLiked: track.isLiked ?? false,
    }));
    setAudioState(prev => ({ ...prev, tracks: tracksWithLikes }));
  }, [session?.user?.id]);

  const setCurrentTrackIndex = useCallback((index: number) => {
    setAudioState(prev => {
      const max = Math.max(0, (prev.tracks?.length || 0) - 1);
      const next = Math.max(0, Math.min(Number.isFinite(index) ? index : 0, max));
      return { ...prev, currentTrackIndex: next };
    });
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setAudioState(prev => ({ ...prev, isPlaying: playing }));
  }, []);

  const setShowPlayer = useCallback((show: boolean) => {
    setAudioState(prev => ({ ...prev, showPlayer: show }));
  }, []);

  const setIsMinimized = useCallback((minimized: boolean) => {
    setAudioState(prev => ({ ...prev, isMinimized: minimized }));
  }, []);

  const setShuffle = useCallback((shuffle: boolean) => {
    setAudioState(prev => ({ ...prev, shuffle }));
    try {
      (audioService.actions as any).setShuffleMode?.(shuffle);
    } catch {}
  }, [audioService.actions]);

  const setRepeat = useCallback((repeat: 'none' | 'one' | 'all') => {
    setAudioState(prev => ({ ...prev, repeat }));
    try {
      (audioService.actions as any).setRepeatMode?.(repeat);
    } catch {}
  }, [audioService.actions]);

  // Synchronisation de l'état du service audio avec le provider
  useEffect(() => {
    const raw = audioService.state.currentTrack;
    if (!raw || !(raw as any)?._id) return;
    const svcTrack = raw as Track;

    const trackIndex = audioState.tracks.findIndex(t => t._id === svcTrack._id);

    if (trackIndex !== -1) {
      if (trackIndex !== audioState.currentTrackIndex) {
        setCurrentTrackIndex(trackIndex);
      }
    } else if (audioState.tracks.length > 0) {
      setAudioState(prev => {
        const already = prev.tracks.findIndex(t => t._id === svcTrack._id);
        if (already !== -1) return { ...prev, currentTrackIndex: already };
        const newTracks: Track[] = [...prev.tracks, svcTrack];
        return { ...prev, tracks: newTracks, currentTrackIndex: newTracks.length - 1, showPlayer: true };
      });
    }
  }, [audioService.state.currentTrack, audioState.tracks, audioState.currentTrackIndex, setCurrentTrackIndex]);

  // Réinitialiser isLiked uniquement quand l'utilisateur se déconnecte
  const prevUserId = useRef(session?.user?.id);
  useEffect(() => {
    if (prevUserId.current && !session?.user?.id && audioState.tracks.length > 0) {
      setAudioState(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => ({ ...track, isLiked: false }))
      }));
    }
    prevUserId.current = session?.user?.id;
  }, [session?.user?.id]);

  const updatePlayCount = useCallback(async (trackId: string) => {
    
    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) return; // silencieux, on ne bloque pas les replays successifs
      
      const data = await response.json();
      
      // Mettre à jour l'état local si fourni
      if (data?.plays !== undefined) {
      setAudioState(prev => {
        const newTracks = prev.tracks.map((track) => {
          if (track._id !== trackId) return track;
          return { 
            ...track, 
            plays: data.plays || track.plays
          };
        });
        return { ...prev, tracks: newTracks };
      });
        // Broadcast global pour synchroniser les listes et compteurs
        try {
          window.dispatchEvent(new CustomEvent('playsUpdated', { detail: { trackId, plays: data.plays } }));
        } catch {}
      }
      
    } catch (error) {
      console.error('Erreur mise à jour plays:', error);
    }
  }, []);

  // Ecoute globale: si playsUpdated vient d'ailleurs, synchroniser l'état du player
  useEffect(() => {
    const handler = (e: any) => {
      const { trackId, plays } = e.detail || {};
      if (!trackId || typeof plays !== 'number') return;
      setAudioState(prev => {
        const newTracks = prev.tracks.map((t) => t._id === trackId ? { ...t, plays } : t);
        return { ...prev, tracks: newTracks };
      });
    };
    window.addEventListener('playsUpdated', handler as EventListener);
    return () => window.removeEventListener('playsUpdated', handler as EventListener);
  }, []);

  const playTrack = useCallback(async (trackIdOrTrack: string | Track) => {
    let trackId: string;
    let trackData: Track | undefined;
    
    if (typeof trackIdOrTrack === 'string') {
      trackId = trackIdOrTrack;
      trackData = undefined;
    } else {
      trackId = trackIdOrTrack._id;
      trackData = trackIdOrTrack;
    }
    
    const trackIndex = audioState.tracks.findIndex(track => track._id === trackId);
    
    // Si la piste n'est pas dans la liste et qu'on a les données, l'ajouter
    if (trackIndex === -1 && trackData) {
      const addedTrack = trackData;
      setAudioState(prev => {
        const newTracks: Track[] = [...prev.tracks, addedTrack];
        return {
          ...prev,
          tracks: newTracks,
          currentTrackIndex: newTracks.length - 1,
          showPlayer: true,
          isMinimized: false,
        };
      });

      try {
        // Sync the audio service queue so auto-next works correctly
        const mergedQueue = [...audioState.tracks, trackData];
        audioService.actions.setQueueOnly(mergedQueue, mergedQueue.length - 1);

        await audioService.actions.loadTrack(trackData);
        await audioService.actions.play();
        await updatePlayCount(trackData._id);
        setTimeout(() => { audioService.actions.forceUpdateNotification(); }, 100);
      } catch {}
      return;
    }
    
    // Si la piste n'est pas dans la liste et qu'on n'a pas les données
    if (trackIndex === -1) {
      // Piste non trouvée dans la liste et données non fournies
      return;
    }
    
    // Si c'est la piste actuelle, toggle play/pause
    if (trackIndex === audioState.currentTrackIndex) {
      if (audioState.isPlaying) {
        audioService.actions.pause();
      } else {
        await audioService.actions.play();
      }
      setShowPlayer(true);
      setIsMinimized(false);
      return;
    }
    
    // Sinon, changer de piste et jouer
    const trackToPlay = trackData || audioState.tracks[trackIndex];

    setAudioState(prev => ({
      ...prev,
      currentTrackIndex: trackIndex,
      showPlayer: true,
      isMinimized: false,
    }));

    // Keep audio service queue in sync so auto-next works
    audioService.actions.setQueueOnly(audioState.tracks, trackIndex);

    try {
      await audioService.actions.loadTrack(trackToPlay);
      await audioService.actions.play();
      await updatePlayCount(trackToPlay._id);
      setTimeout(() => { audioService.actions.forceUpdateNotification(); }, 100);
    } catch {}
  }, [audioState.tracks, audioState.currentTrackIndex, audioState.isPlaying, audioService.actions, setShowPlayer, setIsMinimized, updatePlayCount]);

  const handleLike = useCallback(async (trackId: string) => {
    const isAI = trackId.startsWith('ai-');
    const realAIId = isAI ? trackId.slice(3) : '';

    setAudioState(prev => {
      const newTracks = prev.tracks.map((track) => {
        if (track._id !== trackId) return track;
        const liked = !track.isLiked;
        const likes = liked
          ? [...track.likes, session?.user?.id || '']
          : track.likes.filter(id => id !== session?.user?.id);
        return { ...track, isLiked: liked, likes };
      });
      return { ...prev, tracks: newTracks };
    });

    try {
      if (isAI) {
        const currentTrack = audioState.tracks.find(t => t._id === trackId);
        const wantFav = !(currentTrack?.isLiked);
        const response = await fetch(`/api/ai/tracks/${realAIId}/favorite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_favorite: wantFav }),
        });
        if (!response.ok) throw new Error('Erreur favori IA');
        const data = await response.json();
        setAudioState(prev => ({
          ...prev,
          tracks: prev.tracks.map(t =>
            t._id !== trackId ? t : { ...t, isLiked: data.is_favorite }
          ),
        }));
        syncLikeCtx(trackId, data.is_favorite, data.is_favorite ? 1 : 0);
      } else {
        const currentTrack = audioState.tracks.find(t => t._id === trackId);
        const response = await fetch(`/api/tracks/${trackId}/like`, {
          method: currentTrack?.isLiked ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Erreur lors du like');
        const data = await response.json();
        setAudioState(prev => ({
          ...prev,
          tracks: prev.tracks.map(t =>
            t._id !== trackId ? t : { ...t, isLiked: data.isLiked, likes: data.likes || t.likes }
          ),
        }));
        syncLikeCtx(trackId, data.isLiked, data.likesCount ?? 0);
      }
    } catch (error) {
      console.error('Erreur like:', error);
      setAudioState(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => {
          if (t._id !== trackId) return t;
          return {
            ...t,
            isLiked: !t.isLiked,
            likes: t.isLiked
              ? t.likes.filter(id => id !== session?.user?.id)
              : [...t.likes, session?.user?.id || '']
          };
        }),
      }));
    }
  }, [session?.user?.id, audioState.tracks, syncLikeCtx]);

  const closePlayer = useCallback(() => {
    setShowPlayer(false);
    setIsPlaying(false);
    setIsMinimized(false);
    audioService.actions.stop();
  }, [setShowPlayer, setIsPlaying, setIsMinimized, audioService.actions]);

  // Persister l'état dans localStorage
  const savedTrackIdRef = useRef<string | null>(null);
  useEffect(() => {
    const savedState = localStorage.getItem('audioPlayerState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        savedTrackIdRef.current = typeof parsed?.currentTrackId === 'string' ? parsed.currentTrackId : null;
        setAudioState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erreur parsing audio state:', error);
      }
    }
  }, []);

  useEffect(() => {
    const currentTrack = audioState.tracks[audioState.currentTrackIndex] || null;
    const currentTrackId = currentTrack?._id || null;
    localStorage.setItem('audioPlayerState', JSON.stringify({
      currentTrackIndex: audioState.currentTrackIndex,
      currentTrackId,
      isPlaying: audioState.isPlaying,
      showPlayer: audioState.showPlayer,
      isMinimized: audioState.isMinimized,
      volume: audioState.volume,
      shuffle: audioState.shuffle,
      repeat: audioState.repeat,
    }));
    if (currentTrack?._id) {
      try {
        localStorage.setItem('synaura.lastTrack', JSON.stringify({
          track: currentTrack,
          position: 0,
          timestamp: Date.now(),
        }));
      } catch {}
    }
  }, [audioState.currentTrackIndex, audioState.isPlaying, audioState.showPlayer, audioState.isMinimized, audioState.volume, audioState.shuffle, audioState.repeat, audioState.tracks]);

  // Persist playback position every 3s so "Écouter" can resume mid-track
  useEffect(() => {
    if (!audioState.isPlaying) return;
    const interval = setInterval(() => {
      const currentTrack = audioState.tracks[audioState.currentTrackIndex];
      if (!currentTrack?._id) return;
      try {
        const audioEl = ((audioService as any).audioElement ?? null) as HTMLAudioElement | null;
        const position = audioEl && Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
        localStorage.setItem('synaura.lastTrack', JSON.stringify({
          track: currentTrack,
          position,
          timestamp: Date.now(),
        }));
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [audioState.isPlaying, audioState.currentTrackIndex, audioState.tracks]);

  // Rehydration: si on a un currentTrackId sauvegardé, retrouver l'index quand les tracks sont dispo
  useEffect(() => {
    if (!savedTrackIdRef.current) return;
    if (!audioState.tracks.length) return;
    const idx = audioState.tracks.findIndex((t) => t._id === savedTrackIdRef.current);
    if (idx !== -1 && idx !== audioState.currentTrackIndex) {
      setCurrentTrackIndex(idx);
    }
    // On ne clear pas tout de suite: on laisse vivre au cas où tracks arrivent par vagues,
    // mais on évite de reboucler.
    savedTrackIdRef.current = null;
  }, [audioState.tracks, audioState.currentTrackIndex, setCurrentTrackIndex]);

  // Rehydration: préparer l'élément audio pour que Play fonctionne après refresh.
  // IMPORTANT: ne doit pas interférer avec next/prev (sinon "flicker" et blocage).
  const hasRehydratedAudioRef = useRef(false);
  useEffect(() => {
    if (hasRehydratedAudioRef.current) return;
    if (!audioState.showPlayer) return;
    if (!audioState.tracks.length) return;
    if (audioService.state.isLoading) return;
    // CRITICAL: if the audio service already has a currentTrack, never force-load a track from UI state.
    // This was interrupting auto-next (ended -> next starts -> provider rehydration loadTrack pauses it).
    if (audioService.state.currentTrack) {
      hasRehydratedAudioRef.current = true;
      return;
    }
    const idx = Math.max(0, Math.min(audioState.currentTrackIndex, audioState.tracks.length - 1));
    const t = audioState.tracks[idx];
    if (!t) return;
    const current = audioService.state.currentTrack as any;
    if (current?._id === t._id) {
      hasRehydratedAudioRef.current = true;
      return;
    }
    hasRehydratedAudioRef.current = true;
    audioService.actions.loadTrack(t).catch(() => {});
  }, [
    audioState.showPlayer,
    audioState.tracks.length,
    audioState.currentTrackIndex,
    audioService.actions,
    audioService.state.currentTrack,
    audioService.state.isLoading,
  ]);

  const value = useMemo(() => ({
    audioState,
    albumContext,
    setAlbumContext,
    upNextEnabled,
    upNextTracks,
    setUpNextEnabled,
    toggleUpNextEnabled,
    addToUpNext,
    removeFromUpNext,
    clearUpNext,
    reorderUpNext,
    moveUpNext,
    setTracks,
    setCurrentTrackIndex,
    setIsPlaying,
    setShowPlayer,
    setIsMinimized,
    setShuffle,
    setRepeat,
    playTrack,
    handleLike,
    updatePlayCount,
    closePlayer,
    // Méthodes du service audio
    play: audioService.actions.play,
    pause: audioService.actions.pause,
    stop: audioService.actions.stop,
    seek: audioService.actions.seek,
    setVolume: audioService.actions.setVolume,
    toggleMute: audioService.actions.toggleMute,
    setPlaybackRate: audioService.actions.setPlaybackRate,
    nextTrack: audioService.actions.nextTrack,
    previousTrack: audioService.actions.previousTrack,
    toggleShuffle: audioService.actions.toggleShuffle,
    cycleRepeat: audioService.actions.cycleRepeat,
    setQueueAndPlay,
    setQueueOnly,
    requestNotificationPermission: audioService.actions.requestNotificationPermission,
    forceUpdateNotification: audioService.actions.forceUpdateNotification,
    getAudioElement,
  }), [
    audioState,
    albumContext,
    upNextEnabled,
    upNextTracks,
    setUpNextEnabled,
    toggleUpNextEnabled,
    addToUpNext,
    removeFromUpNext,
    clearUpNext,
    reorderUpNext,
    moveUpNext,
    setTracks,
    setCurrentTrackIndex,
    setIsPlaying,
    setShowPlayer,
    setIsMinimized,
    setShuffle,
    setRepeat,
    playTrack,
    handleLike,
    updatePlayCount,
    closePlayer,
    audioService.actions,
    setQueueAndPlay,
    setQueueOnly,
    getAudioElement,
  ]);

  // Tentative d'exposition du service audio
  if (typeof window !== 'undefined') {
    // État du service
    const serviceState = {
      currentTrack: audioState.tracks[audioState.currentTrackIndex]?.title || '',
      isPlaying: audioState.isPlaying,
      allTracks: audioService.allTracks?.length || 0,
      playerTracks: audioState.tracks.length
    };
    
    // Service audio exposé globalement pour le debug
    (window as any).audioService = {
      state: serviceState,
      actions: {
        play: () => audioService.actions.play(),
        pause: () => audioService.actions.pause(),
        nextTrack: () => audioService.actions.nextTrack(),
        previousTrack: () => audioService.actions.previousTrack(),
        setTrack: (trackId: string) => {
          const trackIndex = audioState.tracks.findIndex(track => track._id === trackId);
          if (trackIndex !== -1) {
            setCurrentTrackIndex(trackIndex);
          }
        },
        loadAllTracks: () => {
          // Synchronisation automatique des pistes avec le player
          setAudioState(prev => ({ ...prev, tracks: audioService.allTracks || [] }));
        }
      }
    };
    
    // Vérification de l'exposition
    if ((window as any).audioService) {
      // Service audio exposé avec succès
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <AudioPlayerContext.Provider value={value}>
      <AudioTimeContext.Provider value={audioTime}>
      {children}
      </AudioTimeContext.Provider>
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}

export function useAudioTime() {
  const ctx = useContext(AudioTimeContext);
  if (!ctx) throw new Error('useAudioTime must be used within an AudioPlayerProvider');
  return ctx;
}

// Sidebar context
interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Charger l'état depuis le stockage et adapter selon la taille d'écran
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ui.sidebar.open');
      if (stored === '0') {
        setIsSidebarOpen(false);
        return;
      }
      if (stored === '1') {
        setIsSidebarOpen(true);
        return;
      }
    } catch {}
    // Par défaut: ouvert sur grands écrans, fermé sinon
    if (typeof window !== 'undefined') {
      setIsSidebarOpen(window.innerWidth >= 1024);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ui.sidebar.open', isSidebarOpen ? '1' : '0');
    } catch {}
  }, [isSidebarOpen]);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(v => !v), []);
  const setSidebarOpen = useCallback((open: boolean) => setIsSidebarOpen(open), []);

  const value = useMemo(() => ({ isSidebarOpen, toggleSidebar, setSidebarOpen }), [isSidebarOpen, toggleSidebar, setSidebarOpen]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

// Provider d'abonnement global
function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptionData = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/subscriptions/my-subscription?userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
        console.log('🌍 Données d\'abonnement globales récupérées:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement global:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptionData();
    }
  }, [session]);

  // Exposer les données d'abonnement globalement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).globalSubscription = {
        data: subscriptionData,
        loading,
        refresh: fetchSubscriptionData
      };
    }
  }, [subscriptionData, loading]);

  return <>{children}</>;
}

function PlaysSyncWrapper({ children }: { children: React.ReactNode }) {
  usePlaysSync(); // Activer la synchronisation des écoutes
  return <>{children}</>;
}

import { useNativeFeatures } from '@/hooks/useNativeFeatures';

function NativeFeaturesWrapper({ children }: { children: React.ReactNode }) {
  useNativeFeatures();
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const WhatsNewModal = dynamic(() => import('@/components/WhatsNewModal'), { ssr: false });
  const WHATSNEW_VERSION = (process.env.NEXT_PUBLIC_WHATSNEW_VERSION as string) || 'v2-mars2026';
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const storageKey = `whatsnew.${WHATSNEW_VERSION}.dontShowUntilNextUpdate`;

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const flag = params.get('whatsnew');
      if (flag === 'reset') localStorage.removeItem(storageKey);
      if (flag === '1' || flag === 'true') {
        setShowWhatsNew(true);
        return;
      }

      const dismissed = localStorage.getItem(storageKey);
      if (!dismissed) setShowWhatsNew(true);
    } catch {}
  }, [storageKey]);

  const dontShowUntilNextUpdate = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
    setShowWhatsNew(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showWhatsNew = () => setShowWhatsNew(true);
    }
  }, []);
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Refetch toutes les 5 minutes
      refetchOnWindowFocus={true} // Refetch quand la fenêtre reprend le focus
    >
      <PreloadProvider>
      <QueryClientProvider client={queryClient}>
        <LikeProvider>
          <PlaysProvider>
            <PlaysSyncWrapper>
              <AudioPlayerProvider>
                <SidebarProvider>
                <SubscriptionProvider>
                    <NativeFeaturesWrapper>
                  {children}
                    </NativeFeaturesWrapper>
                    <WhatsNewModal
                      isOpen={showWhatsNew}
                      onClose={() => setShowWhatsNew(false)}
                      onDontShowUntilNextUpdate={dontShowUntilNextUpdate}
                    />
                  <Toaster position="top-center" />
                </SubscriptionProvider>
                </SidebarProvider>
              </AudioPlayerProvider>
            </PlaysSyncWrapper>
          </PlaysProvider>
        </LikeProvider>
      </QueryClientProvider>
      </PreloadProvider>
    </SessionProvider>
  );
} 