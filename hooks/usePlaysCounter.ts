import { useState, useEffect, useCallback, useRef } from 'react';

interface PlaysCounterOptions {
  updateInterval?: number;
  debounceDelay?: number;
  enableAutoUpdate?: boolean;
}

export function usePlaysCounter(
  trackId: string,
  initialPlays: number = 0,
  options: PlaysCounterOptions = {}
) {
  const {
    updateInterval = 30000, // 30 secondes
    debounceDelay = 1000,
    enableAutoUpdate = true
  } = options;

  // Ignorer initialPlays et toujours récupérer la valeur fraîche depuis l'API
  const [plays, setPlays] = useState(0); // Toujours commencer à 0
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  
  const updateTimer = useRef<NodeJS.Timeout | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Fonction pour formater le nombre
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }, []);

  // Fonction pour récupérer les écoutes depuis l'API
  const fetchPlays = useCallback(async () => {
    if (isUpdating || !isMounted.current) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`);
      if (response.ok) {
        const data = await response.json();
        const newPlays = data.plays;
        if (typeof newPlays === 'number' && isMounted.current) {
          setPlays(newPlays); // Toujours utiliser la valeur de l'API
          setLastUpdate(Date.now());
          hasFetched.current = true;
        }
      } else {
        throw new Error('Erreur lors de la récupération des écoutes');
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    } finally {
      if (isMounted.current) {
        setIsUpdating(false);
      }
    }
  }, [trackId, isUpdating]);

  // Fonction pour incrémenter les écoutes
  const incrementPlays = useCallback(async () => {
    if (isUpdating || !isMounted.current) return;

    // Utiliser un debounce pour éviter les appels multiples
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/tracks/${trackId}/plays`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const newPlays = data.plays;
          if (typeof newPlays === 'number' && isMounted.current) {
            setPlays(newPlays); // Toujours utiliser la valeur de l'API
            setLastUpdate(Date.now());
            hasFetched.current = true;
          }
        } else {
          throw new Error('Erreur lors de l\'incrémentation des écoutes');
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (isMounted.current) {
          setIsUpdating(false);
        }
      }
    }, debounceDelay);
  }, [trackId, isUpdating, debounceDelay]);

  // Mise à jour automatique des écoutes
  useEffect(() => {
    if (!enableAutoUpdate) return;

    const updatePlays = () => {
      fetchPlays();
    };

    updateTimer.current = setInterval(updatePlays, updateInterval);

    return () => {
      if (updateTimer.current) {
        clearInterval(updateTimer.current);
      }
    };
  }, [fetchPlays, updateInterval, enableAutoUpdate]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (updateTimer.current) {
        clearInterval(updateTimer.current);
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Réinitialiser quand le trackId change
  useEffect(() => {
    setPlays(0);
    hasFetched.current = false;
  }, [trackId]);

  // Récupérer immédiatement la valeur fraîche au montage
  useEffect(() => {
    if (trackId && !hasFetched.current) {
      fetchPlays();
    }
  }, [trackId, fetchPlays]);

  return {
    plays,
    formattedPlays: formatNumber(plays),
    isUpdating,
    error,
    lastUpdate,
    incrementPlays,
    refreshPlays: fetchPlays,
    formatNumber
  };
} 