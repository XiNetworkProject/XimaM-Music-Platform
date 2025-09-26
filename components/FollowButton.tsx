"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { UserPlus, Check } from 'lucide-react';

interface FollowButtonProps {
  artistId?: string;
  artistUsername?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  artistId,
  artistUsername,
  size = 'md',
  className = '',
  onFollowChange
}: FollowButtonProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Vérifier l'état initial du suivi
  useEffect(() => {
    if (!session?.user?.id || !artistUsername) {
      setIsChecking(false);
      return;
    }

    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/users/${artistUsername}/follow`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing);
        }
      } catch (error) {
        console.error('Erreur vérification follow:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkFollowStatus();
  }, [session?.user?.id, artistUsername]);

  const handleFollow = async () => {
    if (!session?.user?.id || !artistUsername || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${artistUsername}/follow`, {
        method: 'POST',
      });

      if (response.ok) {
        const { action } = await response.json();
        const newIsFollowing = action === 'followed';
        setIsFollowing(newIsFollowing);
        onFollowChange?.(newIsFollowing);
      }
    } catch (error) {
      console.error('Erreur follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ne pas afficher si pas d'utilisateur ou si c'est le profil de l'utilisateur connecté
  if (!session?.user?.id || !artistUsername || isChecking) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        font-medium rounded-full transition-all duration-200 hover:scale-105 active:scale-95
        ${isFollowing 
          ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white hover:from-pink-700 hover:to-red-700' 
          : 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
      ) : isFollowing ? (
        <div className="flex items-center gap-1">
          <Check size={iconSizes[size]} />
          <span>Abonné</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <UserPlus size={iconSizes[size]} />
          <span>Suivre</span>
        </div>
      )}
    </button>
  );
}
