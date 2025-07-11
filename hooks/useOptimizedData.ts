import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

interface OptimizedDataOptions {
  cacheDuration?: number;
  debounceDelay?: number;
  maxRetries?: number;
}

export function useOptimizedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: OptimizedDataOptions = {}
) {
  const {
    cacheDuration = 30000, // 30 secondes
    debounceDelay = 500,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const retryCount = useRef(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Vérifier le cache
    const cached = cache.current.get(key);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < cacheDuration) {
      setData(cached.data);
      setVersion(cached.version);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      
      // Mettre en cache
      cache.current.set(key, {
        data: result,
        timestamp: Date.now(),
        version: version + 1
      });

      setData(result);
      setVersion(version + 1);
      retryCount.current = 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      
      // Retry automatique
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        setTimeout(() => fetchData(forceRefresh), 1000 * retryCount.current);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, cacheDuration, version, maxRetries]);

  const refresh = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchData(true);
    }, debounceDelay);
  }, [fetchData, debounceDelay]);

  const updateData = useCallback((updater: (prev: T | null) => T) => {
    setData(prev => {
      const newData = updater(prev);
      if (newData) {
        cache.current.set(key, {
          data: newData,
          timestamp: Date.now(),
          version: version + 1
        });
        setVersion(version + 1);
      }
      return newData;
    });
  }, [key, version]);

  // Charger les données au montage
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    version,
    refresh,
    updateData,
    fetchData
  };
} 