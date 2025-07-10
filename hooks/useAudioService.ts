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
          // Service Worker enregistré
        })
        .catch((error) => {
          // Erreur silencieuse
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
    // Contrôle Service Worker
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action });
    }
  }, []);



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
      console.log('🎵 Événement ended déclenché');
      handleTrackEnd();
    };

    const handleError = (e: Event) => {
      console.error('Erreur audio:', e);
      
      // Analyser le type d'erreur
      const audio = audioRef.current;
      let errorMessage = 'Erreur de lecture audio';
      
      if (audio && audio.error) {
        switch (audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Lecture interrompue';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Erreur réseau - impossible de charger l\'audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Format audio non supporté';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Source audio non supportée';
            break;
          default:
            errorMessage = 'Erreur de lecture audio';
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }));
      
      // Réessayer automatiquement après un délai
      setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 3000);
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

  // Charger automatiquement toutes les pistes disponibles
  const loadAllTracks = useCallback(async () => {
    try {
      console.log('🎵 Service audio: Chargement de toutes les pistes...');
      
      // Charger les pistes depuis les mêmes APIs que la page
      const apis = [
        '/api/tracks/popular?limit=20',
        '/api/tracks/trending?limit=10',
        '/api/tracks/recent?limit=10',
        '/api/tracks/most-liked?limit=10',
        '/api/tracks/recommended?limit=10'
      ];
      
      const allTracksPromises = apis.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            return data.tracks || [];
          }
        } catch (error) {
          console.error('Erreur chargement API:', url, error);
        }
        return [];
      });
      
      const allTracksArrays = await Promise.all(allTracksPromises);
      
      // Combiner toutes les pistes et supprimer les doublons
      const tracksMap = new Map<string, Track>();
      
      allTracksArrays.forEach(tracks => {
        tracks.forEach((track: Track) => {
          if (!tracksMap.has(track._id)) {
            tracksMap.set(track._id, track);
          }
        });
      });
      
      const uniqueTracks = Array.from(tracksMap.values());
      console.log('🎵 Service audio: Pistes uniques chargées:', uniqueTracks.length);
      
      setAllTracks(uniqueTracks);
      return uniqueTracks;
      
    } catch (error) {
      console.error('Erreur chargement pistes service audio:', error);
      return [];
    }
  }, []);



  const updateNotification = useCallback(() => {
    if (!('serviceWorker' in navigator) || !state.currentTrack || notificationPermission !== 'granted') {
      // Notification non envoyée
      return;
    }

    // Envoi notification
    const notification = new Notification('XimaM', {
      body: `Lecture de ${state.currentTrack?.title} par ${state.currentTrack?.artist?.name || state.currentTrack?.artist?.username}`,
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
      tag: 'ximam-track',
      requireInteraction: false,
      silent: false
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Auto-fermeture après 5 secondes
    setTimeout(() => {
      notification.close();
    }, 5000);
  }, [state.currentTrack, notificationPermission]);

  const loadTrack = useCallback(async (track: Track) => {
    try {
      // Validation de l'URL audio avec plus de flexibilité
      if (!track.audioUrl) {
        console.warn('Track sans audioUrl:', track._id, track.title);
        throw new Error('URL audio manquante');
      }

      if (track.audioUrl.trim() === '') {
        console.warn('Track avec audioUrl vide:', track._id, track.title);
        throw new Error('URL audio vide');
      }

      // Vérifier que l'URL est accessible (optionnel)
      try {
        const response = await fetch(track.audioUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('Fichier audio potentiellement inaccessible:', track.audioUrl);
          // Ne pas bloquer, juste avertir
        }
      } catch (fetchError) {
        console.warn('Impossible de vérifier l\'URL audio, tentative de chargement direct:', fetchError);
      }

      if (audioRef.current) {
        // Analyser la session d'écoute de la piste précédente
        if (state.currentTrack && state.currentTime > 0) {
          const listenDuration = Math.min(state.currentTime, state.currentTrack.duration);
          recommendations.analyzeListeningSession(state.currentTrack, listenDuration);
        }

        // Forcer l'arrêt de la lecture actuelle
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        // Réinitialiser les erreurs
        setState(prev => ({ ...prev, error: null, isLoading: true }));
        
        // Changer la source audio avec gestion d'erreur
        audioRef.current.src = track.audioUrl;
        
        // Attendre que l'audio soit chargé
        await new Promise((resolve, reject) => {
          if (!audioRef.current) {
            reject(new Error('Élément audio non disponible'));
            return;
          }

          const audio = audioRef.current;
          
          const handleCanPlay = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            resolve(true);
          };

          const handleError = (e: Event) => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            reject(new Error('Erreur de chargement audio'));
          };

          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('error', handleError);
          
          audio.load();
          
          // Timeout de sécurité
          setTimeout(() => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            reject(new Error('Timeout de chargement audio'));
          }, 10000);
        });
        
        setState(prev => ({ 
          ...prev, 
          currentTrack: track,
          currentTime: 0,
          isLoading: false 
        }));
        
        lastTrackId.current = track._id;
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la track:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Erreur de chargement audio',
        isLoading: false 
      }));
      throw error;
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
      // Erreur silencieuse
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

  // Fonction pour incrémenter les écoutes
  const updatePlayCount = useCallback(async (trackId: string) => {
    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Erreur lors de la mise à jour des écoutes');
      }
    } catch (error) {
      console.error('Erreur mise à jour plays:', error);
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
        // Incrémenter les écoutes pour la nouvelle piste
        updatePlayCount(nextTrack._id);
      }
    });
      return;
    }
    
    // Si pas de file d'attente ou une seule piste, utiliser les recommandations
    if (allTracks.length > 0) {
      // Sélection aléatoire intelligente pour la piste suivante
      let nextTrack: Track | null = null;
      
      // 1. Essayer une piste similaire
      if (state.currentTrack && state.currentTrack.genre && state.currentTrack.genre.length > 0) {
        const similarTracks = allTracks.filter(track => 
          track._id !== state.currentTrack!._id && 
          track.genre && 
          track.genre.some(g => state.currentTrack!.genre!.includes(g))
        );
        if (similarTracks.length > 0) {
          nextTrack = similarTracks[Math.floor(Math.random() * similarTracks.length)];
          // Piste similaire sélectionnée
        }
      }
      
      // 2. Essayer une recommandation personnalisée
      if (!nextTrack && session && session.user && session.user.id) {
        const recommendedTracks = allTracks.filter(track => 
          track._id !== state.currentTrack?._id && 
          track.likes.includes(session.user.id)
        );
        if (recommendedTracks.length > 0) {
          nextTrack = recommendedTracks[Math.floor(Math.random() * recommendedTracks.length)];
          // Recommandation personnalisée sélectionnée
        }
      }
      
      // 3. Essayer une piste populaire
      if (!nextTrack) {
        const popularTracks = allTracks.filter(track => 
          track._id !== state.currentTrack?._id && 
          track.likes.length > 5
        );
        if (popularTracks.length > 0) {
          nextTrack = popularTracks[Math.floor(Math.random() * popularTracks.length)];
          // Piste populaire sélectionnée
        }
      }
      
      // 4. Piste aléatoire
      if (!nextTrack) {
        const availableTracks = allTracks.filter(track => track._id !== state.currentTrack?._id);
        if (availableTracks.length > 0) {
          nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
          // Piste aléatoire sélectionnée
        }
      }
      
      if (nextTrack) {
        // Charger et jouer la nouvelle piste
        loadTrack(nextTrack).then(() => {
          if (state.isPlaying) {
            play();
          }
        });
        setCurrentIndex(allTracks.findIndex(track => track._id === nextTrack!._id));
      } else {
        // Aucune piste disponible pour la lecture
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    } else {
      // Aucune piste disponible dans la bibliothèque
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [queue, shuffledQueue, currentIndex, shuffle, repeat, state.isPlaying, state.currentTrack, allTracks, loadTrack, play, stop, session]);

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
        // Incrémenter les écoutes pour la nouvelle piste
        updatePlayCount(prevTrack._id);
      }
    });
      return;
    }
    
    // Si pas de file d'attente ou une seule piste, utiliser les recommandations
    if (allTracks.length > 0) {
      // Sélection aléatoire intelligente pour la piste précédente
      let prevTrack: Track | null = null;
      
      // 1. Essayer une piste similaire
      if (state.currentTrack && state.currentTrack.genre && state.currentTrack.genre.length > 0) {
        const similarTracks = allTracks.filter(track => 
          track._id !== state.currentTrack!._id && 
          track.genre && 
          track.genre.some(g => state.currentTrack!.genre!.includes(g))
        );
        if (similarTracks.length > 0) {
          prevTrack = similarTracks[Math.floor(Math.random() * similarTracks.length)];
          // Piste similaire sélectionnée
        }
      }
      
      // 2. Essayer une recommandation personnalisée
      if (!prevTrack && session && session.user && session.user.id) {
        const recommendedTracks = allTracks.filter(track => 
          track._id !== state.currentTrack?._id && 
          track.likes.includes(session.user.id)
        );
        if (recommendedTracks.length > 0) {
          prevTrack = recommendedTracks[Math.floor(Math.random() * recommendedTracks.length)];
          // Recommandation personnalisée sélectionnée
        }
      }
      
      // 3. Essayer une piste populaire
      if (!prevTrack) {
        const popularTracks = allTracks.filter(track => 
          track._id !== state.currentTrack?._id && 
          track.likes.length > 5
        );
        if (popularTracks.length > 0) {
          prevTrack = popularTracks[Math.floor(Math.random() * popularTracks.length)];
          // Piste populaire sélectionnée
        }
      }
      
      // 4. Piste aléatoire
      if (!prevTrack) {
        const availableTracks = allTracks.filter(track => track._id !== state.currentTrack?._id);
        if (availableTracks.length > 0) {
          prevTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
          // Piste aléatoire sélectionnée
        }
      }
      
      if (prevTrack) {
        // Charger et jouer la nouvelle piste
        loadTrack(prevTrack).then(() => {
          if (state.isPlaying) {
            play();
          }
        });
        setCurrentIndex(allTracks.findIndex(track => track._id === prevTrack!._id));
      } else {
        // Aucune piste disponible pour la lecture
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    } else {
      // Aucune piste disponible dans la bibliothèque
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [queue, shuffledQueue, currentIndex, shuffle, repeat, state.isPlaying, state.currentTrack, allTracks, loadTrack, play, stop, session]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      // Notifications non supportées
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
      // Erreur silencieuse
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
      // Mise à jour notification
    }
  }, [state.currentTrack, notificationPermission, updateNotification]);

  // Fonction pour forcer le rechargement des pistes
  const reloadAllTracks = useCallback(async () => {
    // Rechargement forcé des pistes
    const tracks = await loadAllTracks();
    
    // État allTracks mis à jour
    return tracks;
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

  // Fonction pour gérer la fin d'une piste
  const handleTrackEnd = useCallback(() => {
    console.log('🎵 Fin de piste détectée, auto-play activé');
    
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          console.log('Erreur lors de la répétition de la piste');
        });
      }
    } else if (repeat === 'all' || queue.length > 1) {
      nextTrack();
    } else {
      // Auto-play automatique pour toutes les pistes (pas seulement les playlists)
      if (allTracks.length === 0) {
        console.log('Chargement des pistes pour auto-play...');
        loadAllTracks().then((loadedTracks) => {
          console.log('Pistes chargées pour auto-play:', loadedTracks.length);
          // Après chargement, essayer de jouer une piste aléatoire
          if (loadedTracks && loadedTracks.length > 0) {
            const randomTrack = loadedTracks[Math.floor(Math.random() * loadedTracks.length)];
            console.log('Auto-play: Piste aléatoire sélectionnée:', randomTrack.title);
            loadTrack(randomTrack).then(() => {
              play();
              updatePlayCount(randomTrack._id);
            }).catch((error) => {
              console.error('Erreur lors du chargement de la piste auto-play:', error);
            });
          } else {
            console.log('Aucune piste disponible après chargement');
            setState(prev => ({ ...prev, isPlaying: false }));
          }
        }).catch((error) => {
          console.error('Erreur lors du chargement des pistes pour auto-play:', error);
          setState(prev => ({ ...prev, isPlaying: false }));
        });
        return;
      }
      
      // Sélection intelligente de la piste suivante
      let autoPlayNextTrack: Track | null = null;
      console.log('🎯 Sélection intelligente - Pistes disponibles:', allTracks.length);
      
      // 1. Essayer une piste similaire
      if (state.currentTrack && state.currentTrack.genre && state.currentTrack.genre.length > 0) {
        const similarTracks = allTracks.filter(track => 
          track._id !== state.currentTrack!._id && 
          track.genre && 
          track.genre.some(g => state.currentTrack!.genre!.includes(g))
        );
        console.log('🎵 Pistes similaires trouvées:', similarTracks.length);
        if (similarTracks.length > 0) {
          autoPlayNextTrack = similarTracks[Math.floor(Math.random() * similarTracks.length)];
          console.log('Auto-play: Piste similaire sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      // 2. Essayer une recommandation personnalisée
      if (!autoPlayNextTrack && session && session.user && session.user.id) {
        const recommendedTracks = allTracks.filter(track => 
          track._id !== state.currentTrack?._id && 
          track.likes.includes(session.user.id)
        );
        if (recommendedTracks.length > 0) {
          autoPlayNextTrack = recommendedTracks[Math.floor(Math.random() * recommendedTracks.length)];
          console.log('Auto-play: Recommandation personnalisée sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      // 3. Essayer une piste populaire
      if (!autoPlayNextTrack) {
        const popularTracks = allTracks.filter(track => 
          track._id !== state.currentTrack?._id && 
          track.likes.length > 5
        );
        if (popularTracks.length > 0) {
          autoPlayNextTrack = popularTracks[Math.floor(Math.random() * popularTracks.length)];
          console.log('Auto-play: Piste populaire sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      // 4. Piste aléatoire (fallback)
      if (!autoPlayNextTrack) {
        const availableTracks = allTracks.filter(track => track._id !== state.currentTrack?._id);
        if (availableTracks.length > 0) {
          autoPlayNextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
          console.log('Auto-play: Piste aléatoire sélectionnée:', autoPlayNextTrack.title);
        }
      }
      
      if (autoPlayNextTrack) {
        // Charger et jouer la nouvelle piste
        console.log('🎵 Auto-play de la piste suivante:', autoPlayNextTrack.title);
        loadTrack(autoPlayNextTrack).then(() => {
          play();
          updatePlayCount(autoPlayNextTrack._id);
        }).catch((error) => {
          console.error('Erreur lors du chargement de la piste auto-play:', error);
          // Essayer une autre piste en cas d'erreur
          const availableTracks = allTracks.filter(track => 
            track._id !== state.currentTrack?._id && 
            track._id !== autoPlayNextTrack._id
          );
          if (availableTracks.length > 0) {
            const fallbackTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
            console.log('🎵 Auto-play fallback:', fallbackTrack.title);
            loadTrack(fallbackTrack).then(() => {
              play();
              updatePlayCount(fallbackTrack._id);
            }).catch((fallbackError) => {
              console.error('Erreur fallback auto-play:', fallbackError);
              setState(prev => ({ ...prev, isPlaying: false }));
            });
          } else {
            setState(prev => ({ ...prev, isPlaying: false }));
          }
        });
        setCurrentIndex(allTracks.findIndex(track => track._id === autoPlayNextTrack!._id));
      } else {
        // Aucune piste disponible, arrêter la lecture
        console.log('Aucune piste disponible pour auto-play');
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    }
  }, [repeat, queue.length, allTracks.length, state.currentTrack, session, allTracks, loadAllTracks, loadTrack, play, updatePlayCount, nextTrack]);

  return audioService;
}; 