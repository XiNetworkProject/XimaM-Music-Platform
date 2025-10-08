import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import { usePlaysContext } from '@/contexts/PlaysContext';

interface PlaysState {
  plays: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface UsePlaysSystemProps {
  trackId: string;
  initialPlays?: number;
  onUpdate?: (state: PlaysState) => void;
  autoSync?: boolean;
  syncInterval?: number;
}

interface PlaysResponse {
  success: boolean;
  plays: number;
  track?: any;
  message?: string;
}

// Cache global pour éviter les appels multiples
const playsCache = new Map<string, PlaysState>();
const pendingUpdates = new Set<string>();
const updateQueue = new Map<string, NodeJS.Timeout>();

export function usePlaysSystem({
  trackId,
  initialPlays = 0,
  onUpdate,
  autoSync = true,
  syncInterval = 30000
}: UsePlaysSystemProps) {
  const { data: session } = useSession();
  const { getPlays, updatePlays, syncPlays } = usePlaysContext();
  
  // Utiliser l'état global du contexte
  const globalState = getPlays(trackId);
  const [state, setState] = useState<PlaysState>({
    plays: globalState?.plays ?? initialPlays,
    isLoading: false,
    error: null,
    lastUpdated: Date.now()
  });

  const isMounted = useRef(true);
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  // Formater le nombre d'écoutes
  const formatPlays = useCallback((num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }, []);

  // Récupérer les écoutes depuis l'API
  const fetchPlays = useCallback(async () => {
    if (!trackId || !isMounted.current) return;

    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      if (response.ok) {
        const data: PlaysResponse = await response.json();
        const newState = {
          plays: data.plays,
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        };

        if (isMounted.current) {
          setState(newState);
          playsCache.set(trackId, newState);
          onUpdate?.(newState);
          
          // Mettre à jour le contexte global
          updatePlays(trackId, newState.plays, false, null);
        }
      } else {
        throw new Error('Erreur lors de la récupération des écoutes');
      }
    } catch (error) {
      if (isMounted.current) {
        const errorState = {
          ...state,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        };
        setState(errorState);
        onUpdate?.(errorState);
      }
    }
  }, [trackId, onUpdate]);

  // Incrémenter les écoutes avec gestion des doublons
  const incrementPlays = useCallback(async () => {
    if (!trackId || !session?.user?.id || !isMounted.current) {
      if (!session?.user?.id) {
        notify.error('Connexion requise', 'Connectez-vous pour que vos écoutes soient comptabilisées');
      }
      return;
    }

    // Éviter les doublons
    if (pendingUpdates.has(trackId)) {
      console.log(`🚫 Incrémentation déjà en cours pour ${trackId}`);
      return;
    }

    // Marquer comme en cours
    pendingUpdates.add(trackId);

    // Optimistic update
    const optimisticState = {
      plays: state.plays + 1,
      isLoading: true,
      error: null,
      lastUpdated: Date.now()
    };

    setState(optimisticState);
    onUpdate?.(optimisticState);

    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
      });

      if (response.ok) {
        const data: PlaysResponse = await response.json();
        const newState = {
          plays: data.plays,
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        };

        if (isMounted.current) {
          setState(newState);
          playsCache.set(trackId, newState);
          onUpdate?.(newState);
          
          // Mettre à jour le contexte global avec les vraies données
          syncPlays(trackId, newState.plays);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de l\'incrémentation');
      }
    } catch (error) {
      if (isMounted.current) {
        // Rollback en cas d'erreur
        const errorState = {
          plays: state.plays,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          lastUpdated: Date.now()
        };
        setState(errorState);
        onUpdate?.(errorState);
        notify.error('Erreur comptage', 'Erreur lors du comptage des écoutes');
      }
    } finally {
      // Retirer du suivi après un délai
      setTimeout(() => {
        pendingUpdates.delete(trackId);
      }, 5000);
    }
  }, [trackId, session?.user?.id, state.plays, onUpdate]);

  // Synchronisation automatique
  useEffect(() => {
    if (!autoSync || !trackId) return;

    // Récupérer depuis le cache si disponible
    const cachedState = playsCache.get(trackId);
    if (cachedState && Date.now() - cachedState.lastUpdated < 60000) {
      setState(cachedState);
      onUpdate?.(cachedState);
    } else {
      fetchPlays();
    }

    // Synchronisation périodique
    syncTimer.current = setInterval(fetchPlays, syncInterval);

    return () => {
      if (syncTimer.current) {
        clearInterval(syncTimer.current);
      }
    };
  }, [trackId, autoSync, syncInterval, fetchPlays, onUpdate]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (syncTimer.current) {
        clearInterval(syncTimer.current);
      }
    };
  }, []);

  return {
    ...state,
    formattedPlays: formatPlays(state.plays),
    incrementPlays,
    fetchPlays,
    formatPlays
  };
}

// Hook pour gérer les écoutes en batch (pour les listes)
export function useBatchPlaysSystem() {
  const { data: session } = useSession();
  const [batchLoading, setBatchLoading] = useState<Set<string>>(new Set());

  const incrementPlaysBatch = useCallback(async (trackId: string, currentPlays: number) => {
    if (!session?.user?.id) {
      notify.error('Connexion requise', 'Connectez-vous pour que vos écoutes soient comptabilisées');
      return;
    }

    if (batchLoading.has(trackId)) return;

    setBatchLoading(prev => new Set(prev).add(trackId));

    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'incrémentation');
      }

      const data: PlaysResponse = await response.json();
      
      // Mettre à jour le cache
      const newState = {
        plays: data.plays,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      };
      playsCache.set(trackId, newState);

      return data;

    } catch (error) {
      console.error('Erreur incrémentation batch:', error);
      notify.error('Erreur comptage', 'Erreur lors du comptage des écoutes');
      throw error;
    } finally {
      setBatchLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
    }
  }, [session?.user?.id, batchLoading]);

  return {
    incrementPlaysBatch,
    isBatchLoading: (trackId: string) => batchLoading.has(trackId)
  };
}

// Fonction utilitaire pour nettoyer le cache
export function clearPlaysCache(trackId?: string) {
  if (trackId) {
    playsCache.delete(trackId);
    pendingUpdates.delete(trackId);
    const timeout = updateQueue.get(trackId);
    if (timeout) {
      clearTimeout(timeout);
      updateQueue.delete(trackId);
    }
  } else {
    playsCache.clear();
    pendingUpdates.clear();
    updateQueue.forEach(timeout => clearTimeout(timeout));
    updateQueue.clear();
  }
} 