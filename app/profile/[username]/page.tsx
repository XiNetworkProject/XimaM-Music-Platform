'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3, Camera, Check, ChevronRight, Edit, Heart, Headphones,
  Loader2, MapPin, Globe, Music2, MoreHorizontal, Pause, Play,
  Share2, Upload, UserPlus, Sparkles, Calendar, X, MessageCircle,
  Send, Search, Users, Disc3, ExternalLink, Crown, TrendingUp, Zap, Clock,
  ArrowUpRight, Library, Mic2, Shield, SortAsc, ListPlus, ListEnd, Flag, Link2, FolderPlus, Trash2,
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

const fmtN = new Intl.NumberFormat();
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
function fmtK(n: number): string { if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return String(n); }

/* ═══════════════════════════════════════════════════════ */

export default function SynauraProfile() {
  const { username } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const { playTrack, audioState, addToUpNext } = useAudioPlayer();
  const { canOpen, openDaily, lastOpened, remainingMs, loading: boostersLoading, inventory } = useBoosters();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTracks, setUserTracks] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<'recent' | 'plays' | 'likes'>('plays');
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [ctxTrack, setCtxTrack] = useState<{ track: any; anchorEl: HTMLButtonElement } | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [showBoosterModal, setShowBoosterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditTrackModal, setShowEditTrackModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [trackEditData, setTrackEditData] = useState<any>({});
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [messageRequestStatus, setMessageRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [existingConvId, setExistingConvId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const usernameStr = Array.isArray(username) ? username[0] : username;
  const isOwnProfile = (session?.user as any)?.username === usernameStr;

  useEffect(() => { if (lastOpened) setShowBoosterModal(true); }, [lastOpened]);
  const formatRemaining = (ms: number) => { if (!ms || ms <= 0) return 'Dispo'; const h = Math.floor(ms / 3_600_000); const m = Math.floor((ms % 3_600_000) / 60_000); if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`; const s = Math.floor((ms % 60_000) / 1000); return `${m}:${s.toString().padStart(2, '0')}`; };

  /* ─── Data fetching ─── */
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true); setError('');
      try {
        if (!usernameStr) throw new Error("Username manquant");
        const res = await fetch(`/api/users/${encodeURIComponent(usernameStr)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        let isFollowing = false;
        if (session?.user?.id && data.id !== session.user.id) {
          try { const fr = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/follow`); if (fr.ok) isFollowing = (await fr.json()).isFollowing; } catch {}
        }
        setProfile({ ...data, isFollowing }); setEditData({ ...data, isFollowing }); setUserTracks(data.tracks || []);
      } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    };
    if (usernameStr) fetchProfile();
  }, [usernameStr, session?.user?.id]);

  const playlists = useMemo(() => (Array.isArray(profile?.playlists) ? profile.playlists : []), [profile]);

  const sortedTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (userTracks || []).filter((t) => String(t?.title || '').toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sortBy === 'plays') return (b.plays || 0) - (a.plays || 0);
      if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
      return new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime();
    });
  }, [query, sortBy, userTracks]);

  const displayTracks = showAllTracks ? sortedTracks : sortedTracks.slice(0, 5);

  const closeCtx = useCallback(() => setCtxTrack(null), []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerId(null); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, []);

  const selected = useMemo(() => userTracks.find(t => t.id === drawerId) || null, [drawerId, userTracks]);

  /* ─── Handlers (unchanged logic) ─── */
  const handlePlayTrack = async (track: any) => { try { await playTrack({ _id: track.id, title: track.title, artist: track.artist || track.artist_name || profile?.name || 'Artiste', audioUrl: track.audioUrl || track.audio_url, coverUrl: track.coverUrl || track.cover_url, duration: track.duration, album: track.album || null, likes: track.likes || 0, comments: [], plays: track.plays || 0, genre: track.genre || [], isLiked: track.isLiked || false }); } catch { notify.error('Erreur', 'Lecture impossible'); } };
  const handleLikeUpdate = (tid: string, liked: boolean, count: number) => { setUserTracks(p => p.map(t => t.id === tid ? { ...t, isLiked: liked, likes: count } : t)); setProfile((p: any) => ({ ...p, tracks: p.tracks?.map((t: any) => t.id === tid ? { ...t, isLiked: liked, likes: count } : t) })); };
  const handleDeleteTrack = async (tid: string) => { if (!confirm('Supprimer ?')) return; try { const ai = String(tid).startsWith('ai-'); const eid = ai ? tid.slice(3) : tid; const r = await fetch(ai ? `/api/ai/tracks/${eid}` : `/api/tracks/${eid}`, { method: 'DELETE' }); if (!r.ok) throw new Error((await r.json()).error); setUserTracks(p => p.filter(t => t.id !== tid)); setDrawerId(null); notify.success('OK', 'Supprimee'); } catch (e: any) { notify.error('Erreur', e.message); } };
  const handleFollow = async () => { if (!session?.user) { router.push(`/auth/signup?callbackUrl=/profile/${encodeURIComponent(usernameStr || '')}`); return; } try { if (!usernameStr) return; const r = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/follow`, { method: 'POST' }); if (!r.ok) throw new Error(); const d = await r.json(); setProfile((p: any) => ({ ...p, isFollowing: d.action === 'followed', followerCount: p.followerCount + (d.action === 'followed' ? 1 : -1) })); } catch { notify.error('Erreur', 'Impossible'); } };
  useEffect(() => { if (!session?.user?.id || !profile?.id || isOwnProfile) return; (async () => { try { const r = await fetch(`/api/messages/requests/status?targetId=${profile.id}`); if (r.ok) { const d = await r.json(); setMessageRequestStatus(d.status || 'none'); if (d.conversationId) setExistingConvId(d.conversationId); } } catch {} })(); }, [session?.user?.id, profile?.id, isOwnProfile]);
  const handleSendMessageRequest = async () => { if (!session?.user) { router.push(`/auth/signup?callbackUrl=/profile/${encodeURIComponent(usernameStr || '')}`); return; } if (!profile?.id) return; setSendingRequest(true); try { const r = await fetch('/api/messages/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: profile.id, message: messageText.trim() || null }) }); const d = await r.json(); if (r.ok) { setMessageRequestStatus('pending'); setShowMessageModal(false); setMessageText(''); notify.success('OK', 'Demande envoyee'); } else if (d.alreadyConnected) router.push(d.conversationId ? `/messages/${d.conversationId}` : '/messages'); else if (d.alreadySent) { setMessageRequestStatus('pending'); notify.info('Info', 'Deja envoyee'); } else notify.error('Erreur', d.error || 'Erreur'); } catch { notify.error('Erreur', 'Connexion'); } finally { setSendingRequest(false); } };
  const handleImageUpload = async (type: 'avatar' | 'banner', file: File) => { setUploading(true); try { const ts = Math.round(Date.now() / 1000); const pid = `${usernameStr || 'u'}_${type}_${ts}`; if (!usernameStr) throw new Error(); const s = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/upload-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp: ts, publicId: pid, type }) }); if (!s.ok) throw new Error(); const { signature, apiKey, cloudName } = await s.json(); const fd = new FormData(); fd.append('file', file); fd.append('timestamp', String(ts)); fd.append('public_id', pid); fd.append('folder', `ximam/profiles/${username}`); fd.append('resource_type', 'image'); fd.append('api_key', apiKey); fd.append('signature', signature); const u = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd }); if (!u.ok) throw new Error(); const ud = await u.json(); const sv = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/save-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: ud.secure_url, type, publicId: pid }) }); if (!sv.ok) throw new Error(); const sd = await sv.json(); setProfile((p: any) => ({ ...p, [type]: sd.imageUrl })); setEditData((p: any) => ({ ...p, [type]: sd.imageUrl })); notify.success('OK', 'Image mise a jour'); } catch { notify.error('Erreur', 'Upload echoue'); } finally { setUploading(false); } };
  const handleEdit = () => setShowEditModal(true);
  const handleCancelEdit = () => { setShowEditModal(false); setEditData({ ...profile }); };
  const handleSaveEdit = async () => { setUploading(true); try { if (!usernameStr) throw new Error(); const r = await fetch(`/api/users/${encodeURIComponent(usernameStr)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); const merged = { ...profile, name: d.name || editData.name, bio: d.bio ?? editData.bio, artistName: d.artist_name || editData.artistName, location: d.location ?? editData.location, website: d.website ?? editData.website, genre: d.genre || editData.genre, isArtist: d.is_artist ?? editData.isArtist }; setProfile(merged); setEditData(merged); setShowEditModal(false); notify.success('OK', 'Profil sauvegarde'); } catch (e: any) { notify.error('Erreur', e.message); } finally { setUploading(false); } };
  const handleEditTrack = (t: any) => { setEditingTrack(t); setTrackEditData({ title: t.title, description: t.description || '', genre: Array.isArray(t.genre) ? t.genre.join(', ') : (t.genre || ''), tags: t.tags?.join(', ') || '', isPublic: t.is_public !== false }); setShowEditTrackModal(true); closeCtx(); };
  const handleSaveTrackEdit = async () => { if (!editingTrack) return; setUploading(true); try { const tid = editingTrack.id; const r = await fetch(`/api/tracks/${tid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: trackEditData.title, description: trackEditData.description, genre: trackEditData.genre.split(',').map((g: string) => g.trim()).filter(Boolean), tags: trackEditData.tags.split(',').map((t: string) => t.trim()).filter(Boolean), isPublic: trackEditData.isPublic }) }); if (!r.ok) throw new Error((await r.json()).error); const u = await r.json(); setUserTracks(p => p.map(t => t.id === tid ? { ...t, ...u } : t)); setProfile((p: any) => ({ ...p, tracks: (p.tracks || []).map((t: any) => t.id === tid ? { ...t, ...u } : t) })); setShowEditTrackModal(false); notify.success('OK', 'Modifiee'); } catch (e: any) { notify.error('Erreur', e.message); } finally { setUploading(false); } };
  const handleShareProfile = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/profile/${encodeURIComponent(usernameStr || '')}`); notify.success('OK', 'Lien copie'); } catch {} };
  const memberSince = useMemo(() => { const raw = profile?.createdAt || profile?.created_at; if (!raw) return null; const d = new Date(raw); return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }, [profile]);

  /* ═══════════ LOADING ═══════════ */
  if (loading) return (
    <div className="min-h-screen">
      <div className="h-[340px] bg-gradient-to-b from-[#1a1a2e] to-[#0a0a10] animate-pulse" />
      <div className="max-w-4xl mx-auto px-6 -mt-20">
        <div className="flex gap-5 items-end"><div className="w-36 h-36 rounded-full bg-white/[0.06] animate-pulse border-4 border-[#0a0a10]" /><div className="pb-4 space-y-3"><div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" /><div className="h-4 w-32 bg-white/[0.03] rounded animate-pulse" /></div></div>
      </div>
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center"><Disc3 size={48} className="text-white/8 mx-auto mb-4" /><h2 className="text-xl font-bold text-white mb-2">Profil introuvable</h2><p className="text-sm text-white/30 mb-6">{error || "Ce profil n'existe pas."}</p><button onClick={() => router.push('/discover')} className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition">Decouvrir</button></div>
    </div>
  );

  const totalPlays = profile.totalPlays || 0;
  const followerCount = profile.followerCount || 0;
  const followingCount = profile.followingCount || 0;
  const isTrackPlaying = (tid: string) => audioState.currentTrackIndex !== -1 && audioState.tracks[audioState.currentTrackIndex]?._id === tid && audioState.isPlaying;

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="min-h-screen pb-32">

      {/* ═══════ HERO ═══════ */}
      <div className="relative">
        {/* Banner with gradient fade */}
        <div className="h-[260px] sm:h-[320px] md:h-[360px] relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.banner || '/default-cover.jpg'} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,10,16,0) 0%, rgba(10,10,16,0.4) 50%, rgba(10,10,16,1) 100%)' }} />
          {isOwnProfile && (
            <>
              <button className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/70 hover:text-white transition" onClick={() => bannerInputRef.current?.click()}><Camera size={16} /></button>
              <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload('banner', f); }} />
            </>
          )}
        </div>

        {/* Profile info overlapping banner bottom */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative" style={{ marginTop: '-100px' }}>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-end">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[#0a0a10] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <Avatar src={profile.avatar} name={profile.name} username={profile.username} size="2xl" className="w-full h-full" />
              </div>
              {isOwnProfile && (
                <>
                  <button className="absolute bottom-1 right-1 p-2 rounded-full bg-[#0a0a10] hover:bg-white/[0.1] border border-white/[0.1] text-white transition opacity-0 group-hover:opacity-100" onClick={() => fileInputRef.current?.click()}><Camera size={13} /></button>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload('avatar', f); }} />
                </>
              )}
            </div>

            {/* Name + info */}
            <div className="flex-1 min-w-0 text-center sm:text-left pb-1">
              <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">{profile.name}</h1>
                {profile.isVerified && (
                  <div className="w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center shrink-0"><Check className="text-white" size={14} /></div>
                )}
              </div>
              {profile.artistName && <p className="text-sm text-white/40 mt-0.5">{profile.artistName}</p>}
              <div className="flex items-center gap-1 mt-2 text-sm text-white/40 justify-center sm:justify-start flex-wrap">
                <span>{fmtK(totalPlays)} ecoutes</span>
                <span className="text-white/15 mx-1">&bull;</span>
                <span>{fmtK(profile.totalLikes || 0)} likes</span>
                <span className="text-white/15 mx-1">&bull;</span>
                <span>{fmtK(followerCount)} followers</span>
                <span className="text-white/15 mx-1">&bull;</span>
                <span>{fmtK(followingCount)} abonnements</span>
                <span className="text-white/15 mx-1">&bull;</span>
                <span>{userTracks.length} titre{userTracks.length !== 1 ? 's' : ''}</span>
                {playlists.length > 0 && <><span className="text-white/15 mx-1">&bull;</span><span>{playlists.length} playlist{playlists.length !== 1 ? 's' : ''}</span></>}
              </div>
              {profile.bio?.trim() && <p className="text-sm text-white/35 mt-2 line-clamp-2 max-w-lg">{profile.bio}</p>}
              {(profile.location?.trim() || profile.website?.trim()) && (
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/25 justify-center sm:justify-start flex-wrap">
                  {profile.location?.trim() && <span className="inline-flex items-center gap-1"><MapPin size={10} /> {profile.location}</span>}
                  {profile.website?.trim() && <a href={profile.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white/40"><ExternalLink size={10} /> {profile.website.replace(/^https?:\/\//, '')}</a>}
                  {memberSince && <span className="inline-flex items-center gap-1"><Calendar size={10} /> {memberSince}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 mt-5 flex-wrap justify-center sm:justify-start">
            {isOwnProfile ? (
              <>
                <button onClick={handleEdit} className="h-9 px-5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition inline-flex items-center gap-1.5"><Edit size={14} /> Modifier</button>
                <button onClick={() => router.push('/stats')} className="h-9 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white/80 text-sm font-medium transition inline-flex items-center gap-1.5"><BarChart3 size={14} /> Stats</button>
                <button onClick={handleShareProfile} className="h-9 w-9 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white/60 inline-flex items-center justify-center transition"><Share2 size={15} /></button>
                <button onClick={() => setShowBoosterModal(true)} disabled={!canOpen || boostersLoading}
                  className={`h-9 w-9 rounded-full inline-flex items-center justify-center transition ${canOpen ? 'bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] text-white shadow-[0_0_12px_rgba(110,86,207,0.4)]' : 'bg-white/[0.06] text-white/20 cursor-not-allowed'}`}
                  title={canOpen ? 'Booster' : formatRemaining(remainingMs)}><Sparkles size={14} /></button>
              </>
            ) : (
              <>
                <button onClick={handleFollow}
                  className={`h-9 px-5 rounded-full text-sm font-semibold transition inline-flex items-center gap-1.5 ${profile.isFollowing ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white/80' : 'bg-white text-black hover:bg-white/90'}`}>
                  {profile.isFollowing ? <><Check size={14} /> Abonne</> : <><UserPlus size={14} /> Suivre</>}
                </button>
                <MsgBtn status={messageRequestStatus} existingConvId={existingConvId} onMsg={() => setShowMessageModal(true)} onGo={() => router.push(existingConvId ? `/messages/${existingConvId}` : '/messages')} />
                <button onClick={handleShareProfile} className="h-9 w-9 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white/60 inline-flex items-center justify-center transition"><Share2 size={15} /></button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ QUICK ACTIONS (own profile) ═══════ */}
      {isOwnProfile && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-8">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
            <button onClick={() => router.push('/upload')} className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition group">
              <Upload size={15} className="text-white/40 group-hover:text-[#00d3a7] transition" />
              <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition hidden sm:inline">Uploader</span>
            </button>
            <button onClick={() => router.push('/ai-generator')} className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition group">
              <Sparkles size={15} className="text-white/40 group-hover:text-[#6e56cf] transition" />
              <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition hidden sm:inline">Studio IA</span>
            </button>
            <button onClick={() => router.push('/library')} className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition group">
              <Library size={15} className="text-white/40 group-hover:text-white/60 transition" />
              <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition hidden sm:inline">Bibliotheque</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════ POPULAR TRACKS (Spotify-style list) ═══════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Populaires</h2>
          <div className="flex items-center gap-2">
            {/* Sort buttons */}
            <div className="hidden sm:flex items-center gap-0.5 bg-white/[0.04] rounded-full p-0.5">
              {([['plays', 'Top'], ['recent', 'Recent'], ['likes', 'Likes']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setSortBy(key)} className={`px-3 py-1 text-[11px] rounded-full font-medium transition ${sortBy === key ? 'bg-white/[0.1] text-white/80' : 'text-white/25 hover:text-white/40'}`}>{label}</button>
              ))}
            </div>
            {query && <button onClick={() => setQuery('')} className="text-xs text-white/30 hover:text-white/50">Effacer</button>}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" className="h-8 w-28 sm:w-36 rounded-full bg-white/[0.06] pl-8 pr-3 text-xs text-white placeholder:text-white/20 outline-none focus:w-48 focus:bg-white/[0.08] transition-all" />
            </div>
          </div>
        </div>

        {sortedTracks.length === 0 ? (
          <div className="py-16 text-center">
            <Music2 size={40} className="text-white/6 mx-auto mb-3" />
            <p className="text-sm text-white/25">{query.trim() ? 'Aucun resultat' : isOwnProfile ? 'Pas encore de titres publies' : 'Aucun titre'}</p>
            {isOwnProfile && !query.trim() && (
              <div className="mt-5 flex justify-center gap-3">
                <button onClick={() => router.push('/upload')} className="px-5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-sm text-white/70 font-medium transition inline-flex items-center gap-1.5"><Upload size={14} /> Uploader</button>
                <button onClick={() => router.push('/studio')} className="px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition inline-flex items-center gap-1.5"><Sparkles size={14} /> Studio IA</button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Track rows */}
            <div className="space-y-0.5">
              {displayTracks.map((track, idx) => {
                const isAi = Boolean(track?.is_ai || String(track?.id || '').startsWith('ai-'));
                const playing = isTrackPlaying(track.id);
                return (
                  <div key={track.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group cursor-pointer relative"
                    onClick={() => setDrawerId(track.id)}>
                    {/* # / Play */}
                    <div className="w-6 text-center shrink-0">
                      <span className="text-sm text-white/25 tabular-nums group-hover:hidden">{playing ? <Volume2Icon /> : idx + 1}</span>
                      <button onClick={(e) => { e.stopPropagation(); handlePlayTrack(track); }} className="hidden group-hover:block text-white">
                        {playing ? <Pause size={14} /> : <Play size={14} fill="white" />}
                      </button>
                    </div>
                    {/* Cover */}
                    <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-white/[0.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={track.cover_url || track.coverUrl || '/default-cover.jpg'} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${playing ? 'text-[#00d3a7]' : 'text-white'}`}>{track.title}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/25">
                        {isAi && <span className="text-[#6e56cf] font-semibold">IA</span>}
                        <span>{profile.artistName || profile.name}</span>
                      </div>
                    </div>
                    {/* Plays */}
                    <span className="text-xs text-white/25 tabular-nums hidden sm:block w-20 text-right">{fmtN.format(track.plays || 0)}</span>
                    {/* Like */}
                    {!isAi && (
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <LikeButton trackId={track.id} initialIsLiked={track.isLiked || false} initialLikesCount={track.likes || 0} onUpdate={(s) => handleLikeUpdate(track.id, s.isLiked, s.likesCount)} showCount={false} size="sm" />
                      </div>
                    )}
                    {/* Duration */}
                    <span className="text-xs text-white/20 tabular-nums w-10 text-right shrink-0">{mmss(track.duration || 0)}</span>
                    {/* Menu */}
                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCtxTrack(ctxTrack?.track?.id === track.id ? null : { track, anchorEl: e.currentTarget as HTMLButtonElement }); }} className="p-1 rounded-md hover:bg-white/10 transition text-white/40 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 shrink-0">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            {sortedTracks.length > 5 && (
              <button onClick={() => setShowAllTracks(!showAllTracks)} className="mt-3 text-sm text-white/30 hover:text-white/50 font-medium transition">
                {showAllTracks ? 'Voir moins' : `Voir tout (${sortedTracks.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════ PLAYLISTS ═══════ */}
      {playlists.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
          <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {playlists.filter((p: any) => p?.id || p?._id).map((p: any) => {
              const pid = String(p.id || p._id);
              const cover = p.cover_url || p.coverUrl || '/default-cover.jpg';
              const count = Array.isArray(p.tracks) ? p.tracks.length : Number(p.tracks_count || 0);
              return (
                <button key={pid} onClick={() => router.push(`/playlists/${encodeURIComponent(pid)}`)} className="shrink-0 w-36 sm:w-40 text-left group">
                  <div className="relative rounded-lg overflow-hidden mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="w-full aspect-square object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                      <Play size={28} className="text-white opacity-0 group-hover:opacity-100 transition drop-shadow-lg" fill="white" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{p.name || 'Playlist'}</p>
                  <p className="text-xs text-white/25">{count} titre{count !== 1 ? 's' : ''}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ A PROPOS ═══════ */}
      {(profile.bio || profile.genre?.length > 0 || profile.location || profile.website || memberSince) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
          <h2 className="text-xl font-bold text-white mb-4">A propos</h2>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-4">
            {profile.bio && <p className="text-sm text-white/50 leading-relaxed whitespace-pre-line">{profile.bio}</p>}

            {/* Genres */}
            {profile.genre?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Mic2 size={13} className="text-white/20 mt-0.5" />
                {(Array.isArray(profile.genre) ? profile.genre : [profile.genre]).map((g: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 text-[11px] rounded-full bg-[#6e56cf]/10 text-[#a78bfa] border border-[#6e56cf]/20">{g}</span>
                ))}
              </div>
            )}

            {/* Info rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {profile.location && (
                <div className="flex items-center gap-2.5 text-sm text-white/35">
                  <MapPin size={14} className="text-white/20 shrink-0" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-[#00d3a7]/70 hover:text-[#00d3a7] transition">
                  <Globe size={14} className="shrink-0" />
                  <span className="truncate">{profile.website.replace(/^https?:\/\//, '')}</span>
                  <ArrowUpRight size={11} className="shrink-0" />
                </a>
              )}
              {memberSince && (
                <div className="flex items-center gap-2.5 text-sm text-white/35">
                  <Calendar size={14} className="text-white/20 shrink-0" />
                  <span>Membre depuis {memberSince}</span>
                </div>
              )}
              {profile.role && profile.role !== 'user' && (
                <div className="flex items-center gap-2.5 text-sm text-white/35">
                  <Shield size={14} className="text-white/20 shrink-0" />
                  <span className="capitalize">{profile.role}</span>
                </div>
              )}
            </div>

            {/* Badges */}
            {(profile.isVerified || profile.isArtist) && (
              <div className="flex items-center gap-2 pt-1">
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#00d3a7]/10 text-[#00d3a7] border border-[#00d3a7]/20">
                    <Check size={11} /> Verifie
                  </span>
                )}
                {profile.isArtist && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#6e56cf]/10 text-[#a78bfa] border border-[#6e56cf]/20">
                    <Crown size={11} /> Artiste
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ CTA GUESTS ═══════ */}
      {!session && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-12">
          <div className="text-center py-8">
            <h2 className="text-lg font-bold text-white">Decouvre plus sur Synaura</h2>
            <p className="text-sm text-white/30 mt-1">Cree ton compte pour suivre {profile.name} et creer ta musique.</p>
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={() => router.push(`/auth/signup?callbackUrl=/profile/${encodeURIComponent(usernameStr || '')}`)} className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition"><UserPlus size={14} className="inline mr-1" /> S&apos;inscrire</button>
              <button onClick={() => router.push('/auth/signin')} className="px-6 py-2.5 rounded-full bg-white/[0.08] text-sm text-white/60 hover:bg-white/[0.12] transition">Connexion</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CONTEXT MENU (portal) ═══════ */}
      {ctxTrack && (
        <TrackCtxMenu
          track={ctxTrack.track}
          anchorEl={ctxTrack.anchorEl}
          isOwn={isOwnProfile}
          onClose={closeCtx}
          onEdit={() => handleEditTrack(ctxTrack.track)}
          onDelete={() => { handleDeleteTrack(ctxTrack.track.id); closeCtx(); }}
          onStats={() => { router.push(`/stats?track_id=${encodeURIComponent(ctxTrack.track.id)}`); closeCtx(); }}
          onPlay={() => { handlePlayTrack(ctxTrack.track); closeCtx(); }}
          addToUpNext={addToUpNext}
          artistName={profile.artistName || profile.name}
        />
      )}

      {/* ═══════ DRAWER ═══════ */}
      <Drawer open={!!drawerId} onClose={() => setDrawerId(null)}>
        {selected && <DrawerContent track={selected} playing={isTrackPlaying(selected.id)} onPlay={() => handlePlayTrack(selected)} onEdit={() => handleEditTrack(selected)} onDelete={() => handleDeleteTrack(selected.id)} isOwn={isOwnProfile} onLike={handleLikeUpdate} onClose={() => setDrawerId(null)} artistName={profile.artistName || profile.name} />}
      </Drawer>

      {/* ═══════ MODALS ═══════ */}
      <AnimatePresence>{showBoosterModal && <BoosterOpenModal isOpen onClose={() => setShowBoosterModal(false)} onOpenBooster={openDaily} isOpening={boostersLoading} openedBooster={lastOpened ? { id: lastOpened.inventoryId, status: 'owned', obtained_at: new Date().toISOString(), booster: lastOpened.booster } : null} item={lastOpened || null} />}</AnimatePresence>

      <AnimatePresence>{showMessageModal && (
        <Modal onClose={() => setShowMessageModal(false)}>
          <div className="flex items-center gap-3 mb-4"><Avatar src={profile?.avatar} name={profile?.name} username={usernameStr || ''} size="md" /><div><h2 className="text-base font-bold text-white">Message a {profile?.name}</h2><p className="text-xs text-white/25">Demande en attente de validation</p></div></div>
          <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Message (optionnel)..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-white/15 outline-none focus:ring-1 focus:ring-white/20 resize-none mb-4" />
          <div className="flex gap-2"><button onClick={() => { setShowMessageModal(false); setMessageText(''); }} className="flex-1 py-2.5 rounded-full text-sm bg-white/[0.06] text-white/50 hover:bg-white/[0.1]">Annuler</button><button onClick={handleSendMessageRequest} disabled={sendingRequest} className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"><Send size={13} /> {sendingRequest ? '...' : 'Envoyer'}</button></div>
        </Modal>
      )}</AnimatePresence>

      <AnimatePresence>{showEditModal && (
        <Modal onClose={() => setShowEditModal(false)}>
          <h3 className="text-lg font-bold text-white mb-5">Modifier le profil</h3>
          <div className="space-y-4">
            <Field label="Nom" value={editData.name || ''} onChange={(v) => setEditData({ ...editData, name: v })} />
            <FieldArea label="Bio" value={editData.bio || ''} onChange={(v) => setEditData({ ...editData, bio: v })} />
            <Field label="Nom d'artiste" value={editData.artistName || ''} onChange={(v) => setEditData({ ...editData, artistName: v })} />
            <Field label="Genres (separes par des virgules)" value={Array.isArray(editData.genre) ? editData.genre.join(', ') : (editData.genre || '')} onChange={(v) => setEditData({ ...editData, genre: v.split(',').map((g: string) => g.trim()).filter(Boolean) })} />
            <Field label="Localisation" value={editData.location || ''} onChange={(v) => setEditData({ ...editData, location: v })} />
            <Field label="Site web" value={editData.website || ''} onChange={(v) => setEditData({ ...editData, website: v })} />
          </div>
          <div className="flex gap-2 mt-5"><button onClick={handleCancelEdit} className="flex-1 py-2.5 rounded-full text-sm bg-white/[0.06] text-white/50">Annuler</button><button onClick={handleSaveEdit} disabled={uploading} className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-white text-black disabled:opacity-50">{uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sauvegarder'}</button></div>
        </Modal>
      )}</AnimatePresence>

      <AnimatePresence>{showEditTrackModal && (
        <Modal onClose={() => setShowEditTrackModal(false)}>
          <h3 className="text-lg font-bold text-white mb-5">Modifier la piste</h3>
          <div className="space-y-4">
            <Field label="Titre" value={trackEditData.title || ''} onChange={(v) => setTrackEditData({ ...trackEditData, title: v })} />
            <FieldArea label="Description" value={trackEditData.description || ''} onChange={(v) => setTrackEditData({ ...trackEditData, description: v })} />
            <Field label="Genres" value={trackEditData.genre || ''} onChange={(v) => setTrackEditData({ ...trackEditData, genre: v })} />
            <Field label="Tags" value={trackEditData.tags || ''} onChange={(v) => setTrackEditData({ ...trackEditData, tags: v })} />
            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={trackEditData.isPublic} onChange={(e) => setTrackEditData({ ...trackEditData, isPublic: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-white/50">Publique</span></label>
          </div>
          <div className="flex gap-2 mt-5"><button onClick={() => setShowEditTrackModal(false)} className="flex-1 py-2.5 rounded-full text-sm bg-white/[0.06] text-white/50">Annuler</button><button onClick={handleSaveTrackEdit} disabled={uploading || !trackEditData.title?.trim()} className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-white text-black disabled:opacity-50">{uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sauvegarder'}</button></div>
        </Modal>
      )}</AnimatePresence>

      {/* Mobile FABs */}
      {isOwnProfile ? (
        <div className="md:hidden fixed bottom-24 right-4 flex flex-col gap-2 z-[100]">
          <button onClick={() => setShowBoosterModal(true)} disabled={!canOpen} className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center ${canOpen ? 'bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] text-white' : 'bg-white/[0.06] text-white/20'}`}><Sparkles size={16} /></button>
          <button onClick={handleEdit} className="w-11 h-11 bg-white/[0.08] rounded-full shadow-xl flex items-center justify-center text-white/60 hover:bg-white/[0.12]"><Edit size={15} /></button>
        </div>
      ) : (
        <div className="md:hidden fixed bottom-24 right-4 z-[100]">
          <button onClick={handleFollow} className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center ${profile.isFollowing ? 'bg-white/[0.08] text-white/60' : 'bg-white text-black'}`}>
            {profile.isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════ Small components ═══════════ */

function Volume2Icon() { return <div className="flex items-center justify-center gap-[2px] h-[14px]"><div className="w-[2px] h-2 bg-[#00d3a7] rounded-full animate-pulse" /><div className="w-[2px] h-3 bg-[#00d3a7] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} /><div className="w-[2px] h-1.5 bg-[#00d3a7] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} /></div>; }

function MsgBtn({ status, existingConvId, onMsg, onGo }: { status: string; existingConvId: string | null; onMsg: () => void; onGo: () => void }) {
  if (status === 'accepted' || existingConvId) return <button onClick={onGo} className="h-9 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white/70 text-sm font-medium transition inline-flex items-center gap-1.5"><MessageCircle size={14} /> Message</button>;
  if (status === 'pending') return <button disabled className="h-9 px-4 rounded-full bg-white/[0.04] text-white/25 text-sm cursor-not-allowed inline-flex items-center gap-1.5"><Send size={14} /> En attente</button>;
  return <button onClick={onMsg} className="h-9 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white/70 text-sm font-medium transition inline-flex items-center gap-1.5"><MessageCircle size={14} /> Message</button>;
}

function TrackCtxMenu({ track, anchorEl, isOwn, onClose, onEdit, onDelete, onStats, onPlay, addToUpNext, artistName }: {
  track: any; anchorEl: HTMLElement; isOwn: boolean; onClose: () => void;
  onEdit: () => void; onDelete: () => void; onStats: () => void; onPlay: () => void;
  addToUpNext: (t: any, pos: 'next' | 'end') => void; artistName: string;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const isAi = Boolean(track?.is_ai || String(track?.id || '').startsWith('ai-'));
  const router = useRouter();

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const menuW = 220; const menuH = 320;
    let left = rect.right - menuW;
    let top = rect.bottom + 6;
    if (left < 8) left = 8;
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
    if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 6;
    setPos({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    const close = () => onClose();
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const fmt = (t: any) => ({ _id: t.id, title: t.title, artist: t.artist || t.artist_name || artistName, audioUrl: t.audioUrl || t.audio_url, coverUrl: t.coverUrl || t.cover_url, duration: t.duration, album: t.album || null, likes: t.likes || 0, comments: [], plays: t.plays || 0, genre: t.genre || [], isLiked: t.isLiked || false });
  const handlePlayNext = () => { addToUpNext(fmt(track), 'next'); notify.success('OK', `${track.title} — lu ensuite`); onClose(); };
  const handleQueue = () => { addToUpNext(fmt(track), 'end'); notify.success('OK', `${track.title} — ajouté à la file`); onClose(); };
  const handleShare = async () => {
    const url = `${window.location.origin}/track/${track?.id || ''}`;
    if (navigator.share) { try { await navigator.share({ title: track?.title, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); } catch {} setCopied(true); setTimeout(() => setCopied(false), 2000); }
    onClose();
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed z-[9999] w-[220px] rounded-xl border border-white/10 bg-[#121218]/98 backdrop-blur-2xl py-1.5 shadow-[0_16px_64px_rgba(0,0,0,.7)] animate-in fade-in-0 zoom-in-95 duration-100" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
      <CtxItem icon={Play} label="Ecouter" onClick={onPlay} />
      <CtxItem icon={ListPlus} label="Lire ensuite" onClick={handlePlayNext} />
      <CtxItem icon={ListEnd} label="Ajouter a la file" onClick={handleQueue} />
      <div className="my-1 border-t border-white/[0.06]" />
      <CtxItem icon={copied ? Check : Share2} label={copied ? 'Lien copie !' : 'Partager'} onClick={handleShare} />
      {isOwn && !isAi && (
        <>
          <div className="my-1 border-t border-white/[0.06]" />
          <CtxItem icon={Edit} label="Modifier" onClick={onEdit} />
          <CtxItem icon={BarChart3} label="Statistiques" onClick={onStats} />
          <div className="my-1 border-t border-white/[0.06]" />
          <CtxItem icon={Trash2} label="Supprimer" onClick={onDelete} subtle />
        </>
      )}
    </div>,
    document.body,
  );
}

function CtxItem({ icon: Icon, label, onClick, subtle }: { icon: any; label: string; onClick: () => void; subtle?: boolean }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition ${subtle ? 'text-rose-400/70 hover:text-rose-400 hover:bg-white/[0.04]' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#111116] sm:border-l border-white/[0.06] shadow-2xl transform transition ${open ? 'translate-x-0' : 'translate-x-full'}`}>{children}</div>
    </div>
  );
}

function DrawerContent({ track, playing, onPlay, onEdit, onDelete, isOwn, onLike, onClose, artistName }: {
  track: any; playing: boolean; onPlay: () => void; onEdit: () => void; onDelete: () => void;
  isOwn: boolean; onLike: (id: string, l: boolean, c: number) => void; onClose: () => void; artistName: string;
}) {
  const isAi = Boolean(track?.is_ai || String(track?.id || '').startsWith('ai-'));
  const createdDate = (() => {
    const raw = track?.created_at || track?.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  })();
  return (
    <div className="h-full flex flex-col">
      {/* Header with big cover */}
      <div className="relative">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:text-white"><X size={16} /></button>
        <div className="aspect-square max-h-[320px] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.cover_url || track.coverUrl || '/default-cover.jpg'} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, #111116 0%, transparent 100%)' }}>
          <p className="text-lg font-bold text-white">{track.title}</p>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>{artistName}</span>
            {isAi && <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#6e56cf]/30 text-[#a78bfa]">IA</span>}
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="px-4 py-3 flex items-center gap-2">
        <button onClick={onPlay} className="flex-1 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition inline-flex items-center justify-center gap-1.5">
          {playing ? <Pause size={15} /> : <Play size={15} fill="black" />} {playing ? 'Pause' : 'Ecouter'}
        </button>
        {!isAi && <div onClick={(e) => e.stopPropagation()}><LikeButton trackId={track.id} initialIsLiked={track.isLiked || false} initialLikesCount={track.likes || 0} onUpdate={(s) => onLike(track.id, s.isLiked, s.likesCount)} showCount={false} size="md" /></div>}
      </div>
      {/* Stats */}
      <div className="px-4 pb-3">
        <div className="flex gap-4 text-center py-2 bg-white/[0.03] rounded-lg">
          <div className="flex-1"><div className="text-sm font-bold text-white">{fmtN.format(track.plays || 0)}</div><div className="text-[10px] text-white/20">ecoutes</div></div>
          <div className="flex-1"><div className="text-sm font-bold text-white">{fmtN.format(track.likes || 0)}</div><div className="text-[10px] text-white/20">likes</div></div>
          <div className="flex-1"><div className="text-sm font-bold text-white">{mmss(track.duration || 0)}</div><div className="text-[10px] text-white/20">duree</div></div>
        </div>
      </div>
      {/* Info */}
      <div className="px-4 pb-4 space-y-3 overflow-y-auto flex-1">
        {track.description && <p className="text-xs text-white/30 leading-relaxed">{track.description}</p>}
        {track.genre?.length > 0 && <div className="flex flex-wrap gap-1.5">{(Array.isArray(track.genre) ? track.genre : [track.genre]).map((g: string, i: number) => <span key={i} className="px-2.5 py-1 text-[10px] rounded-full bg-[#6e56cf]/10 text-[#a78bfa] border border-[#6e56cf]/20">{g}</span>)}</div>}
        {track.tags?.length > 0 && <div className="flex flex-wrap gap-1.5">{track.tags.map((t: string, i: number) => <span key={i} className="px-2.5 py-1 text-[10px] rounded-full bg-white/[0.04] text-white/20">#{t}</span>)}</div>}
        {createdDate && (
          <div className="flex items-center gap-2 text-xs text-white/20">
            <Calendar size={12} />
            <span>Publie le {createdDate}</span>
          </div>
        )}
        {isAi && track.prompt && (
          <div className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <p className="text-[10px] text-white/20 mb-1 font-medium uppercase tracking-wider">Prompt IA</p>
            <p className="text-xs text-white/35 leading-relaxed">{track.prompt}</p>
          </div>
        )}
      </div>
      {/* Owner actions at bottom */}
      {isOwn && !isAi && (
        <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] flex gap-2">
          <button onClick={onEdit} className="flex-1 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-sm text-white/60 font-medium transition inline-flex items-center justify-center gap-1.5">
            <Edit size={13} /> Modifier
          </button>
          <button onClick={onDelete} className="py-2.5 px-4 rounded-full bg-white/[0.06] hover:bg-rose-500/20 text-sm text-rose-400/60 hover:text-rose-400 font-medium transition inline-flex items-center justify-center gap-1.5">
            <X size={13} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-[#1a1a22] border border-white/[0.06] p-5 sm:p-6 max-h-[90vh] overflow-y-auto shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>{children}</motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-xs text-white/30 mb-1.5">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3.5 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/20" /></div>;
}

function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="block text-xs text-white/30 mb-1.5">{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-3.5 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder:text-white/15 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none" /></div>;
}
