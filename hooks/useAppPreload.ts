'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getCdnUrl, applyCdnToTracks } from '@/lib/cdn';

interface PreloadState {
  isLoading: boolean;
  progress: number;
  currentTask: string;
  error: string | null;
}

interface PreloadedData {
  session: any;
  // Page d'accueil
  featuredTracks: any[];
  trendingTracks: any[];
  popularTracks: any[];
  recentTracks: any[];
  forYouTracks: any[];
  recommendedTracks: any[];
  followingTracks: any[];
  // Discover
  discoverTracks: any[];
  // Navigation & communauté
  popularUsers: any[];
  genres: any[];
  communityStats?: any;
  // Utilisateur (si connecté)
  aiLibrary?: any[];
  credits?: number;
  playlists?: any[];
  favorites?: any[];
  userStats?: any;
  // Assets
  preloadedImages?: string[];
  preloadedAudios?: string[];
}

const CACHE_DURATION = 5 * 60 * 1000;
const CACHE_KEY = 'xima_preload_cache';

interface CacheEntry {
  data: PreloadedData;
  timestamp: number;
}

export function useAppPreload() {
  const { data: session, status: sessionStatus } = useSession();
  const [state, setState] = useState<PreloadState>({
    isLoading: true, // Toujours commencer avec isLoading = true pour afficher le splash
    progress: 0,
    currentTask: 'Initialisation...',
    error: null,
  });
  const hasStartedPreload = useRef(false);
  const isLoadingRef = useRef(false);

  // Précharger le DNS et établir la connexion au CDN Bunny au montage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN || 'synaura-cdn.b-cdn.net';
      
      // Vérifier si les liens existent déjà
      const existingDns = document.querySelector(`link[rel="dns-prefetch"][href*="${cdnDomain}"]`);
      const existingPreconnect = document.querySelector(`link[rel="preconnect"][href*="${cdnDomain}"]`);
      
      if (!existingDns) {
        const dnsLink = document.createElement('link');
        dnsLink.rel = 'dns-prefetch';
        dnsLink.href = `https://${cdnDomain}`;
        document.head.appendChild(dnsLink);
      }
      
      if (!existingPreconnect) {
        const preconnectLink = document.createElement('link');
        preconnectLink.rel = 'preconnect';
        preconnectLink.href = `https://${cdnDomain}`;
        preconnectLink.crossOrigin = 'anonymous';
        document.head.appendChild(preconnectLink);
      }
    }
  }, []);

  const updateProgress = useCallback((progress: number, task: string) => {
    setState(prev => ({ ...prev, progress, currentTask: task }));
  }, []);

  const saveToCache = useCallback((data: PreloadedData) => {
    try {
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Erreur sauvegarde cache:', error);
    }
  }, []);

  const loadFromCache = useCallback((): PreloadedData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const entry: CacheEntry = JSON.parse(cached);
      if (Date.now() - entry.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.warn('Erreur chargement cache:', error);
      return null;
    }
  }, []);

  const preloadData = useCallback(async (useCache = true): Promise<PreloadedData> => {
    // Éviter les exécutions multiples
    if (isLoadingRef.current) {
      const cached = loadFromCache();
      if (cached) return cached;
      
      return {
        session: null,
        featuredTracks: [],
        trendingTracks: [],
        popularTracks: [],
        recentTracks: [],
        forYouTracks: [],
        recommendedTracks: [],
        followingTracks: [],
        discoverTracks: [],
        popularUsers: [],
        genres: [],
      };
    }
    
    isLoadingRef.current = true;
    
    // Toujours afficher le splash screen au début
    setState({
      isLoading: true,
      progress: 0,
      currentTask: 'Initialisation...',
      error: null,
    });

    // Petit délai pour s'assurer que le splash screen s'affiche
    await new Promise(resolve => setTimeout(resolve, 300));

    if (useCache) {
      const cached = loadFromCache();
      if (cached) {
        // Afficher brièvement le splash avec le cache trouvé (mais minimum 800ms d'affichage)
        updateProgress(100, 'Chargement terminé');
        await new Promise(resolve => setTimeout(resolve, 500));
        setState(prev => ({ ...prev, isLoading: false, progress: 100 }));
        isLoadingRef.current = false;
        return cached;
      }
    }

    setState({
      isLoading: true,
      progress: 0,
      currentTask: 'Préparation...',
      error: null,
    });

    const preloaded: PreloadedData = {
      session: null,
      featuredTracks: [],
      trendingTracks: [],
      popularTracks: [],
      recentTracks: [],
      forYouTracks: [],
      recommendedTracks: [],
      followingTracks: [],
      discoverTracks: [],
      popularUsers: [],
      genres: [],
    };

    try {
      updateProgress(10, 'Authentification...');
      
      if (sessionStatus === 'loading') {
        await new Promise<void>(resolve => {
          const check = setInterval(() => {
            if (sessionStatus !== 'loading') {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });
      }

      preloaded.session = session;
      updateProgress(20, 'Chargement de la page d\'accueil...');

      // Phase 1: Données critiques de la page d'accueil (priorité haute)
      const [featuredRes, trendingRes, popularRes, recentRes] = await Promise.allSettled([
        fetch('/api/tracks/featured?limit=10', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tracks/trending?limit=30', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tracks/popular?limit=30', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tracks/recent?limit=30', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (featuredRes.status === 'fulfilled' && featuredRes.value?.tracks) {
        preloaded.featuredTracks = applyCdnToTracks(featuredRes.value.tracks);
      }
      if (trendingRes.status === 'fulfilled' && trendingRes.value?.tracks) {
        preloaded.trendingTracks = applyCdnToTracks(trendingRes.value.tracks);
      }
      if (popularRes.status === 'fulfilled' && popularRes.value?.tracks) {
        preloaded.popularTracks = applyCdnToTracks(popularRes.value.tracks);
      }
      if (recentRes.status === 'fulfilled' && recentRes.value?.tracks) {
        preloaded.recentTracks = applyCdnToTracks(recentRes.value.tracks);
      }

      updateProgress(35, 'Chargement des pages supplémentaires...');

      // Phase 2: Données pour navigation et autres pages (en parallèle)
      const [forYouRes, recommendedRes, followingRes, discoverRes, usersRes, genresRes] = await Promise.allSettled([
        fetch('/api/ranking/feed?limit=30&ai=1', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tracks/recommended?limit=20', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        session?.user?.id 
          ? fetch('/api/tracks/following?limit=20', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null)
          : Promise.resolve(null),
        fetch('/api/tracks?limit=50', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/users/popular?limit=20', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/genres', { headers: { 'Cache-Control': 'max-age=600' } }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (forYouRes.status === 'fulfilled' && forYouRes.value?.tracks) {
        preloaded.forYouTracks = applyCdnToTracks(forYouRes.value.tracks);
      }
      if (recommendedRes.status === 'fulfilled' && recommendedRes.value?.tracks) {
        preloaded.recommendedTracks = applyCdnToTracks(recommendedRes.value.tracks);
      }
      if (followingRes.status === 'fulfilled' && followingRes.value?.tracks && session?.user?.id) {
        preloaded.followingTracks = applyCdnToTracks(followingRes.value.tracks);
      }
      if (discoverRes.status === 'fulfilled' && discoverRes.value?.tracks) {
        preloaded.discoverTracks = applyCdnToTracks(discoverRes.value.tracks);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value?.users) {
        preloaded.popularUsers = usersRes.value.users;
      }
      if (genresRes.status === 'fulfilled' && genresRes.value?.genres) {
        preloaded.genres = genresRes.value.genres;
      }

      updateProgress(50, 'Préchargement des images et audio...');

      // Collecter toutes les pistes pour précharger les images et audio
      const allTracks = [
        ...preloaded.featuredTracks,
        ...preloaded.trendingTracks,
        ...preloaded.popularTracks,
        ...preloaded.recentTracks,
        ...preloaded.forYouTracks.slice(0, 10), // Limiter pour le player TikTok
        ...preloaded.discoverTracks.slice(0, 10),
      ];
      
      const imageUrls: string[] = [];
      const audioUrls: string[] = [];
      
      // Récupérer les URLs d'images et audio (déjà converties en CDN)
      allTracks.forEach(track => {
        if (track.cover_url || track.coverUrl) {
          const url = track.cover_url || track.coverUrl;
          if (url && !imageUrls.includes(url)) {
            imageUrls.push(url);
          }
        }
        if (track.artist?.avatar) {
          if (!imageUrls.includes(track.artist.avatar)) {
            imageUrls.push(track.artist.avatar);
          }
        }
        // Précharger les premières pistes audio pour le player TikTok
        if (track.audio_url || track.audioUrl || track.stream_audio_url) {
          const audioUrl = track.audio_url || track.audioUrl || track.stream_audio_url;
          if (audioUrl && audioUrls.length < 5) {
            audioUrls.push(audioUrl);
          }
        }
      });

      // Précharger les images CDN en parallèle (limité à 30 pour améliorer les performances)
      const imagesToPreload = imageUrls.slice(0, 30);
      
      // Ajouter les link preload dans le DOM pour le navigateur
      if (typeof document !== 'undefined') {
        imagesToPreload.slice(0, 15).forEach(url => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = url;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        });
      }
      
      // Précharger les images via Image() pour réchauffer le cache CDN
      await Promise.allSettled(
        imagesToPreload.map(url => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Continuer même en cas d'erreur
            img.src = url;
            setTimeout(() => resolve(), 2000); // Timeout réduit pour CDN plus rapide
          });
        })
      );

      preloaded.preloadedImages = imagesToPreload;

      // Précharger les premières pistes audio CDN pour le player TikTok (en arrière-plan)
      preloaded.preloadedAudios = audioUrls;
      
      // Ajouter les link preload pour les audios aussi
      if (typeof document !== 'undefined') {
        audioUrls.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'audio';
          link.href = url;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        });
      }
      
      // Précharger les métadonnées audio pour réchauffer le cache CDN
      Promise.allSettled(
        audioUrls.map(url => {
          return new Promise<void>((resolve) => {
            const audio = new Audio();
            audio.crossOrigin = 'anonymous';
            audio.preload = 'metadata'; // Précharger seulement les métadonnées
            audio.onloadedmetadata = () => resolve();
            audio.onerror = () => resolve();
            audio.src = url;
            setTimeout(() => resolve(), 3000); // Timeout réduit
          });
        })
      ).catch(() => {}); // Ignorer les erreurs, c'est optionnel

      updateProgress(65, 'Données utilisateur...');

      // Phase 3: Données utilisateur (si connecté)
      if (session?.user?.id) {
        const [libraryRes, creditsRes, playlistsRes, statsRes, favoritesRes, userStatsRes] = await Promise.allSettled([
          fetch('/api/ai/library?limit=15', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/billing/credits', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/playlists?user=${session.user.id}&limit=15`, { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/stats/community', { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/tracks/favorites?user=${session.user.id}&limit=20`, { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/users/${session.user.username}`, { headers: { 'Cache-Control': 'max-age=300' } }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (libraryRes.status === 'fulfilled' && libraryRes.value) {
          preloaded.aiLibrary = libraryRes.value.generations || libraryRes.value;
        }
        if (creditsRes.status === 'fulfilled' && creditsRes.value) {
          preloaded.credits = creditsRes.value.balance || creditsRes.value.credits || 0;
        }
        if (playlistsRes.status === 'fulfilled' && playlistsRes.value?.playlists) {
          preloaded.playlists = playlistsRes.value.playlists;
        }
        if (statsRes.status === 'fulfilled' && statsRes.value) {
          preloaded.communityStats = statsRes.value;
        }
        if (favoritesRes.status === 'fulfilled' && favoritesRes.value?.tracks) {
          preloaded.favorites = favoritesRes.value.tracks;
        }
        if (userStatsRes.status === 'fulfilled' && userStatsRes.value) {
          preloaded.userStats = userStatsRes.value;
        }
      }

      updateProgress(90, 'Finalisation...');

      saveToCache(preloaded);

      setState({
        isLoading: false,
        progress: 100,
        currentTask: 'Terminé',
        error: null,
      });

      isLoadingRef.current = false;
      return preloaded;
    } catch (error: any) {
      const errorMsg = error?.message || 'Erreur de préchargement';
      setState({
        isLoading: false,
        progress: 0,
        currentTask: '',
        error: errorMsg,
      });
      
      isLoadingRef.current = false;
      return preloaded;
    }
  }, [session, sessionStatus, updateProgress, saveToCache, loadFromCache]);

  useEffect(() => {
    // S'exécuter une seule fois au montage - ne pas dépendre de preloadData
    if (!hasStartedPreload.current && sessionStatus !== 'loading') {
      hasStartedPreload.current = true;
      preloadData(true);
    }
  }, [sessionStatus]);

  const refresh = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    return await preloadData(false);
  }, [preloadData]);

  return {
    ...state,
    preloadData,
    refresh,
    loadFromCache,
  };
}