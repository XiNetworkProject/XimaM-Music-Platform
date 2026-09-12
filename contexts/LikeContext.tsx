'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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

    // A successful mutation must not revert to stale card props after five minutes.
    // Session changes clear this shared projection; reads never set state in render.

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


  // Nettoyer quand la session change
  useEffect(() => { clearLikeState(); }, [session?.user?.id, clearLikeState]);

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
