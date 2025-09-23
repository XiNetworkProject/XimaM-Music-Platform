'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit3, Check, Heart, Users, Music, Plus, Image, Camera, Loader2, LogOut, Link2, Instagram, Twitter, Youtube, Globe, ChevronDown, ChevronUp, UserPlus, Trash2, Star, Play, Pause, MoreVertical, Crown, MessageCircle, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
const OnboardingChecklist = dynamic(() => import('@/components/OnboardingChecklist'), { ssr: false });
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
import InteractiveCounter from '@/components/InteractiveCounter';
import SocialStats from '@/components/SocialStats';
import UserProfileCard from '@/components/UserProfileCard';
import { AnimatedPlaysCounter } from '@/components/AnimatedCounter';
import toast from 'react-hot-toast';

const socialIcons = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  website: Globe,
};

function formatDuration(duration: number | undefined): string {
  if (!duration || isNaN(duration)) return '--:--';
  const totalSeconds = Math.round(duration);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

export default function ProfileUserPage() {
  const { username } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const { playTrack, audioState } = useAudioPlayer();
  
  // Utiliser les nouveaux systèmes de likes et écoutes pour la synchronisation temps réel
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch, isBatchLoading: isPlaysLoading } = useBatchPlaysSystem();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');
  const [trackPage, setTrackPage] = useState(1);
  const [trackLoading, setTrackLoading] = useState(false);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);
  const tracksPerPage = 12;
  const trackListRef = useRef<HTMLDivElement>(null);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [hasMorePlaylists, setHasMorePlaylists] = useState(true);
  const playlistsPerPage = 9;
  const playlistListRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistData, setNewPlaylistData] = useState({ name: '', description: '', isPublic: true });
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  
  // Nouvelles fonctionnalités pour les tracks
  const [showTrackOptions, setShowTrackOptions] = useState<string | null>(null);
  const [showEditTrackModal, setShowEditTrackModal] = useState(false);
  const [showFeatureTrackModal, setShowFeatureTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [featuringTrack, setFeaturingTrack] = useState<any>(null);
  const [trackEditData, setTrackEditData] = useState<any>({});
  const [featuredBanner, setFeaturedBanner] = useState('');
  const [likeLoading, setLikeLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // État pour l'affichage des tracks
  const [trackViewMode, setTrackViewMode] = useState<'grid' | 'list'>('grid');
  
  // État pour les tracks de l'utilisateur avec synchronisation temps réel
  const [userTracks, setUserTracks] = useState<any[]>([]);

  // Charger le profil utilisateur
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/users/${username}`);
        const data = await res.json();
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Ce profil n\'existe pas');
          } else if (res.status === 500) {
            throw new Error('Erreur serveur - profil temporairement indisponible');
          } else {
            throw new Error(data.error || 'Erreur lors du chargement du profil');
          }
        }
        
        setProfile(data);
        setEditData({ ...data });
        // Mettre à jour les tracks avec synchronisation temps réel
        setUserTracks(data.tracks || []);
      } catch (e: any) {
        setError(e.message || 'Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchProfile();
  }, [username]);

  // Gestion upload avatar/bannière
  const handleImageUpload = async (type: 'avatar' | 'banner', file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const res = await fetch(`/api/users/${username}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setProfile((prev: any) => ({ ...prev, [type]: data.imageUrl }));
      setEditData((prev: any) => ({ ...prev, [type]: data.imageUrl }));
    } catch (e: any) {
      setError(e.message || 'Erreur upload image');
    } finally {
      setUploading(false);
    }
  };

  // Gestion follow/unfollow
  const handleFollow = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' });
      if (!res.ok) throw new Error('Erreur follow');
      // Refresh profil
      const data = await res.json();
      setProfile((prev: any) => ({
        ...prev,
        isFollowing: data.action === 'followed',
        followerCount: prev.followerCount + (data.action === 'followed' ? 1 : -1),
      }));
    } catch (e) {}
  };

  // Écouter les changements dans l'état du lecteur pour mettre à jour les statistiques
  useEffect(() => {
    const handlePlaysUpdated = (event: CustomEvent) => {
      const { trackId, plays } = event.detail || {};
      setUserTracks(prev => prev.map(track => 
        (track._id || track.id) === trackId 
          ? { ...track, plays: typeof plays === 'number' ? plays : (track.plays || 0) + 1 }
          : track
      ));
    };

    window.addEventListener('playsUpdated', handlePlaysUpdated as EventListener);
    return () => window.removeEventListener('playsUpdated', handlePlaysUpdated as EventListener);
  }, []);

  // Gestion demande de messagerie
  const handleMessageRequest = async () => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    try {
      const res = await fetch('/api/messages/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: profile._id }),
      });

      if (res.ok) {
        toast.success('Demande de conversation envoyée');
      } else {
        const data = await res.json();
        if (data.error === 'Conversation déjà existante') {
          // Rediriger vers la conversation existante
          router.push(`/messages/${data.conversationId}`);
        } else {
          toast.error(data.error || 'Erreur lors de l\'envoi de la demande');
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  // Gestion édition profil
  const handleEdit = () => setShowEditModal(true);
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditData({ ...profile });
  };
  const handleSaveEdit = async () => {
    setUploading(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur modification profil');
      setProfile(data);
      setShowEditModal(false);
    } catch (e: any) {
      setError(e.message || 'Erreur modification profil');
    } finally {
      setUploading(false);
    }
  };

  // Prévisualisation image
  const handlePreviewImage = (type: 'avatar' | 'banner', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditData((prev: any) => ({ ...prev, [type]: e.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  // Responsive : collapse bio
  const bioMaxLength = 180;
  const isOwnProfile = session?.user?.username === username;

  // Fermer les menus d'options quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTrackOptions) {
        setShowTrackOptions(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTrackOptions]);

  // Scroll infini pour les musiques
  useEffect(() => {
    if (activeTab !== 'tracks' || !profile) return;
    const handleScroll = () => {
      if (!trackListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = trackListRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100 && hasMoreTracks && !trackLoading) {
        setTrackLoading(true);
        setTimeout(() => {
          setTrackPage((prev) => prev + 1);
          setTrackLoading(false);
        }, 500);
      }
    };
    const ref = trackListRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [activeTab, hasMoreTracks, trackLoading, profile]);

  // Récupérer les musiques paginées
  const paginatedTracks = profile?.tracks?.slice(0, trackPage * tracksPerPage) || [];
  useEffect(() => {
    setHasMoreTracks(paginatedTracks.length < (profile?.tracks?.length || 0));
  }, [paginatedTracks.length, profile?.tracks?.length]);

  // Scroll infini pour les playlists
  useEffect(() => {
    if (activeTab !== 'playlists' || !profile) return;
    const handleScroll = () => {
      if (!playlistListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = playlistListRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100 && hasMorePlaylists && !playlistLoading) {
        setPlaylistLoading(true);
        setTimeout(() => {
          setPlaylistPage((prev) => prev + 1);
          setPlaylistLoading(false);
        }, 500);
      }
    };
    const ref = playlistListRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [activeTab, hasMorePlaylists, playlistLoading, profile]);

  // Récupérer les playlists paginées
  const paginatedPlaylists = profile?.playlists?.slice(0, playlistPage * playlistsPerPage) || [];
  useEffect(() => {
    setHasMorePlaylists(paginatedPlaylists.length < (profile?.playlists?.length || 0));
  }, [paginatedPlaylists.length, profile?.playlists?.length]);

  // Définir les onglets
  const tabs = [
    {
      id: 'tracks' as const,
      label: 'Tracks',
      icon: <Music size={20} />,
      count: profile?.tracks?.length || 0
    },
    {
      id: 'playlists' as const,
      label: 'Playlists',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>,
      count: profile?.playlists?.length || 0
    },
    {
      id: 'followers' as const,
      label: 'Followers',
      icon: <Users size={20} />,
      count: profile?.followerCount || 0
    },
    {
      id: 'following' as const,
      label: 'Following',
      icon: <UserPlus size={20} />,
      count: profile?.followingCount || 0
    },
    {
      id: 'stats' as const,
      label: 'Stats',
      icon: <TrendingUp size={20} />,
      count: 0
    }
  ];

  // Données pour les onglets (simulées pour l'instant)
  const userPlaylists = profile?.playlists || [];
  const followers = profile?.followers || [];
  const following = profile?.following || [];

  // Gestion création playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistData.name.trim()) return;
    setUploading(true);
    setError('');
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlaylistData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur création playlist');
      setShowCreatePlaylistModal(false);
      setNewPlaylistData({ name: '', description: '', isPublic: true });
      // Refresh profil pour inclure la nouvelle playlist
      const profileRes = await fetch(`/api/users/${username}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur création playlist');
    } finally {
      setUploading(false);
    }
  };

  // Gestion play track
  const handlePlayTrack = async (track: any) => {
    try {
      // Normaliser les propriétés de la track (compatibilité API)
      const normalizedTrack = {
        ...track,
        audioUrl: track.audioUrl || track.audio_url,
        coverUrl: track.coverUrl || track.cover_url,
        artist: track.artist || track.artist_name || profile?.name || 'Artiste inconnu'
      };

      // Vérifier si la track a une URL audio
      if (!normalizedTrack.audioUrl) {
        console.warn('Track sans audioUrl, récupération des données complètes:', track.id);
        // Récupérer les détails complets de la track depuis l'API
        const trackResponse = await fetch(`/api/tracks/${track.id}`);
        if (trackResponse.ok) {
          const trackData = await trackResponse.json();
          if (trackData.audioUrl) {
            await playTrack(trackData);
            return;
          } else {
            setError('Fichier audio non disponible pour cette piste');
            return;
          }
        } else {
          setError('Impossible de récupérer les détails de la piste');
          return;
        }
      }

      // S'assurer que la track a tous les champs nécessaires
      const trackToPlay = {
        _id: track.id,
        title: track.title,
        artist: normalizedTrack.artist,
        audioUrl: normalizedTrack.audioUrl,
        coverUrl: normalizedTrack.coverUrl,
        duration: track.duration,
        likes: track.likes || [],
        comments: track.comments || [],
        plays: track.plays || 0,
        genre: track.genre || [],
        isLiked: track.isLiked || false
      };

      // Ajouter la track à la liste si elle n'y est pas déjà
      if (!audioState.tracks.find(t => t._id === track.id)) {
        // Récupérer les détails complets de la track depuis l'API
        const trackResponse = await fetch(`/api/tracks/${track.id}`);
        if (trackResponse.ok) {
          const trackData = await trackResponse.json();
          const fullTrack = {
            ...trackToPlay,
            ...trackData.track
          };
          await playTrack(fullTrack);
        } else {
          // Fallback : utiliser les données disponibles
          await playTrack(trackToPlay);
        }
      } else {
        // La track est déjà dans la liste, la jouer directement
        await playTrack(trackToPlay);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      // Fallback : essayer de jouer avec les données de base
      try {
        await playTrack(track);
      } catch (fallbackError) {
        console.error('Erreur fallback:', fallbackError);
        setError('Erreur lors de la lecture de la musique');
      }
    }
  };

  // Nouvelles fonctions pour la gestion des tracks
  const handleLikeTrack = async (trackId: string) => {
    if (!session?.user) return;
    setLikeLoading(trackId);
    try {
      // Utiliser le système batch pour la synchronisation temps réel
      const result = await toggleLikeBatch(trackId, { isLiked: false, likesCount: 0 });
      
      if (result) {
        // Mettre à jour l'état local avec les vraies données de l'API
        setUserTracks(prev => prev.map(track => 
          track.id === trackId 
            ? { 
                ...track, 
                isLiked: result.isLiked, 
                likes: typeof result.likes === 'number' ? result.likes : track.likes 
              }
            : track
        ));
        
        setProfile((prev: any) => ({
          ...prev,
          tracks: prev.tracks.map((track: any) => 
            track.id === trackId 
              ? { 
                  ...track, 
                  isLiked: result.isLiked, 
                  likes: typeof result.likes === 'number' ? result.likes : track.likes 
                }
              : track
          )
        }));
        
        toast.success(result.isLiked ? 'Track ajoutée aux favoris' : 'Track retirée des favoris');
      }
    } catch (e: any) {
      setError(e.message || 'Erreur like');
      toast.error(e.message || 'Erreur like');
    } finally {
      setLikeLoading(null);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette piste ? Cette action est irréversible.')) return;
    setDeleteLoading(trackId);
    setError('');
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: 'DELETE' });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur suppression');
      }
      
      // Mettre à jour l'état local - supprimer de toutes les listes
      setUserTracks(prev => prev.filter(track => track.id !== trackId));
      
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.filter((track: any) => track.id !== trackId),
        trackCount: Math.max(0, (prev.trackCount || 0) - 1)
      }));
      
      setShowTrackOptions(null);
      toast.success('Track supprimée avec succès');
      
      // Rafraîchir les données d'usage pour mettre à jour le stockage
      try {
        const usageRes = await fetch('/api/subscriptions/usage', { 
          headers: { 'Cache-Control': 'no-store' } 
        });
        if (usageRes.ok) {
          console.log('💾 Stockage mis à jour après suppression');
        }
      } catch (e) {
        console.warn('⚠️ Impossible de rafraîchir l\'usage');
      }
      
    } catch (e: any) {
      setError(e.message || 'Erreur suppression');
      toast.error(e.message || 'Erreur suppression');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditTrack = (track: any) => {
    console.log('🎵 Édition track:', { 
      trackId: track.id, 
      trackData: track,
      allIds: userTracks.map(t => ({ id: t.id, title: t.title }))
    });
    
    setEditingTrack(track);
    setTrackEditData({
      title: track.title,
      description: track.description || '',
      genre: Array.isArray(track.genre) ? track.genre.join(', ') : (track.genre || ''),
      tags: track.tags?.join(', ') || '',
      isPublic: track.is_public !== false // Par défaut true si undefined
    });
    setShowEditTrackModal(true);
    setShowTrackOptions(null); // Fermer le tiroir
  };

  const handleSaveTrackEdit = async () => {
    if (!editingTrack) return;
    setUploading(true);
    setError('');
    try {
      const trackId = editingTrack.id || editingTrack._id;
      const res = await fetch(`/api/tracks/${trackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trackEditData.title,
          genre: trackEditData.genre.split(',').map((g: string) => g.trim()).filter(Boolean),
          isPublic: trackEditData.isPublic
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur modification');
      }
      
      const updatedTrack = await res.json();
      
      // Mettre à jour l'état local avec les nouvelles données
      setUserTracks(prev => prev.map(track => 
        track.id === trackId ? { ...track, ...updatedTrack } : track
      ));
      
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.map((track: any) => 
          track.id === trackId ? { ...track, ...updatedTrack } : track
        )
      }));
      
      setShowEditTrackModal(false);
      setEditingTrack(null);
      setShowTrackOptions(null);
      toast.success('Track modifiée avec succès');
    } catch (e: any) {
      setError(e.message || 'Erreur modification');
      toast.error(e.message || 'Erreur modification');
    } finally {
      setUploading(false);
    }
  };

  const handleFeatureTrack = (track: any) => {
    setFeaturingTrack(track);
    setFeaturedBanner(track.featuredBanner || track.featured_banner || '');
    setShowFeatureTrackModal(true);
    setShowTrackOptions(null); // Fermer le tiroir
  };

  const handleSaveFeatureTrack = async () => {
    if (!featuringTrack) return;
    setUploading(true);
    setError('');
    try {
      const trackId = featuringTrack.id || featuringTrack._id;
      const res = await fetch(`/api/tracks/${trackId}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFeatured: !featuringTrack.is_featured,
          featuredBanner: featuredBanner
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur mise en avant');
      }
      
      const data = await res.json();
      
      // Mettre à jour l'état local
      setUserTracks(prev => prev.map(track => 
        track.id === trackId ? { 
          ...track, 
          is_featured: data.track.is_featured,
          featuredBanner: data.track.featuredBanner,
          featured_banner: data.track.featured_banner
        } : track
      ));
      
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.map((track: any) => 
          track.id === trackId ? { 
            ...track, 
            is_featured: data.track.is_featured,
            featuredBanner: data.track.featuredBanner,
            featured_banner: data.track.featured_banner
          } : track
        )
      }));
      
      setShowFeatureTrackModal(false);
      setFeaturingTrack(null);
      setShowTrackOptions(null);
      toast.success(data.track.is_featured ? 'Track mise en vedette' : 'Track retirée de la vedette');
    } catch (e: any) {
      setError(e.message || 'Erreur mise en avant');
      toast.error(e.message || 'Erreur mise en avant');
    } finally {
      setUploading(false);
    }
  };

  // Suivre/Ne plus suivre un utilisateur depuis les modals
  const handleFollowUser = async (userId: string) => {
    const username = await getUsernameFromId(userId);
    if (!username) return;
    setFollowLoading(userId);
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' });
      await res.json();
      // Refresh profil pour mettre à jour les listes
      const profileRes = await fetch(`/api/users/${username}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (e) {}
    setFollowLoading(null);
  };

  // Menu d'options: tiroir accolé à la carte

  if (loading) {
  return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="animate-spin w-10 h-10 text-purple-400" />
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <User size={40} className="mx-auto mb-4 text-purple-400" />
          <p className="text-lg font-bold mb-2">Profil introuvable</p>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-transparent">
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 pt-0 pb-32">
        {/* Onboarding (affiché tant que non complété) */}
        <OnboardingChecklist />
        {/* Bannière moderne style Suno */}
        <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-8 panel-suno border border-[var(--border)]">
          <img
            src={editData.banner || profile.banner || '/default-cover.jpg'}
            alt="Bannière"
            className="w-full h-full object-cover object-center"
          />
          {/* Overlay gradient moderne */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30"></div>
          
          {isOwnProfile && (
            <button
              className="absolute top-4 right-4 bg-[var(--surface-2)]/80 backdrop-blur-md hover:bg-[var(--surface-3)]/80 text-white p-2.5 rounded-full border border-[var(--border)] transition-all duration-200 hover:scale-105"
              onClick={() => bannerInputRef.current?.click()}
              title="Changer la bannière"
            >
              <Camera size={18} />
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={bannerInputRef}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                handlePreviewImage('banner', file);
                handleImageUpload('banner', file);
              }
            }}
          />
        </div>
        {/* Avatar + infos modernes */}
        <div className="relative flex flex-col items-center -mt-24 mb-8">
          <div className="relative mb-6">
            <div className="relative">
              <img
                src={editData.avatar || profile.avatar || '/default-avatar.png'}
                alt="Avatar"
                className="w-36 h-36 rounded-full object-cover border-4 border-[var(--border)] shadow-2xl bg-[var(--surface-2)] ring-4 ring-[var(--surface-1)]/50"
              />
              {/* Effet de lueur autour de l'avatar */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/20 to-pink-500/20 blur-xl -z-10"></div>
              
              {isOwnProfile && (
                <button
                  className="absolute bottom-2 right-2 bg-[var(--surface-2)]/90 backdrop-blur-md hover:bg-[var(--surface-3)]/90 text-white p-2.5 rounded-full border border-[var(--border)] transition-all duration-200 hover:scale-105 shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                  title="Changer l'avatar"
                >
                  <Camera size={16} />
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  handlePreviewImage('avatar', file);
                  handleImageUpload('avatar', file);
                }
              }}
            />
          </div>
          {/* Informations utilisateur modernes */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  {profile.name}
                </h1>
                {profile.isVerified && (
                  <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="text-white w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[var(--text-muted)] text-lg">@{profile.username}</span>
                {profile.isArtist && profile.artistName && (
                  <span className="px-3 py-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full text-pink-400 text-sm font-medium">
                    {profile.artistName}
                  </span>
                )}
              </div>
            </div>
            
            {/* Statistiques modernes en cartes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 max-w-2xl mx-auto">
              <div className="panel-suno border border-[var(--border)] rounded-xl p-4 text-center hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-[var(--text)]">{profile.followerCount || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Abonnés</div>
              </div>
              <div className="panel-suno border border-[var(--border)] rounded-xl p-4 text-center hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-center mb-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-[var(--text)]">{profile.followingCount || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Abonnements</div>
              </div>
              <div className="panel-suno border border-[var(--border)] rounded-xl p-4 text-center hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-center mb-2">
                  <Music className="w-5 h-5 text-pink-400" />
                </div>
                <div className="text-xl font-bold text-[var(--text)]">{profile.trackCount || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Tracks</div>
              </div>
              <div className="panel-suno border border-[var(--border)] rounded-xl p-4 text-center hover:scale-105 transition-all duration-200">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-xl font-bold text-[var(--text)]">{profile.totalPlays || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Écoutes</div>
              </div>
            </div>
            {/* Bio moderne */}
            {profile.bio && (
              <div className="mt-6 max-w-2xl mx-auto">
                <div className="panel-suno border border-[var(--border)] rounded-xl p-4">
                  <div className="text-[var(--text)] text-sm leading-relaxed">
                    {profile.bio.length > bioMaxLength && !showFullBio ? (
                      <>
                        {profile.bio.slice(0, bioMaxLength)}...{' '}
                        <button className="text-purple-400 hover:text-purple-300 underline font-medium transition-colors" onClick={() => setShowFullBio(true)}>Voir plus</button>
                      </>
                    ) : (
                      <>
                        {profile.bio}
                        {profile.bio.length > bioMaxLength && (
                          <button className="text-purple-400 hover:text-purple-300 underline font-medium ml-2 transition-colors" onClick={() => setShowFullBio(false)}>Réduire</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Réseaux sociaux modernes */}
            {profile.socialLinks && Object.entries(profile.socialLinks).some(([_, value]) => value) && (
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {Object.entries(profile.socialLinks).map(([key, value]) => {
                  const IconComponent = socialIcons[key as keyof typeof socialIcons];
                  return value ? (
                    <a
                      key={key}
                      href={value as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[var(--text)] hover:text-purple-400 px-4 py-2 panel-suno border border-[var(--border)] rounded-full hover:scale-105 transition-all duration-200 hover:border-purple-500/50"
                    >
                      {IconComponent ? (
                        <IconComponent size={16} />
                      ) : (
                        <Link2 size={16} />
                      )}
                      <span className="text-sm font-medium">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                    </a>
                  ) : null;
                })}
              </div>
            )}
            {/* Boutons actions modernes */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {isOwnProfile ? (
                <>
                  <button
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95"
                    onClick={handleEdit}
                    disabled={editMode || uploading}
                  >
                    <Edit3 size={18} /> Modifier le profil
                  </button>
                  <button
                    className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] px-6 py-3 rounded-xl font-semibold hover:bg-[var(--surface-3)] transition-all duration-300 hover:scale-105 active:scale-95"
                    onClick={() => router.push('/stats')}
                  >
                    <TrendingUp size={18} /> Statistiques
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg ${
                      profile.isFollowing 
                        ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white hover:from-pink-700 hover:to-red-700 hover:shadow-pink-500/25' 
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:shadow-purple-500/25'
                    }`}
                    onClick={handleFollow}
                    disabled={uploading}
                  >
                    {profile.isFollowing ? (
                      <>
                        <Check size={18} /> Abonné
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} /> Suivre
                      </>
                    )}
                  </button>
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/25"
                    onClick={handleMessageRequest}
                    disabled={uploading}
                  >
                    <MessageCircle size={18} /> Message
                  </button>
                </>
              )}
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Navigation moderne style Suno */}
        <div className="panel-suno border border-[var(--border)] rounded-2xl p-1 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'tracks'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <Music size={20} />
              <span className="hidden sm:inline">Tracks</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                activeTab === 'tracks' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
              }`}>
                {profile?.tracks?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'playlists'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="hidden sm:inline">Playlists</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                activeTab === 'playlists' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
              }`}>
                {profile?.playlists?.length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Contenu des onglets moderne */}
        <div className="flex-1">
          <div className="space-y-6">
            {activeTab === 'tracks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between panel-suno border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text)]">Mes Tracks</h3>
                      <p className="text-[var(--text-muted)] text-sm">{userTracks.length} piste{userTracks.length !== 1 ? 's' : ''} publié{userTracks.length !== 1 ? 's' : 'e'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      className={`p-3 rounded-xl transition-all duration-200 ${
                        trackViewMode === 'list' 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                          : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
                      }`}
                      onClick={() => setTrackViewMode('list')}
                      title="Vue liste"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button 
                      className={`p-3 rounded-xl transition-all duration-200 ${
                        trackViewMode === 'grid' 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                          : 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
                      }`}
                      onClick={() => setTrackViewMode('grid')}
                      title="Vue grille"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {userTracks.length === 0 ? (
                  <div className="panel-suno border border-[var(--border)] rounded-xl p-6 text-center text-[var(--text-muted)]">
                    Aucune piste encore — dépose un MP3/WAV/FLAC (≤ 50 MB) pour commencer
                  </div>
                ) : trackViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {userTracks.map((track: any) => (
                      <div key={track.id} className="group cursor-pointer animate-fade-in hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 relative">
                        <div className="relative panel-suno rounded-xl p-4 border border-[var(--border)] hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 overflow-hidden">
                          {/* Banderole de mise en avant */}
                          {track.is_featured && (
                            <div className="absolute -top-2 -left-2 z-10">
                              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg">
                                <Crown size={12} />
                                {track.featuredBanner || 'En vedette'}
                              </div>
                            </div>
                          )}
                          
                          {/* Cover avec overlay play */}
                          <div className="relative mb-4 group/cover">
                            <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                              <img 
                                src={track.cover_url || track.coverUrl || '/default-cover.jpg'} 
                                alt={track.title} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                                }}
                              />
                            </div>
                            {/* Bouton play overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl">
                              <button 
                                className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 shadow-lg hover:scale-110 active:scale-95" 
                                onClick={() => handlePlayTrack(track)}
                                title="Lire"
                              >
                                {audioState.currentTrackIndex !== -1 && 
                                 audioState.tracks[audioState.currentTrackIndex]?._id === track.id && 
                                 audioState.isPlaying ? (
                                  <Pause className="w-6 h-6 text-white ml-0" />
                                ) : (
                                  <Play className="w-6 h-6 text-white ml-1" />
                                )}
                              </button>
                            </div>
                            {/* Badge durée */}
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                              {formatDuration(track.duration)}
                            </div>
                          </div>
                          
                          {/* Informations track */}
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-[var(--text)] text-base mb-1 line-clamp-1 title-suno">{track.title}</h4>
                              <p className="text-[var(--text-muted)] text-sm line-clamp-1">
                                {Array.isArray(track.genre) ? track.genre.join(', ') : track.genre}
                              </p>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <TrendingUp size={12} className="text-blue-400" />
                                  <AnimatedPlaysCounter
                                    value={track.plays}
                                    size="sm"
                                    variant="minimal"
                                    showIcon={false}
                                    animation="slide"
                                    className="text-[var(--text-muted)] font-medium"
                                  />
                                </div>
                                <InteractiveCounter
                                  type="likes"
                                  initialCount={track.likes}
                                  isActive={track.isLiked}
                                  onToggle={async (newState) => {
                                    await handleLikeTrack(track.id);
                                  }}
                                  size="sm"
                                  showIcon={true}
                                  disabled={likeLoading === track.id}
                                  className="hover:text-pink-400 transition-colors"
                                />
                              </div>
                              
                              {/* Menu d'options pour le propriétaire */}
                              {isOwnProfile && (
                                <button 
                                  className="p-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTrackOptions(showTrackOptions === track.id ? null : track.id);
                                  }}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTracks.map((track: any) => (
                      <div key={track.id} className={`panel-suno rounded-xl p-4 border border-[var(--border)] transition-all duration-200 group relative ${showTrackOptions === track.id ? 'pr-52' : ''}`}> 
                        {/* Banderole de mise en avant */}
                        {track.is_featured && (
                          <div className="absolute -top-2 -left-2 z-10">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                              <Crown size={12} />
                              {track.featuredBanner || 'En vedette'}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4">
                          <div className="relative flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              {track.cover_url || track.cover_url || track.coverUrl ? (
                                <img src={track.cover_url || track.cover_url || track.coverUrl} alt={track.title} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <button 
                              className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" 
                              onClick={() => handlePlayTrack(track)}
                              title="Lire"
                            >
                              {audioState.currentTrackIndex !== -1 && 
                               audioState.tracks[audioState.currentTrackIndex]?._id === track.id && 
                               audioState.isPlaying ? (
                                <Pause className="w-6 h-6 text-white" />
                              ) : (
                                <Play className="w-6 h-6 text-white" />
                              )}
                            </button>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-lg">{track.title}</h4>
                            <p className="text-sm text-gray-400">
                              {Array.isArray(track.genre) ? track.genre.join(', ') : track.genre}
                            </p>
                            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
                              <InteractiveCounter
                                type="likes"
                                initialCount={track.likes}
                                isActive={track.isLiked}
                                onToggle={async (newState) => {
                                  await handleLikeTrack(track.id);
                                }}
                                size="sm"
                                showIcon={true}
                                disabled={likeLoading === track.id}
                                className="hover:text-pink-400 transition-colors"
                              />
                              <AnimatedPlaysCounter
                                value={track.plays}
                                size="sm"
                                variant="minimal"
                                showIcon={false}
                                animation="slide"
                                className="text-gray-500"
                              />
                              <span>{formatDuration(track.duration)}</span>
                            </div>
                          </div>
                          
                          {/* Menu d'options pour le propriétaire */}
                          {isOwnProfile && (
                            <button 
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTrackOptions(showTrackOptions === track.id ? null : track.id);
                              }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tiroir d'options global pour toutes les vues */}
            {isOwnProfile && showTrackOptions && (
              <div className="fixed inset-0 z-50" onClick={() => setShowTrackOptions(null)}>
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
                <div 
                  className="absolute bg-[var(--surface-2)] border border-[var(--border)] rounded-xl shadow-2xl p-1 min-w-[220px] animate-fade-in"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {userTracks.find(t => t.id === showTrackOptions) && (
                    <>
                      <div className="p-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <img 
                              src={userTracks.find(t => t.id === showTrackOptions)?.cover_url || userTracks.find(t => t.id === showTrackOptions)?.coverUrl || '/default-cover.jpg'} 
                              alt={userTracks.find(t => t.id === showTrackOptions)?.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                              }}
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-[var(--text)] text-sm line-clamp-1">
                              {userTracks.find(t => t.id === showTrackOptions)?.title}
                            </h4>
                            <p className="text-[var(--text-muted)] text-xs">
                              {formatDuration(userTracks.find(t => t.id === showTrackOptions)?.duration)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-3)] flex items-center gap-3 text-[var(--text)] rounded-lg transition-colors"
                          onClick={() => {
                            const track = userTracks.find(t => t.id === showTrackOptions);
                            if (track) handleEditTrack(track);
                          }}
                        >
                          <Edit3 className="w-4 h-4 text-blue-400" />
                          <span>Modifier</span>
                        </button>
                        <button
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-3)] flex items-center gap-3 text-[var(--text)] rounded-lg transition-colors"
                          onClick={() => {
                            const track = userTracks.find(t => t.id === showTrackOptions);
                            if (track) handleFeatureTrack(track);
                          }}
                        >
                          <Star className={`w-4 h-4 ${userTracks.find(t => t.id === showTrackOptions)?.is_featured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                          <span>{userTracks.find(t => t.id === showTrackOptions)?.is_featured ? 'Retirer de la vedette' : 'Mettre en vedette'}</span>
                        </button>
                        <div className="border-t border-[var(--border)] my-2"></div>
                        <button
                          className="w-full px-3 py-2.5 text-left text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-3 rounded-lg transition-colors"
                          onClick={() => {
                            if (showTrackOptions) handleDeleteTrack(showTrackOptions);
                          }}
                          disabled={deleteLoading === showTrackOptions}
                        >
                          {deleteLoading === showTrackOptions ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'playlists' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Playlists</h3>
                  <button
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                    onClick={async () => {
                      // Vérifier quota playlists avant d'ouvrir la modale
                      try {
                        const [u, c] = await Promise.all([
                          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then(r => r.ok ? r.json() : null).catch(() => null),
                          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then(r => r.ok ? r.json() : null).catch(() => null),
                        ]);
                        const limit = u?.playlists?.limit ?? -1;
                        const used = u?.playlists?.used ?? 0;
                        if (limit >= 0 && used >= limit) {
                          // Bloquer + CTA upgrade
                          if (typeof window !== 'undefined') {
                            // Info compacte
                            alert("Limite de playlists atteinte. Rendez-vous sur Abonnements pour améliorer votre plan.");
                            window.location.href = '/subscriptions';
                            return;
                          }
                        }
                        setShowCreatePlaylistModal(true);
                      } catch {
                        setShowCreatePlaylistModal(true);
                      }
                    }}
                  >
                    Créer une playlist
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPlaylists.map((playlist: any) => (
                    <div key={playlist.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group">
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3v3a2 2 0 01-2 2H3a1 1 0 110-2h1V5zM8 11a2 2 0 012-2h1a1 1 0 110 2H9a2 2 0 00-2 2v1a1 1 0 11-2 0v-1z" clipRule="evenodd" />
                              <path d="M13 7a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V8a1 1 0 011-1z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                          <p className="text-sm text-gray-400 truncate">{playlist.tracks.length} tracks</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{playlist.likes} likes</span>
                            <span>{playlist.isPublic ? 'Public' : 'Privé'}</span>
                          </div>
                        </div>
                        <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </div>
      </main>

      {/* Modal Édition Profil */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Modifier le profil</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                  <textarea
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Parlez-nous de vous..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom d'artiste (optionnel)</label>
                  <input
                    type="text"
                    value={editData.artistName || ''}
                    onChange={(e) => setEditData({ ...editData, artistName: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Nom d'artiste"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                  <input
                    type="url"
                    value={editData.socialLinks?.instagram || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      socialLinks: { ...editData.socialLinks, instagram: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://instagram.com/votre-compte"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Twitter</label>
                  <input
                    type="url"
                    value={editData.socialLinks?.twitter || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      socialLinks: { ...editData.socialLinks, twitter: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://twitter.com/votre-compte"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">YouTube</label>
                  <input
                    type="url"
                    value={editData.socialLinks?.youtube || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      socialLinks: { ...editData.socialLinks, youtube: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://youtube.com/votre-chaine"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Site web</label>
                  <input
                    type="url"
                    value={editData.socialLinks?.website || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      socialLinks: { ...editData.socialLinks, website: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://votre-site.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center w-4 h-4 min-h-[16px] mx-auto">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    'Sauvegarder'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Modal Création Playlist */}
      <AnimatePresence>
        {showCreatePlaylistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreatePlaylistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Créer une playlist</h3>
                <button
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom de la playlist</label>
                  <input
                    type="text"
                    value={newPlaylistData.name}
                    onChange={(e) => setNewPlaylistData({ ...newPlaylistData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ma nouvelle playlist"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (optionnel)</label>
                  <textarea
                    value={newPlaylistData.description}
                    onChange={(e) => setNewPlaylistData({ ...newPlaylistData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Décrivez votre playlist..."
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newPlaylistData.isPublic}
                    onChange={(e) => setNewPlaylistData({ ...newPlaylistData, isPublic: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-300">
                    Rendre cette playlist publique
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={uploading || !newPlaylistData.name.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Créer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Édition Track */}
      <AnimatePresence>
        {showEditTrackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditTrackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Modifier la piste</h3>
                <button
                  onClick={() => setShowEditTrackModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                  <input
                    type="text"
                    value={trackEditData.title || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Titre de la piste"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={trackEditData.description || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Description de la piste..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Genres (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={trackEditData.genre || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, genre: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Rock, Pop, Électronique"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tags (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={trackEditData.tags || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="chill, instrumental, ambient"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={trackEditData.isPublic}
                    onChange={(e) => setTrackEditData({ ...trackEditData, isPublic: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-300">
                    Rendre cette piste publique
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditTrackModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveTrackEdit}
                  disabled={uploading || !trackEditData.title?.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sauvegarder'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Mise en avant Track */}
      <AnimatePresence>
        {showFeatureTrackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFeatureTrackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400" />
                  {featuringTrack?.isFeatured ? 'Retirer de la vedette' : 'Mettre en vedette'}
                </h3>
                <button
                  onClick={() => setShowFeatureTrackModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">{featuringTrack?.title}</h4>
                  <p className="text-sm text-gray-400">
                    {Array.isArray(featuringTrack?.genre) ? featuringTrack.genre.join(', ') : featuringTrack?.genre}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Banderole personnalisée (optionnel)
                  </label>
                  <input
                    type="text"
                    value={featuredBanner}
                    onChange={(e) => setFeaturedBanner(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ex: Nouveau single, Hit de l'été, etc."
                    maxLength={30}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Laissez vide pour utiliser "En vedette" par défaut
                  </p>
                </div>

                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown size={16} />
                    <span className="font-medium">
                      {featuredBanner || 'En vedette'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFeatureTrackModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveFeatureTrack}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 
                   featuringTrack?.isFeatured ? 'Retirer de la vedette' : 'Mettre en vedette'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 