'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3, Camera, Check, Edit, Loader2, MapPin, Globe, Music2, MoreHorizontal, Pause, Play,
  Share2, Upload, UserPlus, Sparkles, Calendar, X, MessageCircle,
  Send, Search, Users, Disc3, ExternalLink, Crown,
  ArrowUpRight, Library, Mic2, Shield, ListPlus, ListEnd, Trash2,
  Settings,
} from "lucide-react";
import { FaInstagram, FaSoundcloud, FaSpotify, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { useBoosters } from '@/hooks/useBoosters';
import Avatar from '@/components/Avatar';
import LikeButton from '@/components/LikeButton';
import { notify } from '@/components/NotificationCenter';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { UModal, UModalBody, UModalTitle, UModalFooter, UDrawer, UButton, UInput, UTextarea } from '@/components/ui/UnifiedUI';
import CreatorFeed from '@/components/CreatorFeed';
import { SynauraAppShell, SynauraTopBar, SynauraInkPanel, SynauraPanel, SynauraRouteNav } from '@/components/synaura/SynauraShell';
import TrackCreateRemixActions from '@/components/TrackCreateRemixActions';
import SynauraPulseBar from '@/components/synaura/SynauraPulseBar';
import { getArtistLevel } from '@/lib/synauraCity';

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditTrackModal, setShowEditTrackModal] = useState(false);
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
        setProfile({ ...data, isFollowing }); setUserTracks(data.tracks || []);
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

  const topProfileTracks = useMemo(
    () => [...(userTracks || [])].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 3),
    [userTracks],
  );
  const latestPost = useMemo(() => (Array.isArray(profile?.posts) ? profile.posts[0] : null), [profile?.posts]);
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
  const handleImageUpload = async (type: 'avatar' | 'banner', file: File) => { setUploading(true); try { const ts = Math.round(Date.now() / 1000); const pid = `${usernameStr || 'u'}_${type}_${ts}`; if (!usernameStr) throw new Error(); const s = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/upload-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp: ts, publicId: pid, type }) }); if (!s.ok) throw new Error(); const { signature, apiKey, cloudName } = await s.json(); const fd = new FormData(); fd.append('file', file); fd.append('timestamp', String(ts)); fd.append('public_id', pid); fd.append('folder', `ximam/profiles/${username}`); fd.append('resource_type', 'image'); fd.append('api_key', apiKey); fd.append('signature', signature); const u = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd }); if (!u.ok) throw new Error(); const ud = await u.json(); const sv = await fetch(`/api/users/${encodeURIComponent(usernameStr)}/save-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: ud.secure_url, type, publicId: pid }) }); if (!sv.ok) throw new Error(); const sd = await sv.json(); setProfile((p: any) => ({ ...p, [type]: sd.imageUrl })); notify.success('OK', 'Image mise a jour'); } catch { notify.error('Erreur', 'Upload echoue'); } finally { setUploading(false); } };
  const handleEdit = () => router.push('/settings?tab=profil');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const handleEditTrack = (t: any) => { setEditingTrack(t); setTrackEditData({ title: t.title, description: t.description || '', genre: Array.isArray(t.genre) ? t.genre.join(', ') : (t.genre || ''), tags: t.tags?.join(', ') || '', isPublic: t.is_public !== false }); setCoverFile(null); setCoverPreview(t.cover_url || t.coverUrl || null); setShowEditTrackModal(true); closeCtx(); };
  const uploadCoverToCloudinary = async (file: File) => {
      const timestamp = Math.round(Date.now() / 1000);
    const publicId = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sigRes = await fetch('/api/upload/signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timestamp, publicId, resourceType: 'image' }) });
      if (!sigRes.ok) throw new Error('Erreur signature');
      const { signature, apiKey, cloudName } = await sigRes.json();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'ximam/images');
    fd.append('public_id', publicId);
    fd.append('resource_type', 'image');
    fd.append('timestamp', timestamp.toString());
    fd.append('api_key', apiKey);
    fd.append('signature', signature);
    fd.append('width', '800');
    fd.append('height', '800');
    fd.append('crop', 'fill');
    const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
    if (!upRes.ok) throw new Error('Erreur upload image');
    return upRes.json();
  };
  const handleSaveTrackEdit = async () => { if (!editingTrack) return; setUploading(true); try { const tid = editingTrack.id; let coverUrl: string | undefined; let coverPublicId: string | undefined; if (coverFile) { setCoverUploading(true); const result = await uploadCoverToCloudinary(coverFile); coverUrl = result.secure_url; coverPublicId = result.public_id; setCoverUploading(false); } const payload: any = { title: trackEditData.title, description: trackEditData.description, genre: trackEditData.genre.split(',').map((g: string) => g.trim()).filter(Boolean), tags: trackEditData.tags.split(',').map((t: string) => t.trim()).filter(Boolean), isPublic: trackEditData.isPublic }; if (coverUrl) { payload.coverUrl = coverUrl; payload.coverPublicId = coverPublicId; } const r = await fetch(`/api/tracks/${tid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error((await r.json()).error); const u = await r.json(); setUserTracks(p => p.map(t => t.id === tid ? { ...t, ...u, cover_url: coverUrl || t.cover_url } : t)); setProfile((p: any) => ({ ...p, tracks: (p.tracks || []).map((t: any) => t.id === tid ? { ...t, ...u, cover_url: coverUrl || t.cover_url } : t) })); setShowEditTrackModal(false); setCoverFile(null); notify.success('OK', 'Modifiee'); } catch (e: any) { notify.error('Erreur', e.message); setCoverUploading(false); } finally { setUploading(false); } };
  const getProfileUrl = useCallback(() => `${window.location.origin}/profile/${encodeURIComponent(usernameStr || '')}`, [usernameStr]);
  const copyProfileLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getProfileUrl());
      notify.success('OK', 'Lien du profil copie');
    } catch {
      notify.error('Erreur', 'Copie impossible');
    }
  }, [getProfileUrl]);
  const handleShareProfile = useCallback(async () => {
    const url = getProfileUrl();
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `${profile?.name || profile?.username || 'Profil'} sur Synaura`,
          text: `Regarde le profil de ${profile?.name || profile?.username || 'ce createur'} sur Synaura`,
          url,
        });
        if (profile?.id) {
          fetch('/api/recommendations/impressions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: 'post', contentId: profile.id, source: 'artist-profile', eventType: 'profile_share' }),
            keepalive: true,
          }).catch(() => {});
        }
        return;
      } catch {}
    }

    setShowShareModal(true);
  }, [getProfileUrl, profile?.name, profile?.username]);
  const memberSince = useMemo(() => { const raw = profile?.createdAt || profile?.created_at; if (!raw) return null; const d = new Date(raw); return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }, [profile]);
  const socialLinks = useMemo(() => {
    const links = profile?.preferences?.socialLinks || {};
    return [
      { key: 'instagram', label: 'Instagram', href: links.instagram, icon: FaInstagram },
      { key: 'tiktok', label: 'TikTok', href: links.tiktok, icon: FaTiktok },
      { key: 'youtube', label: 'YouTube', href: links.youtube, icon: FaYoutube },
      { key: 'spotify', label: 'Spotify', href: links.spotify, icon: FaSpotify },
      { key: 'soundcloud', label: 'SoundCloud', href: links.soundcloud, icon: FaSoundcloud },
      { key: 'x', label: 'X', href: links.x, icon: FaXTwitter },
    ].filter((item) => typeof item.href === 'string' && item.href.trim());
  }, [profile?.preferences?.socialLinks]);
  const selectedBadges = useMemo(
    () => (Array.isArray(profile?.preferences?.profileBadges) ? profile.preferences.profileBadges : []).slice(0, 6),
    [profile?.preferences?.profileBadges],
  );

  /* ═══════════ LOADING ═══════════ */
  if (loading) return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar
        searchLabel="Rechercher un profil, un son ou une playlist..."
        secondaryHref="/upload"
        secondaryLabel="Upload"
        primaryHref="/ai-generator"
        primaryLabel="Studio"
      />
      <div className="space-y-4 pb-32">
        <SynauraInkPanel className="overflow-hidden">
          <div className="h-[280px] animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
          <div className="px-5 pb-6 sm:px-7">
            <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="h-28 w-28 rounded-[2rem] border border-white/10 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.2)] animate-pulse sm:h-32 sm:w-32" />
              <div className="flex-1 space-y-3 pb-2">
                <div className="h-9 w-52 rounded-full bg-white/10 animate-pulse" />
                <div className="h-4 w-72 max-w-full rounded-full bg-white/10 animate-pulse" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-9 w-28 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-9 w-24 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-9 w-10 rounded-full bg-white/10 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </SynauraInkPanel>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_360px]">
          <SynauraPanel className="p-5 sm:p-6">
            <div className="space-y-3">
              <div className="h-6 w-40 rounded-full bg-black/[0.06] animate-pulse" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-[1.35rem] bg-black/[0.05] animate-pulse" />
              ))}
            </div>
          </SynauraPanel>
          <div className="space-y-4">
            <SynauraPanel className="p-5 sm:p-6">
              <div className="space-y-3">
                <div className="h-6 w-32 rounded-full bg-black/[0.06] animate-pulse" />
                <div className="h-20 rounded-[1.35rem] bg-black/[0.05] animate-pulse" />
                <div className="h-20 rounded-[1.35rem] bg-black/[0.05] animate-pulse" />
              </div>
            </SynauraPanel>
          </div>
        </div>
      </div>
    </SynauraAppShell>
  );

  if (error || !profile) return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar
        searchLabel="Rechercher un profil, un son ou une playlist..."
        secondaryHref="/upload"
        secondaryLabel="Upload"
        primaryHref="/ai-generator"
        primaryLabel="Studio"
      />
      <div className="py-16">
        <SynauraPanel className="mx-auto max-w-2xl p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[1.4rem] bg-black/[0.05] text-black/30">
            <Disc3 size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#171313]">Profil introuvable</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/55">{error || "Ce profil n'existe pas."}</p>
          <button
            onClick={() => router.push('/discover')}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#171313] px-6 text-sm font-black text-white transition hover:scale-[1.02]"
          >
            Découvrir
          </button>
        </SynauraPanel>
      </div>
    </SynauraAppShell>
  );

  const totalPlays = profile.totalPlays || 0;
  const followerCount = profile.followerCount || 0;
  const followingCount = profile.followingCount || 0;
  const artistProgress = getArtistLevel(
    userTracks.length * 90 +
    Number(totalPlays || 0) +
    Number(profile.totalLikes || 0) * 8 +
    Number(followerCount || 0) * 35,
  );
  const artistProgressPercent = Math.min(100, Math.round((artistProgress.xp / Math.max(1, artistProgress.nextLevelXp)) * 100));
  const isTrackPlaying = (tid: string) => audioState.currentTrackIndex !== -1 && audioState.tracks[audioState.currentTrackIndex]?._id === tid && audioState.isPlaying;

  /* ═══════════ RENDER ═══════════ */
  return (
    <SynauraAppShell contentClassName="max-w-[1180px]">
      <SynauraTopBar
        searchLabel="Rechercher un profil, un son ou une playlist..."
        secondaryHref="/upload"
        secondaryLabel="Upload"
        primaryHref="/ai-generator"
        primaryLabel="Studio"
      />
      <SynauraRouteNav />
      <div className="space-y-4 pb-32">
        <SynauraInkPanel className="overflow-hidden">
          <div className="relative">
            <div className="relative h-[260px] overflow-hidden sm:h-[320px] md:h-[360px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.banner || '/default-cover.svg'} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,19,19,0.08)_0%,rgba(23,19,19,0.18)_34%,rgba(23,19,19,0.76)_76%,#171313_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,111,97,0.24),transparent_32%),radial-gradient(circle_at_top_right,rgba(124,92,255,0.22),transparent_34%),radial-gradient(circle_at_bottom,rgba(0,194,203,0.16),transparent_42%)]" />
              {isOwnProfile && (
                <>
                  <button
                    className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/28 text-white/80 backdrop-blur-xl transition hover:bg-black/40 hover:text-white"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Camera size={16} />
                  </button>
                  <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload('banner', f); }} />
                </>
              )}
            </div>

            <div className="relative px-5 pb-6 sm:px-7 sm:pb-7">
              <div className="-mt-16 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="relative shrink-0 group">
                    <div className="h-28 w-28 overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:h-32 sm:w-32 md:h-36 md:w-36">
                      <Avatar src={profile.avatar} name={profile.name} username={profile.username} size="2xl" className="h-full w-full" />
                    </div>
                    {isOwnProfile && (
                      <>
                        <button
                          className="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/38 text-white/80 opacity-0 backdrop-blur-xl transition group-hover:opacity-100 hover:bg-black/52 hover:text-white"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera size={13} />
                        </button>
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload('avatar', f); }} />
                      </>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
                      Profil Synaura
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <h1 className="text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl md:text-5xl">{profile.name}</h1>
                      {profile.isVerified && (
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-[#4f7cff] text-white shadow-[0_10px_24px_rgba(79,124,255,0.35)]">
                          <Check size={14} />
                        </div>
                      )}
                      {profile.isArtist && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#7c5cff]/32 bg-[#7c5cff]/16 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#d1c4ff]">
                          <Crown size={11} /> Artiste
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.isVerified ? <ProfileBadge label="Artiste vérifié" /> : null}
                      {userTracks.some((t) => t?.is_ai || String(t?.id || '').startsWith('ai-')) ? <ProfileBadge label="Créateur IA" /> : null}
                      {totalPlays > 1000 ? <ProfileBadge label="Top tendance" /> : null}
                      {topProfileTracks.length ? <ProfileBadge label="Remix actif" /> : null}
                      {selectedBadges.map((badge: string) => <ProfileBadge key={badge} label={badge} />)}
                    </div>
                    {profile.artistName && <p className="mt-1 text-sm font-medium text-white/56">{profile.artistName}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatPill value={fmtK(totalPlays)} label="ecoutes" />
                      <StatPill value={fmtK(profile.totalLikes || 0)} label="likes" />
                      <StatPill value={fmtK(followerCount)} label="followers" />
                      <StatPill value={fmtK(followingCount)} label="abonnements" />
                      <StatPill value={String(userTracks.length)} label={`titre${userTracks.length !== 1 ? 's' : ''}`} />
                      {playlists.length > 0 && <StatPill value={String(playlists.length)} label={`playlist${playlists.length !== 1 ? 's' : ''}`} />}
                    </div>
                    {profile.bio?.trim() && (
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-white/66">{profile.bio}</p>
                    )}
                    {(profile.location?.trim() || profile.website?.trim() || memberSince) && (
                      <div className="mt-4 flex flex-wrap gap-2.5 text-xs text-white/50">
                        {profile.location?.trim() && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                            <MapPin size={12} /> {profile.location}
                          </span>
                        )}
                        {profile.website?.trim() && (
                          <a
                            href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 transition hover:bg-white/10 hover:text-white"
                          >
                            <ExternalLink size={12} /> {profile.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {memberSince && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1.5">
                            <Calendar size={12} /> {memberSince}
                          </span>
                        )}
                      </div>
                    )}
                    {socialLinks.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {socialLinks.map((item) => {
                          const Icon = item.icon;
                          return (
                            <a
                              key={item.key}
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              title={item.label}
                              aria-label={item.label}
                              className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/8 text-white/72 transition hover:-translate-y-0.5 hover:bg-white hover:text-[#171313]"
                            >
                              <Icon className="h-4 w-4" />
                            </a>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
                  {isOwnProfile ? (
                    <>
                      <HeroActionPrimary onClick={handleEdit}>
                        <Edit size={15} /> Modifier le profil
                      </HeroActionPrimary>
                      <HeroActionSecondary onClick={() => router.push('/stats')}>
                        <BarChart3 size={15} /> Statistiques
                      </HeroActionSecondary>
                      <HeroActionSecondary onClick={() => router.push('/settings')}>
                        <Settings size={15} /> Paramètres
                      </HeroActionSecondary>
                      <HeroActionSecondary onClick={handleShareProfile}>
                        <Share2 size={15} /> Partager le profil
                      </HeroActionSecondary>
                      <HeroActionBooster
                        onClick={() => setShowBoosterModal(true)}
                        disabled={!canOpen || boostersLoading}
                        label={canOpen ? 'Booster' : formatRemaining(remainingMs)}
                      />
                    </>
                  ) : (
                    <>
                      {profile.isFollowing ? (
                        <HeroActionSecondary onClick={handleFollow}>
                          <Check size={15} /> Abonne
                        </HeroActionSecondary>
                      ) : (
                        <HeroActionPrimary onClick={handleFollow}>
                          <UserPlus size={15} /> Suivre
                        </HeroActionPrimary>
                      )}
                      <MsgBtn status={messageRequestStatus} existingConvId={existingConvId} onMsg={() => setShowMessageModal(true)} onGo={() => router.push(existingConvId ? `/messages/${existingConvId}` : '/messages')} />
                      <HeroActionSecondary onClick={handleShareProfile}>
                        <Share2 size={15} /> Partager le profil
                      </HeroActionSecondary>
                      <HeroActionSecondary onClick={() => router.push('/community/forum?category=collab')}>
                        <Mic2 size={15} /> Demander un feat
                      </HeroActionSecondary>
                      {topProfileTracks[0] ? (
                        <HeroActionSecondary onClick={() => router.push(`/ai-generator?mode=style&sourceTrack=${encodeURIComponent(topProfileTracks[0].id)}&title=${encodeURIComponent(topProfileTracks[0].title || '')}`)}>
                          <Sparkles size={15} /> Inspiré par cet artiste
                        </HeroActionSecondary>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SynauraInkPanel>

        <SynauraPanel className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1rem] bg-[#171313] text-xl font-black text-white">{artistProgress.level}</div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7c5cff]">Progression artiste</p>
                <h2 className="mt-1 truncate text-xl font-black text-[#171313]">{artistProgress.levelName}</h2>
                <p className="mt-1 text-xs font-bold text-black/42">{userTracks.length} sons · {fmtK(totalPlays)} ecoutes · {fmtK(followerCount)} fans</p>
              </div>
            </div>
            <button onClick={() => router.push('/city')} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-black/[0.055] px-4 text-xs font-black text-black/58 transition hover:bg-[#171313] hover:text-white">
              <Sparkles size={14} /> Voir les Events
            </button>
          </div>
          <SynauraPulseBar value={artistProgressPercent} className="mt-4" />
          <p className="mt-2 text-[10px] font-black text-black/35">{Math.max(0, artistProgress.nextLevelXp - artistProgress.xp)} XP avant le prochain niveau</p>
        </SynauraPanel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_360px]">
          <div className="min-w-0 space-y-4">
            {(topProfileTracks.length > 0 || latestPost) && (
              <SynauraPanel className="p-4 sm:p-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">À partager</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Signature musicale</h2>
                  </div>
                  {topProfileTracks[0] ? (
                    <button onClick={() => handlePlayTrack(topProfileTracks[0])} className="rounded-full bg-[#171313] px-4 py-2 text-xs font-black text-white">
                      Jouer le top 1
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {topProfileTracks.map((track, index) => (
                    <div key={track.id} className="rounded-[1.35rem] border border-black/[0.07] bg-black/[0.025] p-3">
                      <div className="mb-3 flex items-center gap-3">
                        <img src={track.cover_url || track.coverUrl || '/default-cover.svg'} alt="" className="h-12 w-12 rounded-[1rem] object-cover" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/35">Top {index + 1}</p>
                          <p className="truncate text-sm font-black text-[#171313]">{track.title}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <TrackCreateRemixActions track={{ ...track, _id: track.id, audioUrl: track.audioUrl || track.audio_url, coverUrl: track.coverUrl || track.cover_url }} compact />
                        <button
                          type="button"
                          onClick={() => {
                            addToUpNext({ _id: track.id, title: track.title, artist: track.artist || track.artist_name || profile.artistName || profile.name, audioUrl: track.audioUrl || track.audio_url, coverUrl: track.coverUrl || track.cover_url, duration: track.duration, album: track.album || null, likes: track.likes || 0, comments: [], plays: track.plays || 0, genre: track.genre || [], isLiked: track.isLiked || false } as any, 'next');
                            notify.success('File', `${track.title} sera lu ensuite.`);
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.045] px-2.5 text-[10px] font-black text-[#171313]/68 transition hover:bg-[#171313] hover:text-white"
                        >
                          <ListPlus size={12} />
                          Ensuite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {latestPost ? (
                  <div className="mt-4 rounded-[1.25rem] bg-black/[0.035] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-black/35">Dernier post</p>
                    <p className="mt-1 line-clamp-2 text-sm text-black/58">{latestPost.content || latestPost.text || latestPost.title || 'Nouvelle activité musicale'}</p>
                  </div>
                ) : null}
              </SynauraPanel>
            )}

            {isOwnProfile && (
              <SynauraPanel className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Raccourcis</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Piloter ton espace</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <button onClick={() => router.push('/upload')} className="inline-flex items-center justify-center gap-2 rounded-full bg-black/[0.055] px-4 py-2.5 text-xs font-black text-black/62 transition hover:bg-black hover:text-white sm:text-sm">
                      <Upload size={15} /> <span className="hidden sm:inline">Uploader</span>
                    </button>
                    <button onClick={() => router.push('/ai-generator')} className="inline-flex items-center justify-center gap-2 rounded-full bg-black/[0.055] px-4 py-2.5 text-xs font-black text-black/62 transition hover:bg-black hover:text-white sm:text-sm">
                      <Sparkles size={15} /> <span className="hidden sm:inline">Studio</span>
                    </button>
                    <button onClick={() => router.push('/library')} className="inline-flex items-center justify-center gap-2 rounded-full bg-black/[0.055] px-4 py-2.5 text-xs font-black text-black/62 transition hover:bg-black hover:text-white sm:text-sm">
                      <Library size={15} /> <span className="hidden sm:inline">Bibliothèque</span>
                    </button>
                  </div>
                </div>
              </SynauraPanel>
            )}

            <SynauraPanel className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 border-b border-black/[0.08] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Musique</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Titres populaires</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full bg-black/[0.05] p-1">
                    {([['plays', 'Top'], ['recent', 'Recent'], ['likes', 'Likes']] as const).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSortBy(key)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-black transition sm:text-xs ${
                          sortBy === key ? 'bg-[#171313] text-white' : 'text-black/45 hover:text-[#171313]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="relative min-w-[180px] flex-1 sm:flex-none">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher un titre"
                      className="h-10 w-full rounded-full border border-black/[0.08] bg-black/[0.035] pl-9 pr-4 text-sm text-[#171313] placeholder:text-black/28 outline-none transition focus:border-black/18 focus:bg-black/[0.045] sm:w-[220px]"
                    />
                  </div>
                  {query && (
                    <button onClick={() => setQuery('')} className="text-xs font-black text-black/40 transition hover:text-[#171313]">
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              {sortedTracks.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[1.35rem] bg-black/[0.05] text-black/22">
                    <Music2 size={28} />
                  </div>
                  <p className="text-sm text-black/48">{query.trim() ? 'Aucun résultat' : isOwnProfile ? 'Pas encore de titres publiés' : 'Aucun titre'}</p>
                  {isOwnProfile && !query.trim() && (
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button onClick={() => router.push('/upload')} className="inline-flex h-10 items-center gap-2 rounded-full bg-black/[0.06] px-4 text-sm font-black text-black/68 transition hover:bg-black hover:text-white"><Upload size={14} /> Uploader</button>
                      <button onClick={() => router.push('/ai-generator')} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-white transition hover:scale-[1.02]"><Sparkles size={14} /> Studio</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {displayTracks.map((track, idx) => {
                    const isAi = Boolean(track?.is_ai || String(track?.id || '').startsWith('ai-'));
                    const playing = isTrackPlaying(track.id);
                    return (
                      <div
                        key={track.id}
                        className="group relative flex cursor-pointer items-center gap-3 rounded-[1.35rem] border border-black/[0.06] bg-black/[0.025] px-3 py-3 transition hover:border-black/[0.10] hover:bg-black/[0.045]"
                        onClick={() => setDrawerId(track.id)}
                      >
                        <div className="grid w-8 shrink-0 place-items-center">
                          <span className="text-sm font-semibold text-black/38 group-hover:hidden">{playing ? <Volume2Icon warm /> : idx + 1}</span>
                          <button onClick={(e) => { e.stopPropagation(); handlePlayTrack(track); }} className="hidden rounded-full bg-[#171313] p-2 text-white group-hover:inline-flex">
                            {playing ? <Pause size={13} /> : <Play size={13} fill="white" />}
                          </button>
                        </div>
                        <div className="h-12 w-12 overflow-hidden rounded-[1rem] bg-black/[0.06] shadow-[0_10px_24px_rgba(20,15,10,0.08)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={track.cover_url || track.coverUrl || '/default-cover.svg'} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.svg'; }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`truncate text-sm font-black ${playing ? 'text-[#7c5cff]' : 'text-[#171313]'}`}>{track.title}</p>
                            {isAi && (
                              <span className="inline-flex shrink-0 rounded-full bg-[#7c5cff]/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#7c5cff]">
                                IA
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-black/42">
                            <span>{profile.artistName || profile.name}</span>
                            <span>{fmtN.format(track.plays || 0)} ecoutes</span>
                            <span>{mmss(track.duration || 0)}</span>
                          </div>
                        </div>
                        {!isAi && (
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <LikeButton trackId={track.id} initialIsLiked={track.isLiked || false} initialLikesCount={track.likes || 0} onUpdate={(s) => handleLikeUpdate(track.id, s.isLiked, s.likesCount)} showCount={false} size="sm" />
                          </div>
                        )}
                        <div className="hidden shrink-0 lg:block" onClick={(e) => e.stopPropagation()}>
                          <TrackCreateRemixActions track={{ ...track, _id: track.id, audioUrl: track.audioUrl || track.audio_url }} compact />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToUpNext({ _id: track.id, title: track.title, artist: track.artist || track.artist_name || profile.artistName || profile.name, audioUrl: track.audioUrl || track.audio_url, coverUrl: track.coverUrl || track.cover_url, duration: track.duration, album: track.album || null, likes: track.likes || 0, comments: [], plays: track.plays || 0, genre: track.genre || [], isLiked: track.isLiked || false } as any, 'next');
                            notify.success('File', `${track.title} sera lu ensuite.`);
                          }}
                          className="hidden shrink-0 rounded-full bg-black/[0.055] px-3 py-2 text-[11px] font-black text-black/52 transition hover:bg-black hover:text-white lg:inline-flex"
                        >
                          Lire ensuite
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCtxTrack(ctxTrack?.track?.id === track.id ? null : { track, anchorEl: e.currentTarget as HTMLButtonElement }); }}
                          className="shrink-0 rounded-full p-2 text-black/36 transition hover:bg-black/[0.06] hover:text-[#171313] sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    );
                  })}

                  {sortedTracks.length > 5 && (
                    <button onClick={() => setShowAllTracks(!showAllTracks)} className="pt-2 text-sm font-black text-black/46 transition hover:text-[#171313]">
                      {showAllTracks ? 'Voir moins' : `Voir tout (${sortedTracks.length})`}
                    </button>
                  )}
                </div>
              )}
            </SynauraPanel>

            {playlists.length > 0 && (
              <SynauraPanel className="p-4 sm:p-5">
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Collections</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Playlists</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {playlists.filter((p: any) => p?.id || p?._id).map((p: any) => {
                    const pid = String(p.id || p._id);
                    const cover = p.cover_url || p.coverUrl || '/default-cover.svg';
                    const count = Array.isArray(p.tracks) ? p.tracks.length : Number(p.tracks_count || 0);
                    return (
                      <button
                        key={pid}
                        onClick={() => router.push(`/playlists/${encodeURIComponent(pid)}`)}
                        className="group overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-black/[0.025] text-left transition hover:-translate-y-0.5 hover:border-black/[0.1] hover:bg-black/[0.04]"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cover} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" loading="lazy" />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(23,19,19,0.68)_100%)]" />
                          <div className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-[#fffaf2] text-[#171313] opacity-0 shadow-[0_14px_30px_rgba(20,15,10,0.18)] transition group-hover:opacity-100">
                            <Play size={16} fill="currentColor" />
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="truncate text-sm font-black text-[#171313]">{p.name || 'Playlist'}</p>
                          <p className="mt-1 text-xs text-black/45">{count} titre{count !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SynauraPanel>
            )}

            <SynauraPanel className="overflow-hidden p-0">
              <div className="border-b border-black/[0.08] bg-[linear-gradient(135deg,#fffaf2_0%,#f4ecff_52%,#ebfbff_100%)] px-4 py-5 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Communauté</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Posts</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex">
                    <div className="rounded-full bg-black/[0.05] px-4 py-2 text-center">
                      <div className="text-sm font-black text-[#171313]">{fmtN.format(profile.postsCount || 0)}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/34">posts</div>
                    </div>
                    <div className="rounded-full bg-black/[0.05] px-4 py-2 text-center">
                      <div className="text-sm font-black text-[#171313]">{fmtN.format(profile.totalLikes || 0)}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/34">likes</div>
                    </div>
                    <div className="rounded-full bg-black/[0.05] px-4 py-2 text-center">
                      <div className="text-sm font-black text-[#171313]">{fmtN.format(userTracks.length)}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/34">sons</div>
                    </div>
                  </div>
                </div>
              </div>
              <CreatorFeed
                creatorId={profile.id}
                showComposer={isOwnProfile}
              />
            </SynauraPanel>

            {!session && (
              <SynauraPanel className="border-[#ff6f61]/18 bg-[#fff7ec] p-6 text-center shadow-[0_22px_70px_rgba(44,33,19,0.12)] sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff6f61]">Profil public</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#171313]">Suis {profile.name} sur Synaura</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-black/58">
                  Crée ton compte pour t'abonner, envoyer un message, commenter les posts et publier tes propres créations.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button onClick={() => router.push(`/auth/signup?callbackUrl=/profile/${encodeURIComponent(usernameStr || '')}`)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"><UserPlus size={14} /> S&apos;inscrire</button>
                  <button onClick={() => router.push(`/auth/signin?callbackUrl=/profile/${encodeURIComponent(usernameStr || '')}`)} className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black/66 transition hover:bg-black hover:text-white">Connexion</button>
                </div>
              </SynauraPanel>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            <SynauraPanel className="p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Vue d&apos;ensemble</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">À propos</h2>
              </div>

              {profile.bio && (
                <div className="mt-4 rounded-[1.35rem] border border-black/[0.06] bg-black/[0.025] p-4">
                  <p className="text-sm leading-6 text-black/62 whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {profile.genre?.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-black/38">
                    <Mic2 size={13} /> Genres
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(profile.genre) ? profile.genre : [profile.genre]).map((g: string, i: number) => (
                      <span key={i} className="inline-flex rounded-full border border-[#7c5cff]/18 bg-[#7c5cff]/8 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-[#7c5cff]">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3">
                {profile.location && (
                  <InfoTile icon={MapPin} label="Localisation" value={profile.location} />
                )}
                {profile.website && (
                  <InfoTile
                    icon={Globe}
                    label="Site web"
                    value={profile.website.replace(/^https?:\/\//, '')}
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  />
                )}
                {memberSince && (
                  <InfoTile icon={Calendar} label="Membre depuis" value={memberSince} />
                )}
                {profile.role && profile.role !== 'user' && (
                  <InfoTile icon={Shield} label="Role" value={profile.role} />
                )}
              </div>

              {(profile.isVerified || profile.isArtist) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.isVerified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00c2cb]/20 bg-[#00c2cb]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#007f87]">
                      <Check size={11} /> Verifie
                    </span>
                  )}
                  {profile.isArtist && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7c5cff]/20 bg-[#7c5cff]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-[#7c5cff]">
                      <Crown size={11} /> Artiste
                    </span>
                  )}
                </div>
              )}
            </SynauraPanel>

            <SynauraPanel className="p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Audience</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Chiffres clés</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <MetricCard label="Followers" value={fmtN.format(followerCount)} accent="violet" />
                <MetricCard label="Abonnements" value={fmtN.format(followingCount)} accent="cyan" />
                <MetricCard label="Écoutes totales" value={fmtN.format(totalPlays)} accent="coral" />
                <MetricCard label="Likes totaux" value={fmtN.format(profile.totalLikes || 0)} accent="ink" />
              </div>
            </SynauraPanel>

            {isOwnProfile && (
              <SynauraPanel className="p-5 sm:p-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Création</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-[#171313]">Espace artiste</h2>
                </div>
                <div className="mt-4 space-y-3">
                  <button onClick={() => router.push('/upload')} className="flex w-full items-center justify-between rounded-[1.35rem] border border-black/[0.06] bg-black/[0.025] px-4 py-3 text-left transition hover:border-black/[0.1] hover:bg-black/[0.045]">
                    <span className="flex items-center gap-3 text-sm font-black text-[#171313]"><Upload size={16} /> Publier un titre</span>
                    <ArrowUpRight size={15} className="text-black/40" />
                  </button>
                  <button onClick={() => router.push('/ai-generator')} className="flex w-full items-center justify-between rounded-[1.35rem] border border-black/[0.06] bg-black/[0.025] px-4 py-3 text-left transition hover:border-black/[0.1] hover:bg-black/[0.045]">
                    <span className="flex items-center gap-3 text-sm font-black text-[#171313]"><Sparkles size={16} /> Ouvrir le studio IA</span>
                    <ArrowUpRight size={15} className="text-black/40" />
                  </button>
                  <button onClick={() => router.push('/stats')} className="flex w-full items-center justify-between rounded-[1.35rem] border border-black/[0.06] bg-black/[0.025] px-4 py-3 text-left transition hover:border-black/[0.1] hover:bg-black/[0.045]">
                    <span className="flex items-center gap-3 text-sm font-black text-[#171313]"><BarChart3 size={16} /> Voir les statistiques</span>
                    <ArrowUpRight size={15} className="text-black/40" />
                  </button>
                </div>
                <div className="mt-4 rounded-[1.35rem] bg-[linear-gradient(135deg,#171313_0%,#2a2422_100%)] p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Booster</p>
                      <p className="mt-1 text-sm font-black">{canOpen ? 'Ton booster du jour est pret' : `Prochain dans ${formatRemaining(remainingMs)}`}</p>
                    </div>
                    <button
                      onClick={() => setShowBoosterModal(true)}
                      disabled={!canOpen || boostersLoading}
                      className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-black transition ${
                        canOpen ? 'bg-[#fffaf2] text-[#171313] hover:scale-[1.02]' : 'bg-white/8 text-white/34'
                      }`}
                    >
                      <Sparkles size={15} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/52">
                    {inventory?.length ? `${inventory.length} objet${inventory.length > 1 ? 's' : ''} en inventaire.` : 'Ouvre tes boosters pour accelerer ta visibilite.'}
                  </p>
                </div>
              </SynauraPanel>
            )}
          </div>
        </div>
      </div>

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
      <UDrawer open={!!drawerId} onClose={() => setDrawerId(null)}>
        {selected && <DrawerContent track={selected} playing={isTrackPlaying(selected.id)} onPlay={() => handlePlayTrack(selected)} onEdit={() => handleEditTrack(selected)} onDelete={() => handleDeleteTrack(selected.id)} isOwn={isOwnProfile} onLike={handleLikeUpdate} onClose={() => setDrawerId(null)} artistName={profile.artistName || profile.name} />}
      </UDrawer>

      {/* ═══════ MODALS ═══════ */}
      <AnimatePresence>{showBoosterModal && <BoosterOpenModal isOpen onClose={() => setShowBoosterModal(false)} onOpenBooster={openDaily} isOpening={boostersLoading} openedBooster={lastOpened ? { id: lastOpened.inventoryId, status: 'owned', obtained_at: new Date().toISOString(), booster: lastOpened.booster } : null} item={lastOpened || null} />}</AnimatePresence>

      <UModal open={showMessageModal} onClose={() => setShowMessageModal(false)}>
        <UModalBody>
          <div className="flex items-center gap-3 mb-4"><Avatar src={profile?.avatar} name={profile?.name} username={usernameStr || ''} size="md" /><div><h2 className="text-base font-bold text-white">Message a {profile?.name}</h2><p className="text-xs text-white/55">Demande en attente de validation</p></div></div>
          <UTextarea value={messageText} onChange={(v) => setMessageText(v)} placeholder="Message (optionnel)..." rows={3} />
          <UModalFooter>
            <UButton variant="secondary" fullWidth onClick={() => { setShowMessageModal(false); setMessageText(''); }}>Annuler</UButton>
            <UButton variant="primary" fullWidth onClick={handleSendMessageRequest} disabled={sendingRequest} loading={sendingRequest}><Send size={13} /> Envoyer</UButton>
          </UModalFooter>
        </UModalBody>
      </UModal>

      <UModal open={showShareModal} onClose={() => setShowShareModal(false)}>
        <UModalBody>
          <div className="mb-4 flex items-center gap-3">
            <Avatar src={profile?.avatar} name={profile?.name} username={usernameStr || ''} size="md" />
            <div>
              <h2 className="text-base font-bold text-white">Partager le profil</h2>
              <p className="text-xs text-white/55">Fais circuler le profil de {profile?.name || profile?.username} proprement.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/42">Lien du profil</div>
            <div className="mt-2 break-all text-sm font-semibold text-white/82">{typeof window !== 'undefined' ? getProfileUrl() : ''}</div>
          </div>
          <UModalFooter>
            <UButton variant="secondary" fullWidth onClick={() => { void copyProfileLink(); }}>
              <Globe size={13} /> Copier le lien
            </UButton>
            <UButton
              variant="primary"
              fullWidth
              onClick={async () => {
                const url = getProfileUrl();
                try {
                  if (typeof navigator !== 'undefined' && (navigator as any).share) {
                    await (navigator as any).share({
                      title: `${profile?.name || profile?.username || 'Profil'} sur Synaura`,
                      text: `Regarde le profil de ${profile?.name || profile?.username || 'ce createur'} sur Synaura`,
                      url,
                    });
                    setShowShareModal(false);
                    return;
                  }
                } catch {}

                await copyProfileLink();
                setShowShareModal(false);
              }}
            >
              <Share2 size={13} /> Partager
            </UButton>
          </UModalFooter>
        </UModalBody>
      </UModal>

      <UModal open={showEditTrackModal} onClose={() => setShowEditTrackModal(false)}>
        <UModalBody>
          <UModalTitle>Modifier la piste</UModalTitle>
          <div className="space-y-4">
            {/* Cover */}
                <div>
              <div className="text-sm font-semibold text-white/82 mb-2">Pochette</div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04] flex-shrink-0">
                  {(coverFile ? URL.createObjectURL(coverFile) : coverPreview) ? (
                    <img src={coverFile ? URL.createObjectURL(coverFile) : (coverPreview || '')} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music2 className="w-6 h-6 text-white/20" /></div>
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/82 hover:bg-white/[0.08] cursor-pointer transition">
                    <Camera className="h-4 w-4" />
                    {coverFile ? 'Changer' : (coverPreview ? 'Remplacer' : 'Ajouter une pochette')}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); } e.target.value = ''; }} />
                  </label>
                  {coverFile && <div className="text-[11px] text-emerald-300 mt-1.5">{coverFile.name}</div>}
                  {!coverPreview && !coverFile && <div className="text-[11px] text-amber-300 mt-1.5">Pochette manquante</div>}
                </div>
              </div>
            </div>
            <UInput label="Titre" value={trackEditData.title || ''} onChange={(v) => setTrackEditData({ ...trackEditData, title: v })} />
            <UTextarea label="Description" value={trackEditData.description || ''} onChange={(v) => setTrackEditData({ ...trackEditData, description: v })} />
            <UInput label="Genres" value={trackEditData.genre || ''} onChange={(v) => setTrackEditData({ ...trackEditData, genre: v })} />
            <UInput label="Tags" value={trackEditData.tags || ''} onChange={(v) => setTrackEditData({ ...trackEditData, tags: v })} />
            <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={trackEditData.isPublic} onChange={(e) => setTrackEditData({ ...trackEditData, isPublic: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-white/78">Publique</span></label>
          </div>
          <UModalFooter>
            <UButton variant="secondary" fullWidth onClick={() => { setShowEditTrackModal(false); setCoverFile(null); }}>Annuler</UButton>
            <UButton variant="primary" fullWidth onClick={handleSaveTrackEdit} disabled={uploading || coverUploading || !trackEditData.title?.trim()} loading={uploading || coverUploading}>{coverUploading ? 'Upload image...' : 'Sauvegarder'}</UButton>
          </UModalFooter>
        </UModalBody>
      </UModal>

      {/* Mobile FABs */}
      {isOwnProfile ? (
        <div className="md:hidden fixed bottom-24 right-4 flex flex-col gap-2 z-[100]">
          <button onClick={() => setShowBoosterModal(true)} disabled={!canOpen} className={`flex h-12 w-12 items-center justify-center rounded-full shadow-[0_20px_45px_rgba(30,25,20,0.20)] ${canOpen ? 'bg-[linear-gradient(135deg,#ff6f61_0%,#7c5cff_55%,#00c2cb_100%)] text-white' : 'bg-black/[0.08] text-black/25'}`}><Sparkles size={16} /></button>
          <button onClick={handleShareProfile} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#171313] shadow-[0_20px_45px_rgba(30,25,20,0.20)]"><Share2 size={15} /></button>
          <button onClick={handleEdit} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171313] text-white shadow-[0_20px_45px_rgba(30,25,20,0.20)]"><Edit size={15} /></button>
              </div>
      ) : (
        <div className="md:hidden fixed bottom-24 right-4 flex flex-col gap-2 z-[100]">
          <button onClick={handleShareProfile} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#171313] shadow-[0_20px_45px_rgba(30,25,20,0.20)]">
            <Share2 size={15} />
          </button>
          <button onClick={handleFollow} className={`flex h-12 w-12 items-center justify-center rounded-full shadow-[0_20px_45px_rgba(30,25,20,0.20)] ${profile.isFollowing ? 'bg-black/[0.08] text-black/55' : 'bg-[#171313] text-white'}`}>
            {profile.isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
          </button>
        </div>
      )}
    </SynauraAppShell>
  );
}

/* ═══════════ Small components ═══════════ */

function Volume2Icon({ warm = false }: { warm?: boolean }) {
  const bar = warm ? 'bg-[#7c5cff]' : 'bg-[#00d3a7]';
  return <div className="flex items-center justify-center gap-[2px] h-[14px]"><div className={`w-[2px] h-2 ${bar} rounded-full animate-pulse`} /><div className={`w-[2px] h-3 ${bar} rounded-full animate-pulse`} style={{ animationDelay: '150ms' }} /><div className={`w-[2px] h-1.5 ${bar} rounded-full animate-pulse`} style={{ animationDelay: '300ms' }} /></div>;
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-white">
      <div className="text-sm font-black leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{label}</div>
    </div>
  );
}

function ProfileBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/62">
      {label}
    </span>
  );
}

function InfoTile({ icon: Icon, label, value, href }: { icon: any; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-3 rounded-[1.2rem] border border-black/[0.06] bg-black/[0.025] p-3.5 transition hover:border-black/[0.1] hover:bg-black/[0.04]">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem] bg-black/[0.06] text-black/46">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-black/35">{label}</div>
        <div className="mt-1 text-sm font-semibold text-[#171313] break-words">{value}</div>
      </div>
      {href ? <ArrowUpRight size={14} className="ml-auto mt-1 shrink-0 text-black/30" /> : null}
    </div>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noreferrer" className="block">{content}</a>;
  }

  return content;
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: 'violet' | 'cyan' | 'coral' | 'ink' }) {
  const toneMap = {
    violet: 'from-[#efe7ff] to-[#fbf8ff] text-[#7c5cff]',
    cyan: 'from-[#e3fbfc] to-[#fbfefe] text-[#0096a0]',
    coral: 'from-[#ffe7df] to-[#fff9f5] text-[#ff6f61]',
    ink: 'from-[#ede6dc] to-[#fffaf2] text-[#171313]',
  } as const;

  return (
    <div className={`rounded-[1.4rem] border border-black/[0.06] bg-gradient-to-br ${toneMap[accent]} p-4`}>
      <div className="text-[11px] font-black uppercase tracking-[0.14em] text-black/36">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-[#171313]">{value}</div>
    </div>
  );
}

function MsgBtn({ status, existingConvId, onMsg, onGo }: { status: string; existingConvId: string | null; onMsg: () => void; onGo: () => void }) {
  if (status === 'accepted' || existingConvId) {
    return <HeroActionSecondary onClick={onGo}><MessageCircle size={14} /> Message</HeroActionSecondary>;
  }
  if (status === 'pending') {
    return <button disabled className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-sm font-black text-white/32 cursor-not-allowed"><Send size={14} /> En attente</button>;
  }
  return <HeroActionSecondary onClick={onMsg}><MessageCircle size={14} /> Message</HeroActionSecondary>;
}

function HeroActionPrimary({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]"
    >
      {children}
    </button>
  );
}

function HeroActionSecondary({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-sm font-black text-white/78 transition hover:bg-white/12 hover:text-white"
    >
      {children}
    </button>
  );
}

function HeroActionBooster({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition ${
        disabled
          ? 'cursor-not-allowed border border-white/10 bg-white/6 text-white/28'
          : 'bg-[linear-gradient(135deg,#ff6f61_0%,#7c5cff_55%,#00c2cb_100%)] text-white shadow-[0_16px_36px_rgba(124,92,255,0.32)] hover:scale-[1.02]'
      }`}
    >
      <Sparkles size={15} />
      <span>{label}</span>
    </button>
  );
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
    <div className="fixed z-[9999] w-[228px] rounded-[1.4rem] border border-black/[0.08] bg-[#fffaf2]/95 py-2 shadow-[0_22px_60px_rgba(30,25,20,0.18)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-100" style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
      <CtxItem icon={Play} label="Écouter" onClick={onPlay} />
      <CtxItem icon={ListPlus} label="Lire ensuite" onClick={handlePlayNext} />
      <CtxItem icon={ListEnd} label="Ajouter à la file" onClick={handleQueue} />
      <div className="my-1 border-t border-black/[0.06]" />
      <CtxItem icon={copied ? Check : Share2} label={copied ? 'Lien copié !' : 'Partager'} onClick={handleShare} />
      {isOwn && !isAi && (
        <>
          <div className="my-1 border-t border-black/[0.06]" />
          <CtxItem icon={Edit} label="Modifier" onClick={onEdit} />
          <CtxItem icon={BarChart3} label="Statistiques" onClick={onStats} />
          <div className="my-1 border-t border-black/[0.06]" />
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
      className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold transition ${subtle ? 'text-[#b84b44] hover:bg-[#ff6f61]/10 hover:text-[#9f3f39]' : 'text-black/68 hover:bg-black/[0.05] hover:text-[#171313]'}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
                </button>
  );
}

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition ${open ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-[#0c0c14] sm:border-l border-white/[0.06] shadow-2xl transform transition ${open ? 'translate-x-0' : 'translate-x-full'}`}>{children}</div>
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
    <div className="flex h-full flex-col bg-[#fffaf2] text-[#171313]">
      {/* Header with big cover */}
      <div className="relative">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/30 text-white/80 backdrop-blur-xl transition hover:bg-black/44 hover:text-white"><X size={16} /></button>
        <div className="aspect-square max-h-[320px] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={track.cover_url || track.coverUrl || '/default-cover.svg'} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.svg'; }} />
          </div>
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top, rgba(23,19,19,0.9) 0%, transparent 100%)' }}>
          <p className="text-lg font-black text-white">{track.title}</p>
          <div className="flex items-center gap-2 text-sm text-white/56">
            <span>{artistName}</span>
            {isAi && <span className="rounded-full bg-[#7c5cff]/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#d1c4ff]">IA</span>}
              </div>
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-4">
        <button onClick={onPlay} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#171313] py-3 text-sm font-black text-white transition hover:scale-[1.01]">
          {playing ? <Pause size={15} /> : <Play size={15} fill="white" />} {playing ? 'Pause' : 'Écouter'}
                </button>
        {!isAi && <div onClick={(e) => e.stopPropagation()}><LikeButton trackId={track.id} initialIsLiked={track.isLiked || false} initialLikesCount={track.likes || 0} onUpdate={(s) => onLike(track.id, s.isLiked, s.likesCount)} showCount={false} size="md" /></div>}
              </div>
      {/* Stats */}
      <div className="px-4 pb-3">
        <div className="flex gap-3 rounded-[1.25rem] border border-black/[0.06] bg-black/[0.03] p-3 text-center">
          <div className="flex-1"><div className="text-sm font-black text-[#171313]">{fmtN.format(track.plays || 0)}</div><div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/28">ecoutes</div></div>
          <div className="flex-1"><div className="text-sm font-black text-[#171313]">{fmtN.format(track.likes || 0)}</div><div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/28">likes</div></div>
          <div className="flex-1"><div className="text-sm font-black text-[#171313]">{mmss(track.duration || 0)}</div><div className="text-[10px] font-black uppercase tracking-[0.12em] text-black/28">duree</div></div>
      </div>
          </div>
      {/* Info */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {track.description && <p className="text-sm leading-6 text-black/58">{track.description}</p>}
        {track.genre?.length > 0 && <div className="flex flex-wrap gap-1.5">{(Array.isArray(track.genre) ? track.genre : [track.genre]).map((g: string, i: number) => <span key={i} className="rounded-full border border-[#7c5cff]/18 bg-[#7c5cff]/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#7c5cff]">{g}</span>)}</div>}
        {track.tags?.length > 0 && <div className="flex flex-wrap gap-1.5">{track.tags.map((t: string, i: number) => <span key={i} className="rounded-full border border-black/[0.06] bg-black/[0.03] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-black/38">#{t}</span>)}</div>}
        {createdDate && (
          <div className="flex items-center gap-2 text-xs text-black/34">
            <Calendar size={12} />
            <span>Publie le {createdDate}</span>
        </div>
        )}
        {isAi && track.prompt && (
          <div className="mt-2 rounded-[1.25rem] border border-black/[0.06] bg-black/[0.03] p-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/32">Prompt IA</p>
            <p className="text-xs leading-relaxed text-black/52">{track.prompt}</p>
          </div>
        )}
            </div>
      {/* Owner actions at bottom */}
      {isOwn && !isAi && (
        <div className="flex gap-2 border-t border-black/[0.06] px-4 pb-4 pt-3">
          <button onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-black/[0.06] py-2.5 text-sm font-black text-black/64 transition hover:bg-black hover:text-white">
            <Edit size={13} /> Modifier
          </button>
          <button onClick={onDelete} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#ff6f61]/10 px-4 py-2.5 text-sm font-black text-[#b84b44] transition hover:bg-[#ff6f61]/18">
            <X size={13} /> Supprimer
          </button>
          </div>
        )}
    </div>
  );
} 
