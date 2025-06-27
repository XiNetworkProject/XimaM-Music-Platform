import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAudioRecommendations } from './useAudioRecommendations';

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

interface AudioServiceState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  playbackRate: number;
}

interface AudioServiceActions {
  play: (track?: Track) => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  loadTrack: (track: Track) => Promise<void>;
  updateNotification: () => void;
  requestNotificationPermission: () => Promise<boolean>;
}

export const useAudioService = () => {
  const { data: session } = useSession();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recommendations = useAudioRecommendations();
  
  const [state, setState] = useState<AudioServiceState>({
    currentTrack: null,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
    isMuted: false,
    playbackRate: 1,
  });

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('none');
  const [shuffledQueue, setShuffledQueue] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // Initialisation du service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker enregistré:', registration);
        })
        .catch((error) => {
          console.error('Erreur enregistrement Service Worker:', error);
        });
    }
  }, []);

  // Écoute des messages du service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'AUDIO_CONTROL') {
          handleServiceWorkerControl(event.data.action);
        }
      });
    }
  }, [state.isPlaying, state.currentTrack]);

  const handleServiceWorkerControl = useCallback((action: string) => {
    switch (action) {
      case 'play':
        if (!state.isPlaying) play();
        break;
      case 'pause':
        if (state.isPlaying) pause();
        break;
      case 'next':
        nextTrack();
        break;
      case 'previous':
        previousTrack();
        break;
    }
  }, [state.isPlaying]);

  // Création de l'élément audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      
      // Événements audio
      audioRef.current.addEventListener('loadstart', () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      });

      audioRef.current.addEventListener('canplay', () => {
        setState(prev => ({ ...prev, isLoading: false }));
      });

      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setState(prev => ({ 
            ...prev, 
            currentTime: audioRef.current!.currentTime 
          }));
        }
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setState(prev => ({ 
            ...prev, 
            duration: audioRef.current!.duration 
          }));
        }
      });

      audioRef.current.addEventListener('ended', () => {
        handleTrackEnd();
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Erreur audio:', e);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur de lecture audio',
          isLoading: false 
        }));
      });

      audioRef.current.addEventListener('play', () => {
        setState(prev => ({ ...prev, isPlaying: true }));
        updateNotification();
      });

      audioRef.current.addEventListener('pause', () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        updateNotification();
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTrackEnd = useCallback(() => {
    if (repeat === 'one') {
      // Rejouer la même piste
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeat === 'all' || queue.length > 1) {
      // Passer à la piste suivante
      nextTrack();
    } else if (autoPlayEnabled && allTracks.length > 0) {
      // Auto-play intelligent
      const nextTrack = recommendations.getAutoPlayNext(state.currentTrack!, queue, allTracks);
      if (nextTrack) {
        loadTrack(nextTrack).then(() => play());
      }
    } else {
      // Arrêter la lecture
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [repeat, queue.length, autoPlayEnabled, allTracks.length, state.currentTrack, recommendations]);

  const play = useCallback(async (track?: Track) => {
    try {
      if (track) {
        await loadTrack(track);
      }
      
      if (audioRef.current) {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true, error: null }));
        updateNotification();
      }
    } catch (error) {
      console.error('Erreur lecture:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible de lire la piste',
        isPlaying: false 
      }));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
      updateNotification();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentTime: 0 
      }));
      updateNotification();
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setState(prev => ({ 
        ...prev, 
        volume,
        isMuted: volume === 0 
      }));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (state.isMuted) {
        audioRef.current.volume = state.volume;
        setState(prev => ({ ...prev, isMuted: false }));
      } else {
        audioRef.current.volume = 0;
        setState(prev => ({ ...prev, isMuted: true }));
      }
    }
  }, [state.isMuted, state.volume]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
      setState(prev => ({ ...prev, playbackRate: rate }));
    }
  }, []);

  const loadTrack = useCallback(async (track: Track) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (audioRef.current) {
        audioRef.current.src = track.audioUrl;
        audioRef.current.load();
        
        setState(prev => ({ 
          ...prev, 
          currentTrack: track,
          currentTime: 0,
          duration: 0,
          isLoading: false 
        }));
        
        // Analyser la session d'écoute
        if (state.currentTrack) {
          const listenDuration = Math.min(state.currentTime, state.currentTrack.duration);
          recommendations.analyzeListeningSession(state.currentTrack, listenDuration);
        }
        
        updateNotification();
      }
    } catch (error) {
      console.error('Erreur chargement piste:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Impossible de charger la piste',
        isLoading: false 
      }));
    }
  }, [state.currentTrack, state.currentTime, recommendations]);

  const nextTrack = useCallback(() => {
    const currentQueue = shuffle ? shuffledQueue : queue;
    if (currentQueue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= currentQueue.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        stop();
        return;
      }
    }

    const nextTrack = currentQueue[nextIndex];
    setCurrentIndex(nextIndex);
    loadTrack(nextTrack).then(() => {
      if (state.isPlaying) {
        play();
      }
    });
  }, [queue, shuffledQueue, currentIndex, shuffle, repeat, state.isPlaying]);

  const previousTrack = useCallback(() => {
    const currentQueue = shuffle ? shuffledQueue : queue;
    if (currentQueue.length === 0) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeat === 'all') {
        prevIndex = currentQueue.length - 1;
      } else {
        stop();
        return;
      }
    }

    const prevTrack = currentQueue[prevIndex];
    setCurrentIndex(prevIndex);
    loadTrack(prevTrack).then(() => {
      if (state.isPlaying) {
        play();
      }
    });
  }, [queue, shuffledQueue, currentIndex, shuffle, repeat, state.isPlaying]);

  const updateNotification = useCallback(() => {
    if ('serviceWorker' in navigator && state.currentTrack) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: 'UPDATE_NOTIFICATION',
          title: state.currentTrack?.title || 'XimaM Music',
          body: `${state.currentTrack?.artist?.name || state.currentTrack?.artist?.username} - ${state.isPlaying ? 'En lecture' : 'En pause'}`,
          track: state.currentTrack
        });
      });
    }
  }, [state.currentTrack, state.isPlaying]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('Notifications non supportées');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  // Gestion de la file d'attente
  const setQueueAndPlay = useCallback((tracks: Track[], startIndex: number = 0) => {
    setQueue(tracks);
    setCurrentIndex(startIndex);
    
    if (shuffle) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      setShuffledQueue(shuffled);
    }
    
    if (tracks.length > 0) {
      loadTrack(tracks[startIndex]);
    }
  }, [shuffle]);

  const toggleShuffle = useCallback(() => {
    const newShuffle = !shuffle;
    setShuffle(newShuffle);
    
    if (newShuffle && queue.length > 0) {
      const shuffled = [...queue].sort(() => Math.random() - 0.5);
      setShuffledQueue(shuffled);
    }
  }, [shuffle, queue]);

  const cycleRepeat = useCallback(() => {
    setRepeat(prev => {
      switch (prev) {
        case 'none': return 'one';
        case 'one': return 'all';
        case 'all': return 'none';
        default: return 'none';
      }
    });
  }, []);

  // Auto-play intelligent amélioré
  const autoPlayNext = useCallback(() => {
    if (queue.length > 1 && repeat !== 'none') {
      nextTrack();
    } else if (autoPlayEnabled && allTracks.length > 0) {
      const nextTrack = recommendations.getAutoPlayNext(state.currentTrack!, queue, allTracks);
      if (nextTrack) {
        loadTrack(nextTrack).then(() => play());
      }
    }
  }, [queue, repeat, autoPlayEnabled, allTracks.length, state.currentTrack, recommendations]);

  // Méthodes pour les recommandations
  const getSimilarTracks = useCallback((limit: number = 10) => {
    if (!state.currentTrack || !allTracks.length) return [];
    return recommendations.getSimilarTracks(state.currentTrack, allTracks, limit);
  }, [state.currentTrack, allTracks, recommendations]);

  const getRecommendedTracks = useCallback((limit: number = 10) => {
    return recommendations.getRecommendedTracks(allTracks, limit);
  }, [allTracks, recommendations]);

  const getMoodBasedRecommendations = useCallback((mood: string, limit: number = 10) => {
    return recommendations.getMoodBasedRecommendations(mood, allTracks, limit);
  }, [allTracks, recommendations]);

  return {
    state,
    queue,
    currentIndex,
    shuffle,
    repeat,
    allTracks,
    autoPlayEnabled,
    actions: {
      play,
      pause,
      stop,
      seek,
      setVolume,
      toggleMute,
      setPlaybackRate,
      nextTrack,
      previousTrack,
      loadTrack,
      updateNotification,
      requestNotificationPermission,
      setQueueAndPlay,
      toggleShuffle,
      cycleRepeat,
      autoPlayNext,
      setAllTracks: setAllTracks,
      setAutoPlayEnabled,
      getSimilarTracks,
      getRecommendedTracks,
      getMoodBasedRecommendations,
    }
  };
}; 