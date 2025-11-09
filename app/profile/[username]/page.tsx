'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Heart, Upload, MoreHorizontal, Headphones, Edit, BarChart3, Rocket, Music2, Clock, ChevronRight, X, Loader2, Camera, Check, UserPlus, Sparkles } from "lucide-react";
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
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
  const { toggleLikeBatch } = useBatchLikeSystem();
  const { canOpen, openDaily, lastOpened, remainingMs, loading: boostersLoading, inventory } = useBoosters();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTracks, setUserTracks] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [query, setQuery] = useState("");
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

  const isOwnProfile = session?.user?.username === username;

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
        const res = await fetch(`/api/users/${username}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Erreur chargement profil');
        }
        
        // Vérifier l'état de suivi
        let isFollowing = false;
        if (session?.user?.id && data.id !== session.user.id) {
          try {
            const followRes = await fetch(`/api/users/${username}/follow`);
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
    if (username) fetchProfile();
  }, [username, session?.user?.id]);

  const filtered = useMemo(() =>
    userTracks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
  , [query, userTracks]);

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
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' });
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
      const publicId = `${username}_${type}_${timestamp}`;
      
      const sigRes = await fetch(`/api/users/${username}/upload-image`, {
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
      
      const saveRes = await fetch(`/api/users/${username}/save-image`, {
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
      const res = await fetch(`/api/users/${username}`, {
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
          <p className="text-lg font-bold mb-2">Profil introuvable</p>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-transparent">
      {/* Hero Banner + Avatar */}
      <section className="mx-auto max-w-7xl px-2 sm:px-4 pt-2 sm:pt-4">
        <div className="relative w-full h-[180px] sm:h-[220px] md:h-[280px] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10">
          <img src={profile.banner || '/default-cover.jpg'} alt="banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {isOwnProfile && (
            <button
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-md hover:bg-black/70 text-white p-2.5 rounded-full border border-white/10 transition"
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
              if (file) handleImageUpload('banner', file);
            }}
          />
          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 md:left-6 md:right-6 flex items-end justify-between">
            <div className="flex items-end gap-2 sm:gap-4">
          <div className="relative">
                <Avatar
                  src={profile.avatar}
                  name={profile.name}
                  username={profile.username}
                  size="2xl"
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-white/10 shadow-lg"
            />
            {isOwnProfile && (
              <button
                    className="absolute bottom-0 right-0 bg-black/50 backdrop-blur-md hover:bg-black/70 text-white p-2 rounded-full border border-white/10 transition"
                onClick={() => fileInputRef.current?.click()}
                title="Changer l'avatar"
              >
                    <Camera size={14} />
              </button>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={e => {
                const file = e.target.files?.[0];
                    if (file) handleImageUpload('avatar', file);
              }}
            />
          </div>
              <div className="pb-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold leading-tight drop-shadow">{profile.name}</h1>
              {profile.isVerified && (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <Check className="text-white w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              )}
            </div>
                <p className="text-white/80 text-[10px] sm:text-xs md:text-sm">@{profile.username}</p>
            </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <>
                  <button onClick={handleEdit} className="hidden md:flex px-3 py-1.5 text-sm rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 items-center gap-2 transition"><Edit className="w-4 h-4"/> <span className="hidden lg:inline">Modifier</span></button>
                  <button onClick={() => router.push('/stats')} className="hidden md:flex px-3 py-1.5 text-sm rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 items-center gap-2 transition"><BarChart3 className="w-4 h-4"/> <span className="hidden lg:inline">Stats</span></button>
                  <button
                    onClick={() => setShowBoosterModal(true)}
                    disabled={!canOpen || boostersLoading}
                    title={canOpen ? 'Ouvrir un booster quotidien' : `Disponible dans ${formatRemaining(remainingMs)}`}
                    className={`px-3 py-1.5 text-sm rounded-xl border border-white/10 flex items-center gap-2 transition ${
                      canOpen 
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg' 
                        : 'bg-white/10 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4"/>
                    <span className="hidden md:inline">{canOpen ? 'Ouvrir Booster' : formatRemaining(remainingMs)}</span>
                  </button>
                      </>
                    ) : (
                  <button
                  onClick={handleFollow}
                    disabled={uploading}
                  className={`px-3 py-1.5 text-sm rounded-xl border border-white/10 flex items-center gap-2 transition ${
                    profile.isFollowing 
                      ? 'bg-white/10 hover:bg-white/15' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  }`}
                  >
                  {profile.isFollowing ? <Check className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>}
                  {profile.isFollowing ? 'Abonné' : 'Suivre'}
                  </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats + Bio + Actions */}
      <section className="mx-auto max-w-7xl px-2 sm:px-4 mt-2 sm:mt-4 grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile label="Abonnés" value={fmt.format(profile.followerCount || 0)} />
            <StatTile label="Abonnements" value={fmt.format(profile.followingCount || 0)} />
            <StatTile label="Écoutes" value={fmt.format(profile.totalPlays || 0)} />
                </div>
          {profile.bio && (
            <div className="mt-3 sm:mt-4">
              <h3 className="text-xs sm:text-sm font-semibold mb-1">Bio</h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{profile.bio}</p>
                </div>
          )}
            </div>
        {isOwnProfile && (
          <div className="bg-gradient-to-br from-indigo-600/20 via-fuchsia-600/10 to-cyan-600/10 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold mb-2">Actions rapides</h3>
            <div className="space-y-2">
              <QuickAction onClick={() => router.push('/upload')} icon={<Upload className="w-3 h-3 sm:w-4 sm:h-4"/>} label="Uploader" />
              <QuickAction onClick={() => router.push('/stats')} icon={<BarChart3 className="w-3 h-3 sm:w-4 sm:h-4"/>} label="Stats" />
              <QuickAction onClick={() => router.push('/library')} icon={<Music2 className="w-3 h-3 sm:w-4 sm:h-4"/>} label="Bibliothèque" />
                            </div>
                          </div>
                        )}
      </section>

      {/* Tracks publiés — GRID + DRAWER */}
      <main className="mx-auto max-w-7xl px-2 sm:px-4 pb-24 sm:pb-12">
        <section className="mt-4 sm:mt-8">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg font-semibold">Titres publiés</h2>
            <p className="text-[10px] sm:text-xs text-white/60">{filtered.length} titres</p>
                            </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {filtered.map(t => (
              <TrackTile
                key={t.id}
                track={t}
                isPlaying={audioState.currentTrackIndex !== -1 && audioState.tracks[audioState.currentTrackIndex]?._id === t.id && audioState.isPlaying}
                onPlay={(e: React.MouseEvent) => { e.stopPropagation(); handlePlayTrack(t); }}
                onOpenDetails={() => setDrawerId(t.id)}
                menuOpen={menuOpenId === t.id}
                onToggleMenu={(e: React.MouseEvent) => { e.stopPropagation(); setMenuOpenId(id => id === t.id ? null : t.id); }}
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
        </section>

        {/* DRAWER latéral */}
        <Drawer open={!!drawerId} onClose={() => setDrawerId(null)}>
          {selected && (
            <DrawerContent
              track={selected}
              isPlaying={audioState.currentTrackIndex !== -1 && audioState.tracks[audioState.currentTrackIndex]?._id === selected.id && audioState.isPlaying}
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

        <DevTests tracks={userTracks} />
      </main>

      {/* Background FX */}
      <div className="pointer-events-none fixed -z-10 inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-indigo-600/10 blur-3xl" />
                          </div>
                          
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
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition backdrop-blur-md ${
              canOpen 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700' 
                : 'bg-white/10 opacity-60'
            }`}
            title={canOpen ? 'Ouvrir un booster' : `Booster dans ${formatRemaining(remainingMs)}`}
          >
            <Sparkles className="w-6 h-6" />
                              </button>
                                  <button
            onClick={handleEdit}
            className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-2xl flex items-center justify-center hover:bg-white/15 transition"
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
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition backdrop-blur-md ${
              profile.isFollowing 
                ? 'bg-white/10 border border-white/10' 
                : 'bg-gradient-to-r from-purple-600 to-blue-600'
            }`}
            title={profile.isFollowing ? 'Se désabonner' : 'Suivre'}
          >
            {profile.isFollowing ? <Check className="w-6 h-6"/> : <UserPlus className="w-6 h-6"/>}
                </button>
              </div>
      )}
    </div>
  );
}

// ---- Subcomponents ----
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg sm:rounded-xl bg-white/5 border border-white/10 p-2 sm:p-3 text-center">
      <p className="text-sm sm:text-lg font-bold">{value}</p>
      <p className="text-[10px] sm:text-xs text-white/60">{label}</p>
                </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }){
  return (
    <button onClick={onClick} className="w-full text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-between transition">
      <span className="flex items-center gap-1.5 sm:gap-2">{icon}<span className="truncate">{label}</span></span>
      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-70 flex-shrink-0"/>
    </button>
  );
}

function TrackTile({ track, isPlaying, onPlay, onOpenDetails, menuOpen, onToggleMenu, onAction, isOwnProfile, onLikeUpdate }: { track: any; isPlaying: boolean; onPlay: (e: React.MouseEvent) => void; onOpenDetails: () => void; menuOpen: boolean; onToggleMenu: (e: React.MouseEvent) => void; onAction: (action: string) => void; isOwnProfile: boolean; onLikeUpdate: (trackId: string, isLiked: boolean, likesCount: number) => void }){
  return (
    <div onClick={onOpenDetails} className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 hover:bg-white/10 transition relative cursor-pointer group">
      <div className="relative">
        <img src={track.cover_url || track.coverUrl || '/default-cover.jpg'} alt={track.title} className="w-full aspect-square object-cover rounded-lg sm:rounded-xl" />
        
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
          <button onClick={onToggleMenu} aria-haspopup="menu" aria-expanded={menuOpen} className="absolute top-1 right-1 p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-black/50 hover:bg-black/70 border border-white/10">
            <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
        {/* overlay on hover - hidden on mobile */}
        <div className="hidden sm:flex absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/50 rounded-xl flex-col items-center justify-center gap-2">
          <div className="text-[11px] flex items-center gap-3">
            <span className="flex items-center gap-1"><Headphones className="w-4 h-4"/>{fmt.format(track.plays || 0)}</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4"/>{fmt.format(track.likes || 0)}</span>
          </div>
                  <div className="flex items-center gap-2">
            <button onClick={onPlay} className="px-2 py-1 text-[11px] rounded-md bg-white/10 hover:bg-white/20 border border-white/20">{isPlaying? 'Pause':'Play'}</button>
            <button onClick={(e)=>{e.stopPropagation(); onAction("stats");}} className="px-2 py-1 text-[11px] rounded-md bg-white/10 hover:bg-white/20 border border-white/20">Stats</button>
                  </div>
                </div>
              </div>
      <div className="mt-1.5 sm:mt-2">
        <p className="text-xs sm:text-sm font-medium line-clamp-1">{track.title}</p>
        <p className="text-[10px] sm:text-xs text-white/60 line-clamp-1">{mmss(track.duration || 0)}</p>
              </div>

      {/* Mini modal menu */}
      {menuOpen && isOwnProfile && (
        <div data-menu-root="true" role="menu" className="absolute right-2 top-20 z-20 w-44 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-lg">
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
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[480px] bg-[#0c0c16] sm:border-l border-white/10 shadow-2xl transform transition ${open? 'translate-x-0':'translate-x-full'}`}>
          {children}
        </div>
      </div>
    </>
  );
}

function DrawerContent({ track, isPlaying, onPlay, onEdit, onDuplicate, onDelete, isOwnProfile, onLikeUpdate, onClose }: { track: any; isPlaying: boolean; onPlay: () => void; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; isOwnProfile: boolean; onLikeUpdate: (trackId: string, isLiked: boolean, likesCount: number) => void; onClose: () => void }){
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 sm:p-4 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <img src={track.cover_url || track.coverUrl || '/default-cover.jpg'} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold line-clamp-1">{track.title}</p>
            <p className="text-[10px] sm:text-xs text-white/60">{mmss(track.duration || 0)} • {fmt.format(track.plays || 0)} écoutes</p>
            {track.genre && (
              <p className="text-[10px] sm:text-xs text-white/50 mt-1 line-clamp-1">{Array.isArray(track.genre) ? track.genre.join(', ') : track.genre}</p>
            )}
          </div>
          {/* Bouton fermer pour mobile */}
          <button onClick={onClose} className="sm:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
                </button>
              </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={onPlay} className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border border-white/10 flex items-center justify-center gap-1.5 sm:gap-2">
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
              <button onClick={onEdit} className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10">
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
        <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
          <h4 className="text-xs sm:text-sm font-semibold mb-2">Statistiques</h4>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <StatSmall label="Écoutes" value={fmt.format(track.plays || 0)} />
            <StatSmall label="Likes" value={fmt.format(track.likes || 0)} />
            <StatSmall label="Durée" value={mmss(track.duration || 0)} />
          </div>
        </div>

        {track.description && (
          <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
            <h4 className="text-xs sm:text-sm font-semibold mb-1">Description</h4>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{track.description}</p>
          </div>
        )}

        {track.tags && track.tags.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
            <h4 className="text-xs sm:text-sm font-semibold mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {track.tags.map((t: string, i: number)=> (
                <span key={i} className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-white/10 border border-white/10">{t}</span>
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
    <div className="rounded-md sm:rounded-lg bg-white/5 border border-white/10 p-2 sm:p-3">
      <p className="text-sm sm:text-base font-bold leading-none">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-white/60 mt-1">{label}</p>
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

/** Dev tests — simples checks au runtime (console) */
function DevTests({ tracks }: { tracks: any[] }){
  useEffect(() => {
    try {
      if (tracks.length > 0) {
        console.assert(Array.isArray(tracks), "Tracks should be an array");
        console.assert(typeof tracks[0].title === 'string', "Track has title");
        console.assert(typeof tracks[0].plays !== 'undefined' || typeof tracks[0].listens !== 'undefined', "Track has plays or listens");
        console.assert(typeof tracks[0].id === 'string', "Track has id");
        console.log(`[DevTests] Profile - ${tracks.length} tracks loaded OK`);
      }
    } catch (e) {
      console.error("[DevTests] FAILED", e);
    }
  }, [tracks]);
  return <div className="sr-only" aria-hidden />
}

