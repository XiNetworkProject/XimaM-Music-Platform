'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface PlaysState {
  [trackId: string]: {
    plays: number;
    lastUpdated: number;
    isLoading: boolean;
    error: string | null;
  };
}

interface PlaysContextType {
  playsState: PlaysState;
  updatePlays: (trackId: string, plays: number, isLoading?: boolean, error?: string | null) => void;
  getPlays: (trackId: string) => { plays: number; isLoading: boolean; error: string | null } | null;
  clearPlays: (trackId?: string) => void;
  syncPlays: (trackId: string, plays: number) => void;
  incrementPlays: (trackId: string) => void;
}

const PlaysContext = createContext<PlaysContextType | undefined>(undefined);

export function PlaysProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [playsState, setPlaysState] = useState<PlaysState>({});

  // Mettre à jour l'état des écoutes
  const updatePlays = useCallback((trackId: string, plays: number, isLoading = false, error: string | null = null) => {
    setPlaysState(prev => ({
      ...prev,
      [trackId]: {
        plays,
        lastUpdated: Date.now(),
        isLoading,
        error
      }
    }));
  }, []);

  // Obtenir l'état des écoutes
  const getPlays = useCallback((trackId: string) => {
    const state = playsState[trackId];
    if (!state) return null;

    // Vérifier si l'état n'est pas trop ancien (5 minutes)
    const isExpired = Date.now() - state.lastUpdated > 5 * 60 * 1000;
    if (isExpired) {
      // Nettoyer l'état expiré
      setPlaysState(prev => {
        const newState = { ...prev };
        delete newState[trackId];
        return newState;
      });
      return null;
    }

    return {
      plays: state.plays,
      isLoading: state.isLoading,
      error: state.error
    };
  }, [playsState]);

  // Nettoyer l'état des écoutes
  const clearPlays = useCallback((trackId?: string) => {
    if (trackId) {
      setPlaysState(prev => {
        const newState = { ...prev };
        delete newState[trackId];
        return newState;
      });
    } else {
      setPlaysState({});
    }
  }, []);

  // Synchroniser les écoutes (pour les mises à jour en temps réel)
  const syncPlays = useCallback((trackId: string, plays: number) => {
    updatePlays(trackId, plays);
  }, [updatePlays]);

  // Incrémenter les écoutes
  const incrementPlays = useCallback(async (trackId: string) => {
    if (!session?.user?.id) return;

    // Optimistic update
    const currentState = getPlays(trackId);
    const currentPlays = currentState?.plays || 0;
    updatePlays(trackId, currentPlays + 1, true);

    try {
      const response = await fetch(`/api/tracks/${trackId}/plays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        updatePlays(trackId, data.plays, false, null);
      } else {
        // Rollback en cas d'erreur
        updatePlays(trackId, currentPlays, false, 'Erreur lors de l\'incrémentation');
      }
    } catch (error) {
      // Rollback en cas d'erreur
      updatePlays(trackId, currentPlays, false, 'Erreur réseau');
    }
  }, [session?.user?.id, getPlays, updatePlays]);

  // Nettoyer les états expirés périodiquement
  const cleanupExpiredStates = useCallback(() => {
    const now = Date.now();
    const expiredThreshold = 5 * 60 * 1000; // 5 minutes

    setPlaysState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(trackId => {
        if (now - newState[trackId].lastUpdated > expiredThreshold) {
          delete newState[trackId];
        }
      });
      return newState;
    });
  }, []);

  // Nettoyer périodiquement
  useState(() => {
    const interval = setInterval(cleanupExpiredStates, 60000); // Toutes les minutes
    return () => clearInterval(interval);
  });

  // Nettoyer quand la session change
  useState(() => {
    if (!session?.user?.id) {
      clearPlays();
    }
  });

  const value: PlaysContextType = {
    playsState,
    updatePlays,
    getPlays,
    clearPlays,
    syncPlays,
    incrementPlays
  };

  return (
    <PlaysContext.Provider value={value}>
      {children}
    </PlaysContext.Provider>
  );
}

export function usePlaysContext() {
  const context = useContext(PlaysContext);
  if (context === undefined) {
    throw new Error('usePlaysContext must be used within a PlaysProvider');
  }
  return context;
}

// Hook utilitaire pour obtenir l'état des écoutes avec fallback
export function useTrackPlays(trackId: string, fallbackPlays = 0) {
  const { getPlays } = usePlaysContext();
  
  const state = getPlays(trackId);
  
  return {
    plays: state?.plays ?? fallbackPlays,
    isLoading: state?.isLoading ?? false,
    error: state?.error ?? null,
    hasCachedState: state !== null
  };
} 