'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  Edit,
  Heart,
  Headphones,
  Loader2,
  MapPin,
  Globe,
  Music2,
  MoreHorizontal,
  Pause,
  Play,
  Share2,
  Upload,
  UserPlus,
  Sparkles,
  Calendar,
  X,
} from "lucide-react";
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useBoosters } from '@/hooks/useBoosters';
import Avatar from '@/components/Avatar';
import LikeButton from '@/components/LikeButton';
import { notify } from '@/components/NotificationCenter';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';

const BoosterOpenModal = dynamic(() => import('@/components/BoosterOpenModal'), { ssr: false });

/**
 * Synaura — Page Profil (même style que la Home) — HYBRID GRID + DRAWER
 * - Connexion aux vraies données API
 * - Bannière héro + avatar superposé
 * - Stats & bio en cartes
 * - Grille compacte de tracks (cards carrées)
 * - CLIC sur une card => ouvre un DRAWER latéral
 */

// ---- Utils ----
const fmt = new Intl.NumberFormat();
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

// ---- Page ----
export default function SynauraProfile(){
  const { username } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const { playTrack, audioState } = useAudioPlayer();
  const { canOpen, openDaily, lastOpened, remainingMs, loading: boostersLoading, inventory } = useBoosters();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTracks, setUserTracks] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists' | 'about'>('tracks');
  const [sortBy, setSortBy] = useState<'recent' | 'plays' | 'likes'>('recent');
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showBoosterModal, setShowBoosterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTrackModal, setShowEditTrackModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [trackEditData, setTrackEditData] = useState<any>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const usernameStr = Array.isArray(username) ? username[0] : username;
  const isOwnProfile = (session?.user as any)?.username === usernameStr;

  // Auto-ouvrir le modal booster après ouverture
  useEffect(() => {
    if (lastOpened) setShowBoosterModal(true);
  }, [lastOpened]);

  // Formater le temps restant
  const formatRemaining = (ms: number) => {
    if (!ms || ms <= 0) return 'Disponible';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    if (h > 0) return `${h}h ${m.toString().padStart(2,'0')}m`;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  // Charger le profil
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        if (!usernameStr) throw new Error('Nom d’utilisateur manquant');
        const res = await fetch(`/api/users/${encodeURIComponent(usernameStr)}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Erreur chargement profil');
        }
        
        // Vérifier l'état de suivi
        let isFollowing = false;
        if (session?.user?.id && data.id !== session.user.id) {
          try {
            const followRes = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/follow`);
            if (followRes.ok) {
              const followData = await followRes.json();
              isFollowing = followData.isFollowing;
            }
          } catch (e) {
            console.error('Erreur vérification follow:', e);
          }
        }
        
        setProfile({ ...data, isFollowing });
        setEditData({ ...data, isFollowing });
        setUserTracks(data.tracks || []);
      } catch (e: any) {
        setError(e.message || 'Erreur chargement profil');
      } finally {
        setLoading(false);
      }
    };
    if (usernameStr) fetchProfile();
  }, [usernameStr, session?.user?.id]);

  const playlists = useMemo(
    () => (Array.isArray(profile?.playlists) ? profile.playlists : []),
    [profile],
  );

  const visibleTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (userTracks || [])
      .filter((t) => String(t?.title || '').toLowerCase().includes(q));

    const score = (t: any) => ({
      plays: Number(t?.plays || 0),
      likes: Number(t?.likes || 0),
      created: new Date(t?.created_at || t?.createdAt || 0).getTime() || 0,
    });

    const sorted = [...list].sort((a, b) => {
      const A = score(a);
      const B = score(b);
      if (sortBy === 'plays') return (B.plays - A.plays) || (B.created - A.created);
      if (sortBy === 'likes') return (B.likes - A.likes) || (B.created - A.created);
      return B.created - A.created;
    });
    return sorted;
  }, [query, sortBy, userTracks]);

  const visiblePlaylists = useMemo(() => {
    const q = playlistQuery.trim().toLowerCase();
    return playlists.filter((p: any) =>
      String(p?.name || '').toLowerCase().includes(q),
    );
  }, [playlistQuery, playlists]);

  // Click-outside pour fermer les menus
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const open = document.querySelector('[data-menu-root="true"]');
      if (open && !open.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // ESC pour fermer le drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerId(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Style no-scrollbar (si besoin)
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch (e) {} };
  }, []);

  const selected = useMemo(() => userTracks.find(t => t.id === drawerId) || null, [drawerId, userTracks]);

  // Gestion play track
  const handlePlayTrack = async (track: any) => {
    try {
      const trackToPlay = {
        _id: track.id,
        title: track.title,
        artist: track.artist || track.artist_name || profile?.name || 'Artiste inconnu',
        audioUrl: track.audioUrl || track.audio_url,
        coverUrl: track.coverUrl || track.cover_url,
        duration: track.duration,
        album: track.album || null,
        likes: track.likes || 0,
        comments: track.comments || [],
        plays: track.plays || 0,
        genre: track.genre || [],
        isLiked: track.isLiked || false
      };
      await playTrack(trackToPlay);
    } catch (error) {
      console.error('Erreur lecture:', error);
      notify.error('Erreur', 'Impossible de lire la piste');
    }
  };

  // Gestion like avec mise à jour de l'état local
  const handleLikeUpdate = (trackId: string, isLiked: boolean, likesCount: number) => {
    setUserTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, isLiked, likes: likesCount }
        : track
    ));
    
    setProfile((prev: any) => ({
      ...prev,
      tracks: prev.tracks?.map((track: any) => 
        track.id === trackId ? { ...track, isLiked, likes: likesCount } : track
      )
    }));
  };

  // Gestion delete track
  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Supprimer cette piste définitivement ?')) return;
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur suppression');
      }
      
      setUserTracks(prev => prev.filter(track => track.id !== trackId));
      setDrawerId(null);
      notify.success('Track supprimée', 'Track supprimée avec succès');
    } catch (e: any) {
      notify.error('Erreur', e.message || 'Erreur suppression');
    }
  };

  // Gestion follow
  const handleFollow = async () => {
    if (!session?.user) return;
    try {
      if (!usernameStr) return;
      const res = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/follow`, { method: 'POST' });
      if (!res.ok) throw new Error('Erreur follow');
      const data = await res.json();
      setProfile((prev: any) => ({
        ...prev,
        isFollowing: data.action === 'followed',
        followerCount: prev.followerCount + (data.action === 'followed' ? 1 : -1),
      }));
    } catch (e) {
      notify.error('Erreur', 'Impossible de suivre cet utilisateur');
    }
  };

  // Upload image
  const handleImageUpload = async (type: 'avatar' | 'banner', file: File) => {
    setUploading(true);
    try {
      const timestamp = Math.round(Date.now() / 1000);
      const publicId = `${usernameStr || 'user'}_${type}_${timestamp}`;
      
      if (!usernameStr) throw new Error('Nom d’utilisateur manquant');
      const sigRes = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, publicId, type })
      });
      
      if (!sigRes.ok) throw new Error('Erreur signature');
      const { signature, apiKey, cloudName } = await sigRes.json();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', String(timestamp));
      formData.append('public_id', publicId);
      formData.append('folder', `ximam/profiles/${username}`);
      formData.append('resource_type', 'image');
      formData.append('api_key', apiKey);
      formData.append('signature', signature);
      
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error('Erreur upload');
      const uploadData = await uploadRes.json();
      
      const saveRes = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/save-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.secure_url, type, publicId })
      });
      
      if (!saveRes.ok) throw new Error('Erreur sauvegarde');
      const saveData = await saveRes.json();
      setProfile((prev: any) => ({ ...prev, [type]: saveData.imageUrl }));
      setEditData((prev: any) => ({ ...prev, [type]: saveData.imageUrl }));
      notify.success('Succès', 'Image mise à jour');
    } catch (e: any) {
      notify.error('Erreur', e.message || 'Erreur upload image');
    } finally {
      setUploading(false);
    }
  };

  // Édition profil
  const handleEdit = () => setShowEditModal(true);
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditData({ ...profile });
  };
  const handleSaveEdit = async () => {
    setUploading(true);
    setError('');
    try {
      if (!usernameStr) throw new Error('Nom d’utilisateur manquant');
      const res = await fetch(`/api/users/${encodeURIComponent(usernameStr)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur modification profil');
      setProfile(data);
      setEditData(data);
      setShowEditModal(false);
      notify.success('Succès', 'Profil mis à jour');
    } catch (e: any) {
      setError(e.message || 'Erreur modification profil');
      notify.error('Erreur', e.message || 'Erreur modification profil');
    } finally {
      setUploading(false);
    }
  };

  // Édition track
  const handleEditTrack = (track: any) => {
    setEditingTrack(track);
    setTrackEditData({
      title: track.title,
      description: track.description || '',
      genre: Array.isArray(track.genre) ? track.genre.join(', ') : (track.genre || ''),
      tags: track.tags?.join(', ') || '',
      isPublic: track.is_public !== false
    });
    setShowEditTrackModal(true);
    setMenuOpenId(null);
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
      notify.success('Succès', 'Track modifiée');
    } catch (e: any) {
      setError(e.message || 'Erreur modification');
      notify.error('Erreur', e.message || 'Erreur modification');
    } finally {
      setUploading(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      if (typeof window === 'undefined') return;
      const url = `${window.location.origin}/profile/${encodeURIComponent(usernameStr || '')}`;
      await navigator.clipboard.writeText(url);
      notify.success('Copié', 'Lien du profil copié');
    } catch {
      notify.error('Erreur', "Impossible de copier le lien");
    }
  };

  const memberSince = useMemo(() => {
    const raw = profile?.createdAt || profile?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [profile]);

  if (loading) {
  return (
      <div className="min-h-screen bg-background-primary text-foreground-primary">
        <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-6 md:py-10">
          <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-10">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin w-5 h-5 text-foreground-tertiary" />
              <div className="text-sm text-foreground-secondary">Chargement du profil…</div>
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="h-20 rounded-2xl bg-white/5 border border-border-secondary animate-pulse" />
              <div className="h-20 rounded-2xl bg-white/5 border border-border-secondary animate-pulse" />
              <div className="h-20 rounded-2xl bg-white/5 border border-border-secondary animate-pulse" />
              <div className="h-20 rounded-2xl bg-white/5 border border-border-secondary animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background-primary text-foreground-primary">
        <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-10">
          <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-10">
            <div className="text-lg font-semibold">Profil introuvable</div>
            <div className="mt-2 text-sm text-foreground-tertiary">{error || 'Ce profil n’existe pas.'}</div>
            <div className="mt-6 flex gap-2 flex-wrap">
              <button
                onClick={() => router.push('/discover')}
                className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition font-semibold"
              >
                Découvrir
              </button>
              <button
                onClick={() => router.push('/')}
                className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition"
              >
                Accueil
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      {/* Background FX */}
      <div className="pointer-events-none fixed -z-10 inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[520px] h-[520px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-4 md:py-6 pb-24 space-y-4">
        {/* HERO */}
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
          <div className="relative h-[200px] sm:h-[240px] md:h-[300px]">
            <img
              src={profile.banner || '/default-cover.jpg'}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-400/10 mix-blend-soft-light" />

            {isOwnProfile && (
              <>
                <button
                  className="absolute top-3 right-3 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white p-2.5 rounded-full border border-white/10 transition"
                  onClick={() => bannerInputRef.current?.click()}
                  title="Changer la bannière"
                >
                  <Camera size={18} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={bannerInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('banner', file);
                  }}
                />
              </>
            )}
          </div>

          <div className="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-end gap-3">
                <div className="relative">
                  <Avatar
                    src={profile.avatar}
                    name={profile.name}
                    username={profile.username}
                    size="2xl"
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl border-2 border-white/10 shadow-2xl"
                  />
                  {isOwnProfile && (
                    <>
                      <button
                        className="absolute -bottom-2 -right-2 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white p-2 rounded-full border border-white/10 transition"
                        onClick={() => fileInputRef.current?.click()}
                        title="Changer l'avatar"
                      >
                        <Camera size={14} />
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('avatar', file);
                        }}
                      />
                    </>
                  )}
                </div>

                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">
                      {profile.name}
                    </h1>
                    {profile.isVerified && (
                      <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="text-white w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-white/80 truncate">@{profile.username}</div>
                  {profile.artistName && (
                    <div className="mt-1 text-xs text-white/60 truncate">
                      Artiste: {profile.artistName}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                <button
                  onClick={handleShareProfile}
                  className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-sm"
                  title="Copier le lien du profil"
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </button>

                {isOwnProfile ? (
                  <>
                    <button
                      onClick={handleEdit}
                      className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-sm font-semibold"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => router.push('/stats')}
                      className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-sm"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Stats
                    </button>
                    <button
                      onClick={() => setShowBoosterModal(true)}
                      disabled={!canOpen || boostersLoading}
                      title={canOpen ? 'Ouvrir un booster quotidien' : `Disponible dans ${formatRemaining(remainingMs)}`}
                      className={`h-10 px-3 rounded-2xl border border-border-secondary inline-flex items-center gap-2 text-sm transition ${
                        canOpen
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg'
                          : 'bg-white/5 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">{canOpen ? 'Booster' : formatRemaining(remainingMs)}</span>
                      <span className="sm:hidden">{canOpen ? 'Booster' : '⏳'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleFollow}
                    disabled={uploading}
                    className={`h-10 px-3 rounded-2xl border border-border-secondary inline-flex items-center gap-2 text-sm font-semibold transition ${
                      profile.isFollowing
                        ? 'bg-white/5 hover:bg-white/10'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg'
                    }`}
                  >
                    {profile.isFollowing ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {profile.isFollowing ? 'Abonné' : 'Suivre'}
                  </button>
                )}
              </div>
            </div>

            {/* Stats pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              <StatPill label="Titres" value={fmt.format(profile.tracksCount || visibleTracks.length || 0)} />
              <StatPill label="Playlists" value={fmt.format(profile.playlistsCount || playlists.length || 0)} />
              <StatPill label="Écoutes" value={fmt.format(profile.totalPlays || 0)} icon={<Headphones className="w-4 h-4" />} />
              <StatPill label="Likes" value={fmt.format(profile.totalLikes || 0)} icon={<Heart className="w-4 h-4" />} />
            </div>

            {/* Tabs */}
            <div className="mt-4 flex flex-wrap gap-2">
              <TabButton active={activeTab === 'tracks'} onClick={() => setActiveTab('tracks')}>
                Titres
              </TabButton>
              <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')}>
                Playlists
              </TabButton>
              <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')}>
                À propos
              </TabButton>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        {activeTab === 'tracks' && (
          <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Titres publiés</h2>
                <div className="text-xs text-foreground-tertiary">{visibleTracks.length} titre(s)</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-[360px]">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary">
                    <SearchIcon />
                  </div>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un titre…"
                    className="h-11 w-full rounded-2xl border border-border-secondary bg-white/5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-violet-400/40"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-11 rounded-2xl border border-border-secondary bg-white/5 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-400/40"
                >
                  <option value="recent">Récents</option>
                  <option value="plays">Plus écoutés</option>
                  <option value="likes">Plus likés</option>
                </select>
              </div>
            </div>

            {visibleTracks.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-border-secondary bg-white/5 p-8 text-center">
                <div className="text-sm font-semibold">Aucun titre</div>
                <div className="mt-1 text-sm text-foreground-tertiary">
                  {query.trim()
                    ? 'Essaie une autre recherche.'
                    : isOwnProfile
                    ? 'Upload un son ou génère-en un dans le Studio.'
                    : 'Cet utilisateur n’a rien publié pour le moment.'}
                </div>
                {isOwnProfile && (
                  <div className="mt-5 flex justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => router.push('/upload')}
                      className="h-11 px-4 inline-flex items-center gap-2 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition font-semibold"
                    >
                      <Upload className="w-4 h-4" />
                      Uploader
                    </button>
                    <button
                      onClick={() => router.push('/studio')}
                      className="h-11 px-4 inline-flex items-center gap-2 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition"
                    >
                      <Music2 className="w-4 h-4" />
                      Studio
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {visibleTracks.map((t) => (
                  <TrackTile
                    key={t.id}
                    track={t}
                    isPlaying={
                      audioState.currentTrackIndex !== -1 &&
                      audioState.tracks[audioState.currentTrackIndex]?._id === t.id &&
                      audioState.isPlaying
                    }
                    onPlay={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handlePlayTrack(t);
                    }}
                    onOpenDetails={() => setDrawerId(t.id)}
                    menuOpen={menuOpenId === t.id}
                    onToggleMenu={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setMenuOpenId((id) => (id === t.id ? null : t.id));
                    }}
                    onAction={(action: string) => {
                      if (action === "delete") handleDeleteTrack(t.id);
                      else if (action === "edit") handleEditTrack(t);
                      else if (action === "stats") router.push(`/stats?track_id=${encodeURIComponent(t.id)}`);
                    }}
                    isOwnProfile={isOwnProfile}
                    onLikeUpdate={handleLikeUpdate}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'playlists' && (
          <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Playlists</h2>
                <div className="text-xs text-foreground-tertiary">{visiblePlaylists.length} playlist(s)</div>
              </div>
              <div className="relative flex-1 md:flex-none md:w-[360px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary">
                  <SearchIcon />
                </div>
                <input
                  value={playlistQuery}
                  onChange={(e) => setPlaylistQuery(e.target.value)}
                  placeholder="Rechercher une playlist…"
                  className="h-11 w-full rounded-2xl border border-border-secondary bg-white/5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>
            </div>

            {visiblePlaylists.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-border-secondary bg-white/5 p-8 text-center">
                <div className="text-sm font-semibold">Aucune playlist</div>
                <div className="mt-1 text-sm text-foreground-tertiary">
                  {playlistQuery.trim()
                    ? 'Essaie une autre recherche.'
                    : isOwnProfile
                    ? 'Crée une playlist depuis ta bibliothèque.'
                    : 'Cet utilisateur n’a pas encore de playlists.'}
                </div>
                {isOwnProfile && (
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => router.push('/library')}
                      className="h-11 px-4 inline-flex items-center gap-2 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition font-semibold"
                    >
                      <Music2 className="w-4 h-4" />
                      Aller à la bibliothèque
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {visiblePlaylists
                  .filter((p: any) => Boolean(p?.id || p?._id))
                  .map((p: any) => {
                    const pid = String(p?.id || p?._id);
                    return (
                      <PlaylistTile
                        key={pid}
                        playlist={p}
                        onOpen={() => router.push(`/playlists/${encodeURIComponent(pid)}`)}
                      />
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'about' && (
          <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">À propos</h2>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-3xl border border-border-secondary bg-white/5 p-4 sm:p-5">
                <div className="text-sm font-semibold">Bio</div>
                <div className="mt-2 text-sm text-foreground-secondary leading-relaxed">
                  {profile.bio?.trim() ? profile.bio : 'Aucune bio pour le moment.'}
                </div>
              </div>
              <div className="rounded-3xl border border-border-secondary bg-white/5 p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-foreground-tertiary" />
                  <span className="text-foreground-secondary">{profile.location?.trim() ? profile.location : 'Localisation non renseignée'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-foreground-tertiary" />
                  {profile.website?.trim() ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground-secondary hover:underline truncate"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    <span className="text-foreground-secondary">Site web non renseigné</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-foreground-tertiary" />
                  <span className="text-foreground-secondary">{memberSince ? `Membre depuis ${memberSince}` : 'Date d’inscription inconnue'}</span>
                </div>
              </div>
            </div>

            {isOwnProfile && (
              <div className="mt-4 rounded-3xl border border-border-secondary bg-white/5 p-4 sm:p-5">
                <div className="text-sm font-semibold">Actions rapides</div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <QuickAction onClick={() => router.push('/upload')} icon={<Upload className="w-4 h-4" />} label="Uploader" />
                  <QuickAction onClick={() => router.push('/stats')} icon={<BarChart3 className="w-4 h-4" />} label="Stats" />
                  <QuickAction onClick={() => router.push('/library')} icon={<Music2 className="w-4 h-4" />} label="Bibliothèque" />
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* DRAWER latéral */}
      <Drawer open={!!drawerId} onClose={() => setDrawerId(null)}>
        {selected && (
          <DrawerContent
            track={selected}
            isPlaying={
              audioState.currentTrackIndex !== -1 &&
              audioState.tracks[audioState.currentTrackIndex]?._id === selected.id &&
              audioState.isPlaying
            }
            onPlay={() => handlePlayTrack(selected)}
            onEdit={() => handleEditTrack(selected)}
            onDuplicate={() => notify.info('Bientôt disponible', 'Fonctionnalité en développement')}
            onDelete={() => handleDeleteTrack(selected.id)}
            isOwnProfile={isOwnProfile}
            onLikeUpdate={handleLikeUpdate}
            onClose={() => setDrawerId(null)}
          />
        )}
      </Drawer>
                          
      {/* Modal Booster */}
      <AnimatePresence>
        {showBoosterModal && (
          <BoosterOpenModal
            isOpen={showBoosterModal}
            onClose={() => setShowBoosterModal(false)}
            onOpenBooster={openDaily}
            isOpening={boostersLoading}
            openedBooster={lastOpened ? { 
              id: lastOpened.inventoryId, 
              status: 'owned', 
              obtained_at: new Date().toISOString(), 
              booster: lastOpened.booster 
            } : null}
            item={lastOpened || null}
          />
        )}
      </AnimatePresence>

      {/* Boutons flottants mobile - z-index élevé */}
      {isOwnProfile && (
        <div className="md:hidden fixed bottom-24 right-4 flex flex-col gap-3 z-[100]">
          <button
            onClick={() => setShowBoosterModal(true)}
            disabled={!canOpen || boostersLoading}
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition backdrop-blur-md border border-border-secondary ${
              canOpen
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
                : 'bg-white/5 opacity-60'
            }`}
            title={canOpen ? 'Ouvrir un booster' : `Booster dans ${formatRemaining(remainingMs)}`}
          >
            <Sparkles className="w-6 h-6" />
          </button>
          <button
            onClick={handleEdit}
            className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-full border border-border-secondary shadow-2xl flex items-center justify-center hover:bg-white/10 transition"
            title="Modifier le profil"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Modal Édition Profil */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-white">Modifier le profil</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Nom</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Bio</label>
                  <textarea
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Parlez-nous de vous..."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Nom d'artiste (optionnel)</label>
                  <input
                    type="text"
                    value={editData.artistName || ''}
                    onChange={(e) => setEditData({ ...editData, artistName: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Nom d'artiste"
                  />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <h4 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Inventaire boosters</h4>
                  <p className="text-[10px] sm:text-xs text-white/60 mb-2">{inventory.filter(i=>i.status==='owned').length} disponible(s)</p>
                  {inventory.length === 0 ? (
                    <div className="text-[10px] sm:text-xs text-white/50">Aucun booster. Ouvre ton booster quotidien.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 max-h-32 overflow-y-auto">
                      {inventory.filter(i=>i.status==='owned').slice(0, 6).map((it) => (
                        <div key={it.id} className="border border-white/10 rounded-md sm:rounded-lg p-1.5 sm:p-2 bg-white/5">
                          <div className="text-[10px] sm:text-xs font-medium line-clamp-1">{it.booster.name}</div>
                          <div className="text-[9px] sm:text-[10px] text-white/60">x{it.booster.multiplier.toFixed(2)}</div>
                </div>
                      ))}
                </div>
                  )}
              </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button onClick={handleCancelEdit} className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveEdit} disabled={uploading} className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sauvegarder'}
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowEditTrackModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-white">Modifier la piste</h3>
                <button onClick={() => setShowEditTrackModal(false)} className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Titre</label>
                  <input
                    type="text"
                    value={trackEditData.title || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, title: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Titre de la piste"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Description</label>
                  <textarea
                    value={trackEditData.description || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, description: e.target.value })}
                    rows={3}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Description de la piste..."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Genres (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={trackEditData.genre || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, genre: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Rock, Pop, Électronique"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2">Tags (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={trackEditData.tags || ''}
                    onChange={(e) => setTrackEditData({ ...trackEditData, tags: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="chill, instrumental, ambient"
                  />
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={trackEditData.isPublic}
                    onChange={(e) => setTrackEditData({ ...trackEditData, isPublic: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-white/10 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isPublic" className="text-xs sm:text-sm text-gray-300">
                    Rendre cette piste publique
                  </label>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button onClick={() => setShowEditTrackModal(false)} className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveTrackEdit} disabled={uploading || !trackEditData.title?.trim()} className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sauvegarder'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isOwnProfile && (
        <div className="md:hidden fixed bottom-24 right-4 z-[100]">
          <button
            onClick={handleFollow}
            disabled={uploading}
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition backdrop-blur-md border border-border-secondary ${
              profile.isFollowing ? 'bg-white/5' : 'bg-gradient-to-r from-purple-600 to-blue-600'
            }`}
            title={profile.isFollowing ? 'Se désabonner' : 'Suivre'}
          >
            {profile.isFollowing ? <Check className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Subcomponents ----
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-10 px-3 rounded-2xl border border-border-secondary inline-flex items-center justify-center text-sm font-semibold transition ${
        active ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 inline-flex items-center gap-2">
      {icon ? <span className="text-foreground-tertiary">{icon}</span> : null}
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs text-foreground-tertiary">{label}</span>
    </div>
  );
}

function PlaylistTile({
  playlist,
  onOpen,
}: {
  playlist: any;
  onOpen: () => void;
}) {
  const cover = playlist?.cover_url || playlist?.coverUrl || '/default-cover.jpg';
  const count = Array.isArray(playlist?.tracks)
    ? playlist.tracks.length
    : Number(playlist?.tracks_count || 0);

  return (
    <button
      onClick={onOpen}
      className="text-left rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-2 group"
    >
      <div className="relative">
        <img
          src={cover}
          alt=""
          loading="lazy"
          className="w-full aspect-square object-cover rounded-xl border border-border-secondary"
        />
        <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/45 rounded-xl items-center justify-center">
          <div className="px-3 py-1.5 text-xs rounded-full bg-white/10 border border-white/20">
            Ouvrir
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="text-sm font-semibold truncate">{playlist?.name || 'Playlist'}</div>
        <div className="text-xs text-foreground-tertiary">{fmt.format(count)} titre(s)</div>
      </div>
    </button>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }){
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 flex items-center justify-between transition"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-foreground-tertiary">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-foreground-tertiary flex-shrink-0"/>
    </button>
  );
}

function TrackTile({ track, isPlaying, onPlay, onOpenDetails, menuOpen, onToggleMenu, onAction, isOwnProfile, onLikeUpdate }: { track: any; isPlaying: boolean; onPlay: (e: React.MouseEvent) => void; onOpenDetails: () => void; menuOpen: boolean; onToggleMenu: (e: React.MouseEvent) => void; onAction: (action: string) => void; isOwnProfile: boolean; onLikeUpdate: (trackId: string, isLiked: boolean, likesCount: number) => void }){
  return (
    <div
      onClick={onOpenDetails}
      className="bg-white/5 border border-border-secondary rounded-2xl p-2 hover:bg-white/10 transition relative cursor-pointer group"
    >
      <div className="relative">
        <img
          src={track.cover_url || track.coverUrl || '/default-cover.jpg'}
          alt=""
          loading="lazy"
          className="w-full aspect-square object-cover rounded-xl border border-border-secondary"
        />
        
        {/* Bouton like en haut à gauche */}
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10" onClick={(e) => e.stopPropagation()}>
          <LikeButton
            trackId={track.id}
            initialIsLiked={track.isLiked || false}
            initialLikesCount={track.likes || 0}
            onUpdate={(state) => onLikeUpdate(track.id, state.isLiked, state.likesCount)}
            showCount={false}
            size="sm"
          />
                </div>

        {isOwnProfile && (
          <button
            onClick={onToggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="absolute top-1 right-1 p-1.5 rounded-xl bg-black/45 hover:bg-black/65 border border-white/10"
          >
            <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
        {/* overlay on hover - hidden on mobile */}
        <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/50 rounded-xl flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
          <div className="text-[11px] flex items-center gap-3">
            <span className="flex items-center gap-1"><Headphones className="w-4 h-4"/>{fmt.format(track.plays || 0)}</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4"/>{fmt.format(track.likes || 0)}</span>
          </div>
                  <div className="flex items-center gap-2">
            <button onClick={onPlay} className="px-2 py-1 text-[11px] rounded-full bg-white/10 hover:bg-white/20 border border-white/20">{isPlaying? 'Pause':'Play'}</button>
            <button onClick={(e)=>{e.stopPropagation(); onAction("stats");}} className="px-2 py-1 text-[11px] rounded-full bg-white/10 hover:bg-white/20 border border-white/20">Stats</button>
                  </div>
                </div>
              </div>
      <div className="mt-1.5 sm:mt-2">
        <p className="text-xs sm:text-sm font-semibold line-clamp-1">{track.title}</p>
        <p className="text-[10px] sm:text-xs text-foreground-tertiary line-clamp-1">{mmss(track.duration || 0)}</p>
              </div>

      {/* Mini modal menu */}
      {menuOpen && isOwnProfile && (
        <div data-menu-root="true" role="menu" className="absolute right-2 top-20 z-20 w-44 rounded-2xl border border-border-secondary bg-black/80 backdrop-blur-xl shadow-lg overflow-hidden">
          <MenuBtn onClick={() => onAction("edit")} label="Modifier" danger={false} />
          <MenuBtn onClick={() => onAction("stats")} label="Statistiques" danger={false} />
          <div className="h-px bg-white/10" />
          <MenuBtn onClick={() => onAction("delete")} label="Supprimer" danger />
        </div>
      )}
    </div>
  );
}

function MenuBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger: boolean }){
  return (
    <button onClick={onClick} className={`w-full text-left text-sm px-3 py-2 hover:bg-white/10 flex items-center gap-2 ${danger? 'text-rose-400':''}`}>
      <span>{label}</span>
                </button>
  );
}

// ---- Drawer ----
function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }){
  return (
    <>
      <div className={`fixed inset-0 z-50 transition ${open? 'pointer-events-auto opacity-100':'pointer-events-none opacity-0'}`}>
        {/* overlay */}
        <div onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${open? 'opacity-100':'opacity-0'}`} />
        {/* panel - pleine largeur sur mobile */}
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[480px] bg-background-primary sm:border-l border-border-secondary shadow-2xl transform transition ${open? 'translate-x-0':'translate-x-full'}`}>
          {children}
        </div>
      </div>
    </>
  );
}

function DrawerContent({ track, isPlaying, onPlay, onEdit, onDuplicate, onDelete, isOwnProfile, onLikeUpdate, onClose }: { track: any; isPlaying: boolean; onPlay: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; isOwnProfile: boolean; onLikeUpdate: (trackId: string, isLiked: boolean, likesCount: number) => void; onClose: () => void }){
  return (
    <div className="h-full flex flex-col text-foreground-primary">
      <div className="p-3 sm:p-4 border-b border-border-secondary bg-background-fog-thin">
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <img src={track.cover_url || track.coverUrl || '/default-cover.jpg'} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold line-clamp-1">{track.title}</p>
            <p className="text-[10px] sm:text-xs text-foreground-tertiary">{mmss(track.duration || 0)} • {fmt.format(track.plays || 0)} écoutes</p>
            {track.genre && (
              <p className="text-[10px] sm:text-xs text-foreground-tertiary mt-1 line-clamp-1">{Array.isArray(track.genre) ? track.genre.join(', ') : track.genre}</p>
            )}
          </div>
          {/* Bouton fermer pour mobile */}
          <button onClick={onClose} className="sm:hidden p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-border-secondary transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
                </button>
              </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={onPlay} className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border border-border-secondary flex items-center justify-center gap-1.5 sm:gap-2">
            {isPlaying? <Pause className="w-3 h-3 sm:w-4 sm:h-4"/> : <Play className="w-3 h-3 sm:w-4 sm:h-4"/>}
            <span className="hidden xs:inline">{isPlaying? 'Pause':'Play'}</span>
                </button>
          <LikeButton
            trackId={track.id}
            initialIsLiked={track.isLiked || false}
            initialLikesCount={track.likes || 0}
            onUpdate={(state) => onLikeUpdate(track.id, state.isLiked, state.likesCount)}
            showCount={false}
            size="md"
          />
          {isOwnProfile && (
            <>
              <button onClick={onEdit} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-border-secondary">
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
              <button onClick={onDelete} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400">
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </>
          )}
              </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
        <div className="bg-white/5 border border-border-secondary rounded-2xl p-3">
          <h4 className="text-xs sm:text-sm font-semibold mb-2">Statistiques</h4>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <StatSmall label="Écoutes" value={fmt.format(track.plays || 0)} />
            <StatSmall label="Likes" value={fmt.format(track.likes || 0)} />
            <StatSmall label="Durée" value={mmss(track.duration || 0)} />
          </div>
        </div>

        {track.description && (
          <div className="bg-white/5 border border-border-secondary rounded-2xl p-3">
            <h4 className="text-xs sm:text-sm font-semibold mb-1">Description</h4>
            <p className="text-xs sm:text-sm text-foreground-secondary leading-relaxed">{track.description}</p>
          </div>
        )}

        {track.tags && track.tags.length > 0 && (
          <div className="bg-white/5 border border-border-secondary rounded-2xl p-3">
            <h4 className="text-xs sm:text-sm font-semibold mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {track.tags.map((t: string, i: number)=> (
                <span key={i} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-white/10 border border-border-secondary">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 

function StatSmall({ label, value }: { label: string; value: string }){
  return (
    <div className="rounded-2xl bg-white/5 border border-border-secondary p-2 sm:p-3">
      <p className="text-sm sm:text-base font-bold leading-none">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-foreground-tertiary mt-1">{label}</p>
    </div>
  );
}

function SearchIcon(){
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
      <path fillRule="evenodd" d="M10 2a8 8 0 105.293 14.293l4.207 4.207a1 1 0 001.414-1.414l-4.207-4.207A8 8 0 0010 2zm-6 8a6 6 0 1110.392 4.242A6 6 0 014 10z" clipRule="evenodd" />
    </svg>
  );
}
