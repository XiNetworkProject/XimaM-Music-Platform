'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface LikeState {
  [trackId: string]: {
    isLiked: boolean;
    likesCount: number;
    lastUpdated: number;
  };
}

interface LikeContextType {
  likeState: LikeState;
  updateLike: (trackId: string, isLiked: boolean, likesCount: number) => void;
  getLikeState: (trackId: string) => { isLiked: boolean; likesCount: number } | null;
  clearLikeState: (trackId?: string) => void;
  syncLikeState: (trackId: string, isLiked: boolean, likesCount: number) => void;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

export function LikeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [likeState, setLikeState] = useState<LikeState>({});

  // Mettre à jour l'état d'un like
  const updateLike = useCallback((trackId: string, isLiked: boolean, likesCount: number) => {
    setLikeState(prev => ({
      ...prev,
      [trackId]: {
        isLiked,
        likesCount,
        lastUpdated: Date.now()
      }
    }));
  }, []);

  // Obtenir l'état d'un like
  const getLikeState = useCallback((trackId: string) => {
    const state = likeState[trackId];
    if (!state) return null;

    // Vérifier si l'état n'est pas trop ancien (5 minutes)
    const isExpired = Date.now() - state.lastUpdated > 5 * 60 * 1000;
    if (isExpired) {
      // Nettoyer l'état expiré
      setLikeState(prev => {
        const newState = { ...prev };
        delete newState[trackId];
        return newState;
      });
      return null;
    }

    return {
      isLiked: state.isLiked,
      likesCount: state.likesCount
    };
  }, [likeState]);

  // Nettoyer l'état des likes
  const clearLikeState = useCallback((trackId?: string) => {
    if (trackId) {
      setLikeState(prev => {
        const newState = { ...prev };
        delete newState[trackId];
        return newState;
      });
    } else {
      setLikeState({});
    }
  }, []);

  // Synchroniser l'état d'un like (pour les mises à jour en temps réel)
  const syncLikeState = useCallback((trackId: string, isLiked: boolean, likesCount: number) => {
    updateLike(trackId, isLiked, likesCount);
  }, [updateLike]);

  // Nettoyer les états expirés périodiquement
  const cleanupExpiredStates = useCallback(() => {
    const now = Date.now();
    const expiredThreshold = 5 * 60 * 1000; // 5 minutes

    setLikeState(prev => {
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
      clearLikeState();
    }
  });

  const value: LikeContextType = {
    likeState,
    updateLike,
    getLikeState,
    clearLikeState,
    syncLikeState
  };

  return (
    <LikeContext.Provider value={value}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLikeContext() {
  const context = useContext(LikeContext);
  if (context === undefined) {
    throw new Error('useLikeContext must be used within a LikeProvider');
  }
  return context;
}

// Hook utilitaire pour obtenir l'état d'un like avec fallback
export function useTrackLike(trackId: string, fallbackLikesCount = 0, fallbackIsLiked = false) {
  const { getLikeState } = useLikeContext();
  
  const state = getLikeState(trackId);
  
  return {
    isLiked: state?.isLiked ?? fallbackIsLiked,
    likesCount: state?.likesCount ?? fallbackLikesCount,
    hasCachedState: state !== null
  };
} 