import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  loading: boolean;
  error: string | null;
}

interface DataCache<T> {
  [key: string]: CacheEntry<T>;
}

interface UseOptimizedDataOptions {
  cacheDuration?: number;
  retryCount?: number;
  retryDelay?: number;
  enableBackgroundRefresh?: boolean;
}

const DEFAULT_OPTIONS: UseOptimizedDataOptions = {
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  retryCount: 2,
  retryDelay: 1000,
  enableBackgroundRefresh: true,
};

export const useOptimizedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseOptimizedDataOptions = {}
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cache = useRef<DataCache<T>>({});
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const backgroundRefreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Fonction de nettoyage du cache
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    Object.keys(cache.current).forEach(cacheKey => {
      if (now - cache.current[cacheKey].timestamp > opts.cacheDuration!) {
        delete cache.current[cacheKey];
      }
    });
  }, [opts.cacheDuration]);

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const interval = setInterval(cleanupCache, 60000); // Toutes les minutes
    return () => clearInterval(interval);
  }, [cleanupCache]);

  // Fonction de chargement des données avec retry
  const loadData = useCallback(async (forceRefresh = false): Promise<T | null> => {
    const cached = cache.current[key];
    const now = Date.now();

    // Vérifier si on a des données en cache valides
    if (!forceRefresh && cached && !cached.loading && now - cached.timestamp < opts.cacheDuration!) {
      setData(cached.data);
      setError(null);
      return cached.data;
    }

    // Marquer comme en cours de chargement
    setLoading(true);
    setError(null);
    cache.current[key] = { ...cached, loading: true, error: null };

    try {
      const result = await fetcher();
      
      // Mettre en cache
      cache.current[key] = {
        data: result,
        timestamp: now,
        loading: false,
        error: null,
      };

      setData(result);
      setError(null);
      retryCountRef.current = 0;

      // Programmer un rafraîchissement en arrière-plan
      if (opts.enableBackgroundRefresh) {
        backgroundRefreshTimeoutRef.current = setTimeout(() => {
          loadData(true);
        }, opts.cacheDuration! - 30000); // Rafraîchir 30s avant expiration
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      
      // Retry en cas d'échec
      if (retryCountRef.current < opts.retryCount!) {
        retryCountRef.current++;
        setTimeout(() => {
          loadData(forceRefresh);
        }, opts.retryDelay!);
        return null;
      }

      // Échec définitif
      cache.current[key] = {
        ...cached,
        loading: false,
        error: errorMessage,
      };

      setError(errorMessage);
      setLoading(false);
      retryCountRef.current = 0;
      return null;
    }
  }, [key, fetcher, opts]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
    
    return () => {
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, [loadData]);

  // Fonction pour forcer le rafraîchissement
  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  // Fonction pour invalider le cache
  const invalidate = useCallback(() => {
    delete cache.current[key];
    setData(null);
    setError(null);
  }, [key]);

  // Fonction pour mettre à jour les données localement
  const updateData = useCallback((updater: (current: T | null) => T) => {
    const newData = updater(data);
    setData(newData);
    
    if (cache.current[key]) {
      cache.current[key] = {
        ...cache.current[key],
        data: newData,
        timestamp: Date.now(),
      };
    }
  }, [data, key]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    updateData,
    isCached: !!cache.current[key]?.data,
    cacheTimestamp: cache.current[key]?.timestamp,
  };
}; 