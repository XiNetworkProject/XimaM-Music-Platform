import { useState, useEffect, useCallback, useRef } from 'react';

interface TrackStats {
  likes: number;
  comments: number;
  plays: number;
}

interface UseOptimizedDataOptions {
  trackId: string;
  initialStats: TrackStats;
  refreshInterval?: number;
  enableCache?: boolean;
}

export function useOptimizedData({
  trackId,
  initialStats,
  refreshInterval = 30000, // 30 secondes
  enableCache = true
}: UseOptimizedDataOptions) {
  const [stats, setStats] = useState<TrackStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const cacheRef = useRef<Map<string, { data: TrackStats; timestamp: number }>>(new Map());

  // Validation des données
  const validateStats = useCallback((data: any): TrackStats => {
    return {
      likes: typeof data.likes === 'number' && data.likes >= 0 ? data.likes : 0,
      comments: typeof data.comments === 'number' && data.comments >= 0 ? data.comments : 0,
      plays: typeof data.plays === 'number' && data.plays >= 0 ? data.plays : 0
    };
  }, []);

  // Charger les données depuis l'API
  const loadStats = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    const cacheKey = `stats_${trackId}`;
    const cached = cacheRef.current.get(cacheKey);

    // Vérifier le cache si activé et pas de refresh forcé
    if (enableCache && !forceRefresh && cached && (now - cached.timestamp) < refreshInterval) {
      setStats(cached.data);
      return;
    }

    // Éviter les requêtes multiples
    if (isLoading && !forceRefresh) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tracks/${trackId}`);
      if (response.ok) {
        const data = await response.json();
        const validatedStats = validateStats({
          likes: data.likes?.length || 0,
          comments: data.comments?.length || 0,
          plays: data.plays || 0
        });

        setStats(validatedStats);
        lastUpdateRef.current = now;

        // Mettre en cache
        if (enableCache) {
          cacheRef.current.set(cacheKey, {
            data: validatedStats,
            timestamp: now
          });
        }
      } else {
        throw new Error('Erreur lors du chargement des statistiques');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur chargement stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [trackId, refreshInterval, enableCache, isLoading, validateStats]);

  // Mettre à jour une statistique spécifique
  const updateStat = useCallback((key: keyof TrackStats, value: number) => {
    setStats(prev => ({
      ...prev,
      [key]: Math.max(0, value) // Empêcher les valeurs négatives
    }));
  }, []);

  // Mettre à jour les statistiques avec validation
  const updateStats = useCallback((newStats: Partial<TrackStats>) => {
    setStats(prev => {
      const updated = { ...prev };
      Object.entries(newStats).forEach(([key, value]) => {
        if (typeof value === 'number' && value >= 0) {
          updated[key as keyof TrackStats] = value;
        }
      });
      return updated;
    });
  }, []);

  // Charger les données au montage
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Rafraîchissement automatique
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loadStats, refreshInterval]);

  // Nettoyer le cache périodiquement
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(cacheRef.current.entries());
      entries.forEach(([key, value]) => {
        if (now - value.timestamp > refreshInterval * 2) {
          cacheRef.current.delete(key);
        }
      });
    }, refreshInterval);

    return () => clearInterval(cleanupInterval);
  }, [refreshInterval]);

  return {
    stats,
    isLoading,
    error,
    loadStats,
    updateStat,
    updateStats,
    lastUpdate: lastUpdateRef.current
  };
} 