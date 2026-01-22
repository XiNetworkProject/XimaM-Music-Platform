'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock3,
  ChevronDown,
  FolderPlus,
  Globe,
  Grid,
  Heart,
  List,
  Lock,
  MoreVertical,
  Music,
  Pause,
  Play,
  Search,
  ArrowUp,
  ArrowDown,
  FolderPlus as AddToFolderIcon,
  Plus,
  ListPlus,
  Share2,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import { LibraryPageSkeleton } from '@/components/Skeletons';
import { applyCdnToTracks } from '@/lib/cdnHelpers';
import { useBatchLikeSystem } from '@/hooks/useLikeSystem';
import { useBatchPlaysSystem } from '@/hooks/usePlaysSystem';

type TabKey = 'playlists' | 'favorites' | 'recent' | 'downloads';
type ViewMode = 'grid' | 'list';

type Track = {
  _id: string;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  genre: string[];
  likes: string[];
  plays: number;
  isLiked?: boolean;
  createdAt: string;
};

type Playlist = {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackCount: number;
  duration: number;
  isPublic: boolean;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatCompact(n: number) {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

async function safeJson(res: Response) {
  return await res.json().catch(() => ({}));
}

function isDisabledTrackId(trackId: string) {
  return trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-');
}

function trackIsLiked(t: Track, userId: string | undefined) {
  if (typeof t.isLiked === 'boolean') return t.isLiked;
  if (!userId) return false;
  return Array.isArray(t.likes) ? t.likes.includes(userId) : false;
}

function normalizeGenre(g: any) {
  return String(g || '').trim();
}

function sortTracks(list: Track[], sort: 'recent' | 'title' | 'plays' | 'duration') {
  const arr = [...(list || [])];
  arr.sort((a, b) => {
    if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
    if (sort === 'duration') return (b.duration || 0) - (a.duration || 0);
    if (sort === 'plays') return (b.plays || 0) - (a.plays || 0);
    // recent
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  return arr;
}

export default function LibraryClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { audioState, setQueueAndPlay, setQueueOnly, playTrack } = useAudioPlayer();
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch } = useBatchPlaysSystem();

  const [tab, setTab] = useState<TabKey | 'queue'>('playlists');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');

  const [trackSort, setTrackSort] = useState<'recent' | 'title' | 'plays' | 'duration'>('recent');
  const [genreFilter, setGenreFilter] = useState<string | 'all'>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);

  const [recentLimit, setRecentLimit] = useState(40);
  const [favoritesLimit, setFavoritesLimit] = useState(60);
  const [loadingMoreRecent, setLoadingMoreRecent] = useState(false);
  const [loadingMoreFav, setLoadingMoreFav] = useState(false);
  const recentSentinelRef = useRef<HTMLDivElement | null>(null);
  const favSentinelRef = useRef<HTMLDivElement | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPl, setNewPl] = useState({ name: '', description: '', isPublic: true });

  const [activeTrackMenu, setActiveTrackMenu] = useState<{
    track: Track;
    context: 'playlist' | 'favorites' | 'recent';
    playlistId?: string;
    index?: number;
    listIds?: string[];
  } | null>(null);
  const [showAddToPlaylistFor, setShowAddToPlaylistFor] = useState<Track | null>(null);
  const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);

  const [showEditPlaylist, setShowEditPlaylist] = useState(false);
  const [editPl, setEditPl] = useState<{ name: string; description: string; isPublic: boolean }>({
    name: '',
    description: '',
    isPublic: true,
  });
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  const isPlayingId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isPlaying = audioState.isPlaying;

  const loadCore = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [plRes, recentRes, favRes] = await Promise.all([
        fetch(`/api/playlists?user=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
        fetch(`/api/tracks?recent=true&limit=${recentLimit}`, { cache: 'no-store' }),
        fetch(`/api/tracks?liked=true&limit=${favoritesLimit}`, { cache: 'no-store' }),
      ]);

      const plJson = await safeJson(plRes);
      const recentJson = await safeJson(recentRes);
      const favJson = await safeJson(favRes);

      if (plRes.ok) setPlaylists(Array.isArray(plJson?.playlists) ? plJson.playlists : []);
      if (recentRes.ok) setRecentTracks(applyCdnToTracks(Array.isArray(recentJson?.tracks) ? recentJson.tracks : []));
      if (favRes.ok) setFavoriteTracks(applyCdnToTracks(Array.isArray(favJson?.tracks) ? favJson.tracks : []));

      if (!plRes.ok && !recentRes.ok && !favRes.ok) {
        throw new Error(plJson?.error || recentJson?.error || favJson?.error || 'Erreur chargement bibliothèque');
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement bibliothèque');
    } finally {
      setLoading(false);
    }
  }, [favoritesLimit, recentLimit, userId]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  // Load selected playlist details
  useEffect(() => {
    if (!selectedPlaylistId) {
      setSelectedPlaylist(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/playlists/${encodeURIComponent(selectedPlaylistId)}`, { cache: 'no-store' });
        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error || 'Erreur chargement dossier');
        if (!cancelled) setSelectedPlaylist(json as Playlist);
      } catch (e: any) {
        if (!cancelled) notify.error('Bibliothèque', e?.message || 'Erreur');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlaylistId]);

  // Infinite scroll: recent
  useEffect(() => {
    if (tab !== 'recent') return;
    const el = recentSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loadingMoreRecent) return;
        setLoadingMoreRecent(true);
        try {
          const next = recentLimit + 20;
          const res = await fetch(`/api/tracks?recent=true&limit=${next}`, { cache: 'no-store' });
          const json = await safeJson(res);
          if (res.ok) {
            setRecentTracks((prev) => {
              const seen = new Set(prev.map((t) => t._id));
              const merged = [...prev];
              for (const t of applyCdnToTracks(Array.isArray(json?.tracks) ? json.tracks : [])) {
                if (!seen.has(t._id)) merged.push(t);
              }
              return merged;
            });
            setRecentLimit(next);
          }
        } finally {
          setLoadingMoreRecent(false);
        }
      },
      { rootMargin: '0px 0px 240px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadingMoreRecent, recentLimit, tab]);

  // Infinite scroll: favorites
  useEffect(() => {
    if (tab !== 'favorites') return;
    const el = favSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (loadingMoreFav) return;
        setLoadingMoreFav(true);
        try {
          const next = favoritesLimit + 30;
          const res = await fetch(`/api/tracks?liked=true&limit=${next}`, { cache: 'no-store' });
          const json = await safeJson(res);
          if (res.ok) {
            setFavoriteTracks((prev) => {
              const seen = new Set(prev.map((t) => t._id));
              const merged = [...prev];
              for (const t of applyCdnToTracks(Array.isArray(json?.tracks) ? json.tracks : [])) {
                if (!seen.has(t._id)) merged.push(t);
              }
              return merged;
            });
            setFavoritesLimit(next);
          }
        } finally {
          setLoadingMoreFav(false);
        }
      },
      { rootMargin: '0px 0px 240px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [favoritesLimit, loadingMoreFav, tab]);

  // Real-time plays sync (global event)
  useEffect(() => {
    const handler = (e: any) => {
      const { trackId, plays } = e.detail || {};
      if (!trackId || typeof plays !== 'number') return;
      setRecentTracks((prev) => prev.map((t) => (t._id === trackId ? { ...t, plays } : t)));
      setFavoriteTracks((prev) => prev.map((t) => (t._id === trackId ? { ...t, plays } : t)));
      setPlaylists((prev) =>
        prev.map((pl) => ({ ...pl, tracks: (pl.tracks || []).map((t) => (t._id === trackId ? { ...t, plays } : t)) })),
      );
    };
    window.addEventListener('playsUpdated', handler as EventListener);
    return () => window.removeEventListener('playsUpdated', handler as EventListener);
  }, []);

  const visiblePlaylists = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = playlists || [];
    if (!q) return list;
    return list.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [playlists, search]);

  const visibleRecent = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = recentTracks || [];
    const filtered = list.filter((t) => {
      const matchesQ = !q || (t.title || '').toLowerCase().includes(q) || (t.artist?.name || '').toLowerCase().includes(q);
      const matchesGenre =
        genreFilter === 'all' ||
        (Array.isArray(t.genre) && t.genre.map(normalizeGenre).filter(Boolean).includes(String(genreFilter)));
      return matchesQ && matchesGenre;
    });
    return sortTracks(filtered, trackSort);
  }, [genreFilter, recentTracks, search, trackSort]);

  const visibleFav = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = favoriteTracks || [];
    const filtered = list.filter((t) => {
      const matchesQ = !q || (t.title || '').toLowerCase().includes(q) || (t.artist?.name || '').toLowerCase().includes(q);
      const matchesGenre =
        genreFilter === 'all' ||
        (Array.isArray(t.genre) && t.genre.map(normalizeGenre).filter(Boolean).includes(String(genreFilter)));
      return matchesQ && matchesGenre;
    });
    return sortTracks(filtered, trackSort);
  }, [favoriteTracks, genreFilter, search, trackSort]);

  const playTracks = useCallback(
    async (tracks: Track[], index: number, source: string) => {
      const list = (tracks || []).filter((t) => t && t._id && t.audioUrl && !isDisabledTrackId(t._id));
      if (!list.length) return;
      const clamped = Math.min(Math.max(0, index), list.length - 1);
      const target = list[clamped];

      const sameQueue =
        audioState.tracks.length === list.length &&
        audioState.tracks.every((t, i) => t?._id && list[i]?._id && t._id === list[i]._id);

      try {
        const currentId = audioState.tracks[audioState.currentTrackIndex]?._id;
        if (currentId && currentId === target._id) {
          // Toggle play/pause sur la piste courante
          await playTrack(target._id);
          return;
        }

        if (sameQueue) {
          await playTrack(target._id); // switch dans la queue courante
        } else {
          setQueueAndPlay(list as any, clamped); // remplace la queue (cas normal)
        }

        // Incrémenter les écoutes (best-effort)
        if (target?._id) incrementPlaysBatch(target._id, target.plays || 0).catch(() => null);
      } catch {
        notify.error('Lecture', 'Impossible de lancer la lecture');
      }
    },
    [audioState.currentTrackIndex, audioState.isPlaying, audioState.tracks, incrementPlaysBatch, playTrack, setQueueAndPlay],
  );

  // Keep edit form in sync when a playlist is loaded/opened
  useEffect(() => {
    if (!selectedPlaylist) return;
    setEditPl({
      name: selectedPlaylist.name || '',
      description: selectedPlaylist.description || '',
      isPublic: Boolean(selectedPlaylist.isPublic),
    });
  }, [selectedPlaylist]);

  const shareTrack = useCallback(async (t: Track) => {
    try {
      const url = `${window.location.origin}/track/${encodeURIComponent(t._id)}?autoplay=1`;
      const text = `Écoute "${t.title}" sur Synaura`;
      if ((navigator as any).share) {
        await (navigator as any).share({ title: t.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} — ${url}`);
        notify.success('Lien copié');
      }
    } catch {
      // silent
    }
  }, []);

  const removeFromPlaylist = useCallback(
    async (playlistId: string, trackId: string) => {
      try {
        const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks?trackId=${encodeURIComponent(trackId)}`, {
          method: 'DELETE',
        });
        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error || 'Erreur');
        setSelectedPlaylist((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tracks: (prev.tracks || []).filter((t) => t._id !== trackId),
            trackCount: Math.max(0, (prev.trackCount || (prev.tracks || []).length) - 1),
          };
        });
        setPlaylists((prev) => prev.map((p) => (p._id === playlistId ? { ...p, trackCount: Math.max(0, (p.trackCount || 0) - 1) } : p)));
        notify.success('Retiré du dossier');
      } catch (e: any) {
        notify.error('Bibliothèque', e?.message || 'Erreur');
      }
    },
    [],
  );

  const queuePlayNext = useCallback(
    (t: Track) => {
      try {
        if (!t?._id || !t.audioUrl || isDisabledTrackId(t._id)) return;
        const curIdx = Math.max(0, audioState.currentTrackIndex || 0);
        const cur = audioState.tracks[curIdx];
        if (!cur?._id) {
          setQueueAndPlay([t] as any, 0);
          return;
        }
        const q = [...(audioState.tracks || [])];
        const existingIdx = q.findIndex((x) => x?._id === t._id);
        if (existingIdx !== -1) q.splice(existingIdx, 1);
        const insertAt = Math.min(q.length, curIdx + 1);
        q.splice(insertAt, 0, t as any);
        setQueueOnly(q as any, curIdx);
        notify.success('Ajouté en lecture suivante');
      } catch {}
    },
    [audioState.currentTrackIndex, audioState.tracks, setQueueAndPlay, setQueueOnly],
  );

  const queueAdd = useCallback(
    (t: Track) => {
      try {
        if (!t?._id || !t.audioUrl || isDisabledTrackId(t._id)) return;
        const curIdx = Math.max(0, audioState.currentTrackIndex || 0);
        const q = [...(audioState.tracks || [])];
        const exists = q.some((x) => x?._id === t._id);
        if (!exists) q.push(t as any);
        setQueueOnly(q as any, curIdx);
        notify.success('Ajouté à la file');
      } catch {}
    },
    [audioState.currentTrackIndex, audioState.tracks, setQueueOnly],
  );

  const addTrackToPlaylist = useCallback(
    async (playlistId: string, trackId: string) => {
      setAddingToPlaylistId(playlistId);
      try {
        const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId }),
        });
        const json = await safeJson(res);
        if (!res.ok) throw new Error(json?.error || 'Erreur');
        notify.success('Ajouté au dossier');
        setPlaylists((prev) => prev.map((p) => (p._id === playlistId ? { ...p, trackCount: (p.trackCount || 0) + 1 } : p)));
        setShowAddToPlaylistFor(null);
      } catch (e: any) {
        notify.error('Bibliothèque', e?.message || 'Erreur');
      } finally {
        setAddingToPlaylistId(null);
      }
    },
    [],
  );

  const openEditPlaylist = useCallback((p: Playlist) => {
    setEditPl({ name: p.name || '', description: p.description || '', isPublic: Boolean(p.isPublic) });
    setShowEditPlaylist(true);
  }, []);

  const saveEditPlaylist = useCallback(async () => {
    if (!selectedPlaylistId) return;
    setSavingPlaylist(true);
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(selectedPlaylistId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editPl }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setPlaylists((prev) =>
        prev.map((p) => (p._id === selectedPlaylistId ? { ...p, name: editPl.name, description: editPl.description, isPublic: editPl.isPublic } : p)),
      );
      setSelectedPlaylist((prev) => (prev ? { ...prev, name: editPl.name, description: editPl.description, isPublic: editPl.isPublic } : prev));
      setShowEditPlaylist(false);
      notify.success('Dossier mis à jour');
    } catch (e: any) {
      notify.error('Bibliothèque', e?.message || 'Erreur');
    } finally {
      setSavingPlaylist(false);
    }
  }, [editPl, selectedPlaylistId]);

  const togglePlaylistVisibility = useCallback(async (playlistId: string, nextPublic: boolean) => {
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextPublic }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setPlaylists((prev) => prev.map((p) => (p._id === playlistId ? { ...p, isPublic: nextPublic } : p)));
      setSelectedPlaylist((prev) => (prev ? { ...prev, isPublic: nextPublic } : prev));
      notify.success(nextPublic ? 'Dossier rendu public' : 'Dossier rendu privé');
    } catch (e: any) {
      notify.error('Bibliothèque', e?.message || 'Erreur');
    }
  }, []);

  const setPlaylistCoverFromTrack = useCallback(async (playlistId: string, coverUrl?: string) => {
    if (!coverUrl) return;
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverUrl }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || 'Erreur');
      setPlaylists((prev) => prev.map((p) => (p._id === playlistId ? { ...p, coverUrl } : p)));
      setSelectedPlaylist((prev) => (prev ? { ...prev, coverUrl } : prev));
      notify.success('Cover mise à jour');
    } catch (e: any) {
      notify.error('Bibliothèque', e?.message || 'Erreur');
    }
  }, []);

  const reorderInPlaylist = useCallback(async (playlistId: string, orderedIds: string[]) => {
    if (!orderedIds.length) return;
    await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedTrackIds: orderedIds }),
    }).catch(() => null);
  }, []);

  const toggleLike = useCallback(
    async (t: Track) => {
      if (!t?._id) return;
      const isLiked = trackIsLiked(t, userId);
      const likesCount = Array.isArray(t.likes) ? t.likes.length : 0;
      const res = await toggleLikeBatch(t._id, { isLiked, likesCount }).catch(() => null);
      if (!res) return;
      const nextLiked = Boolean((res as any).isLiked);
      const nextCount = Number((res as any).likesCount ?? (res as any).likes ?? likesCount);

      const patch = (x: Track) => {
        if (x._id !== t._id) return x;
        return {
          ...x,
          isLiked: nextLiked,
          likes: Array.isArray(x.likes)
            ? nextLiked
              ? Array.from(new Set([...(x.likes || []), userId || '']))
              : (x.likes || []).filter((id) => id && id !== userId)
            : x.likes,
        };
      };

      setRecentTracks((prev) => prev.map(patch));
      setFavoriteTracks((prev) => prev.map(patch));
      setSelectedPlaylist((prev) => (prev ? { ...prev, tracks: (prev.tracks || []).map(patch) } : prev));
      notify.success(nextLiked ? 'Ajouté aux favoris' : 'Retiré des favoris');
    },
    [toggleLikeBatch, userId],
  );

  const createPlaylist = useCallback(async () => {
    if (!newPl.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPl.name.trim(), description: newPl.description.trim(), isPublic: newPl.isPublic }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || 'Erreur création dossier');
      setPlaylists((prev) => [json as Playlist, ...(prev || [])]);
      setShowCreate(false);
      setNewPl({ name: '', description: '', isPublic: true });
      notify.success('Dossier créé');
    } catch (e: any) {
      notify.error('Bibliothèque', e?.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  }, [newPl.description, newPl.isPublic, newPl.name]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    if (!confirm('Supprimer ce dossier ?')) return;
    try {
      const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur suppression');
      setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
      if (selectedPlaylistId === playlistId) setSelectedPlaylistId(null);
      notify.success('Dossier supprimé');
    } catch (e: any) {
      notify.error('Bibliothèque', e?.message || 'Erreur');
    }
  }, [selectedPlaylistId]);

  const header = (
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-background-primary/70 border-b border-border-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-background-fog-thin border border-border-secondary grid place-items-center">
                <Sparkles className="h-5 w-5 text-foreground-secondary" />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl font-semibold text-foreground-primary leading-tight">Bibliothèque</div>
                <div className="text-xs text-foreground-tertiary">Dossiers • Favoris • Récents</div>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              className={cx(
                'h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-secondary hover:bg-overlay-on-primary transition',
                viewMode === 'grid' && 'text-foreground-primary',
              )}
              onClick={() => setViewMode('grid')}
              aria-label="Vue grille"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cx(
                'h-10 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-secondary hover:bg-overlay-on-primary transition',
                viewMode === 'list' && 'text-foreground-primary',
              )}
              onClick={() => setViewMode('list')}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-inactive" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un dossier ou une piste…"
              className="w-full h-11 pl-10 pr-10 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary"
            />
            {search.trim() ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary transition grid place-items-center"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <TabButton active={tab === 'playlists'} onClick={() => { setTab('playlists'); setSelectedPlaylistId(null); }}>
            Dossiers
          </TabButton>
          <TabButton active={tab === 'favorites'} onClick={() => { setTab('favorites'); setSelectedPlaylistId(null); }}>
            Favoris
          </TabButton>
          <TabButton active={tab === 'recent'} onClick={() => { setTab('recent'); setSelectedPlaylistId(null); }}>
            Récents
          </TabButton>
          <TabButton active={tab === 'queue'} onClick={() => { setTab('queue'); setSelectedPlaylistId(null); }}>
            À suivre
          </TabButton>
        </div>

        {/* Sort / Filter controls (tracks only) */}
        {tab !== 'playlists' && tab !== 'queue' ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs text-foreground-tertiary">
              <Clock3 className="h-4 w-4" />
              <select
                value={trackSort}
                onChange={(e) => setTrackSort(e.target.value as any)}
                className="bg-transparent outline-none text-foreground-secondary"
              >
                <option value="recent">Récent</option>
                <option value="title">Titre</option>
                <option value="plays">Écoutes</option>
                <option value="duration">Durée</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs text-foreground-tertiary">
              <Grid className="h-4 w-4" />
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value as any)}
                className="bg-transparent outline-none text-foreground-secondary"
              >
                <option value="all">Tous les genres</option>
                {Array.from(
                  new Set(
                    (tab === 'favorites' ? favoriteTracks : recentTracks)
                      .flatMap((t) => (Array.isArray(t.genre) ? t.genre : []))
                      .map(normalizeGenre)
                      .filter(Boolean),
                  ),
                )
                  .sort((a, b) => a.localeCompare(b))
                  .slice(0, 25)
                  .map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
              </select>
            </div>

            {(genreFilter !== 'all' || trackSort !== 'recent') ? (
              <button
                type="button"
                onClick={() => {
                  setGenreFilter('all');
                  setTrackSort('recent');
                }}
                className="h-9 px-3 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition text-xs text-foreground-secondary"
              >
                Réinitialiser
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (loading) return <LibraryPageSkeleton />;

  if (!userId) {
    return (
      <div className="min-h-[70vh] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-border-secondary bg-background-fog-thin p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-background-tertiary border border-border-secondary grid place-items-center">
            <Music className="h-6 w-6 text-foreground-secondary" />
          </div>
          <div className="mt-4 text-lg font-semibold text-foreground-primary">Connecte-toi</div>
          <div className="mt-1 text-sm text-foreground-secondary">
            Ta bibliothèque (dossiers, favoris, historiques) est liée à ton compte.
          </div>
          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="mt-5 h-11 px-4 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-border-secondary bg-background-fog-thin p-6">
          <div className="text-lg font-semibold text-foreground-primary">Erreur</div>
          <div className="mt-1 text-sm text-foreground-secondary">{error}</div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => loadCore()}
              className="h-11 px-4 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      {header}

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Playlist detail */}
        {tab === 'playlists' && selectedPlaylistId && selectedPlaylist ? (
          <div>
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setSelectedPlaylistId(null)}
                className="h-11 w-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                aria-label="Retour"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 rounded-3xl bg-background-tertiary border border-border-secondary overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedPlaylist.coverUrl || '/default-cover.jpg'}
                      alt={selectedPlaylist.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-xl font-semibold truncate">{selectedPlaylist.name}</div>
                      {selectedPlaylist.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-xs text-foreground-tertiary">
                          <Globe className="h-3 w-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-foreground-tertiary">
                          <Lock className="h-3 w-3" /> Privé
                        </span>
                      )}
                    </div>
                    {selectedPlaylist.description ? (
                      <div className="mt-1 text-sm text-foreground-secondary line-clamp-2">
                        {selectedPlaylist.description}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-foreground-inactive">Aucune description</div>
                    )}
                    <div className="mt-2 text-xs text-foreground-tertiary">
                      {selectedPlaylist.trackCount || selectedPlaylist.tracks?.length || 0} pistes •{' '}
                      {formatDuration(selectedPlaylist.duration || 0)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playTracks(selectedPlaylist.tracks || [], 0, 'library-playlist')}
                      className="h-11 px-4 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition inline-flex items-center gap-2"
                      disabled={!selectedPlaylist.tracks?.length}
                    >
                      <Play className="h-4 w-4" />
                      Lire
                    </button>
                    <button
                      type="button"
                      onClick={() => playTracks(selectedPlaylist.tracks || [], Math.floor(Math.random() * Math.max(1, (selectedPlaylist.tracks || []).length)), 'library-playlist-shuffle')}
                      className="h-11 w-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                      aria-label="Lecture aléatoire"
                      disabled={!selectedPlaylist.tracks?.length}
                    >
                      <Shuffle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePlaylist(selectedPlaylist._id)}
                      className="h-11 w-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-red-500/15 hover:border-red-500/30 transition grid place-items-center"
                      aria-label="Supprimer le dossier"
                    >
                      <Trash2 className="h-4 w-4 text-red-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditPlaylist(selectedPlaylist)}
                      className="h-11 w-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                      aria-label="Options du dossier"
                    >
                      <MoreVertical className="h-4 w-4 text-foreground-tertiary" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
              <div className="px-4 py-3 text-sm text-foreground-secondary border-b border-border-secondary/60 flex items-center justify-between">
                <span>Pistes</span>
                <span className="text-xs text-foreground-tertiary">{selectedPlaylist.tracks?.length || 0}</span>
              </div>

              {(selectedPlaylist.tracks || []).length ? (
                <div className="divide-y divide-border-secondary/40">
                  {(selectedPlaylist.tracks || []).map((t, idx) => (
                    <TrackRow
                      key={t._id}
                      track={t}
                      index={idx}
                      isActive={isPlayingId === t._id}
                      isPlaying={isPlaying}
                      disabled={isDisabledTrackId(t._id)}
                      onPlay={() => playTracks(selectedPlaylist.tracks || [], idx, 'library-playlist-row')}
                      onToggleLike={() => toggleLike(t)}
                      likeLoading={isBatchLoading(t._id)}
                      liked={trackIsLiked(t, userId)}
                      onMore={() =>
                        setActiveTrackMenu({
                          track: t,
                          context: 'playlist',
                          playlistId: selectedPlaylist._id,
                          index: idx,
                          listIds: (selectedPlaylist.tracks || []).map((x) => x._id),
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-foreground-secondary">Ce dossier est vide.</div>
              )}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'playlists' ? (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-foreground-secondary">
                    {visiblePlaylists.length} dossier{visiblePlaylists.length > 1 ? 's' : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="h-11 px-4 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition inline-flex items-center gap-2"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Nouveau dossier
                  </button>
                </div>

                {visiblePlaylists.length ? (
                  <div className={cx('mt-4', viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2')}>
                    {visiblePlaylists.map((p) => (
                      <PlaylistCard
                        key={p._id}
                        playlist={p}
                        viewMode={viewMode}
                        onOpen={() => setSelectedPlaylistId(p._id)}
                        onDelete={() => deletePlaylist(p._id)}
                        onPlay={() => playTracks(p.tracks || [], 0, 'library-playlist-card')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-10 rounded-3xl border border-border-secondary bg-background-fog-thin p-8 text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-background-tertiary border border-border-secondary grid place-items-center">
                      <FolderPlus className="h-6 w-6 text-foreground-secondary" />
                    </div>
                    <div className="mt-4 text-lg font-semibold">Aucun dossier</div>
                    <div className="mt-1 text-sm text-foreground-secondary">
                      Crée un dossier pour organiser tes morceaux.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="mt-5 h-11 px-4 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition"
                    >
                      Créer mon premier dossier
                    </button>
                  </div>
                )}
              </motion.div>
            ) : tab === 'favorites' ? (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <SectionHeader
                  title="Favoris"
                  subtitle={`${visibleFav.length} piste${visibleFav.length > 1 ? 's' : ''}`}
                  action={
                    <button
                      type="button"
                      onClick={() => playTracks(visibleFav, 0, 'library-favorites')}
                      className="h-11 px-4 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition inline-flex items-center gap-2"
                      disabled={!visibleFav.length}
                    >
                      <Play className="h-4 w-4" /> Lire tout
                    </button>
                  }
                />

                <div className="mt-4 rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                  {visibleFav.length ? (
                    <div className="divide-y divide-border-secondary/40">
                      {visibleFav.map((t, idx) => (
                        <TrackRow
                          key={t._id}
                          track={t}
                          index={idx}
                          isActive={isPlayingId === t._id}
                          isPlaying={isPlaying}
                          disabled={isDisabledTrackId(t._id)}
                          onPlay={() => playTracks(visibleFav, idx, 'library-favorites-row')}
                          onToggleLike={() => toggleLike(t)}
                          likeLoading={isBatchLoading(t._id)}
                          liked={trackIsLiked(t, userId)}
                          onMore={() => setActiveTrackMenu({ track: t, context: 'favorites' })}
                        />
                      ))}
                      <div ref={favSentinelRef} className="h-10" />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-foreground-secondary">
                      Aucun favori pour l’instant.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : tab === 'queue' ? (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <SectionHeader
                  title="À suivre"
                  subtitle={`${Math.max(0, (audioState.tracks?.length || 0) - (audioState.currentTrackIndex || 0) - 1)} titre(s)`}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        const idx = Math.max(0, audioState.currentTrackIndex || 0);
                        const tracks = Array.isArray(audioState.tracks) ? audioState.tracks.slice(0, idx + 1) : [];
                        setQueueOnly(tracks as any, idx);
                      }}
                      className="h-11 px-4 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                      disabled={Math.max(0, (audioState.tracks?.length || 0) - (audioState.currentTrackIndex || 0) - 1) === 0}
                    >
                      Vider
                    </button>
                  }
                />

                <div className="mt-4 rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                  <div className="px-4 py-3 text-sm text-foreground-secondary border-b border-border-secondary/60">
                    Lecture en cours
                  </div>
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-foreground-primary truncate">
                      {audioState.tracks[audioState.currentTrackIndex]?.title || '—'}
                    </div>
                    <div className="text-xs text-foreground-tertiary truncate">
                      {audioState.tracks[audioState.currentTrackIndex]?.artist?.name ||
                        audioState.tracks[audioState.currentTrackIndex]?.artist?.username ||
                        ''}
                    </div>
                  </div>

                  <div className="px-4 py-3 text-sm text-foreground-secondary border-t border-border-secondary/60 border-b border-border-secondary/60">
                    Prochains titres
                  </div>

                  <div className="divide-y divide-border-secondary/40">
                    {(audioState.tracks || []).slice(Math.max(0, (audioState.currentTrackIndex || 0) + 1)).length ? (
                      (audioState.tracks || [])
                        .slice(Math.max(0, (audioState.currentTrackIndex || 0) + 1))
                        .map((t: any) => (
                          <div key={t._id} className="px-3 py-2 flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-foreground-primary truncate">{t.title}</div>
                              <div className="text-xs text-foreground-tertiary truncate">{t.artist?.name || t.artist?.username || ''}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => playTrack(t._id)}
                              className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                              aria-label="Lire"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const idx = Math.max(0, audioState.currentTrackIndex || 0);
                                const tracks = Array.isArray(audioState.tracks) ? [...audioState.tracks] : [];
                                const removeAt = tracks.findIndex((x) => x?._id === t._id);
                                if (removeAt <= idx) return;
                                tracks.splice(removeAt, 1);
                                setQueueOnly(tracks as any, idx);
                              }}
                              className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-red-500/15 hover:border-red-500/30 transition grid place-items-center"
                              aria-label="Retirer"
                            >
                              <Trash2 className="h-4 w-4 text-red-300" />
                            </button>
                          </div>
                        ))
                    ) : (
                      <div className="p-8 text-center text-sm text-foreground-secondary">Rien à suivre pour le moment.</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <SectionHeader
                  title="Récents"
                  subtitle={`${visibleRecent.length} piste${visibleRecent.length > 1 ? 's' : ''}`}
                  action={
                    <button
                      type="button"
                      onClick={() => playTracks(visibleRecent, 0, 'library-recent')}
                      className="h-11 px-4 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition inline-flex items-center gap-2"
                      disabled={!visibleRecent.length}
                    >
                      <Play className="h-4 w-4" /> Lire tout
                    </button>
                  }
                />

                <div className="mt-4 rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                  {visibleRecent.length ? (
                    <div className="divide-y divide-border-secondary/40">
                      {visibleRecent.map((t, idx) => (
                        <TrackRow
                          key={t._id}
                          track={t}
                          index={idx}
                          isActive={isPlayingId === t._id}
                          isPlaying={isPlaying}
                          disabled={isDisabledTrackId(t._id)}
                          onPlay={() => playTracks(visibleRecent, idx, 'library-recent-row')}
                          onToggleLike={() => toggleLike(t)}
                          likeLoading={isBatchLoading(t._id)}
                          liked={trackIsLiked(t, userId)}
                          onMore={() => setActiveTrackMenu({ track: t, context: 'recent' })}
                        />
                      ))}
                      <div ref={recentSentinelRef} className="h-10" />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-foreground-secondary">
                      Rien ici pour l’instant.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Create playlist modal (portaled to body for true viewport centering) */}
      {isMounted
        ? createPortal(
            <AnimatePresence>
              {showCreate ? (
                <motion.div
                  className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCreate(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 18 }}
                    transition={{ duration: 0.18 }}
                    className="w-[92vw] max-w-md rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground-primary">Nouveau dossier</div>
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="text-xs text-foreground-tertiary mb-1">Nom</div>
                        <input
                          value={newPl.name}
                          onChange={(e) => setNewPl((p) => ({ ...p, name: e.target.value }))}
                          className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin px-3 text-sm outline-none"
                          placeholder="Mes coups de cœur"
                          autoFocus
                        />
                      </div>
                      <div>
                        <div className="text-xs text-foreground-tertiary mb-1">Description</div>
                        <textarea
                          value={newPl.description}
                          onChange={(e) => setNewPl((p) => ({ ...p, description: e.target.value }))}
                          className="w-full min-h-[88px] rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none resize-none"
                          placeholder="Optionnel…"
                          maxLength={240}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-3">
                        <div className="text-sm text-foreground-secondary">Dossier public</div>
                        <button
                          type="button"
                          onClick={() => setNewPl((p) => ({ ...p, isPublic: !p.isPublic }))}
                          className={cx(
                            'h-7 w-12 rounded-full border border-border-secondary transition relative',
                            newPl.isPublic ? 'bg-overlay-on-primary' : 'bg-background-tertiary',
                          )}
                          aria-label="Toggle public"
                        >
                          <span
                            className={cx(
                              'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background-primary transition',
                              newPl.isPublic ? 'left-6' : 'left-1',
                            )}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border-secondary/60 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="flex-1 h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={creating || !newPl.name.trim()}
                        onClick={createPlaylist}
                        className="flex-1 h-11 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition disabled:opacity-50"
                      >
                        {creating ? 'Création…' : 'Créer'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {/* Track actions modal (portaled) */}
      {isMounted
        ? createPortal(
            <AnimatePresence>
              {activeTrackMenu ? (
                <motion.div
                  className="fixed inset-0 z-[230] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveTrackMenu(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 22 }}
                    transition={{ duration: 0.18 }}
                    className="w-[92vw] max-w-[460px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                  >
              <div className="p-4 border-b border-border-secondary/60">
                <div className="text-sm font-semibold text-foreground-primary truncate">{activeTrackMenu.track.title}</div>
                <div className="mt-0.5 text-xs text-foreground-tertiary truncate">{activeTrackMenu.track.artist?.name}</div>
              </div>

              <div className="p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    queuePlayNext(activeTrackMenu.track);
                    setActiveTrackMenu(null);
                  }}
                  className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2"
                >
                  <ListPlus className="h-4 w-4" />
                  Lire ensuite
                </button>

                <button
                  type="button"
                  onClick={() => {
                    queueAdd(activeTrackMenu.track);
                    setActiveTrackMenu(null);
                  }}
                  className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter à la file
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddToPlaylistFor(activeTrackMenu.track);
                    setActiveTrackMenu(null);
                  }}
                  className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2"
                >
                  <AddToFolderIcon className="h-4 w-4" />
                  Ajouter à un dossier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    shareTrack(activeTrackMenu.track);
                    setActiveTrackMenu(null);
                  }}
                  className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </button>

                {activeTrackMenu.context === 'playlist' && activeTrackMenu.playlistId ? (
                  <button
                    type="button"
                    onClick={() => {
                      removeFromPlaylist(activeTrackMenu.playlistId!, activeTrackMenu.track._id);
                      setActiveTrackMenu(null);
                    }}
                    className="w-full h-11 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition text-red-200 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Retirer du dossier
                  </button>
                ) : null}

                {activeTrackMenu.context === 'playlist' && activeTrackMenu.playlistId && typeof activeTrackMenu.index === 'number' && Array.isArray(activeTrackMenu.listIds) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={activeTrackMenu.index <= 0}
                      onClick={() => {
                        const ids = activeTrackMenu.listIds!.slice();
                        const i = activeTrackMenu.index!;
                        if (i <= 0) return;
                        [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                        setSelectedPlaylist((prev) => {
                          if (!prev) return prev;
                          const map = new Map((prev.tracks || []).map((t) => [t._id, t]));
                          return { ...prev, tracks: ids.map((id) => map.get(id)!).filter(Boolean) };
                        });
                        reorderInPlaylist(activeTrackMenu.playlistId!, ids);
                        setActiveTrackMenu((prev) => (prev ? { ...prev, index: i - 1, listIds: ids } : prev));
                      }}
                      className="h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ArrowUp className="h-4 w-4" />
                      Monter
                    </button>
                    <button
                      type="button"
                      disabled={activeTrackMenu.index >= (activeTrackMenu.listIds.length - 1)}
                      onClick={() => {
                        const ids = activeTrackMenu.listIds!.slice();
                        const i = activeTrackMenu.index!;
                        if (i >= ids.length - 1) return;
                        [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                        setSelectedPlaylist((prev) => {
                          if (!prev) return prev;
                          const map = new Map((prev.tracks || []).map((t) => [t._id, t]));
                          return { ...prev, tracks: ids.map((id) => map.get(id)!).filter(Boolean) };
                        });
                        reorderInPlaylist(activeTrackMenu.playlistId!, ids);
                        setActiveTrackMenu((prev) => (prev ? { ...prev, index: i + 1, listIds: ids } : prev));
                      }}
                      className="h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ArrowDown className="h-4 w-4" />
                      Descendre
                    </button>
                  </div>
                ) : null}

                {activeTrackMenu.context === 'playlist' && activeTrackMenu.playlistId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPlaylistCoverFromTrack(activeTrackMenu.playlistId!, activeTrackMenu.track.coverUrl);
                      setActiveTrackMenu(null);
                    }}
                    className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Définir comme cover du dossier
                  </button>
                ) : null}
              </div>

              <div className="p-3 border-t border-border-secondary/60">
                <button
                  type="button"
                  onClick={() => setActiveTrackMenu(null)}
                  className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                >
                  Fermer
                </button>
              </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {/* Add to playlist modal (portaled) */}
      {isMounted
        ? createPortal(
            <AnimatePresence>
              {showAddToPlaylistFor ? (
                <motion.div
                  className="fixed inset-0 z-[240] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddToPlaylistFor(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 22 }}
                    transition={{ duration: 0.18 }}
                    className="w-[92vw] max-w-[520px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                  >
              <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground-primary">Ajouter à un dossier</div>
                  <div className="text-xs text-foreground-tertiary truncate">{showAddToPlaylistFor.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddToPlaylistFor(null)}
                  className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {visiblePlaylists.length ? (
                  visiblePlaylists.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      disabled={addingToPlaylistId === p._id}
                      onClick={() => addTrackToPlaylist(p._id, showAddToPlaylistFor._id)}
                      className="w-full text-left rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition px-3 py-3 disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{p.name}</div>
                          <div className="text-xs text-foreground-tertiary truncate">
                            {p.trackCount || 0} piste{(p.trackCount || 0) > 1 ? 's' : ''} • {p.isPublic ? 'Public' : 'Privé'}
                          </div>
                        </div>
                        <div className="text-xs text-foreground-tertiary">{addingToPlaylistId === p._id ? 'Ajout…' : 'Ajouter'}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-foreground-secondary">Aucun dossier disponible.</div>
                )}
              </div>

              <div className="p-3 border-t border-border-secondary/60 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddToPlaylistFor(null); setShowCreate(true); }}
                  className="flex-1 h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                >
                  Nouveau dossier
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddToPlaylistFor(null)}
                  className="flex-1 h-11 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition"
                >
                  OK
                </button>
              </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {/* Edit playlist modal (portaled) */}
      {isMounted
        ? createPortal(
            <AnimatePresence>
              {showEditPlaylist && selectedPlaylist ? (
                <motion.div
                  className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEditPlaylist(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 22 }}
                    transition={{ duration: 0.18 }}
                    className="w-[92vw] max-w-md rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
              <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground-primary">Options du dossier</div>
                <button
                  type="button"
                  onClick={() => setShowEditPlaylist(false)}
                  className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-foreground-tertiary mb-1">Nom</div>
                  <input
                    value={editPl.name}
                    onChange={(e) => setEditPl((p) => ({ ...p, name: e.target.value }))}
                    className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin px-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <div className="text-xs text-foreground-tertiary mb-1">Description</div>
                  <textarea
                    value={editPl.description}
                    onChange={(e) => setEditPl((p) => ({ ...p, description: e.target.value }))}
                    className="w-full min-h-[88px] rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm outline-none resize-none"
                    maxLength={240}
                  />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-3">
                  <div className="text-sm text-foreground-secondary">Dossier public</div>
                  <button
                    type="button"
                    onClick={() => setEditPl((p) => ({ ...p, isPublic: !p.isPublic }))}
                    className={cx(
                      'h-7 w-12 rounded-full border border-border-secondary transition relative',
                      editPl.isPublic ? 'bg-overlay-on-primary' : 'bg-background-tertiary',
                    )}
                    aria-label="Toggle public"
                  >
                    <span
                      className={cx(
                        'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background-primary transition',
                        editPl.isPublic ? 'left-6' : 'left-1',
                      )}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => togglePlaylistVisibility(selectedPlaylist._id, !selectedPlaylist.isPublic)}
                  className="w-full h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                >
                  {selectedPlaylist.isPublic ? 'Rendre privé' : 'Rendre public'}
                </button>
              </div>

              <div className="p-4 border-t border-border-secondary/60 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditPlaylist(false)}
                  className="flex-1 h-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingPlaylist || !editPl.name.trim()}
                  onClick={saveEditPlaylist}
                  className="flex-1 h-11 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition disabled:opacity-50"
                >
                  {savingPlaylist ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: any;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-10 px-3 rounded-2xl border text-sm transition',
        active
          ? 'border-border-secondary bg-background-fog-thin text-foreground-primary'
          : 'border-border-secondary/60 bg-transparent text-foreground-tertiary hover:bg-background-fog-thin',
      )}
    >
      {children}
    </button>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: any;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-foreground-tertiary">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}

function PlaylistCard({
  playlist,
  viewMode,
  onOpen,
  onDelete,
  onPlay,
}: {
  playlist: Playlist;
  viewMode: ViewMode;
  onOpen: () => void;
  onDelete: () => void;
  onPlay: () => void;
}) {
  const cover = playlist.coverUrl || '/default-cover.jpg';
  const count = playlist.trackCount || playlist.tracks?.length || 0;

  if (viewMode === 'list') {
    return (
      <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
        <button type="button" className="w-full text-left" onClick={onOpen}>
          <div className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 rounded-2xl bg-background-tertiary border border-border-secondary overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt={playlist.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{playlist.name}</div>
              <div className="text-xs text-foreground-tertiary truncate">
                {count} piste{count > 1 ? 's' : ''} • {playlist.isPublic ? 'Public' : 'Privé'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                aria-label="Lire"
              >
                <Play className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-red-500/15 hover:border-red-500/30 transition grid place-items-center"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-red-300" />
              </button>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden group">
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="aspect-square bg-background-tertiary border-b border-border-secondary/60 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={playlist.name} className="h-full w-full object-cover" />
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{playlist.name}</div>
              <div className="text-xs text-foreground-tertiary truncate">
                {count} piste{count > 1 ? 's' : ''} • {playlist.isPublic ? 'Public' : 'Privé'}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center opacity-0 group-hover:opacity-100"
              aria-label="Lire"
            >
              <Play className="h-4 w-4" />
            </button>
          </div>
        </div>
      </button>
    </div>
  );
}

function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  disabled,
  onPlay,
  onToggleLike,
  likeLoading,
  liked,
  onMore,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  disabled: boolean;
  onPlay: () => void;
  onToggleLike: () => void;
  likeLoading: boolean;
  liked: boolean;
  onMore?: () => void;
}) {
  const cover = track.coverUrl || '/default-cover.jpg';
  return (
    <div className={cx('px-3 py-2 flex items-center gap-3', disabled && 'opacity-60')}>
      <button
        type="button"
        onClick={onPlay}
        disabled={disabled}
        className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center shrink-0"
        aria-label="Lire"
      >
        {isActive && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="h-10 w-10 rounded-2xl bg-background-tertiary border border-border-secondary overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={track.title} className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground-primary truncate">{track.title || 'Titre'}</div>
        <div className="text-xs text-foreground-tertiary truncate">{track.artist?.name || 'Artiste'}</div>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-xs text-foreground-tertiary">
        <span className="tabular-nums">{formatDuration(track.duration || 0)}</span>
        <span className="tabular-nums">{formatCompact(track.plays || 0)} écoutes</span>
      </div>

      <button
        type="button"
        onClick={onToggleLike}
        disabled={disabled || likeLoading}
        className={cx(
          'h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center',
          liked && 'text-red-300 border-red-500/30',
        )}
        aria-label="Favori"
      >
        <Heart className={cx('h-4 w-4', liked && 'fill-red-400')} />
      </button>

      <button
        type="button"
        className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
        aria-label="Plus"
        onClick={onMore}
      >
        <MoreVertical className="h-4 w-4 text-foreground-tertiary" />
      </button>
    </div>
  );
}

