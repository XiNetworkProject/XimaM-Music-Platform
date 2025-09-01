import { useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CacheEntry {
  timestamp: number;
  data: any;
  loading: boolean;
}

interface NavigationCache {
  [key: string]: CacheEntry;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PRELOAD_DISTANCE = 2; // Précharger 2 pages à l'avance

export const useOptimizedNavigation = () => {
  const router = useRouter();
  const cache = useRef<NavigationCache>({});
  const preloadQueue = useRef<string[]>([]);
  const isPreloading = useRef(false);

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      Object.keys(cache.current).forEach(key => {
        if (now - cache.current[key].timestamp > CACHE_DURATION) {
          delete cache.current[key];
        }
      });
    };

    const interval = setInterval(cleanup, 60000); // Nettoyer toutes les minutes
    return () => clearInterval(interval);
  }, []);

  // Précharger une page
  const preloadPage = useCallback(async (path: string) => {
    if (cache.current[path]?.loading || cache.current[path]?.data) {
      return;
    }

    cache.current[path] = { timestamp: Date.now(), data: null, loading: true };

    try {
      // Précharger les données de la page
      const response = await fetch(path, {
        method: 'HEAD',
        cache: 'force-cache'
      });

      if (response.ok) {
        cache.current[path] = {
          timestamp: Date.now(),
          data: { exists: true, status: response.status },
          loading: false
        };
      }
    } catch (error) {
      delete cache.current[path];
    }
  }, []);

  // Navigation optimisée
  const navigate = useCallback((path: string, options?: { scroll?: boolean }) => {
    // Vérifier si la page est déjà en cache
    const cached = cache.current[path];
    
    if (cached?.data) {
      // Navigation instantanée si en cache
      router.push(path, { scroll: options?.scroll ?? false });
    } else {
      // Précharger puis naviguer
      preloadPage(path).then(() => {
        router.push(path, { scroll: options?.scroll ?? false });
      });
    }

    // Précharger les pages suivantes
    preloadNextPages(path);
  }, [router, preloadPage]);

  // Précharger les pages suivantes
  const preloadNextPages = useCallback((currentPath: string) => {
    if (isPreloading.current) return;
    isPreloading.current = true;

    const paths = [
      '/',
      '/discover',
      '/library',
      '/community',
      '/settings'
    ];

    const currentIndex = paths.indexOf(currentPath);
    if (currentIndex === -1) {
      isPreloading.current = false;
      return;
    }

    // Précharger les pages à proximité
    const preloadPaths = [];
    for (let i = 1; i <= PRELOAD_DISTANCE; i++) {
      const nextIndex = (currentIndex + i) % paths.length;
      const prevIndex = (currentIndex - i + paths.length) % paths.length;
      
      preloadPaths.push(paths[nextIndex]);
      preloadPaths.push(paths[prevIndex]);
    }

    // Ajouter à la queue de préchargement
    preloadQueue.current.push(...preloadPaths);

    // Traiter la queue
    const processQueue = async () => {
      while (preloadQueue.current.length > 0) {
        const path = preloadQueue.current.shift();
        if (path) {
          await preloadPage(path);
        }
      }
      isPreloading.current = false;
    };

    processQueue();
  }, [preloadPage]);

  // Vérifier si une page est en cache
  const isCached = useCallback((path: string) => {
    return !!cache.current[path]?.data;
  }, []);

  // Obtenir les statistiques du cache
  const getCacheStats = useCallback(() => {
    const entries = Object.keys(cache.current);
    return {
      total: entries.length,
      cached: entries.filter(key => cache.current[key].data).length,
      loading: entries.filter(key => cache.current[key].loading).length
    };
  }, []);

  return {
    navigate,
    preloadPage,
    isCached,
    getCacheStats,
    cache: cache.current
  };
}; 