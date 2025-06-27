import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const notificationRef = useRef<Notification | null>(null);
  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null);
  
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation optimisée du service worker
  useEffect(() => {
    const initServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          serviceWorkerRef.current = registration;
          console.log('Service Worker enregistré:', registration);
          
          // Demander les permissions de notification immédiatement
          if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        } catch (error) {
          console.error('Erreur enregistrement Service Worker:', error);
        }
      }
    };

    initServiceWorker();
  }, []);

  // Écoute des messages du service worker avec debounce
  useEffect(() => {
    if (!serviceWorkerRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'AUDIO_CONTROL') {
        handleServiceWorkerControl(event.data.action);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

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

  // Création optimisée de l'élément audio
  useEffect(() => {
    if (isInitialized) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    
    // Optimisation des événements audio
    const events = {
      loadstart: () => setState(prev => ({ ...prev, isLoading: true, error: null })),
      canplay: () => setState(prev => ({ ...prev, isLoading: false })),
      timeupdate: () => {
        if (audio.currentTime !== state.currentTime) {
          setState(prev => ({ ...prev, currentTime: audio.currentTime }));
        }
      },
      loadedmetadata: () => {
        if (audio.duration !== state.duration) {
          setState(prev => ({ ...prev, duration: audio.duration }));
        }
      },
      ended: () => handleTrackEnd(),
      error: (e: Event) => {
        console.error('Erreur audio:', e);
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur de lecture audio',
          isLoading: false 
        }));
      },
      play: () => {
        setState(prev => ({ ...prev, isPlaying: true }));
        updateNotification();
      },
      pause: () => {
        setState(prev => ({ ...prev, isPlaying: false }));
        updateNotification();
      }
    };

    // Ajouter tous les événements
    Object.entries(events).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });

    audioRef.current = audio;
    setIsInitialized(true);

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        audio.removeEventListener(event, handler);
      });
      audio.pause();
      audioRef.current = null;
    };
  }, [isInitialized, state.currentTime, state.duration]);

  const handleTrackEnd = useCallback(() => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } else if (repeat === 'all' || queue.length > 1) {
      nextTrack();
    } else if (autoPlayEnabled && allTracks.length > 0) {
      const nextTrack = recommendations.getAutoPlayNext(state.currentTrack!, queue, allTracks);
      if (nextTrack) {
        loadTrack(nextTrack).then(() => play());
      }
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [repeat, queue.length, autoPlayEnabled, allTracks.length, state.currentTrack, recommendations]);

  // Fonction play ultra-optimisée
  const play = useCallback(async (track?: Track) => {
    if (!audioRef.current) return;

    try {
      if (track) {
        await loadTrack(track);
      }
      
      // Utiliser une promesse pour éviter les problèmes de timing
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      setState(prev => ({ ...prev, isPlaying: true, error: null }));
      updateNotification();
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

  // Fonction loadTrack ultra-optimisée
  const loadTrack = useCallback(async (track: Track) => {
    if (!audioRef.current) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Analyser la session d'écoute précédente
      if (state.currentTrack) {
        const listenDuration = Math.min(state.currentTime, state.currentTrack.duration);
        recommendations.analyzeListeningSession(state.currentTrack, listenDuration);
      }

      // Charger la nouvelle piste
      audioRef.current.src = track.audioUrl;
      await audioRef.current.load();
      
      setState(prev => ({ 
        ...prev, 
        currentTrack: track,
        currentTime: 0,
        duration: 0,
        isLoading: false 
      }));
      
      updateNotification();
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

  // Notifications ultra-optimisées
  const updateNotification = useCallback(() => {
    if (!state.currentTrack) return;

    // Fermer la notification précédente
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }

    // Créer une nouvelle notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        notificationRef.current = new Notification(state.currentTrack.title, {
          body: `${state.currentTrack.artist?.name || state.currentTrack.artist?.username} - ${state.isPlaying ? 'En lecture' : 'En pause'}`,
          icon: state.currentTrack.coverUrl || '/android-chrome-192x192.png',
          badge: '/android-chrome-192x192.png',
          tag: 'ximam-audio',
          requireInteraction: false,
          silent: false,
          data: { track: state.currentTrack }
        });

        // Auto-fermer après 5 secondes
        setTimeout(() => {
          if (notificationRef.current) {
            notificationRef.current.close();
            notificationRef.current = null;
          }
        }, 5000);
      } catch (error) {
        console.error('Erreur notification:', error);
      }
    }

    // Mettre à jour le service worker
    if (serviceWorkerRef.current?.active) {
      serviceWorkerRef.current.active.postMessage({
        type: 'UPDATE_NOTIFICATION',
        title: state.currentTrack.title,
        body: `${state.currentTrack.artist?.name || state.currentTrack.artist?.username} - ${state.isPlaying ? 'En lecture' : 'En pause'}`,
        track: state.currentTrack
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

  // Gestion de la file d'attente optimisée
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
  }, [shuffle, loadTrack]);

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