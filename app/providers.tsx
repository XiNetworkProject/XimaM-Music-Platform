'use client';

import { QueryClient, QueryClientProvider } from 'react-query';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

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
}

interface AudioPlayerState {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  showPlayer: boolean;
  isMinimized: boolean;
}

interface AudioPlayerContextType {
  audioState: AudioPlayerState;
  setTracks: (tracks: Track[]) => void;
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setShowPlayer: (show: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  playTrack: (trackId: string) => void;
  handleLike: (trackId: string) => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [audioState, setAudioState] = useState<AudioPlayerState>({
    tracks: [],
    currentTrackIndex: 0,
    isPlaying: false,
    showPlayer: false,
    isMinimized: false,
  });

  const setTracks = (tracks: Track[]) => {
    setAudioState(prev => ({ ...prev, tracks }));
  };

  const setCurrentTrackIndex = (index: number) => {
    setAudioState(prev => ({ ...prev, currentTrackIndex: index }));
  };

  const setIsPlaying = (playing: boolean) => {
    setAudioState(prev => ({ ...prev, isPlaying: playing }));
  };

  const setShowPlayer = (show: boolean) => {
    setAudioState(prev => ({ ...prev, showPlayer: show }));
  };

  const setIsMinimized = (minimized: boolean) => {
    setAudioState(prev => ({ ...prev, isMinimized: minimized }));
  };

  const playTrack = (trackId: string) => {
    const trackIndex = audioState.tracks.findIndex(track => track._id === trackId);
    if (trackIndex !== -1) {
      setCurrentTrackIndex(trackIndex);
      setIsPlaying(true);
      setShowPlayer(true);
      setIsMinimized(false);
    }
  };

  const handleLike = async (trackId: string) => {
    // Mettre à jour l'état local
    setAudioState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track._id === trackId 
          ? { 
              ...track, 
              isLiked: !track.isLiked, 
              likes: track.isLiked 
                ? track.likes.filter(id => id !== session?.user?.id) 
                : [...track.likes, session?.user?.id || '']
            }
          : track
      )
    }));

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
    } catch (error) {
      console.error('Erreur like:', error);
    }
  };

  const closePlayer = () => {
    setShowPlayer(false);
    setIsPlaying(false);
    setIsMinimized(false);
  };

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
    }));
  }, [audioState.currentTrackIndex, audioState.isPlaying, audioState.showPlayer, audioState.isMinimized]);

  const value = {
    audioState,
    setTracks,
    setCurrentTrackIndex,
    setIsPlaying,
    setShowPlayer,
    setIsMinimized,
    playTrack,
    handleLike,
    closePlayer,
  };

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

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Refetch toutes les 5 minutes
      refetchOnWindowFocus={true} // Refetch quand la fenêtre reprend le focus
    >
      <QueryClientProvider client={queryClient}>
        <AudioPlayerProvider>
          {children}
          <Toaster position="top-center" />
        </AudioPlayerProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
} 