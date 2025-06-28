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
  const isInitialized = useRef(false);
  const lastTrackId = useRef<string | null>(null);
  
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isFirstPlay, setIsFirstPlay] = useState(true);

  // Initialisation du service worker et des notifications
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Enregistrer le service worker
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

    // Vérifier les permissions de notification
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Écoute des messages du service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

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
    console.log('Contrôle Service Worker:', action);
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

  // Création et configuration de l'élément audio
  useEffect(() => {
    if (audioRef.current) return;

    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
    audioRef.current.crossOrigin = 'anonymous';
    
    // Configuration spécifique pour mobile
    audioRef.current.setAttribute('playsinline', 'true');
    audioRef.current.setAttribute('webkit-playsinline', 'true');
    audioRef.current.setAttribute('x-webkit-airplay', 'allow');
    
    // Événements audio optimisés
    const audio = audioRef.current;

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    };

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }));
    };

    const handleTimeUpdate = () => {
      if (audio) {
        setState(prev => ({ 
          ...prev, 
          currentTime: audio.currentTime 
        }));
      }
    };

    const handleLoadedMetadata = () => {
      if (audio) {
        setState(prev => ({ 
          ...prev, 
          duration: audio.duration 
        }));
      }
    };

    const handleEnded = () => {
      handleTrackEnd();
    };

    const handleError = (e: Event) => {
      console.error('Erreur audio:', e);
      setState(prev => ({ 
        ...prev, 
        error: 'Erreur de lecture audio',
        isLoading: false 
      }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
      updateNotification();
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
      updateNotification();
    };

    // Ajouter les événements
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      if (audio) {
        audio.pause();
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audioRef.current = null;
      }
    };
  }, []);

  const handleTrackEnd = useCallback(() => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } else if (repeat === 'all' || queue.length > 1) {
      nextTrack();
    } else if (autoPlayEnabled && allTracks.length > 0) {
      console.log('🎵 Auto-play intelligent activé...');
      
      let autoPlayNextTrack: Track | null = null;
      
      // 1. Essayer de trouver une piste similaire à la piste actuelle
      if (state.currentTrack) {
        const similarTracks = recommendations.getSimilarTracks(state.currentTrack, allTracks, 10);
        const filteredSimilar = similarTracks.filter(t => t._id !== state.currentTrack?._id);
        if (filteredSimilar.length > 0) {
          autoPlayNextTrack = filteredSimilar[Math.floor(Math.random() * filteredSimilar.length)];
          console.log('🎵 Auto-play: Piste similaire sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      // 2. Si pas de piste similaire, utiliser les recommandations personnalisées
      if (!autoPlayNextTrack) {
        const recommendedTracks = recommendations.getRecommendedTracks(allTracks, 10);
        if (recommendedTracks.length > 0) {
          autoPlayNextTrack = recommendedTracks[Math.floor(Math.random() * recommendedTracks.length)];
          console.log('🎵 Auto-play: Recommandation personnalisée sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      // 3. En dernier recours, sélection aléatoire parmi toutes les pistes populaires
      if (!autoPlayNextTrack) {
        const popularTracks = allTracks
          .filter(t => t._id !== state.currentTrack?._id)
          .sort((a, b) => b.plays - a.plays)
          .slice(0, 20);
        
        if (popularTracks.length > 0) {
          autoPlayNextTrack = popularTracks[Math.floor(Math.random() * popularTracks.length)];
          console.log('🎵 Auto-play: Piste populaire sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      // 4. Si vraiment rien, prendre une piste aléatoire
      if (!autoPlayNextTrack && allTracks.length > 0) {
        const availableTracks = allTracks.filter(t => t._id !== state.currentTrack?._id);
        if (availableTracks.length > 0) {
          autoPlayNextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
          console.log('🎵 Auto-play: Piste aléatoire sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      if (autoPlayNextTrack) {
        // Mettre à jour la file d'attente avec la nouvelle piste
        const newQueue = [autoPlayNextTrack];
        setQueue(newQueue);
        setCurrentIndex(0);
        
        if (shuffle) {
          setShuffledQueue([autoPlayNextTrack]);
        }
        
        loadTrack(autoPlayNextTrack).then(() => play());
      } else {
        console.log('❌ Auto-play: Aucune piste disponible');
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [repeat, queue.length, autoPlayEnabled, allTracks.length, state.currentTrack, recommendations, shuffle]);

  const updateNotification = useCallback(() => {
    if (!('serviceWorker' in navigator) || !state.currentTrack || notificationPermission !== 'granted') {
      console.log('Notification non envoyée:', {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasCurrentTrack: !!state.currentTrack,
        permission: notificationPermission
      });
      return;
    }

    // Utiliser les données les plus récentes de l'état
    const currentTrack = state.currentTrack;
    const isPlaying = state.isPlaying;

    console.log('Envoi notification:', {
      title: currentTrack?.title,
      artist: currentTrack?.artist?.name || currentTrack?.artist?.username,
      isPlaying,
      trackId: currentTrack?._id
    });

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage({
          type: 'UPDATE_NOTIFICATION',
          title: currentTrack?.title || 'XimaM Music',
          body: `${currentTrack?.artist?.name || currentTrack?.artist?.username} - ${isPlaying ? 'En lecture' : 'En pause'}`,
          track: currentTrack,
          isPlaying: isPlaying
        });
      }
    }).catch(console.error);
  }, [state.currentTrack, state.isPlaying, notificationPermission]);

  const loadTrack = useCallback(async (track: Track) => {
    // Éviter de recharger la même piste
    if (lastTrackId.current === track._id && audioRef.current?.src === track.audioUrl) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (audioRef.current) {
        // Analyser la session d'écoute de la piste précédente
        if (state.currentTrack && state.currentTime > 0) {
          const listenDuration = Math.min(state.currentTime, state.currentTrack.duration);
          recommendations.analyzeListeningSession(state.currentTrack, listenDuration);
        }

        audioRef.current.src = track.audioUrl;
        audioRef.current.load();
        
        setState(prev => ({ 
          ...prev, 
          currentTrack: track,
          currentTime: 0,
          duration: 0,
          isLoading: false 
        }));
        
        lastTrackId.current = track._id;
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

  const play = useCallback(async (track?: Track) => {
    try {
      if (track) {
        await loadTrack(track);
      }
      
      if (audioRef.current) {
        // Gestion spécifique pour mobile
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          setState(prev => ({ ...prev, isPlaying: true, error: null }));
          // Marquer que la première lecture a réussi
          if (isFirstPlay) {
            setIsFirstPlay(false);
          }
        } else {
          // Fallback pour les navigateurs qui ne retournent pas de promise
          setState(prev => ({ ...prev, isPlaying: true, error: null }));
          if (isFirstPlay) {
            setIsFirstPlay(false);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lecture:', error);
      
      // Gestion spécifique des erreurs mobile
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setState(prev => ({ 
            ...prev, 
            error: '🎵 Cliquez sur le bouton play pour commencer la lecture (lecture automatique bloquée sur mobile)',
            isPlaying: false 
          }));
        } else if (error.message.includes('play()') || isFirstPlay) {
          setState(prev => ({ 
            ...prev, 
            error: '🎵 Première lecture : Cliquez sur play pour activer l\'audio sur mobile',
            isPlaying: false 
          }));
        } else {
          setState(prev => ({ 
            ...prev, 
            error: 'Impossible de lire la piste',
            isPlaying: false 
          }));
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur de lecture inconnue',
          isPlaying: false 
        }));
      }
    }
  }, [loadTrack, isFirstPlay]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentTime: 0,
        currentTrack: null 
      }));
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

  const nextTrack = useCallback(() => {
    const currentQueue = shuffle ? shuffledQueue : queue;
    
    // Si aucune piste n'est jouée mais des pistes sont disponibles
    if (!state.currentTrack && allTracks.length > 0) {
      const firstTrack = allTracks[0];
      setQueue([firstTrack]);
      setCurrentIndex(0);
      loadTrack(firstTrack).then(() => play());
      return;
    }
    
    // Si on a une file d'attente avec plusieurs pistes
    if (currentQueue.length > 1) {
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
      return;
    }
    
    // Si pas de file d'attente ou une seule piste, utiliser les recommandations
    if (allTracks.length > 0) {
      console.log('🎵 Sélection aléatoire intelligente pour la piste suivante...');
      
      let nextTrack: Track | null = null;
      
      // 1. Essayer de trouver une piste similaire à la piste actuelle
      if (state.currentTrack) {
        const similarTracks = recommendations.getSimilarTracks(state.currentTrack, allTracks, 10);
        const filteredSimilar = similarTracks.filter(t => t._id !== state.currentTrack?._id);
        if (filteredSimilar.length > 0) {
          nextTrack = filteredSimilar[Math.floor(Math.random() * filteredSimilar.length)];
          console.log('🎵 Piste similaire sélectionnée:', nextTrack.title);
        }
      }
      
      // 2. Si pas de piste similaire, utiliser les recommandations personnalisées
      if (!nextTrack) {
        const recommendedTracks = recommendations.getRecommendedTracks(allTracks, 10);
        if (recommendedTracks.length > 0) {
          nextTrack = recommendedTracks[Math.floor(Math.random() * recommendedTracks.length)];
          console.log('🎵 Recommandation personnalisée sélectionnée:', nextTrack.title);
        }
      }
      
      // 3. En dernier recours, sélection aléatoire parmi toutes les pistes populaires
      if (!nextTrack) {
        const popularTracks = allTracks
          .filter(t => t._id !== state.currentTrack?._id)
          .sort((a, b) => b.plays - a.plays)
          .slice(0, 20);
        
        if (popularTracks.length > 0) {
          nextTrack = popularTracks[Math.floor(Math.random() * popularTracks.length)];
          console.log('🎵 Piste populaire sélectionnée:', nextTrack.title);
        }
      }
      
      // 4. Si vraiment rien, prendre une piste aléatoire
      if (!nextTrack && allTracks.length > 0) {
        const availableTracks = allTracks.filter(t => t._id !== state.currentTrack?._id);
        if (availableTracks.length > 0) {
          nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
          console.log('🎵 Piste aléatoire sélectionnée:', nextTrack.title);
        }
      }
      
      if (nextTrack) {
        // Mettre à jour la file d'attente avec la nouvelle piste
        const newQueue = [nextTrack];
        setQueue(newQueue);
        setCurrentIndex(0);
        
        if (shuffle) {
          setShuffledQueue([nextTrack]);
        }
        
        loadTrack(nextTrack).then(() => {
          if (state.isPlaying) {
            play();
          }
        });
      } else {
        console.log('❌ Aucune piste disponible pour la lecture');
      }
    } else {
      console.log('❌ Aucune piste disponible dans la bibliothèque');
    }
  }, [queue, shuffledQueue, currentIndex, shuffle, repeat, state.isPlaying, state.currentTrack, allTracks, loadTrack, play, stop, recommendations]);

  const previousTrack = useCallback(() => {
    const currentQueue = shuffle ? shuffledQueue : queue;
    
    // Si aucune piste n'est jouée mais des pistes sont disponibles
    if (!state.currentTrack && allTracks.length > 0) {
      const firstTrack = allTracks[0];
      setQueue([firstTrack]);
      setCurrentIndex(0);
      loadTrack(firstTrack).then(() => play());
      return;
    }
    
    // Si on a une file d'attente avec plusieurs pistes
    if (currentQueue.length > 1) {
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
      return;
    }
    
    // Si pas de file d'attente ou une seule piste, utiliser les recommandations
    if (allTracks.length > 0) {
      console.log('🎵 Sélection aléatoire intelligente pour la piste précédente...');
      
      let prevTrack: Track | null = null;
      
      // 1. Essayer de trouver une piste similaire à la piste actuelle
      if (state.currentTrack) {
        const similarTracks = recommendations.getSimilarTracks(state.currentTrack, allTracks, 10);
        const filteredSimilar = similarTracks.filter(t => t._id !== state.currentTrack?._id);
        if (filteredSimilar.length > 0) {
          prevTrack = filteredSimilar[Math.floor(Math.random() * filteredSimilar.length)];
          console.log('🎵 Piste similaire sélectionnée:', prevTrack.title);
        }
      }
      
      // 2. Si pas de piste similaire, utiliser les recommandations personnalisées
      if (!prevTrack) {
        const recommendedTracks = recommendations.getRecommendedTracks(allTracks, 10);
        if (recommendedTracks.length > 0) {
          prevTrack = recommendedTracks[Math.floor(Math.random() * recommendedTracks.length)];
          console.log('🎵 Recommandation personnalisée sélectionnée:', prevTrack.title);
        }
      }
      
      // 3. En dernier recours, sélection aléatoire parmi toutes les pistes populaires
      if (!prevTrack) {
        const popularTracks = allTracks
          .filter(t => t._id !== state.currentTrack?._id)
          .sort((a, b) => b.plays - a.plays)
          .slice(0, 20);
        
        if (popularTracks.length > 0) {
          prevTrack = popularTracks[Math.floor(Math.random() * popularTracks.length)];
          console.log('🎵 Piste populaire sélectionnée:', prevTrack.title);
        }
      }
      
      // 4. Si vraiment rien, prendre une piste aléatoire
      if (!prevTrack && allTracks.length > 0) {
        const availableTracks = allTracks.filter(t => t._id !== state.currentTrack?._id);
        if (availableTracks.length > 0) {
          prevTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
          console.log('🎵 Piste aléatoire sélectionnée:', prevTrack.title);
        }
      }
      
      if (prevTrack) {
        // Mettre à jour la file d'attente avec la nouvelle piste
        const newQueue = [prevTrack];
        setQueue(newQueue);
        setCurrentIndex(0);
        
        if (shuffle) {
          setShuffledQueue([prevTrack]);
        }
        
        loadTrack(prevTrack).then(() => {
          if (state.isPlaying) {
            play();
          }
        });
      } else {
        console.log('❌ Aucune piste disponible pour la lecture');
      }
    } else {
      console.log('❌ Aucune piste disponible dans la bibliothèque');
    }
  }, [queue, shuffledQueue, currentIndex, shuffle, repeat, state.isPlaying, state.currentTrack, allTracks, loadTrack, play, stop, recommendations]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('Notifications non supportées');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Erreur demande permission notification:', error);
      return false;
    }
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

  // Synchroniser les notifications avec l'état
  useEffect(() => {
    if (state.currentTrack && notificationPermission === 'granted') {
      updateNotification();
    }
  }, [state.currentTrack, state.isPlaying, notificationPermission, updateNotification]);

  // Effet séparé pour les changements de piste
  useEffect(() => {
    if (state.currentTrack && notificationPermission === 'granted') {
      // Délai plus long pour les changements de piste
      const timeoutId = setTimeout(() => {
        updateNotification();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.currentTrack?._id, notificationPermission, updateNotification]);

  const forceUpdateNotification = useCallback(() => {
    if (state.currentTrack && notificationPermission === 'granted') {
      console.log('Forçage mise à jour notification pour:', state.currentTrack.title);
      updateNotification();
    }
  }, [state.currentTrack, notificationPermission, updateNotification]);

  // Charger automatiquement toutes les pistes disponibles
  const loadAllTracks = useCallback(async () => {
    try {
      console.log('📚 Chargement de toutes les pistes disponibles...');
      const response = await fetch('/api/tracks');
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Données reçues de l\'API:', data);
        
        // Vérifier que data est un tableau
        if (Array.isArray(data)) {
          setAllTracks(data);
          console.log(`✅ ${data.length} pistes chargées`);
        } else if (data && Array.isArray(data.tracks)) {
          // Si l'API retourne un objet avec une propriété tracks
          setAllTracks(data.tracks);
          console.log(`✅ ${data.tracks.length} pistes chargées (propriété tracks)`);
        } else if (data && Array.isArray(data.data)) {
          // Si l'API retourne un objet avec une propriété data
          setAllTracks(data.data);
          console.log(`✅ ${data.data.length} pistes chargées (propriété data)`);
        } else {
          console.error('❌ Format de données invalide:', data);
          setAllTracks([]);
        }
      } else {
        console.error('❌ Erreur chargement pistes:', response.status, response.statusText);
        setAllTracks([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement pistes:', error);
      setAllTracks([]);
    }
  }, []);

  // Fonction pour forcer le rechargement des pistes
  const reloadAllTracks = useCallback(async () => {
    console.log('🔄 Rechargement forcé des pistes...');
    await loadAllTracks();
  }, [loadAllTracks]);

  // Charger les pistes au démarrage
  useEffect(() => {
    loadAllTracks();
  }, [loadAllTracks]);

  // Debug: Afficher l'état des pistes
  useEffect(() => {
    console.log('📊 État allTracks mis à jour:', {
      count: allTracks.length,
      hasTracks: allTracks.length > 0,
      firstTrack: allTracks[0]?.title || 'Aucune'
    });
  }, [allTracks]);

  // Mémoriser l'objet retourné pour éviter les re-rendus inutiles
  const audioService = useMemo(() => ({
    state,
    queue,
    currentIndex,
    shuffle,
    repeat,
    allTracks,
    autoPlayEnabled,
    notificationPermission,
    isFirstPlay,
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
      forceUpdateNotification,
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
      loadAllTracks,
      reloadAllTracks,
    }
  }), [
    state,
    queue,
    currentIndex,
    shuffle,
    repeat,
    allTracks,
    autoPlayEnabled,
    notificationPermission,
    isFirstPlay,
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
    forceUpdateNotification,
    requestNotificationPermission,
    setQueueAndPlay,
    toggleShuffle,
    cycleRepeat,
    autoPlayNext,
    setAllTracks,
    setAutoPlayEnabled,
    getSimilarTracks,
    getRecommendedTracks,
    getMoodBasedRecommendations,
    loadAllTracks,
    reloadAllTracks,
  ]);

  return audioService;
}; 