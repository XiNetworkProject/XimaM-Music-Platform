'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTrackLike } from '@/contexts/LikeContext';
import { useTrackPlays } from '@/contexts/PlaysContext';

interface SocialStats {
  likes: number;
  comments: number;
  followers: number;
  following: number;
}

interface UseSocialInteractionsProps {
  trackId?: string;
  userId?: string;
  initialStats?: Partial<SocialStats>;
  onStatsUpdate?: (stats: SocialStats) => void;
}

// Ajout d'une fonction utilitaire pour obtenir le username à partir de l'id
async function getUsernameFromId(userId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) return null;
    const user = await res.json();
    return user.username;
  } catch {
    return null;
  }
}

export function useSocialInteractions({
  trackId,
  userId,
  initialStats = {},
  onStatsUpdate
}: UseSocialInteractionsProps) {
  const { data: session } = useSession();
  
  // Utiliser les nouveaux hooks pour les likes et écoutes
  const { isLiked, likesCount } = useTrackLike(
    trackId || '',
    initialStats.likes || 0,
    false
  );
  
  // Note: plays n'est pas dans SocialStats, on l'utilise juste pour le cache
  const { plays } = useTrackPlays(
    trackId || '',
    0
  );

  const [stats, setStats] = useState<SocialStats>({
    likes: likesCount,
    comments: initialStats.comments || 0,
    followers: initialStats.followers || 0,
    following: initialStats.following || 0
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mettre à jour les stats quand les likes changent
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      likes: likesCount
    }));
    onStatsUpdate?.({ ...stats, likes: likesCount });
  }, [likesCount, onStatsUpdate]);

  // Vérifier l'état initial des interactions
  useEffect(() => {
    if (session?.user?.id) {
      checkInitialState();
    }
  }, [session?.user?.id, trackId, userId]);

  const checkInitialState = async () => {
    if (!session?.user?.id) return;

    try {
      // Vérifier si l'utilisateur est suivi
      if (userId) {
        const username = await getUsernameFromId(userId);
        if (!username) return;
        const followResponse = await fetch(`/api/users/${username}/follow`);
        if (followResponse.ok) {
          const followData = await followResponse.json();
          setIsFollowing(followData.following || false);
        }
      }
    } catch (error) {
      console.error('Erreur vérification état initial:', error);
    }
  };

  const handleLike = useCallback(async () => {
    if (!session?.user?.id || !trackId || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const { isLiked: newIsLiked, likesCount } = await response.json();
        setStats(prev => ({
          ...prev,
          likes: likesCount
        }));
        onStatsUpdate?.({ ...stats, likes: likesCount });
      }
    } catch (error) {
      console.error('Erreur like:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, trackId, isLoading, stats, onStatsUpdate]);

  const handleFollow = useCallback(async () => {
    if (!session?.user?.id || !userId || isLoading) return;

    setIsLoading(true);
    try {
      const username = await getUsernameFromId(userId);
      if (!username) throw new Error('Utilisateur introuvable');
      const response = await fetch(`/api/users/${username}/follow`, {
        method: 'POST',
      });

      if (response.ok) {
        const { action } = await response.json();
        const newIsFollowing = action === 'followed';
        setIsFollowing(newIsFollowing);
        
        setStats(prev => ({
          ...prev,
          followers: newIsFollowing 
            ? prev.followers + 1 
            : Math.max(0, prev.followers - 1)
        }));
        
        onStatsUpdate?.({
          ...stats,
          followers: newIsFollowing 
            ? stats.followers + 1 
            : Math.max(0, stats.followers - 1)
        });
      }
    } catch (error) {
      console.error('Erreur follow:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, userId, isLoading, stats, onStatsUpdate]);

  const addComment = useCallback(async (content: string) => {
    if (!session?.user?.id || !trackId || isLoading) return null;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const { comment } = await response.json();
        setStats(prev => ({
          ...prev,
          comments: prev.comments + 1
        }));
        onStatsUpdate?.({ ...stats, comments: stats.comments + 1 });
        return comment;
      }
    } catch (error) {
      console.error('Erreur ajout commentaire:', error);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, [session?.user?.id, trackId, isLoading, stats, onStatsUpdate]);

  const updateStats = useCallback((newStats: Partial<SocialStats>) => {
    setStats(prev => {
      const updated = { ...prev, ...newStats };
      onStatsUpdate?.(updated);
      return updated;
    });
  }, [onStatsUpdate]);

  const refreshStats = useCallback(async () => {
    if (!trackId && !userId) return;

    try {
      if (trackId) {
        const trackResponse = await fetch(`/api/tracks/${trackId}`);
        if (trackResponse.ok) {
          const track = await trackResponse.json();
          setStats(prev => ({
            ...prev,
            likes: track.likes?.length || 0,
            comments: track.comments?.length || 0
          }));
        }
      }

      if (userId) {
        const username = await getUsernameFromId(userId);
        if (!username) return;
        const userResponse = await fetch(`/api/users/${username}`);
        if (userResponse.ok) {
          const user = await userResponse.json();
          setStats(prev => ({
            ...prev,
            followers: user.followerCount || 0,
            following: user.followingCount || 0
          }));
        }
      }
    } catch (error) {
      console.error('Erreur rafraîchissement stats:', error);
    }
  }, [trackId, userId]);

  return {
    stats,
    isLiked,
    isFollowing,
    isLoading,
    handleLike,
    handleFollow,
    addComment,
    updateStats,
    refreshStats,
    checkInitialState
  };
} 