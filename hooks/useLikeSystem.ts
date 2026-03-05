import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import { useLikeContext } from '@/contexts/LikeContext';

interface LikeState {
  isLiked: boolean;
  likesCount: number;
  isLoading: boolean;
  error: string | null;
}

interface UseLikeSystemProps {
  trackId: string;
  initialLikesCount?: number;
  initialIsLiked?: boolean;
  onUpdate?: (state: LikeState) => void;
}

interface LikeResponse {
  success: boolean;
  isLiked: boolean;
  likes: string[];
  likesCount: number;
  track?: any;
}

export function useLikeSystem({
  trackId,
  initialLikesCount = 0,
  initialIsLiked = false,
  onUpdate
}: UseLikeSystemProps) {
  const { data: session } = useSession();
  const { getLikeState, updateLike, syncLikeState } = useLikeContext();
  
  const globalState = getLikeState(trackId);
  const [state, setState] = useState<LikeState>({
    isLiked: globalState?.isLiked ?? initialIsLiked,
    likesCount: globalState?.likesCount ?? initialLikesCount,
    isLoading: false,
    error: null
  });

  // Reset state when trackId changes (e.g. mini player switches tracks)
  const prevTrackIdRef = useRef(trackId);
  useEffect(() => {
    if (prevTrackIdRef.current !== trackId) {
      prevTrackIdRef.current = trackId;
      const gs = getLikeState(trackId);
      setState({
        isLiked: gs?.isLiked ?? initialIsLiked,
        likesCount: gs?.likesCount ?? initialLikesCount,
        isLoading: false,
        error: null,
      });
    }
  }, [trackId, initialIsLiked, initialLikesCount, getLikeState]);

  // Sync from global LikeContext → local state (keeps all LikeButtons in sync)
  useEffect(() => {
    if (globalState && !state.isLoading) {
      if (globalState.isLiked !== state.isLiked || globalState.likesCount !== state.likesCount) {
        setState(prev => ({ ...prev, isLiked: globalState.isLiked, likesCount: globalState.likesCount }));
      }
    }
  }, [globalState?.isLiked, globalState?.likesCount]);

  const isRadio = trackId === 'radio-mixx-party' || trackId === 'radio-ximam';
  const isAI = trackId.startsWith('ai-');
  const realAIId = isAI ? trackId.slice(3) : '';

  useEffect(() => {
    if (session?.user?.id && trackId && !isRadio) {
      checkLikeStatus();
    }
  }, [session?.user?.id, trackId]);

  const checkLikeStatus = useCallback(async () => {
    if (!session?.user?.id || !trackId || isRadio) return;

    try {
      if (isAI) {
        // AI tracks don't have a GET like endpoint — state comes from initialIsLiked
        return;
      }
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          isLiked: data.liked,
          likesCount: data.likesCount || prev.likesCount
        }));
      }
    } catch (error) {
      console.error('Erreur vérification like:', error);
    }
  }, [session?.user?.id, trackId, isAI, isRadio]);

  const toggleLike = useCallback(async () => {
    if (!session?.user?.id) {
      notify.error('Connexion requise', 'Connectez-vous pour liker des titres');
      return;
    }
    
    if (isRadio) {
      notify.error('Like impossible', 'Impossible de liker la radio');
      return;
    }

    if (state.isLoading) return;

    const optimisticState = {
      isLiked: !state.isLiked,
      likesCount: state.isLiked ? Math.max(0, state.likesCount - 1) : state.likesCount + 1,
      isLoading: true,
      error: null
    };

    setState(optimisticState);
    onUpdate?.(optimisticState);
    updateLike(trackId, optimisticState.isLiked, optimisticState.likesCount);

    try {
      if (isAI) {
        // AI track: use the AI favorite endpoint
        const response = await fetch(`/api/ai/tracks/${realAIId}/favorite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_favorite: optimisticState.isLiked }),
        });

        if (!response.ok) throw new Error('Erreur lors du favori IA');

        const data = await response.json();
        const newState = {
          isLiked: data.is_favorite,
          likesCount: data.is_favorite ? state.likesCount + 1 : Math.max(0, state.likesCount - 1),
          isLoading: false,
          error: null
        };
        setState(newState);
        onUpdate?.(newState);
        syncLikeState(trackId, newState.isLiked, newState.likesCount);

        notify.success(data.is_favorite ? 'Ajouté aux favoris' : 'Retiré des favoris', '');
      } else {
        // Normal track: use POST/DELETE like endpoint
        const response = await fetch(`/api/tracks/${trackId}/like`, {
          method: optimisticState.isLiked ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Erreur lors du like');

        const data: LikeResponse = await response.json();
        const newState = {
          isLiked: data.isLiked,
          likesCount: data.likesCount,
          isLoading: false,
          error: null
        };
        setState(newState);
        onUpdate?.(newState);
        syncLikeState(trackId, newState.isLiked, newState.likesCount);

        if (data.isLiked) {
          notify.success('Ajouté aux favoris', 'Titre ajouté aux favoris');
          try { await fetch(`/api/tracks/${trackId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'favorite' }) }); } catch {}
        } else {
          notify.success('Retiré des favoris', 'Titre retiré des favoris');
          try { await fetch(`/api/tracks/${trackId}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: 'unfavorite' }) }); } catch {}
        }
      }
    } catch (error) {
      console.error('Erreur like:', error);
      const errorState = {
        isLiked: state.isLiked,
        likesCount: state.likesCount,
        isLoading: false,
        error: 'Erreur lors du like'
      };
      setState(errorState);
      onUpdate?.(errorState);
      syncLikeState(trackId, errorState.isLiked, errorState.likesCount);
      notify.error('Erreur like', 'Erreur lors du like');
    }
  }, [session?.user?.id, trackId, state.isLiked, state.likesCount, state.isLoading, onUpdate, isAI, isRadio, realAIId]);

  const forceUpdate = useCallback((newState: Partial<LikeState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  return {
    ...state,
    toggleLike,
    forceUpdate,
    checkLikeStatus
  };
}

// Hook pour gérer les likes en batch (pour les listes)
export function useBatchLikeSystem() {
  const { data: session } = useSession();
  const [batchLoading, setBatchLoading] = useState<Set<string>>(new Set());

  const toggleLikeBatch = useCallback(async (trackId: string, currentState: { isLiked: boolean; likesCount: number }) => {
    if (!session?.user?.id) {
      notify.error('Connexion requise', 'Connectez-vous pour liker des titres');
      return;
    }

    if (batchLoading.has(trackId)) return;

    setBatchLoading(prev => new Set(prev).add(trackId));

    try {
      const nextIsLiked = !currentState.isLiked;
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: nextIsLiked ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du like');
      }

      const data: LikeResponse = await response.json();
      return data;

    } catch (error) {
      console.error('Erreur like batch:', error);
      notify.error('Erreur like', 'Erreur lors du like');
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
    toggleLikeBatch,
    isBatchLoading: (trackId: string) => batchLoading.has(trackId)
  };
} 