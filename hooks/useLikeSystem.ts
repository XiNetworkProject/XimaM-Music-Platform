import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
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
  
  // Utiliser l'état global du contexte
  const globalState = getLikeState(trackId);
  const [state, setState] = useState<LikeState>({
    isLiked: globalState?.isLiked ?? initialIsLiked,
    likesCount: globalState?.likesCount ?? initialLikesCount,
    isLoading: false,
    error: null
  });

  // Synchroniser avec les props initiales
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLiked: initialIsLiked,
      likesCount: initialLikesCount
    }));
  }, [initialIsLiked, initialLikesCount]);

  // Vérifier l'état initial depuis le serveur
  useEffect(() => {
    if (session?.user?.id && trackId) {
      // Ne pas vérifier le statut de like pour la radio
      if (trackId === 'radio-mixx-party') {
        return;
      }
      checkLikeStatus();
    }
  }, [session?.user?.id, trackId]);

  const checkLikeStatus = useCallback(async () => {
    if (!session?.user?.id || !trackId) return;
    
    // Ne pas vérifier le statut de like pour la radio ou les pistes IA
    if (trackId === 'radio-mixx-party' || trackId.startsWith('ai-')) return;

    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
  }, [session?.user?.id, trackId]);

  const toggleLike = useCallback(async () => {
    if (!session?.user?.id) {
      toast.error('Connectez-vous pour liker des titres');
      return;
    }
    
    // Ne pas permettre de liker la radio ou les pistes IA
    if (trackId === 'radio-mixx-party' || trackId.startsWith('ai-')) {
      toast.error(`Impossible de liker ${trackId.startsWith('ai-') ? 'une piste IA' : 'la radio'}`);
      return;
    }

    if (state.isLoading) return;

    // Optimistic update
    const optimisticState = {
      isLiked: !state.isLiked,
      likesCount: state.isLiked ? Math.max(0, state.likesCount - 1) : state.likesCount + 1,
      isLoading: true,
      error: null
    };

    setState(optimisticState);
    onUpdate?.(optimisticState);
    
    // Mettre à jour le contexte global
    updateLike(trackId, optimisticState.isLiked, optimisticState.likesCount);

    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du like');
      }

      const data: LikeResponse = await response.json();

      // Mise à jour avec les vraies données du serveur
      const newState = {
        isLiked: data.isLiked,
        likesCount: data.likesCount,
        isLoading: false,
        error: null
      };

      setState(newState);
      onUpdate?.(newState);
      
      // Mettre à jour le contexte global avec les vraies données
      syncLikeState(trackId, newState.isLiked, newState.likesCount);

      // Notification de succès + analytics (favorite/unfavorite)
      if (data.isLiked) {
        toast.success('Titre ajouté aux favoris');
        try {
          await fetch(`/api/tracks/${trackId}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'favorite' })
          });
        } catch {}
      } else {
        toast.success('Titre retiré des favoris');
        try {
          await fetch(`/api/tracks/${trackId}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: 'unfavorite' })
          });
        } catch {}
      }

    } catch (error) {
      console.error('Erreur like:', error);
      
      // Revenir à l'état précédent en cas d'erreur
      const errorState = {
        isLiked: state.isLiked,
        likesCount: state.likesCount,
        isLoading: false,
        error: 'Erreur lors du like'
      };

      setState(errorState);
      onUpdate?.(errorState);
      
      // Restaurer l'état global en cas d'erreur
      syncLikeState(trackId, errorState.isLiked, errorState.likesCount);
      
      toast.error('Erreur lors du like');
    }
  }, [session?.user?.id, trackId, state.isLiked, state.likesCount, state.isLoading, onUpdate]);

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
      toast.error('Connectez-vous pour liker des titres');
      return;
    }

    if (batchLoading.has(trackId)) return;

    setBatchLoading(prev => new Set(prev).add(trackId));

    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
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
      toast.error('Erreur lors du like');
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