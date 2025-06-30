'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit3, Check, Heart, Users, Music, Plus, Image, Camera, Loader2, LogOut, Link2, Instagram, Twitter, Youtube, Globe, ChevronDown, ChevronUp, UserPlus, Trash2, Star, Play, Pause, MoreVertical, Crown } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

const socialIcons = {
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  website: Globe,
};

export default function ProfileUserPage() {
  const { username } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const { playTrack, audioState } = useAudioPlayer();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'likes' | 'followers' | 'following'>('tracks');
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
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
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
    }
  ];

  // Données pour les onglets (simulées pour l'instant)
  const userTracks = profile?.tracks || [];
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
      // Vérifier si la track a une URL audio
      if (!track.audioUrl) {
        console.warn('Track sans audioUrl, récupération des données complètes:', track._id);
        // Récupérer les détails complets de la track depuis l'API
        const trackResponse = await fetch(`/api/tracks/${track._id}`);
        if (trackResponse.ok) {
          const trackData = await trackResponse.json();
          if (trackData.track && trackData.track.audioUrl) {
            await playTrack(trackData.track);
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
        _id: track._id,
        title: track.title,
        artist: track.artist || {
          _id: profile._id,
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar
        },
        audioUrl: track.audioUrl,
        coverUrl: track.coverUrl,
        duration: track.duration,
        likes: track.likes || [],
        comments: track.comments || [],
        plays: track.plays || 0,
        genre: track.genre || [],
        isLiked: track.isLiked || false
      };

      // Ajouter la track à la liste si elle n'y est pas déjà
      if (!audioState.tracks.find(t => t._id === track._id)) {
        // Récupérer les détails complets de la track depuis l'API
        const trackResponse = await fetch(`/api/tracks/${track._id}`);
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
      const res = await fetch(`/api/tracks/${trackId}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('Erreur like');
      const data = await res.json();
      
      // Mettre à jour l'état local
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.map((track: any) => 
          track._id === trackId 
            ? { ...track, isLiked: data.isLiked, likes: data.isLiked ? [...track.likes, session.user.id] : track.likes.filter((id: string) => id !== session.user.id) }
            : track
        )
      }));
    } catch (e: any) {
      setError(e.message || 'Erreur like');
    } finally {
      setLikeLoading(null);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette piste ?')) return;
    setDeleteLoading(trackId);
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur suppression');
      
      // Mettre à jour l'état local
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.filter((track: any) => track._id !== trackId),
        trackCount: prev.trackCount - 1
      }));
    } catch (e: any) {
      setError(e.message || 'Erreur suppression');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditTrack = (track: any) => {
    setEditingTrack(track);
    setTrackEditData({
      title: track.title,
      description: track.description || '',
      genre: track.genre?.join(', ') || '',
      tags: track.tags?.join(', ') || '',
      isPublic: track.isPublic
    });
    setShowEditTrackModal(true);
  };

  const handleSaveTrackEdit = async () => {
    if (!editingTrack) return;
    setUploading(true);
    setError('');
    try {
      const res = await fetch(`/api/tracks/${editingTrack._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trackEditData,
          genre: trackEditData.genre.split(',').map((g: string) => g.trim()).filter(Boolean),
          tags: trackEditData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        }),
      });
      if (!res.ok) throw new Error('Erreur modification');
      const data = await res.json();
      
      // Mettre à jour l'état local
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.map((track: any) => 
          track._id === editingTrack._id ? data.track : track
        )
      }));
      setShowEditTrackModal(false);
      setEditingTrack(null);
    } catch (e: any) {
      setError(e.message || 'Erreur modification');
    } finally {
      setUploading(false);
    }
  };

  const handleFeatureTrack = (track: any) => {
    setFeaturingTrack(track);
    setFeaturedBanner(track.featuredBanner || '');
    setShowFeatureTrackModal(true);
  };

  const handleSaveFeatureTrack = async () => {
    if (!featuringTrack) return;
    setUploading(true);
    setError('');
    try {
      const res = await fetch(`/api/tracks/${featuringTrack._id}/featured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFeatured: !featuringTrack.isFeatured,
          featuredBanner: featuredBanner
        }),
      });
      if (!res.ok) throw new Error('Erreur mise en avant');
      const data = await res.json();
      
      // Mettre à jour l'état local
      setProfile((prev: any) => ({
        ...prev,
        tracks: prev.tracks.map((track: any) => 
          track._id === featuringTrack._id ? data.track : track
        )
      }));
      setShowFeatureTrackModal(false);
      setFeaturingTrack(null);
    } catch (e: any) {
      setError(e.message || 'Erreur mise en avant');
    } finally {
      setUploading(false);
    }
  };

  // Suivre/Ne plus suivre un utilisateur depuis les modals
  const handleFollowUser = async (userId: string) => {
    setFollowLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
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

  const [menuDirection, setMenuDirection] = useState<{ [trackId: string]: 'up' | 'down' }>({});
  const menuButtonRefs = useRef<{ [trackId: string]: HTMLButtonElement | null }>({});
  const menuRefs = useRef<{ [trackId: string]: HTMLDivElement | null }>({});

  // Gestion dynamique de la direction du menu
  useEffect(() => {
    if (!showTrackOptions) return;
    const button = menuButtonRefs.current[showTrackOptions];
    const menu = menuRefs.current[showTrackOptions];
    if (button && typeof window !== 'undefined') {
      const rect = button.getBoundingClientRect();
      const menuHeight = menu ? menu.offsetHeight : 120;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        setMenuDirection((prev) => ({ ...prev, [showTrackOptions]: 'up' }));
      } else {
        setMenuDirection((prev) => ({ ...prev, [showTrackOptions]: 'down' }));
      }
    }
  }, [showTrackOptions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <Loader2 className="animate-spin w-10 h-10 text-purple-400" />
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <div className="text-center">
          <User size={40} className="mx-auto mb-4 text-purple-400" />
          <p className="text-lg font-bold mb-2">Profil introuvable</p>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="max-w-3xl mx-auto px-2 pt-0 pb-32">
        {/* Bannière */}
        <div className="relative h-40 md:h-56 rounded-b-3xl overflow-hidden mb-8">
          <img
            src={editData.banner || profile.banner || '/default-cover.jpg'}
            alt="Bannière"
            className="w-full h-full object-cover object-center"
          />
          {isOwnProfile && (
            <button
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
              onClick={() => bannerInputRef.current?.click()}
              title="Changer la bannière"
            >
              <Camera size={20} />
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
        {/* Avatar + infos */}
        <div className="relative flex flex-col items-center -mt-20 mb-6">
          <div className="relative">
            <img
              src={editData.avatar || profile.avatar || '/default-avatar.png'}
              alt="Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl bg-gray-800"
            />
            {isOwnProfile && (
              <button
                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                title="Changer l'avatar"
              >
                <Camera size={18} />
              </button>
            )}
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
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl font-bold gradient-text">{profile.name}</span>
              {profile.isVerified && <Check className="text-blue-400 w-5 h-5" />}
            </div>
            <span className="text-white/60 text-sm">@{profile.username}</span>
            {profile.isArtist && profile.artistName && (
              <div className="text-xs text-pink-400 mt-1">Artiste : {profile.artistName}</div>
            )}
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              <span className="flex items-center gap-1 text-xs bg-white/10 px-3 py-1 rounded-full"><Music size={14} /> {profile.trackCount} morceaux</span>
              <span className="flex items-center gap-1 text-xs bg-white/10 px-3 py-1 rounded-full"><Heart size={14} /> {profile.likeCount} likes</span>
              <button
                className="flex items-center gap-1 text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20"
                onClick={() => setShowFollowersModal(true)}
              >
                <Users size={14} /> {profile.followerCount} abonnés
              </button>
              <button
                className="flex items-center gap-1 text-xs bg-white/10 px-3 py-1 rounded-full hover:bg-white/20"
                onClick={() => setShowFollowingModal(true)}
              >
                <UserPlus size={14} /> {profile.followingCount} suivis
              </button>
            </div>
            {/* Bio */}
            {profile.bio && (
              <div className="mt-4 text-white/80 text-sm max-w-xl mx-auto">
                {profile.bio.length > bioMaxLength && !showFullBio ? (
                  <>
                    {profile.bio.slice(0, bioMaxLength)}...{' '}
                    <button className="text-purple-400 underline" onClick={() => setShowFullBio(true)}>Voir plus</button>
                  </>
                ) : (
                  <>
                    {profile.bio}
                    {profile.bio.length > bioMaxLength && (
                      <button className="text-purple-400 underline ml-2" onClick={() => setShowFullBio(false)}>Réduire</button>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Réseaux sociaux */}
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {profile.socialLinks && Object.entries(profile.socialLinks).map(([key, value]) => {
                const IconComponent = socialIcons[key as keyof typeof socialIcons];
                return value && (
                  <a
                    key={key}
                    href={value as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-white/70 hover:text-purple-400 text-xs px-2 py-1 bg-white/10 rounded-full"
                  >
                    {IconComponent ? (
                      <IconComponent size={14} className="mr-1" />
                    ) : (
                      <Link2 size={14} className="mr-1" />
                    )}
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                );
              })}
            </div>
            {/* Boutons actions */}
            <div className="flex justify-center gap-3 mt-6">
              {isOwnProfile ? (
                <button
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-full font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                  onClick={handleEdit}
                  disabled={editMode || uploading}
                >
                  <Edit3 size={16} /> Modifier le profil
                </button>
              ) : (
                <button
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all ${profile.isFollowing ? 'bg-pink-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                  onClick={handleFollow}
                  disabled={uploading}
                >
                  {profile.isFollowing ? <Check size={16} /> : <Plus size={16} />} {profile.isFollowing ? 'Abonné' : 'Suivre'}
                </button>
              )}
            </div>
            {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                      {tab.count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 py-6">
            {activeTab === 'tracks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Tracks</h3>
                  <div className="flex items-center space-x-2">
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        trackViewMode === 'list' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                      onClick={() => setTrackViewMode('list')}
                      title="Vue liste"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        trackViewMode === 'grid' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
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
                
                {trackViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userTracks.map((track: any) => (
                      <div key={track._id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group relative">
                        {/* Banderole de mise en avant */}
                        {track.isFeatured && (
                          <div className="absolute -top-2 -left-2 z-10">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                              <Crown size={12} />
                              {track.featuredBanner || 'En vedette'}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start space-x-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              {track.coverUrl ? (
                                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
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
                               audioState.tracks[audioState.currentTrackIndex]?._id === track._id && 
                               audioState.isPlaying ? (
                                <Pause className="w-6 h-6 text-white" />
                              ) : (
                                <Play className="w-6 h-6 text-white" />
                              )}
                            </button>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{track.title}</h4>
                            <p className="text-sm text-gray-400 truncate">
                              {Array.isArray(track.genre) ? track.genre.join(', ') : track.genre}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <button 
                                className={`flex items-center gap-1 hover:text-pink-400 transition-colors ${
                                  track.isLiked ? 'text-pink-400' : 'text-gray-500'
                                }`}
                                onClick={() => handleLikeTrack(track._id)}
                                disabled={likeLoading === track._id}
                              >
                                {likeLoading === track._id ? (
                                  <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  </div>
                                ) : (
                                  <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                                )}
                                {track.likes.length}
                              </button>
                              <span>{track.plays} écoutes</span>
                            </div>
                          </div>
                          
                          {/* Menu d'options pour le propriétaire */}
                          {isOwnProfile && (
                            <div className="relative">
                              <button 
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTrackOptions(showTrackOptions === track._id ? null : track._id);
                                }}
                                ref={el => { menuButtonRefs.current[track._id] = el; }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {showTrackOptions === track._id && (
                                <div 
                                  className={`absolute ${menuDirection[track._id] === 'up' ? 'top-full mt-1' : 'bottom-full mt-1'} bg-gray-800 rounded-lg shadow-lg border border-white/10 z-20 min-w-[160px]`}
                                  onClick={(e) => e.stopPropagation()}
                                  ref={el => { menuRefs.current[track._id] = el; }}
                                >
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => handleEditTrack(track)}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Modifier
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => handleFeatureTrack(track)}
                                  >
                                    <Star className={`w-4 h-4 ${track.isFeatured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                    {track.isFeatured ? 'Retirer de la vedette' : 'Mettre en vedette'}
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                                    onClick={() => handleDeleteTrack(track._id)}
                                    disabled={deleteLoading === track._id}
                                  >
                                    {deleteLoading === track._id ? (
                                      <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      </div>
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTracks.map((track: any) => (
                      <div key={track._id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group relative">
                        {/* Banderole de mise en avant */}
                        {track.isFeatured && (
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
                              {track.coverUrl ? (
                                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover rounded-lg" />
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
                               audioState.tracks[audioState.currentTrackIndex]?._id === track._id && 
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
                              <button 
                                className={`flex items-center gap-2 hover:text-pink-400 transition-colors ${
                                  track.isLiked ? 'text-pink-400' : 'text-gray-500'
                                }`}
                                onClick={() => handleLikeTrack(track._id)}
                                disabled={likeLoading === track._id}
                              >
                                {likeLoading === track._id ? (
                                  <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  </div>
                                ) : (
                                  <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                                )}
                                {track.likes.length} likes
                              </button>
                              <span>{track.plays} écoutes</span>
                              <span>{track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}</span>
                            </div>
                          </div>
                          
                          {/* Menu d'options pour le propriétaire */}
                          {isOwnProfile && (
                            <div className="relative">
                              <button 
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTrackOptions(showTrackOptions === track._id ? null : track._id);
                                }}
                                ref={el => { menuButtonRefs.current[track._id] = el; }}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {showTrackOptions === track._id && (
                                <div 
                                  className={`absolute ${menuDirection[track._id] === 'up' ? 'top-full mt-1' : 'bottom-full mt-1'} bg-gray-800 rounded-lg shadow-lg border border-white/10 z-20 min-w-[160px]`}
                                  onClick={(e) => e.stopPropagation()}
                                  ref={el => { menuRefs.current[track._id] = el; }}
                                >
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => handleEditTrack(track)}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Modifier
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                                    onClick={() => handleFeatureTrack(track)}
                                  >
                                    <Star className={`w-4 h-4 ${track.isFeatured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                    {track.isFeatured ? 'Retirer de la vedette' : 'Mettre en vedette'}
                                  </button>
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                                    onClick={() => handleDeleteTrack(track._id)}
                                    disabled={deleteLoading === track._id}
                                  >
                                    {deleteLoading === track._id ? (
                                      <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      </div>
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'playlists' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Playlists</h3>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors" onClick={() => setShowCreatePlaylistModal(true)}>
                    Créer une playlist
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userPlaylists.map((playlist: any) => (
                    <div key={playlist._id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group">
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
                            <span>{playlist.likes.length} likes</span>
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

            {activeTab === 'followers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Followers</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {followers.map((follower: any) => (
                    <div key={follower._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {follower.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{follower.username}</h4>
                          <p className="text-sm text-gray-400">{follower.tracks?.length || 0} tracks</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {follower.isFollowing ? (
                          <button
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            onClick={() => handleFollowUser(follower._id)}
                            disabled={followLoading === follower._id}
                          >
                            {followLoading === follower._id ? (
                              <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              'Ne plus suivre'
                            )}
                          </button>
                        ) : (
                          <button
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                            onClick={() => handleFollowUser(follower._id)}
                            disabled={followLoading === follower._id}
                          >
                            {followLoading === follower._id ? (
                              <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              'Suivre'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'following' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Following</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="px-3 py-2 bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {following.map((followed: any) => (
                    <div key={followed._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {followed.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{followed.username}</h4>
                          <p className="text-sm text-gray-400">{followed.tracks?.length || 0} tracks</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {followed.isFollowing ? (
                          <button
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            onClick={() => handleFollowUser(followed._id)}
                            disabled={followLoading === followed._id}
                          >
                            {followLoading === followed._id ? (
                              <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              'Ne plus suivre'
                            )}
                          </button>
                        ) : (
                          <button
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                            onClick={() => handleFollowUser(followed._id)}
                            disabled={followLoading === followed._id}
                          >
                            {followLoading === followed._id ? (
                              <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            ) : (
                              'Suivre'
                            )}
                          </button>
                        )}
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

      {/* Modal Followers */}
      <AnimatePresence>
        {showFollowersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFollowersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Abonnés ({profile?.followerCount})</h3>
                <button
                  onClick={() => setShowFollowersModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {followers.length > 0 ? (
                  followers.map((follower: any) => (
                    <div key={follower._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {follower.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{follower.username}</h4>
                          <p className="text-sm text-gray-400">{follower.tracks?.length || 0} tracks</p>
                        </div>
                      </div>
                      {follower.isFollowing ? (
                        <button
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[90px]"
                          onClick={() => handleFollowUser(follower._id)}
                          disabled={followLoading === follower._id}
                        >
                          {followLoading === follower._id ? (
                            <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : (
                            'Ne plus suivre'
                          )}
                        </button>
                      ) : (
                        <button
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[90px]"
                          onClick={() => handleFollowUser(follower._id)}
                          disabled={followLoading === follower._id}
                        >
                          {followLoading === follower._id ? (
                            <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          ) : (
                            'Suivre'
                          )}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Aucun abonné pour le moment</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Following */}
      <AnimatePresence>
        {showFollowingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFollowingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Abonnements ({profile?.followingCount})</h3>
                <button
                  onClick={() => setShowFollowingModal(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {following.length > 0 ? (
                  following.map((followed: any) => (
                    <div key={followed._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {followed.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{followed.username}</h4>
                          <p className="text-sm text-gray-400">{followed.tracks?.length || 0} tracks</p>
                        </div>
                      </div>
                      <button
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center min-w-[90px]"
                        onClick={() => handleFollowUser(followed._id)}
                        disabled={followLoading === followed._id}
                      >
                        {followLoading === followed._id ? (
                          <div className="flex items-center justify-center w-4 h-4 min-h-[16px]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          'Ne plus suivre'
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Aucun abonnement pour le moment</p>
                  </div>
                )}
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