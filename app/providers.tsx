'use client';

import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioService } from '@/hooks/useAudioService';
import { LikeProvider } from '@/contexts/LikeContext';
import { PlaysProvider } from '@/contexts/PlaysContext';
import { usePlaysSync } from '@/hooks/usePlaysSync';

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

interface AudioPlayerContextType {
  audioState: AudioPlayerState;
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
  requestNotificationPermission: () => Promise<boolean>;
  forceUpdateNotification: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const audioService = useAudioService();
  
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

  // Synchronisation optimisée avec le service audio
  useEffect(() => {
    setAudioState(prev => ({
      ...prev,
      isPlaying: audioService.state.isPlaying,
      volume: audioService.state.volume,
      currentTime: audioService.state.currentTime,
      duration: audioService.state.duration,
      isLoading: audioService.state.isLoading,
      error: audioService.state.error,
      isMuted: audioService.state.isMuted,
      playbackRate: audioService.state.playbackRate,
      shuffle: audioService.shuffle,
      repeat: audioService.repeat,
    }));
  }, [audioService.state, audioService.shuffle, audioService.repeat]);

  // Synchronisation de la piste courante optimisée
  useEffect(() => {
    if (audioService.state.currentTrack) {
      const trackIndex = audioState.tracks.findIndex(track => track._id === audioService.state.currentTrack?._id);
        setAudioState(prev => ({ ...prev, currentTrackIndex: trackIndex }));
    }
  }, [audioService.state.currentTrack, audioState.tracks]);

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
    // Initialiser l'état isLiked pour chaque piste
    const tracksWithLikes = tracks.map(track => ({
      ...track,
      isLiked: false // track.likes est un nombre dans Supabase, pas un tableau
    }));
    setAudioState(prev => ({ ...prev, tracks: tracksWithLikes }));
  }, [session?.user?.id]);

  const setCurrentTrackIndex = useCallback((index: number) => {
    setAudioState(prev => ({ ...prev, currentTrackIndex: index }));
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
  }, []);

  const setRepeat = useCallback((repeat: 'none' | 'one' | 'all') => {
    setAudioState(prev => ({ ...prev, repeat }));
  }, []);

  // Synchronisation de l'état du service audio avec le provider
  useEffect(() => {
    if (audioService.state.currentTrack && audioState.tracks.length > 0) {
      const trackIndex = audioState.tracks.findIndex(track => track._id === audioService.state.currentTrack?._id);
      if (trackIndex !== -1 && trackIndex !== audioState.currentTrackIndex) {
        setCurrentTrackIndex(trackIndex);
      }
    }
  }, [audioService.state.currentTrack, audioState.tracks, audioState.currentTrackIndex, setCurrentTrackIndex]);

  // Mettre à jour l'état isLiked quand la session change
  useEffect(() => {
    if (audioState.tracks.length > 0) {
      setAudioState(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => ({
          ...track,
          isLiked: false // track.likes est un nombre dans Supabase, pas un tableau
        }))
      }));
    }
  }, [session?.user?.id, audioState.tracks.length]);

  const updatePlayCount = useCallback(async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des écoutes');
      }
      
      const data = await response.json();
      
      // Mettre à jour l'état avec le nouveau nombre d'écoutes de manière atomique
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
      
    } catch (error) {
      console.error('Erreur mise à jour plays:', error);
    }
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
      const newTracks = [...audioState.tracks, trackData];
      setAudioState(prev => ({
        ...prev,
        tracks: newTracks,
        currentTrackIndex: newTracks.length - 1,
        showPlayer: true,
        isMinimized: false,
      }));
      
      // Utiliser directement le service audio
      await audioService.actions.loadTrack(trackData);
      await audioService.actions.play();
      
      // Incrémenter le nombre d'écoutes
      await updatePlayCount(trackData._id);
      
      // Forcer la mise à jour de la notification
      setTimeout(() => {
        audioService.actions.forceUpdateNotification();
      }, 100);
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
    
    // Mettre à jour l'état du player
    setAudioState(prev => ({
      ...prev,
      currentTrackIndex: trackIndex,
      showPlayer: true,
      isMinimized: false,
    }));
    
    // Forcer le chargement et la lecture de la nouvelle piste
    try {
      await audioService.actions.loadTrack(trackToPlay);
      await audioService.actions.play();
      
      // Incrémenter le nombre d'écoutes
      await updatePlayCount(trackToPlay._id);
      
      // Forcer la mise à jour de la notification
      setTimeout(() => {
        audioService.actions.forceUpdateNotification();
      }, 100);
    } catch (error) {
      // Erreur silencieuse
    }
  }, [audioState.tracks, audioState.currentTrackIndex, audioState.isPlaying, audioService.actions, setShowPlayer, setIsMinimized, updatePlayCount]);

  const handleLike = useCallback(async (trackId: string) => {
    // Optimistic update pour une meilleure UX
    setAudioState(prev => {
      const newTracks = prev.tracks.map((track) => {
        if (track._id !== trackId) return track;
        const isLiked = !track.isLiked;
        const likes = isLiked
          ? [...track.likes, session?.user?.id || '']
          : track.likes.filter(id => id !== session?.user?.id);
        return { ...track, isLiked, likes };
      });
      return { ...prev, tracks: newTracks };
    });

    // Appel API pour liker/unliker
    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du like');
      }
      
      // Récupérer la réponse pour synchroniser les vraies données
      const data = await response.json();
      
      // Mettre à jour avec les vraies données de l'API
      setAudioState(prev => {
        const newTracks = prev.tracks.map((track) => {
          if (track._id !== trackId) return track;
          return { 
            ...track, 
            isLiked: data.isLiked,
            likes: data.likes || track.likes // Utiliser les likes retournés par l'API
          };
        });
        return { ...prev, tracks: newTracks };
      });
      
    } catch (error) {
      console.error('Erreur like:', error);
      // En cas d'erreur, revenir à l'état précédent
      setAudioState(prev => {
        const newTracks = prev.tracks.map((track) => {
          if (track._id !== trackId) return track;
          return { 
            ...track, 
            isLiked: !track.isLiked, // Inverser pour revenir à l'état précédent
            likes: track.isLiked 
              ? track.likes.filter(id => id !== session?.user?.id)
              : [...track.likes, session?.user?.id || '']
          };
        });
        return { ...prev, tracks: newTracks };
      });
    }
  }, [session?.user?.id]);

  const closePlayer = useCallback(() => {
    setShowPlayer(false);
    setIsPlaying(false);
    setIsMinimized(false);
    audioService.actions.stop();
  }, [setShowPlayer, setIsPlaying, setIsMinimized, audioService.actions]);

  // Persister l'état dans localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('audioPlayerState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setAudioState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Erreur parsing audio state:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('audioPlayerState', JSON.stringify({
      currentTrackIndex: audioState.currentTrackIndex,
      isPlaying: audioState.isPlaying,
      showPlayer: audioState.showPlayer,
      isMinimized: audioState.isMinimized,
      volume: audioState.volume,
      shuffle: audioState.shuffle,
      repeat: audioState.repeat,
    }));
  }, [audioState.currentTrackIndex, audioState.isPlaying, audioState.showPlayer, audioState.isMinimized, audioState.volume, audioState.shuffle, audioState.repeat]);

  const value = useMemo(() => ({
    audioState,
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
    setQueueAndPlay: audioService.actions.setQueueAndPlay,
    requestNotificationPermission: audioService.actions.requestNotificationPermission,
    forceUpdateNotification: audioService.actions.forceUpdateNotification,
  }), [
    audioState,
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
    audioService.actions
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

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Refetch toutes les 5 minutes
      refetchOnWindowFocus={true} // Refetch quand la fenêtre reprend le focus
    >
      <QueryClientProvider client={queryClient}>
        <LikeProvider>
          <PlaysProvider>
            <PlaysSyncWrapper>
              <AudioPlayerProvider>
                <SubscriptionProvider>
                  {children}
                  <Toaster position="top-center" />
                </SubscriptionProvider>
              </AudioPlayerProvider>
            </PlaysSyncWrapper>
          </PlaysProvider>
        </LikeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
} 