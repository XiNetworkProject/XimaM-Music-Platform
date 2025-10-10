'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LibraryPageSkeleton, EmptyState } from '@/components/Skeletons';
import { 
  Heart, 
  Clock, 
  Plus, 
  Play, 
  Pause,
  MoreVertical, 
  Music, 
  Users,
  User,
  Calendar,
  Shuffle,
  Repeat,
  Edit3,
  Trash2,
  Share2,
  Download,
  Search,
  Filter,
  Grid,
  List,
  X,
  Check,
  FolderPlus,
  Star,
  Eye,
  EyeOff,
  Copy,
  Settings,
  Sparkles,
  GripVertical,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';
import { notify, notificationStore } from '@/components/NotificationCenter';
// Composants temporairement commentés jusqu'à leur création
// import LikeButton from '@/components/LikeButton';
// import { AnimatedPlaysCounter } from '@/components/AnimatedCounter';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  genre: string[];
  tags: string[];
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  createdAt: string;
}

interface Playlist {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackCount: number;
  duration: number;
  isPublic: boolean;
  tracks: Track[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  likes: string[];
  followers: string[];
}

export default function LibraryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { audioState, playTrack, setQueueAndPlay } = useAudioPlayer();
  
  // Utiliser les nouveaux systèmes de likes et écoutes
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch, isBatchLoading: isPlaysLoading } = useBatchPlaysSystem();
  
  // États principaux
  const [activeTab, setActiveTab] = useState<'playlists' | 'recent' | 'favorites' | 'downloads'>('playlists');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [recentLimit, setRecentLimit] = useState(40);
  const [favoritesLimit, setFavoritesLimit] = useState(60);
  const [isLoadingMoreRecent, setIsLoadingMoreRecent] = useState(false);
  const [isLoadingMoreFavorites, setIsLoadingMoreFavorites] = useState(false);
  const recentSentinelRef = useRef<HTMLDivElement | null>(null);
  const favoritesSentinelRef = useRef<HTMLDivElement | null>(null);

  // États pour création/édition de playlist
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    isPublic: true
  });

  // Edition de dossier (playlist)
  const [showEditPlaylist, setShowEditPlaylist] = useState(false);
  const [editPlaylistData, setEditPlaylistData] = useState({
    name: '',
    description: '',
    isPublic: true,
  });

  // Menus contextuels & Drag & Drop
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [activeTrackMenu, setActiveTrackMenu] = useState<string | null>(null);
  const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);
  const [trackMenuPosition, setTrackMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [folderMenuPosition, setFolderMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [sortKey, setSortKey] = useState<'alpha' | 'recent' | 'duration'>('recent');
  const [trackSort, setTrackSort] = useState<'title' | 'duration' | 'position'>('position');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);

  // Charger les données depuis l'API
  const fetchLibraryData = useCallback(async () => {
    console.log('🔄 fetchLibraryData appelé avec session:', !!session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('❌ Pas de session utilisateur, arrêt du chargement');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Charger les playlists de l'utilisateur
      try {
        console.log('🔄 Tentative de chargement des playlists...');
        const playlistsResponse = await fetch('/api/playlists?user=' + session.user.id);
        console.log('📡 Réponse playlists:', playlistsResponse.status);
        
        if (playlistsResponse.ok) {
          const playlistsData = await playlistsResponse.json();
          console.log('📋 Données playlists reçues:', playlistsData);
          setPlaylists(playlistsData.playlists || []);
        } else {
          console.warn('❌ Erreur lors du chargement des playlists:', playlistsResponse.status);
          const errorText = await playlistsResponse.text();
          console.warn('📄 Détails de l\'erreur:', errorText);
        }
      } catch (error) {
        console.warn('❌ Erreur réseau pour les playlists:', error);
      }

      // Charger les pistes récentes (pagination simple)
      try {
        const recentResponse = await fetch(`/api/tracks?recent=true&limit=${recentLimit}`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache' } });
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          setRecentTracks(recentData.tracks || []);
        } else {
          console.warn('Erreur lors du chargement des pistes récentes:', recentResponse.status);
        }
      } catch (error) {
        console.warn('Erreur réseau pour les pistes récentes:', error);
      }

      // Charger les favoris (pagination simple)
      try {
        const favoritesResponse = await fetch(`/api/tracks?liked=true&limit=${favoritesLimit}`, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache' } });
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json();
          setFavoriteTracks(favoritesData.tracks || []);
        } else {
          console.warn('Erreur lors du chargement des favoris:', favoritesResponse.status);
        }
      } catch (error) {
        console.warn('Erreur réseau pour les favoris:', error);
      }

      // Charger toutes les pistes pour l'ajout aux playlists
      try {
        const allTracksResponse = await fetch('/api/tracks?limit=100', { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache' } });
        if (allTracksResponse.ok) {
          const allTracksData = await allTracksResponse.json();
          setAllTracks(allTracksData.tracks || []);
        } else {
          console.warn('Erreur lors du chargement de toutes les pistes:', allTracksResponse.status);
        }
      } catch (error) {
        console.warn('Erreur réseau pour toutes les pistes:', error);
      }

      // Charger les téléchargements (simulation)
      setDownloadedTracks([]);

    } catch (error) {
      console.error('Erreur lors du chargement de la bibliothèque:', error);
      setError('Erreur lors du chargement de la bibliothèque');
      // En cas d'erreur, on met quand même loading à false
    } finally {
      console.log('✅ Chargement terminé, loading mis à false');
      setLoading(false);
    }
  }, [session?.user?.id, recentLimit, favoritesLimit]);

  useEffect(() => {
    fetchLibraryData();
  }, [fetchLibraryData]);

  // Synchronisation temps réel des écoutes via event global
  useEffect(() => {
    const handler = (e: any) => {
      const { trackId, plays } = e.detail || {};
      if (!trackId || typeof plays !== 'number') return;
      setRecentTracks(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
      setFavoriteTracks(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
      setAllTracks(prev => prev.map(t => t._id === trackId ? { ...t, plays } : t));
      setPlaylists(prev => prev.map(pl => ({
        ...pl,
        tracks: pl.tracks?.map(t => t._id === trackId ? { ...t, plays } : t) || pl.tracks
      })));
    };
    window.addEventListener('playsUpdated', handler as EventListener);
    return () => window.removeEventListener('playsUpdated', handler as EventListener);
  }, []);

  // Infinite scroll: Récent
  useEffect(() => {
    if (activeTab !== 'recent') return;
    const el = recentSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(async (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !isLoadingMoreRecent) {
        setIsLoadingMoreRecent(true);
        try {
          const nextLimit = recentLimit + 40;
          const res = await fetch(`/api/tracks?recent=true&limit=${nextLimit}`, { headers: { 'Cache-Control': 'no-store' } });
          if (res.ok) {
            const json = await res.json();
            setRecentTracks(prev => {
              const seen = new Set(prev.map(t => t._id));
              const merged = [...prev];
              for (const t of json.tracks || []) if (!seen.has(t._id)) merged.push(t);
              return merged;
            });
            setRecentLimit(nextLimit);
          }
        } catch {}
        setIsLoadingMoreRecent(false);
      }
    }, { rootMargin: '0px 0px 200px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, recentLimit, isLoadingMoreRecent]);

  // Infinite scroll: Favoris
  useEffect(() => {
    if (activeTab !== 'favorites') return;
    const el = favoritesSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(async (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !isLoadingMoreFavorites) {
        setIsLoadingMoreFavorites(true);
        try {
          const nextLimit = favoritesLimit + 60;
          const res = await fetch(`/api/tracks?liked=true&limit=${nextLimit}`, { headers: { 'Cache-Control': 'no-store' } });
          if (res.ok) {
            const json = await res.json();
            setFavoriteTracks(prev => {
              const seen = new Set(prev.map(t => t._id));
              const merged = [...prev];
              for (const t of json.tracks || []) if (!seen.has(t._id)) merged.push(t);
              return merged;
            });
            setFavoritesLimit(nextLimit);
          }
        } catch {}
        setIsLoadingMoreFavorites(false);
      }
    }, { rootMargin: '0px 0px 200px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, favoritesLimit, isLoadingMoreFavorites]);

  // Créer une nouvelle playlist
  const createPlaylist = async () => {
    if (!newPlaylist.name.trim()) return;

    try {
      setActionLoading(true);
      console.log('🎵 Création de playlist:', newPlaylist);
      
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlaylist),
      });

      console.log('📡 Réponse création playlist:', response.status);

      if (response.ok) {
        const playlist = await response.json();
        console.log('✅ Playlist créée:', playlist);
        setPlaylists(prev => [playlist, ...prev]);
        setNewPlaylist({ name: '', description: '', isPublic: true });
        setShowCreatePlaylist(false);
        notify.success('Dossier créé');
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur création playlist:', response.status, errorText);
        setError('Erreur lors de la création de la playlist');
        notify.error('Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('❌ Erreur réseau création playlist:', error);
      setError('Erreur réseau lors de la création de la playlist');
      notify.error('Erreur réseau lors de la création');
    } finally {
      setActionLoading(false);
    }
  };

  // Ajouter une piste à une playlist
  const addTrackToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId }),
      });

      if (response.ok) {
        // Mettre à jour l'état local
        setPlaylists(prev => prev.map(playlist => 
          playlist._id === playlistId 
            ? { ...playlist, trackCount: playlist.trackCount + 1 }
            : playlist
        ));
        setShowAddToPlaylist(null);
        notify.success('Piste ajoutée au dossier');
      }
    } catch (error) {
      // Erreur silencieuse
      notify.error('Erreur lors de l\'ajout au dossier');
    } finally {
      setActionLoading(false);
    }
  };

  // Supprimer une playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette playlist ?')) return;

    try {
      setActionLoading(true);
      const backup = playlists.find(p => p._id === playlistId);
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPlaylists(prev => prev.filter(p => p._id !== playlistId));
        if (selectedPlaylist === playlistId) {
          setSelectedPlaylist(null);
        }
        // Undo: recréer le dossier et réinsérer les pistes
        if (backup) {
          notificationStore.add({
            type: 'info',
            title: 'Dossier supprimé',
            message: 'Cliquez pour annuler la suppression',
            duration: 6000,
            action: {
              label: 'Annuler',
              onClick: async () => {
                try {
                  const createRes = await fetch('/api/playlists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: backup.name, description: backup.description, isPublic: backup.isPublic })
                  });
                  if (!createRes.ok) return;
                  const recreated = await createRes.json();
                  // Réinsérer les pistes de manière asynchrone
                  if (Array.isArray(backup.tracks) && backup.tracks.length) {
                    for (const t of backup.tracks) {
                      await fetch(`/api/playlists/${encodeURIComponent(recreated._id)}/tracks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trackId: t._id })
                      });
                    }
                  }
                  setPlaylists(prev => [recreated, ...prev]);
                  notify.success('Dossier restauré');
                } catch {
                  notify.error('Impossible de restaurer le dossier');
                }
              }
            }
          });
        } else {
          notify.success('Dossier supprimé');
        }
      }
    } catch (error) {
      // Erreur silencieuse
      notify.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  // Mettre à jour une playlist (dossier)
  const updatePlaylist = async () => {
    if (!selectedPlaylist) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/playlists/${selectedPlaylist}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlaylistData),
      });
      if (response.ok) {
        const updated = await response.json();
        setPlaylists(prev => prev.map(p => p._id === selectedPlaylist ? {
          ...p,
          name: updated.name,
          description: updated.description,
          isPublic: updated.isPublic,
        } : p));
        setShowEditPlaylist(false);
        notify.success('Dossier mis à jour');
      }
    } catch {
      notify.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(false);
    }
  };

  // Retirer une piste d'une playlist (dossier)
  const removeTrackFromPlaylist = async (playlistId: string, trackId: string) => {
    try {
      setActionLoading(true);
      const removedTrack = playlists.find(pl => pl._id === playlistId)?.tracks.find(t => t._id === trackId);
      const response = await fetch(`/api/playlists/${playlistId}/tracks?trackId=${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPlaylists(prev => prev.map(pl => pl._id === playlistId ? {
          ...pl,
          tracks: (pl.tracks || []).filter(t => t._id !== trackId),
          trackCount: Math.max(0, (pl.trackCount || 0) - 1),
        } : pl));
        // Undo : réajout de la piste
        if (removedTrack) {
          notificationStore.add({
            type: 'info',
            title: 'Piste retirée',
            message: removedTrack.title,
            duration: 6000,
            action: {
              label: 'Annuler',
              onClick: async () => {
                try {
                  const addRes = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trackId })
                  });
                  if (addRes.ok) {
                    setPlaylists(prev => prev.map(pl => pl._id === playlistId ? {
                      ...pl,
                      tracks: [...(pl.tracks || []), removedTrack],
                      trackCount: (pl.trackCount || 0) + 1,
                    } : pl));
                    notify.success('Piste restaurée');
                  }
                } catch {
                  notify.error('Impossible de restaurer la piste');
                }
              }
            }
          });
        } else {
          notify.success('Piste retirée du dossier');
        }
      }
    } catch {
      notify.error('Erreur lors du retrait du dossier');
    } finally {
      setActionLoading(false);
    }
  };

  // Définir la cover d'un dossier depuis une piste
  const setPlaylistCover = async (playlistId: string, coverUrl?: string) => {
    if (!coverUrl) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverUrl }),
      });
      if (!res.ok) throw new Error('Failed');
      setPlaylists(prev => prev.map(p => p._id === playlistId ? { ...p, coverUrl } : p));
      notify.success('Cover du dossier mise à jour');
    } catch {
      notify.error('Erreur lors de la mise à jour de la cover');
    } finally {
      setActionLoading(false);
      setActiveTrackMenu(null);
    }
  };

  // Jouer une playlist
  const playPlaylist = async (playlist: Playlist) => {
    if (playlist.tracks.length === 0) return;
    
    try {
      setQueueAndPlay(playlist.tracks, 0);
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Gérer les likes
  const handleLikeTrack = async (trackId: string) => {
    try {
      await toggleLikeBatch(trackId, { isLiked: false, likesCount: 0 });
      // Mettre à jour l'état local
      setFavoriteTracks(prev => prev.map(track => 
        track._id === trackId 
          ? { ...track, isLiked: !track.isLiked, likes: track.isLiked ? track.likes.filter(id => id !== session?.user?.id) : [...track.likes, session?.user?.id || ''] }
          : track
      ));
      notify.success('Favori mis à jour');
    } catch (error) {
      // Erreur silencieuse
      notify.error('Erreur lors de l\'action sur le favori');
    }
  };

  // Partager une playlist
  const sharePlaylist = async (playlist: Playlist) => {
    try {
      const shareUrl = `${window.location.origin}/playlists/${playlist._id}`;
      const shareText = `Écoutez "${playlist.name}" sur Synaura`;
      
      if (navigator.share) {
        await navigator.share({
          title: playlist.name,
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
        // Lien copié dans le presse-papiers
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Basculer visibilité dossier
  const togglePlaylistVisibility = async (playlistId: string, nextPublic: boolean) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextPublic })
      });
      if (res.ok) {
        setPlaylists(prev => prev.map(p => p._id === playlistId ? { ...p, isPublic: nextPublic } : p));
        notify.success(nextPublic ? 'Dossier rendu public' : 'Dossier rendu privé');
      } else {
        notify.error('Erreur lors du changement de visibilité');
      }
    } catch {
      notify.error('Erreur réseau');
    } finally {
      setActionLoading(false);
      setActiveFolderMenu(null);
    }
  };

  // Partager une piste
  const shareTrack = async (track: Track) => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({ title: track.title, text: `${track.title}`, url });
      } else {
        await navigator.clipboard.writeText(`${track.title} - ${url}`);
      }
      notify.success('Lien partagé/copier');
    } catch {}
  };

  // Drag & Drop: réordonnancement des pistes
  const reorderTracksLocal = (playlistId: string, draggedId: string, targetId: string): string[] => {
    const playlist = playlists.find(pl => pl._id === playlistId);
    if (!playlist) {
      console.error('❌ Playlist non trouvée:', playlistId);
      return [];
    }
    
    const items = [...(playlist.tracks || [])];
    const fromIndex = items.findIndex(t => t._id === draggedId);
    const toIndex = items.findIndex(t => t._id === targetId);
    
    console.log('🔍 Indices:', { fromIndex, toIndex, draggedId, targetId, itemsCount: items.length });
    
    if (fromIndex === -1 || toIndex === -1) {
      console.error('❌ Piste(s) non trouvée(s)');
      return [];
    }
    
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    const orderedTrackIds = items.map(t => t._id);
    
    // Mettre à jour l'état local
    setPlaylists(prev => prev.map(pl => 
      pl._id === playlistId ? { ...pl, tracks: items } : pl
    ));
    
    return orderedTrackIds;
  };

  const handleDragStart = (trackId: string) => {
    setDraggingTrackId(trackId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetTrackId: string) => {
    if (!draggingTrackId || !selectedPlaylist) return;
    if (draggingTrackId === targetTrackId) {
      setDraggingTrackId(null);
      return;
    }
    const ordered = reorderTracksLocal(selectedPlaylist, draggingTrackId, targetTrackId);
    console.log('🔄 Réordonnancement:', { ordered, count: ordered.length });
    if (!ordered.length) {
      console.error('❌ Aucune piste à réordonner');
      setDraggingTrackId(null);
      return;
    }
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(selectedPlaylist)}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedTrackIds: ordered }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ Erreur API reorder:', res.status, errorData);
        throw new Error('Failed');
      }
      console.log('✅ Réordonnancement réussi');
      notify.success('Ordre mis à jour');
      // L'état local est déjà mis à jour par reorderTracksLocal
    } catch (e) {
      console.error('❌ Erreur handleDrop:', e);
      notify.error('Erreur lors du réordonnancement');
      // Recharger uniquement cette playlist en cas d'erreur
      try {
        const res = await fetch(`/api/playlists/${encodeURIComponent(selectedPlaylist)}`);
        if (res.ok) {
          const pl = await res.json();
          setPlaylists(prev => prev.map(p => p._id === selectedPlaylist ? pl : p));
        }
      } catch {}
    } finally {
      setDraggingTrackId(null);
    }
  };

  // Utilitaires
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const isCurrentlyPlaying = (trackId: string) => {
    return audioState.tracks[audioState.currentTrackIndex]?._id === trackId && audioState.isPlaying;
  };

  const currentPlaylist = playlists.find(p => p._id === selectedPlaylist);

  // Filtres et tri des pistes du dossier en cours
  const currentGenres = useMemo(() => {
    const set = new Set<string>();
    (currentPlaylist?.tracks || []).forEach(t => (t.genre || []).forEach(g => set.add(g)));
    return Array.from(set);
  }, [currentPlaylist?.tracks]);

  const displayedTracks = useMemo(() => {
    let list = [...(currentPlaylist?.tracks || [])];
    if (genreFilter) {
      list = list.filter(t => (t.genre || []).includes(genreFilter));
    }
    // Ne trier que si un tri explicite est demandé (pas 'recent' par défaut)
    if (trackSort === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (trackSort === 'duration') {
      list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    }
    // Si trackSort === 'recent', on garde l'ordre naturel (position) de la playlist
    return list;
  }, [currentPlaylist?.tracks, genreFilter, trackSort]);

  // Filtrer les données selon la recherche
  const filteredPlaylists = playlists.filter(playlist => 
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tri des dossiers
  const sortedPlaylists = useMemo(() => {
    const arr = [...filteredPlaylists];
    switch (sortKey) {
      case 'alpha':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'duration':
        return arr.sort((a, b) => (b.duration || 0) - (a.duration || 0));
      case 'recent':
      default:
        return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [filteredPlaylists, sortKey]);

  const filteredRecentTracks = recentTracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFavoriteTracks = favoriteTracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // État de chargement
  if (loading) {
    return <LibraryPageSkeleton />;
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={24} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-[var(--text-muted)] mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchLibraryData();
            }}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg transition-all"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // État non connecté
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-[var(--color-primary)]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Connexion requise</h2>
          <p className="text-[var(--text-muted)] mb-4">Connectez-vous pour accéder à votre bibliothèque</p>
          <a
            href="/auth/signin"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text)] overflow-x-hidden w-full">
      <main className="container mx-auto px-2 sm:px-4 pt-16 pb-32">
        <div className="w-full max-w-none sm:max-w-6xl sm:mx-auto overflow-hidden">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] flex items-center gap-3">
                <Music size={28} className="text-[var(--color-primary)]" />
                Ma Bibliothèque
              </h1>
              
              {/* Bouton Bibliothèque IA */}
              <a
                href="/ai-library"
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg"
              >
                <Sparkles size={16} />
                <span>Bibliothèque IA</span>
              </a>
            </div>
            <p className="text-[var(--text-muted)] text-lg">Vos playlists, écoutes récentes et favoris.</p>
          </div>
          
          {/* Barre de recherche et contrôles */}
          <div className="panel-suno border border-[var(--border)] rounded-xl p-3 sm:p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Barre de recherche */}
              <div className="relative flex-1 max-w-xs sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher dans votre bibliothèque..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none text-[var(--text)] placeholder-[var(--text-muted)]"
                />
              </div>

              {/* Contrôles */}
              <div className="flex items-center space-x-3">
                {/* Bouton vue */}
                <div className="flex bg-[var(--surface-2)] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>

                {/* Bouton créer dossier */}
                {activeTab === 'playlists' && (
                  <button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="flex items-center space-x-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-full font-medium transition-all"
                  >
                    <Plus size={16} />
                    <span>Nouveau dossier</span>
                  </button>
                )}

                {/* Tri */}
                {activeTab === 'playlists' && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-[var(--text-muted)] text-sm">Trier</span>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as any)}
                      className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-md px-2 py-1 focus:outline-none"
                      aria-label="Trier les dossiers"
                    >
                      <option value="recent">Ajout récent</option>
                      <option value="alpha">A–Z</option>
                      <option value="duration">Durée</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Onglets */}
            <div className="panel-suno border border-[var(--border)] rounded-xl p-3 sm:p-6 mb-8">
            <div className="flex space-x-1 bg-[var(--surface-2)] rounded-xl p-1">
              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'playlists'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Music size={16} className="inline mr-2" />
                Dossiers
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'recent'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Clock size={16} className="inline mr-2" />
                Récent
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Heart size={16} className="inline mr-2" />
                Favoris
              </button>
              <button
                onClick={() => setActiveTab('downloads')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'downloads'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Download size={16} className="inline mr-2" />
                Téléchargements
              </button>
            </div>
          </div>

          {/* Modal de création de dossier */}
          <AnimatePresence>
            {showCreatePlaylist && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-6 w-full max-w-[90vw] sm:max-w-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Créer un dossier</h3>
                    <button
                      onClick={() => setShowCreatePlaylist(false)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text)] mb-2">Nom</label>
                      <input
                        type="text"
                        value={newPlaylist.name}
                        onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nom du dossier"
                        className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-[var(--text)] border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text)] mb-2">Description</label>
                      <textarea
                        value={newPlaylist.description}
                        onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optionnel)"
                        rows={3}
                        className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-[var(--text)] border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setNewPlaylist(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          newPlaylist.isPublic 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                        }`}
                      >
                        {newPlaylist.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="text-sm">
                          {newPlaylist.isPublic ? 'Publique' : 'Privée'}
                        </span>
                      </button>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setShowCreatePlaylist(false)}
                        className="flex-1 py-2 px-4 bg-[var(--surface-2)] rounded-lg text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={createPlaylist}
                        disabled={!newPlaylist.name.trim() || actionLoading}
                        className="flex-1 py-2 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'Création...' : 'Créer'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal d'édition de dossier */}
          <AnimatePresence>
            {showEditPlaylist && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-6 w-full max-w-[90vw] sm:max-w-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Modifier le dossier</h3>
                    <button
                      onClick={() => setShowEditPlaylist(false)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text)] mb-2">Nom</label>
                      <input
                        type="text"
                        value={editPlaylistData.name}
                        onChange={(e) => setEditPlaylistData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nom du dossier"
                        className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-[var(--text)] border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text)] mb-2">Description</label>
                      <textarea
                        value={editPlaylistData.description}
                        onChange={(e) => setEditPlaylistData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optionnel)"
                        rows={3}
                        className="w-full px-3 py-2 bg-[var(--bg)] rounded-lg text-[var(--text)] border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setEditPlaylistData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                          editPlaylistData.isPublic 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                        }`}
                      >
                        {editPlaylistData.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span className="text-sm">
                          {editPlaylistData.isPublic ? 'Publique' : 'Privée'}
                        </span>
                      </button>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setShowEditPlaylist(false)}
                        className="flex-1 py-2 px-4 bg-[var(--surface-2)] rounded-lg text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={updatePlaylist}
                        disabled={!editPlaylistData.name.trim() || actionLoading}
                        className="flex-1 py-2 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal d'ajout à un dossier */}
          <AnimatePresence>
            {showAddToPlaylist && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-6 w-full max-w-[90vw] sm:max-w-md max-h-96 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Ajouter à un dossier</h3>
                    <button
                      onClick={() => setShowAddToPlaylist(null)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {playlists.map((playlist) => (
                      <button
                                        key={playlist._id}
                onClick={() => addTrackToPlaylist(playlist._id, showAddToPlaylist!)}
                        disabled={actionLoading}
                        className="w-full flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        <img
                          src={(playlist.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
                          alt={playlist.name}
                          className="w-12 h-12 rounded object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="flex-1 text-left">
                          <h4 className="font-medium">{playlist.name}</h4>
                          <p className="text-sm text-white/60">{playlist.trackCount} pistes</p>
                        </div>
                        <Plus size={16} className="text-white/60" />
                      </button>
                    ))}
        </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contenu des onglets */}
            <div className="panel-suno border border-[var(--border)] rounded-xl p-3 sm:p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'playlists' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {selectedPlaylist ? (
                  // Vue détaillée de la playlist
                  <div>
                    <div className="flex items-center space-x-4 mb-6">
                      <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        ←
                      </button>
                        <div className="flex-1">
                        <h2 className="text-xl font-bold">{currentPlaylist?.name}</h2>
                        <p className="text-white/60">{currentPlaylist?.description}</p>
                      </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (currentPlaylist) {
                                setEditPlaylistData({
                                  name: currentPlaylist.name,
                                  description: currentPlaylist.description,
                                  isPublic: currentPlaylist.isPublic,
                                });
                                setShowEditPlaylist(true);
                              }
                            }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            title="Modifier le dossier"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => sharePlaylist(currentPlaylist!)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            onClick={() => deletePlaylist(currentPlaylist!._id)}
                            className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                    </div>

                    {/* Barre d’actions sticky: lecture + filtres/tri */}
                    <div className="sticky top-[64px] z-10 flex items-center gap-3 mb-6 p-2 rounded-xl bg-[var(--surface)]/60 backdrop-blur border border-[var(--border)]">
                      <button
                          onClick={() => playPlaylist(currentPlaylist!)}
                          className="w-12 h-12 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-full flex items-center justify-center transition-all"
                      >
                          <Play size={20} />
                      </button>
                      <button className="p-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                        <Shuffle size={20} />
                      </button>
                      <button className="p-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                        <Repeat size={20} />
                      </button>

                      <div className="ml-auto flex items-center gap-2">
                        {/* Filtre genre */}
                        <select
                          value={genreFilter || ''}
                          onChange={(e) => setGenreFilter(e.target.value || null)}
                          className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-md px-2 py-1 focus:outline-none"
                          aria-label="Filtrer par genre"
                        >
                          <option value="">Tous les genres</option>
                          {currentGenres.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                        {/* Tri pistes */}
                        <select
                          value={trackSort}
                          onChange={(e) => setTrackSort(e.target.value as any)}
                          className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-md px-2 py-1 focus:outline-none"
                          aria-label="Trier les pistes"
                        >
                          <option value="position">Position (ordre manuel)</option>
                          <option value="title">Titre (A–Z)</option>
                          <option value="duration">Durée</option>
                        </select>
                      </div>
                    </div>

                    {/* Liste des pistes */}
                    <div className="space-y-2">
                      {displayedTracks.map((track, index) => (
                        <motion.div
                          key={`${currentPlaylist?._id || 'pl'}-${track._id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                          draggable
                          onDragStart={() => handleDragStart(track._id)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(track._id)}
                        >
                              <span className="text-white/40 text-sm w-8 flex items-center justify-center">
                                <GripVertical className="mr-1 opacity-60" size={14} />
                                {index + 1}
                              </span>
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-white/60 truncate">
                              {track.artist?.name || track.artist?.username}
                            </p>
                          </div>
                          <button
                            onClick={() => track.audioUrl && playTrack(track)}
                            disabled={!track.audioUrl}
                            aria-label={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                            title={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                            className={`p-2 rounded-full transition-colors ${track.audioUrl ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
                          >
                              {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                          <span className="text-white/40 text-sm">
                            {formatDuration(track.duration)}
                          </span>
                          {/* Menu piste */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTrackMenu === track._id) {
                                  console.log('Fermeture du menu piste');
                                  setActiveTrackMenu(null);
                                  setTrackMenuPosition(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pos = { top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 180 };
                                  console.log('Ouverture menu piste:', track._id, pos);
                                  setTrackMenuPosition(pos);
                                  setActiveTrackMenu(track._id);
                                }
                              }}
                              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                              aria-haspopup="menu"
                              aria-expanded={activeTrackMenu === track._id}
                              title="Plus d'actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {activeTrackMenu === track._id && trackMenuPosition && typeof window !== 'undefined' && createPortal(
                                <>
                                  {/* Overlay pour fermer le menu */}
                                  <div
                                    onClick={() => {
                                      setActiveTrackMenu(null);
                                      setTrackMenuPosition(null);
                                    }}
                                    className="fixed inset-0 z-[9998]"
                                  />
                                  {/* Menu */}
                                <motion.div
                                  initial={{ opacity: 0, y: -6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  style={{ 
                                    position: 'absolute', 
                                    top: `${trackMenuPosition.top}px`, 
                                    left: `${trackMenuPosition.left}px`,
                                    zIndex: 9999
                                  }}
                                  className="min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl"
                                  role="menu"
                                >
                                  <button
                                    onClick={(e) => { e.stopPropagation(); track.audioUrl && playTrack(track); setActiveTrackMenu(null); }}
                                    disabled={!track.audioUrl}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)] ${!track.audioUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    role="menuitem"
                                  >
                                    <Play size={14} /> Lire
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowAddToPlaylist(track._id); setActiveTrackMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                    role="menuitem"
                                  >
                                    <Plus size={14} /> Ajouter au dossier
                                  </button>
                                  {currentPlaylist?.tracks?.length ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setPlaylistCover(currentPlaylist!._id, track.coverUrl); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                      role="menuitem"
                                    >
                                      <ImageIcon /> Définir comme cover
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (currentPlaylist) removeTrackFromPlaylist(currentPlaylist._id, track._id); setActiveTrackMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                    role="menuitem"
                                  >
                                    <Trash2 size={14} /> Retirer du dossier
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); router.push(`/profile/${track.artist?.username || track.artist?._id}`); setActiveTrackMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                    role="menuitem"
                                  >
                                    <User size={14} /> Aller au profil
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); shareTrack(track); setActiveTrackMenu(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                    role="menuitem"
                                  >
                                    <Share2 size={14} /> Partager
                                  </button>
                                </motion.div>
                                </>,
                                document.body
                              )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Liste des playlists
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Mes Dossiers</h2>
                        <div className="text-white/60 text-sm">
                          {filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                      {filteredPlaylists.length === 0 ? (
                        <EmptyState
                          icon={FolderPlus}
                          title={searchQuery ? 'Aucun dossier trouvé' : 'Aucun dossier créé'}
                          description={searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Créez votre premier dossier pour organiser vos musiques préférées'}
                          action={!searchQuery ? {
                            label: "Créer un dossier",
                            onClick: () => setShowCreatePlaylist(true)
                          } : undefined}
                        />
                    ) : (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6' : 'space-y-4'}>
                          {sortedPlaylists.map((playlist) => (
                          <motion.div
                            key={`folder-${playlist._id}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                              className={`glass-effect rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer ${
                                viewMode === 'list' ? 'flex items-center space-x-4 p-4' : 'p-4'
                              }`}
                            onClick={() => setSelectedPlaylist(playlist._id)}
                          >
                              {viewMode === 'grid' ? (
                                <>
                                  <div className="relative">
                            <img
                                      src={(playlist.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
                              alt={playlist.name}
                              className="w-full h-32 object-cover rounded-lg mb-3"
                                      loading="lazy"
                                      decoding="async"
                                    />
                                    {/* Menu dossier (grid) */}
                                    <div className="absolute top-2 right-2">
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (activeFolderMenu === playlist._id) {
                                            setActiveFolderMenu(null);
                                            setFolderMenuPosition(null);
                                          } else {
                                            const rect = e.currentTarget.getBoundingClientRect(); 
                                            setFolderMenuPosition({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 200 }); 
                                            setActiveFolderMenu(playlist._id);
                                          }
                                        }}
                                        className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                                        aria-haspopup="menu"
                                        aria-expanded={activeFolderMenu === playlist._id}
                                        title="Plus d'actions"
                                      >
                                        <MoreVertical size={16} />
                                      </button>
                                        {activeFolderMenu === playlist._id && folderMenuPosition && typeof window !== 'undefined' && createPortal(
                                          <>
                                            <div onClick={() => { setActiveFolderMenu(null); setFolderMenuPosition(null); }} className="fixed inset-0 z-[9998]" />
                                          <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            style={{ position: 'absolute', top: `${folderMenuPosition.top}px`, left: `${folderMenuPosition.left}px`, zIndex: 9999 }}
                                            className="min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl"
                                            role="menu"
                                          >
                                            <button
                                              onClick={(e) => { e.stopPropagation(); setSelectedPlaylist(playlist._id); setEditPlaylistData({ name: playlist.name, description: playlist.description, isPublic: playlist.isPublic }); setShowEditPlaylist(true); setActiveFolderMenu(null); }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                              role="menuitem"
                                            >
                                              <Edit3 size={14} /> Renommer / Modifier
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); togglePlaylistVisibility(playlist._id, !playlist.isPublic); }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                              role="menuitem"
                                            >
                                              {playlist.isPublic ? <><EyeOff size={14} /> Rendre privé</> : <><Eye size={14} /> Rendre public</>}
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); sharePlaylist(playlist); setActiveFolderMenu(null); }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                              role="menuitem"
                                            >
                                              <Share2 size={14} /> Partager
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist._id); setActiveFolderMenu(null); }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)] text-red-400"
                                              role="menuitem"
                                            >
                                              <Trash2 size={14} /> Supprimer
                                            </button>
                                          </motion.div>
                                          </>,
                                          document.body
                                        )}
                                    </div>
                                  </div>
                            <h3 className="font-semibold mb-1">{playlist.name}</h3>
                            <p className="text-sm text-white/60 mb-2">{playlist.description}</p>
                            <div className="flex items-center justify-between text-xs text-white/40">
                              <span>{playlist.trackCount} pistes</span>
                              <span>{formatDuration(playlist.duration)}</span>
                            </div>
                                </>
                              ) : (
                                <>
                                  <img
                                    src={(playlist.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
                                    alt={playlist.name}
                                    className="w-16 h-16 rounded object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold">{playlist.name}</h3>
                                    <p className="text-sm text-white/60">{playlist.description}</p>
                                    <div className="flex items-center space-x-4 text-xs text-white/40 mt-1">
                                      <span>{playlist.trackCount} pistes</span>
                                      <span>{formatDuration(playlist.duration)}</span>
                                      <span className={`flex items-center space-x-1 ${playlist.isPublic ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {playlist.isPublic ? <Eye size={12} /> : <EyeOff size={12} />}
                                        <span>{playlist.isPublic ? 'Publique' : 'Privée'}</span>
                                      </span>
                                    </div>
                                  </div>
                                  {/* Menu dossier */}
                                  <div className="ml-auto relative">
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (activeFolderMenu === playlist._id) {
                                          setActiveFolderMenu(null);
                                          setFolderMenuPosition(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect(); 
                                          setFolderMenuPosition({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX - 200 }); 
                                          setActiveFolderMenu(playlist._id);
                                        }
                                      }}
                                      className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                      aria-haspopup="menu"
                                      aria-expanded={activeFolderMenu === playlist._id}
                                      title="Plus d'actions"
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                      {activeFolderMenu === playlist._id && folderMenuPosition && typeof window !== 'undefined' && createPortal(
                                        <>
                                          <div onClick={() => { setActiveFolderMenu(null); setFolderMenuPosition(null); }} className="fixed inset-0 z-[9998]" />
                                        <motion.div
                                          initial={{ opacity: 0, y: -6 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -6 }}
                                          style={{ position: 'absolute', top: `${folderMenuPosition.top}px`, left: `${folderMenuPosition.left}px`, zIndex: 9999 }}
                                          className="min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-xl"
                                          role="menu"
                                        >
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedPlaylist(playlist._id); setEditPlaylistData({ name: playlist.name, description: playlist.description, isPublic: playlist.isPublic }); setShowEditPlaylist(true); setActiveFolderMenu(null); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                            role="menuitem"
                                          >
                                            <Edit3 size={14} /> Renommer / Modifier
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); togglePlaylistVisibility(playlist._id, !playlist.isPublic); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                            role="menuitem"
                                          >
                                            {playlist.isPublic ? <><EyeOff size={14} /> Rendre privé</> : <><Eye size={14} /> Rendre public</>}
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); sharePlaylist(playlist); setActiveFolderMenu(null); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                                            role="menuitem"
                                          >
                                            <Share2 size={14} /> Partager
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist._id); setActiveFolderMenu(null); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)] text-red-400"
                                            role="menuitem"
                                          >
                                            <Trash2 size={14} /> Supprimer
                                          </button>
                                        </motion.div>
                                        </>,
                                        document.body
                                      )}
                                  </div>
                                </>
                              )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'recent' && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-6">Écouté Récemment</h2>
                
                  {filteredRecentTracks.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title={searchQuery ? 'Aucun résultat trouvé' : 'Aucune écoute récente'}
                      description={searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Vos écoutes récentes apparaîtront ici'}
                    />
                ) : (
                  <div className="space-y-3">
                      {filteredRecentTracks.map((track, index) => (
                      <motion.div
                        key={`recent-${track._id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={(track.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-white/60 truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowAddToPlaylist(track._id)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                        <button
                          onClick={() => track.audioUrl && playTrack(track)}
                          disabled={!track.audioUrl}
                          aria-label={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                          title={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                          className={`p-2 rounded-full transition-colors ${track.audioUrl ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
                        >
                              {isCurrentlyPlaying(track._id) ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                          </div>
                        <div className="text-right">
                          <span className="text-white/40 text-sm block">
                            {formatDuration(track.duration)}
                          </span>
                          <span className="text-white/40 text-xs">
                            {formatNumber(track.plays)} écoutes
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={recentSentinelRef} className="h-8" />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-xl font-bold mb-6">Mes Favoris</h2>
                
                  {filteredFavoriteTracks.length === 0 ? (
                  <EmptyState
                    icon={Heart}
                    title={searchQuery ? 'Aucun résultat trouvé' : 'Aucun favori pour le moment'}
                    description={searchQuery ? 'Essayez avec d\'autres mots-clés' : 'Likez des musiques pour les retrouver ici'}
                    action={!searchQuery ? {
                      label: "Découvrir de la musique",
                      href: "/discover"
                    } : undefined}
                  />
                ) : (
                  <div className="space-y-3">
                      {filteredFavoriteTracks.map((track, index) => (
                      <motion.div
                        key={`fav-${track._id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={(track.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{track.title}</h4>
                          <p className="text-sm text-white/60 truncate">
                            {track.artist?.name || track.artist?.username}
                          </p>
                        </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleLikeTrack(track._id)}
                              className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                              <Heart size={16} fill="currentColor" />
                            </button>
                            <button
                              onClick={() => setShowAddToPlaylist(track._id)}
                              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                        <button
                          onClick={() => track.audioUrl && playTrack(track)}
                          disabled={!track.audioUrl}
                          aria-label={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                          title={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                          className={`p-2 rounded-full transition-colors ${track.audioUrl ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
                        >
                              {isCurrentlyPlaying(track._id) ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                          </div>
                        <div className="text-right">
                          <span className="text-white/40 text-sm block">
                            {formatDuration(track.duration)}
                          </span>
                          <span className="text-white/40 text-xs">
                            {formatNumber(track.likes.length)} likes
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={favoritesSentinelRef} className="h-8" />
                  </div>
                )}
              </motion.div>
            )}

              {activeTab === 'downloads' && (
                <motion.div
                  key="downloads"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-bold mb-6">Téléchargements</h2>
                  
                  {downloadedTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <Download className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">Aucun téléchargement pour le moment</p>
                      <p className="text-white/40 text-sm">Les musiques que vous téléchargez apparaîtront ici</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {downloadedTracks.map((track, index) => (
                        <motion.div
                          key={`dl-${track._id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <img
                            src={(track.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
                            alt={track.title}
                            className="w-12 h-12 rounded object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{track.title}</h4>
                            <p className="text-sm text-white/60 truncate">
                              {track.artist?.name || track.artist?.username}
                            </p>
                          </div>
                          <button
                            onClick={() => track.audioUrl && playTrack(track)}
                            disabled={!track.audioUrl}
                            aria-label={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                            title={track.audioUrl ? 'Lire' : 'Piste indisponible'}
                            className={`p-2 rounded-full transition-colors ${track.audioUrl ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'}`}
                          >
                            {isCurrentlyPlaying(track._id) ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                          <span className="text-white/40 text-sm">
                            {formatDuration(track.duration)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
          </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
} 