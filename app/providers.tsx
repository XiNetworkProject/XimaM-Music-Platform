'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useCapacitorMediaSession, type MediaTrack as MSMediaTrack } from '@/hooks/useCapacitorMediaSession';
import { useMediaSession } from '@/hooks/useMediaSession';
import { toArtworkList } from '@/lib/mediaArtwork';
import { useSession } from 'next-auth/react';
import { useAudioCoreTime, useAudioService } from '@/hooks/useAudioService';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';
import { LikeProvider, useLikeContext } from '@/contexts/LikeContext';
import { insertQueueTrack, remainingQueueStart } from '@/lib/trackActions';
import { useFavoriteActions } from '@/lib/organizationClient';
import { notify } from '@/components/NotificationCenter';
import { PlaysProvider } from '@/contexts/PlaysContext';
import { usePlaysSync } from '@/hooks/usePlaysSync';
import { PreloadProvider } from '@/contexts/PreloadContext';
import { isPastShutdownEnd, isShutdownAnnounced } from '@/lib/synauraShutdown';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import { useRouter } from 'next/navigation';

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
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  musicVideoUrl?: string | null;
  musicVideoPosterUrl?: string | null;
  visualUrl?: string | null;
  visualType?: 'image' | 'video' | 'generated' | 'none' | null;
  dominantColors?: string[];
  auraVisualEnabled?: boolean;
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
  upNextTracks: Track[];
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

function getTrackId(track: any): string {
  return String(track?._id || track?.id || '');
}

function getQueueSignature(tracks: any[] | null | undefined, index: number = 0): string {
  const list = Array.isArray(tracks) ? tracks : [];
  return `${Math.max(0, index)}:${list.length}:${list.map(getTrackId).join('|')}`;
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const providerRenderCountRef = useRef(0);
  providerRenderCountRef.current += 1;
  const { data: session } = useSession();
  const audioService = useAudioService({ authority: true });
  const { syncLikeState: syncLikeCtx } = useLikeContext();
  const audioActionsRef = useRef<any>(audioService.actions);
  const audioServiceRef = useRef<any>(audioService);
  const audioStateRef = useRef<AudioPlayerState | null>(null);
  const audioServiceStateRef = useRef<any>(audioService.state);
  audioActionsRef.current = audioService.actions;
  audioServiceRef.current = audioService;
  audioServiceStateRef.current = audioService.state;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    getBrowserAudioCore()?.setProviderRenderCount(providerRenderCountRef.current);
  });

  useEffect(() => {
    const target = window as typeof window & { __synauraAudioNavigate?: (pathname: string) => void };
    if (process.env.NODE_ENV !== 'development') {
      delete target.__synauraAudioNavigate;
      return;
    }
    target.__synauraAudioNavigate = (pathname) => {
      if (/^\/[A-Za-z0-9_~!$&'()*+,;=:@%./?-]*$/.test(pathname)) routerRef.current.push(pathname);
    };
    return () => { delete target.__synauraAudioNavigate; };
  }, []);
  
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
  audioStateRef.current = audioState;

  const servicePlay = useCallback(() => audioActionsRef.current.play(), []);
  const servicePause = useCallback(() => audioActionsRef.current.pause(), []);
  const serviceStop = useCallback(() => audioActionsRef.current.stop(), []);
  const serviceSeek = useCallback((time: number) => audioActionsRef.current.seek(time), []);
  const serviceSetVolume = useCallback((volume: number) => audioActionsRef.current.setVolume(volume), []);
  const serviceToggleMute = useCallback(() => audioActionsRef.current.toggleMute(), []);
  const serviceSetPlaybackRate = useCallback((rate: number) => audioActionsRef.current.setPlaybackRate(rate), []);
  const serviceNextTrack = useCallback(() => audioActionsRef.current.nextTrack(), []);
  const servicePreviousTrack = useCallback(() => audioActionsRef.current.previousTrack(), []);
  const serviceToggleShuffle = useCallback(() => audioActionsRef.current.toggleShuffle(), []);
  const serviceCycleRepeat = useCallback(() => audioActionsRef.current.cycleRepeat(), []);
  const serviceRequestNotificationPermission = useCallback(() => audioActionsRef.current.requestNotificationPermission(), []);
  const serviceForceUpdateNotification = useCallback(() => audioActionsRef.current.forceUpdateNotification(), []);
  const serviceSetQueueOnly = useCallback((tracks: Track[], index: number) => {
    audioActionsRef.current.setQueueOnly?.(tracks, index);
  }, []);
  const serviceSetQueueAndPlay = useCallback((tracks: Track[], index: number) => {
    audioActionsRef.current.setQueueAndPlay(tracks, index);
  }, []);
  const servicePlayImmediate = useCallback((track: Track) => {
    audioActionsRef.current.playImmediate?.(track);
  }, []);
  const serviceLoadTrack = useCallback((track: Track) => audioActionsRef.current.loadTrack(track), []);
  const serviceSetAllTracks = useCallback((tracks: Track[]) => {
    audioActionsRef.current.setAllTracks?.(tracks);
  }, []);
  const serviceSetShuffleMode = useCallback((enabled: boolean) => {
    audioActionsRef.current.setShuffleMode?.(enabled);
  }, []);
  const serviceSetRepeatMode = useCallback((mode: 'none' | 'one' | 'all') => {
    audioActionsRef.current.setRepeatMode?.(mode);
  }, []);
  const serviceSetUpNextEnabled = useCallback((enabled: boolean) => {
    audioActionsRef.current.setUpNextEnabled?.(enabled);
  }, []);
  const serviceSetUpNextQueue = useCallback((tracks: Track[]) => {
    audioActionsRef.current.setUpNextQueue?.(tracks);
  }, []);

  // Album context: set when playing from an album page
  const [albumContext, setAlbumContext] = useState<AlbumContext | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentTrack = audioState.tracks[audioState.currentTrackIndex] as any;
    const detail = {
      id: currentTrack?._id || currentTrack?.id || null,
      isPlaying: Boolean(audioService.state.isPlaying && currentTrack),
      coverUrl: currentTrack?.coverUrl || currentTrack?.cover_url || null,
      coverVideoUrl: currentTrack?.coverVideoUrl || currentTrack?.cover_video_url || null,
      coverVideoPosterUrl: currentTrack?.coverVideoPosterUrl || currentTrack?.cover_video_poster_url || null,
      musicVideoUrl: currentTrack?.musicVideoUrl || currentTrack?.music_video_url || null,
      musicVideoPosterUrl: currentTrack?.musicVideoPosterUrl || currentTrack?.music_video_poster_url || null,
      visualUrl: currentTrack?.visualUrl || currentTrack?.visual_url || null,
      visualType: currentTrack?.visualType || currentTrack?.visual_type || null,
      dominantColors: currentTrack?.dominantColors || currentTrack?.dominant_colors || [],
      auraVisualEnabled: (currentTrack?.auraVisualEnabled ?? currentTrack?.aura_visual_enabled) !== false,
    };
    (window as any).__synauraActiveTrackMedia = detail;
    window.dispatchEvent(new CustomEvent('synaura:active-track-media', { detail }));
  }, [audioService.state.isPlaying, audioState.currentTrackIndex, audioState.tracks]);

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

  // Compatibility name only: the next tracks are a read-only AudioCore projection.
  // Legacy queue.upnext storage is intentionally left untouched, not reactivated.
  const upNextTracks = useMemo(() => (audioService.queue as Track[] || []).slice(remainingQueueStart(audioService.queue, audioService.state.currentTrack?._id || null)), [audioService.queue, audioService.state.currentTrack]);

  const getAudioElement = useCallback(() => {
    return ((audioServiceRef.current?.audioElement ?? null) as HTMLAudioElement | null);
  }, []);

  const mergeQueueWithUpNext = useCallback((baseTracks: Track[], currentId: string | null) => {
    const index = currentId ? baseTracks.findIndex(t => t._id === currentId) : 0;
    return { tracks: baseTracks, currentIndex: Math.max(0, index) };
  }, []);
  const applyingUpNextRef = useRef(false);

  // IMPORTANT: keep AudioPlayerContext state (audioState.tracks/currentTrackIndex) in sync with audioService queue actions.
  // Otherwise UI features (Library queue, "À suivre" bubble, etc.) won't reflect changes.
  const rawSetQueueOnly = useCallback(
    (tracks: Track[], startIndex: number = 0) => {
      const safeTracks = Array.isArray(tracks) ? tracks : [];
      const nextIndex = Math.max(0, Math.min(startIndex, Math.max(0, safeTracks.length - 1)));
      // Update UI state first (atomic), then update service
      setAudioState((prev) => {
        const boundedIndex = safeTracks.length ? nextIndex : 0;
        if (getQueueSignature(prev.tracks, prev.currentTrackIndex) === getQueueSignature(safeTracks, boundedIndex)) {
          return prev;
        }
        return {
          ...prev,
          tracks: safeTracks,
          currentTrackIndex: boundedIndex,
        };
      });
      try {
        serviceSetQueueOnly(safeTracks, nextIndex);
      } catch {}
    },
    [serviceSetQueueOnly],
  );

  const rawSetQueueAndPlay = useCallback(
    (tracks: Track[], startIndex: number = 0) => {
      const safeTracks = Array.isArray(tracks) ? tracks : [];
      const nextIndex = Math.max(0, Math.min(startIndex, Math.max(0, safeTracks.length - 1)));
      const boundedIndex = safeTracks.length ? nextIndex : 0;
      const nextTrackId = getTrackId(safeTracks[boundedIndex]);
      const currentService = audioServiceStateRef.current;
      const currentUi = audioStateRef.current;
      const sameQueue =
        currentUi &&
        getQueueSignature(currentUi.tracks, currentUi.currentTrackIndex) === getQueueSignature(safeTracks, boundedIndex);
      const sameLoadedTrack = nextTrackId && getTrackId(currentService?.currentTrack) === nextTrackId;

      setAudioState((prev) => {
        const queueAlreadySet = getQueueSignature(prev.tracks, prev.currentTrackIndex) === getQueueSignature(safeTracks, boundedIndex);
        if (queueAlreadySet && prev.showPlayer && !prev.isMinimized) {
          return prev;
        }
        return {
          ...prev,
          tracks: safeTracks,
          currentTrackIndex: boundedIndex,
          showPlayer: true,
          isMinimized: false,
        };
      });

      if (sameQueue && sameLoadedTrack) {
        if (!currentService?.isPlaying) {
          servicePlay().catch(() => {});
        }
        return;
      }

      serviceSetQueueAndPlay(safeTracks, nextIndex);
    },
    [servicePlay, serviceSetQueueAndPlay],
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

  const addToUpNext = useCallback((track: Track, mode: 'next' | 'end' = 'end') => {
    const core = getBrowserAudioCore();
    if (!core || !track?._id || !track.audioUrl) return;
    const snapshot = core.getSnapshot();
    if (snapshot.currentTrack?._id === track._id) return;
    core.reorderQueue(insertQueueTrack(snapshot.queue, snapshot.currentTrack?._id || null, track, mode));
  }, []);
  const removeFromUpNext = useCallback((id: string) => {
    const core = getBrowserAudioCore();
    if (core?.getSnapshot().currentTrack?._id !== id) core?.removeFromQueue(id);
  }, []);
  const clearUpNext = useCallback(() => {
    const core = getBrowserAudioCore(); if (!core) return;
    const snapshot = core.getSnapshot();
    core.reorderQueue(snapshot.queue.slice(0, remainingQueueStart(snapshot.queue, snapshot.currentTrack?._id || null)));
  }, []);
  const reorderUpNext = useCallback((tracks: Track[]) => {
    const core = getBrowserAudioCore(); if (!core) return;
    const snapshot = core.getSnapshot();
    const start = remainingQueueStart(snapshot.queue, snapshot.currentTrack?._id || null);
    const remaining = snapshot.queue.slice(start);
    const ids = new Set(remaining.map(t => t._id));
    if (tracks.length !== ids.size || new Set(tracks.map(t => t._id)).size !== ids.size || tracks.some(t => !ids.has(t._id))) return;
    core.reorderQueue([...snapshot.queue.slice(0, start), ...tracks]);
  }, []);
  const moveUpNext = useCallback((id: string, direction: 'up' | 'down') => {
    const core = getBrowserAudioCore(); if (!core) return;
    const snapshot = core.getSnapshot();
    const tracks = snapshot.queue.slice(remainingQueueStart(snapshot.queue, snapshot.currentTrack?._id || null)) as Track[];
    const index = tracks.findIndex(t => t._id === id); const next = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || next < 0 || next >= tracks.length) return;
    [tracks[index], tracks[next]] = [tracks[next], tracks[index]]; reorderUpNext(tracks);
  }, [reorderUpNext]);
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
  const audioElement = ((audioService as any).audioElement ?? null) as HTMLAudioElement | null;
  const isNativeRuntime = Capacitor.isNativePlatform();
  const mediaControls = useMemo(() => ({
    play: servicePlay,
    pause: servicePause,
    next: serviceNextTrack,
    prev: servicePreviousTrack,
    seekTo: serviceSeek,
    seekBy: (offset: number) => {
      const a = audioElement;
      if (!a) return;
      const duration = Number.isFinite(a.duration) ? a.duration : a.currentTime + offset;
      const target = Math.max(0, Math.min(duration, a.currentTime + offset));
      serviceSeek(target);
    },
    stop: serviceStop,
  }), [audioElement, serviceNextTrack, servicePause, servicePlay, servicePreviousTrack, serviceSeek, serviceStop]);

  useMediaSession({
    audioEl: isNativeRuntime ? null : audioElement,
    track: isNativeRuntime ? null : mediaSessionTrack,
    controls: mediaControls,
    isPlaying: !!audioService.state.isPlaying,
  });

  useCapacitorMediaSession(
    isNativeRuntime ? audioElement : null,
    isNativeRuntime ? mediaSessionTrack : null,
    mediaControls,
    !!audioService.state.isPlaying
  );

  // Synchronisation de la piste courante (ne jamais pousser currentTrackIndex à -1)
  // NOTE: on garde la version plus sûre plus bas (avec guard trackIndex !== -1).
  // Cet ancien effet pouvait provoquer un clignotement (currentTrack undefined) lors de mises à jour fréquentes (ex: radios).

  // Synchronisation des pistes avec le service audio
  useEffect(() => {
    if (audioState.tracks.length > 0) {
      if (getQueueSignature(audioState.tracks, 0) !== getQueueSignature(audioService.allTracks, 0)) {
        serviceSetAllTracks(audioState.tracks);
      }
    }
  }, [audioState.tracks, audioService.allTracks, serviceSetAllTracks]);

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
    const currentId = getTrackId(audioServiceStateRef.current?.currentTrack);
    const currentIndex = currentId ? tracksWithLikes.findIndex((track) => track._id === currentId) : 0;
    serviceSetQueueOnly(tracksWithLikes, currentIndex >= 0 ? currentIndex : 0);
  }, [serviceSetQueueOnly]);

  const setCurrentTrackIndex = useCallback((index: number) => {
    const tracks = audioStateRef.current?.tracks || [];
    const max = Math.max(0, tracks.length - 1);
    const next = Math.max(0, Math.min(Number.isFinite(index) ? index : 0, max));
    serviceSetQueueOnly(tracks, next);
    setAudioState(prev => ({ ...prev, currentTrackIndex: next }));
  }, [serviceSetQueueOnly]);

  const setIsPlaying = useCallback((playing: boolean) => {
    if (playing) void servicePlay();
    else servicePause();
  }, [servicePause, servicePlay]);

  const setShowPlayer = useCallback((show: boolean) => {
    setAudioState(prev => ({ ...prev, showPlayer: show }));
  }, []);

  const setIsMinimized = useCallback((minimized: boolean) => {
    setAudioState(prev => ({ ...prev, isMinimized: minimized }));
  }, []);

  const setShuffle = useCallback((shuffle: boolean) => {
    setAudioState(prev => ({ ...prev, shuffle }));
    try {
      serviceSetShuffleMode(shuffle);
    } catch {}
  }, [serviceSetShuffleMode]);

  const setRepeat = useCallback((repeat: 'none' | 'one' | 'all') => {
    setAudioState(prev => ({ ...prev, repeat }));
    try {
      serviceSetRepeatMode(repeat);
    } catch {}
  }, [serviceSetRepeatMode]);

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
      const mergedQueue = [...audioState.tracks, trackData];
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
        serviceSetQueueOnly(mergedQueue, mergedQueue.length - 1);
        // IMPORTANT: use playImmediate (synchronous src set + play) to respect mobile autoplay policy.
        // loadTrack + play() fails on mobile because play() is called after an await (outside user gesture).
        servicePlayImmediate(trackData);
        updatePlayCount(trackData._id);
        setTimeout(() => { serviceForceUpdateNotification(); }, 100);
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
      if (audioServiceStateRef.current?.isPlaying) {
        servicePause();
      } else {
        await servicePlay();
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
    serviceSetQueueOnly(audioState.tracks, trackIndex);

    try {
      // IMPORTANT: use playImmediate (synchronous src set + play()) to respect mobile autoplay policy.
      // The old loadTrack() + play() pattern fails on mobile because play() is called after an await,
      // which loses the user gesture trust required by mobile browsers.
      servicePlayImmediate(trackToPlay);
      updatePlayCount(trackToPlay._id);
      setTimeout(() => { serviceForceUpdateNotification(); }, 100);
    } catch {}
  }, [audioState.tracks, audioState.currentTrackIndex, serviceForceUpdateNotification, servicePause, servicePlay, servicePlayImmediate, serviceSetQueueOnly, setShowPlayer, setIsMinimized, updatePlayCount]);

  const favoriteActions = useFavoriteActions();
  const handleLike = useCallback((trackId: string) => {
    void favoriteActions.toggle(trackId).catch(error => notify.error('Favoris', error.message));
  }, [favoriteActions.toggle]);

  const closePlayer = useCallback(() => {
    setShowPlayer(false);
    setIsPlaying(false);
    setIsMinimized(false);
    serviceStop();
  }, [setShowPlayer, setIsPlaying, setIsMinimized, serviceStop]);

  // Audio Core owns persistence and restoration. This state is only the legacy
  // React projection consumed by existing UI components.
  useEffect(() => {
    const coreQueue = Array.isArray(audioService.queue) ? audioService.queue as Track[] : [];
    if (!coreQueue.length && !audioService.state.currentTrack) return;
    setAudioState((previous) => {
      const byId = new Map(previous.tracks.map((track) => [track._id, track]));
      const tracks = coreQueue.map((track) => ({ ...byId.get(track._id), ...track })) as Track[];
      const currentIndex = audioService.currentIndex >= 0 ? audioService.currentIndex : 0;
      const unchanged =
        getQueueSignature(previous.tracks, previous.currentTrackIndex) === getQueueSignature(tracks, currentIndex) &&
        previous.showPlayer === Boolean(previous.showPlayer || audioService.state.currentTrack);
      if (unchanged) return previous;
      return {
        ...previous,
        tracks,
        currentTrackIndex: currentIndex,
        showPlayer: previous.showPlayer || Boolean(audioService.state.currentTrack),
      };
    });
  }, [audioService.currentIndex, audioService.queue, audioService.state.currentTrack]);

  const contextAudioState = useMemo<AudioPlayerState>(() => ({
    ...audioState,
    currentTrackIndex: audioService.currentIndex >= 0 ? audioService.currentIndex : audioState.currentTrackIndex,
    isPlaying: audioService.state.isPlaying,
    shuffle: audioService.shuffle,
    repeat: audioService.repeat,
    volume: audioService.state.volume,
    duration: audioService.state.duration,
    isLoading: audioService.state.isLoading,
    error: audioService.state.error,
    isMuted: audioService.state.isMuted,
    playbackRate: audioService.state.playbackRate,
  }), [
    audioService.currentIndex,
    audioService.repeat,
    audioService.shuffle,
    audioService.state.duration,
    audioService.state.error,
    audioService.state.isLoading,
    audioService.state.isMuted,
    audioService.state.isPlaying,
    audioService.state.playbackRate,
    audioService.state.volume,
    audioState,
  ]);

  const value = useMemo(() => ({
    audioState: contextAudioState,
    albumContext,
    setAlbumContext,
    upNextTracks,
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
    play: servicePlay,
    pause: servicePause,
    stop: serviceStop,
    seek: serviceSeek,
    setVolume: serviceSetVolume,
    toggleMute: serviceToggleMute,
    setPlaybackRate: serviceSetPlaybackRate,
    nextTrack: serviceNextTrack,
    previousTrack: servicePreviousTrack,
    toggleShuffle: serviceToggleShuffle,
    cycleRepeat: serviceCycleRepeat,
    setQueueAndPlay,
    setQueueOnly,
    requestNotificationPermission: serviceRequestNotificationPermission,
    forceUpdateNotification: serviceForceUpdateNotification,
    getAudioElement,
  }), [
    contextAudioState,
    albumContext,
    upNextTracks,
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
    serviceCycleRepeat,
    serviceForceUpdateNotification,
    serviceNextTrack,
    servicePause,
    servicePlay,
    servicePreviousTrack,
    serviceRequestNotificationPermission,
    serviceSeek,
    serviceSetPlaybackRate,
    serviceSetVolume,
    serviceStop,
    serviceToggleMute,
    serviceToggleShuffle,
    setQueueAndPlay,
    setQueueOnly,
    getAudioElement,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
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
  return useAudioCoreTime();
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
  const ShutdownModal = dynamic(() => import('@/components/SynauraShutdownModal'), { ssr: false });
  const WHATSNEW_VERSION = (process.env.NEXT_PUBLIC_WHATSNEW_VERSION as string) || 'v2-mars2026';
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showShutdown, setShowShutdown] = useState(false);
  const storageKey = `whatsnew.${WHATSNEW_VERSION}.dontShowUntilNextUpdate`;
  const shutdownStorageKey = 'synaura.shutdown.2026.dismissed';

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!isShutdownAnnounced() || isPastShutdownEnd()) return;

      const params = new URLSearchParams(window.location.search);
      const shutdownFlag = params.get('fermeture');
      if (shutdownFlag === 'reset') localStorage.removeItem(shutdownStorageKey);
      if (shutdownFlag === '1' || shutdownFlag === 'true') {
        setShowShutdown(true);
        return;
      }
      const shutdownDismissed = localStorage.getItem(shutdownStorageKey);
      if (!shutdownDismissed) {
        setShowShutdown(true);
        return;
      }
    } catch {}
  }, [shutdownStorageKey]);

  useEffect(() => {
    if (showShutdown) return;
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const flag = params.get('whatsnew');
      if (flag === 'reset') {
        localStorage.removeItem(storageKey);
        setShowWhatsNew(true);
        return;
      }
      if (flag === '1' || flag === 'true') {
        setShowWhatsNew(true);
      }
    } catch {}
  }, [storageKey, showShutdown]);

  const dontShowUntilNextUpdate = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
    setShowWhatsNew(false);
  };

  const dismissShutdownModal = () => {
    try {
      localStorage.setItem(shutdownStorageKey, '1');
    } catch {}
    setShowShutdown(false);
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
                      <OnboardingGate>{children}</OnboardingGate>
                    </NativeFeaturesWrapper>
                    <ShutdownModal
                      isOpen={showShutdown}
                      onClose={() => setShowShutdown(false)}
                      onDismiss={dismissShutdownModal}
                    />
                    <WhatsNewModal
                      isOpen={showWhatsNew && !showShutdown}
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
