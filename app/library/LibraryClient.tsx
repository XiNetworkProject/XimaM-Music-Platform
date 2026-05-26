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
import {
  SynauraAnnouncementStrip,
  SynauraAppShell,
  SynauraInkPanel,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';
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

const LIBRARY_SCOPE_CLASS = 'library-synaura-scope';
const LIBRARY_MODAL_CLASS = 'library-synaura-modal';

const LIBRARY_SCOPE_CSS = `
  .${LIBRARY_SCOPE_CLASS},
  .${LIBRARY_MODAL_CLASS} {
    --background-primary: transparent;
    --background-secondary: #fff6ea;
    --background-tertiary: rgba(255, 250, 242, 0.96);
    --foreground-primary: #171313;
    --foreground-secondary: rgba(23, 19, 19, 0.72);
    --foreground-tertiary: rgba(23, 19, 19, 0.48);
    --foreground-inactive: rgba(23, 19, 19, 0.34);
    --border-primary: rgba(23, 19, 19, 0.08);
    --border-secondary: rgba(23, 19, 19, 0.10);
    --overlay-on-primary: rgba(23, 19, 19, 0.08);
  }

  .${LIBRARY_SCOPE_CLASS} .bg-background-fog-thin,
  .${LIBRARY_MODAL_CLASS} .bg-background-fog-thin {
    background-color: rgba(23, 19, 19, 0.04) !important;
  }

  .${LIBRARY_SCOPE_CLASS} .bg-background-tertiary,
  .${LIBRARY_MODAL_CLASS} .bg-background-tertiary {
    background-color: rgba(255, 250, 242, 0.96) !important;
  }

  .${LIBRARY_SCOPE_CLASS} .bg-overlay-on-primary,
  .${LIBRARY_MODAL_CLASS} .bg-overlay-on-primary {
    background-color: #171313 !important;
    color: #fffaf2 !important;
    border-color: #171313 !important;
  }

  .${LIBRARY_SCOPE_CLASS} .hover\\:bg-overlay-on-primary:hover,
  .${LIBRARY_MODAL_CLASS} .hover\\:bg-overlay-on-primary:hover {
    background-color: rgba(23, 19, 19, 0.08) !important;
    color: #171313 !important;
  }

  .${LIBRARY_SCOPE_CLASS} .divide-border-secondary\\/40 > :not([hidden]) ~ :not([hidden]),
  .${LIBRARY_MODAL_CLASS} .divide-border-secondary\\/40 > :not([hidden]) ~ :not([hidden]) {
    border-color: rgba(23, 19, 19, 0.08) !important;
  }

  .${LIBRARY_SCOPE_CLASS} select,
  .${LIBRARY_MODAL_CLASS} select {
    color: #171313;
  }

  .${LIBRARY_SCOPE_CLASS} option,
  .${LIBRARY_MODAL_CLASS} option {
    background: #fffaf2;
    color: #171313;
  }
`;

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

  const {
    audioState,
    setQueueAndPlay,
    playTrack,
    addToUpNext,
    upNextEnabled,
    upNextTracks,
    toggleUpNextEnabled,
    removeFromUpNext,
    clearUpNext,
  } = useAudioPlayer();
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
      if (!t?._id || !t.audioUrl || isDisabledTrackId(t._id)) return;
      addToUpNext(t as any, 'next');
      notify.success('Ajouté à “À suivre” (lecture suivante)');
    },
    [addToUpNext],
  );

  const queueAdd = useCallback(
    (t: Track) => {
      if (!t?._id || !t.audioUrl || isDisabledTrackId(t._id)) return;
      addToUpNext(t as any, 'end');
      notify.success('Ajouté à “À suivre”');
    },
    [addToUpNext],
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

  const tabMeta = (() => {
    if (tab === 'playlists') {
      return {
        eyebrow: 'Organisation vivante',
        title: selectedPlaylist ? selectedPlaylist.name : 'Bibliotheque Synaura',
        description: selectedPlaylist
          ? 'Retrouve un dossier, relance-le, reorganise ses pistes et garde la meme sensation que depuis la home.'
          : 'Dossiers, favoris, recents et queue vivent maintenant dans la meme ambiance chaude que la home.',
        count: selectedPlaylist ? selectedPlaylist.tracks?.length || 0 : visiblePlaylists.length,
        countLabel: selectedPlaylist ? 'pistes dans le dossier' : 'dossiers visibles',
      };
    }

    if (tab === 'favorites') {
      return {
        eyebrow: 'Collection aimee',
        title: 'Favoris',
        description: 'Les sons que tu gardes pres de toi, avec lecture immediate, likes et actions rapides.',
        count: visibleFav.length,
        countLabel: 'titres favoris',
      };
    }

    if (tab === 'recent') {
      return {
        eyebrow: 'Memoire recente',
        title: 'Recents',
        description: 'Tout ce que tu as relance recemment, trie, filtre et pret a repartir.',
        count: visibleRecent.length,
        countLabel: 'titres recents',
      };
    }

    return {
      eyebrow: 'Lecture continue',
      title: 'A suivre',
      description: 'Ta queue reste au centre de la page, prete a enchainer sans casser ton rythme.',
      count: upNextTracks.length,
      countLabel: 'titres en attente',
    };
  })();

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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un dossier ou une piste…"
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
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

          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5">
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

  const synauraHeader = (
    <div className="sticky top-0 z-20 mb-5">
      <div className="rounded-[2rem] border border-border-secondary bg-background-tertiary/95 p-4 shadow-[0_18px_60px_rgba(30,25,20,0.10)] backdrop-blur-2xl sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px] xl:items-start">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-black/[0.05] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black/42">
                  {tabMeta.eyebrow}
                </span>
                <h1 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.05em] text-[#171313] sm:text-[2.35rem]">
                  {tabMeta.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-secondary">{tabMeta.description}</p>
              </div>

              {tab === 'playlists' && !selectedPlaylistId ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <button
                    type="button"
                    className={cx(
                      'grid h-11 w-11 place-items-center rounded-full border border-border-secondary bg-background-fog-thin text-foreground-secondary transition hover:bg-black hover:text-white',
                      viewMode === 'grid' && 'bg-[#171313] text-white hover:bg-[#171313]',
                    )}
                    onClick={() => setViewMode('grid')}
                    aria-label="Vue grille"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={cx(
                      'grid h-11 w-11 place-items-center rounded-full border border-border-secondary bg-background-fog-thin text-foreground-secondary transition hover:bg-black hover:text-white',
                      viewMode === 'list' && 'bg-[#171313] text-white hover:bg-[#171313]',
                    )}
                    onClick={() => setViewMode('list')}
                    aria-label="Vue liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.4rem] border border-border-secondary bg-background-fog-thin p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground-tertiary">Focus</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#171313]">{tabMeta.count}</p>
                <p className="text-xs text-foreground-secondary">{tabMeta.countLabel}</p>
              </div>
              <div className="rounded-[1.4rem] border border-border-secondary bg-background-fog-thin p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground-tertiary">Dossiers</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#171313]">{playlists.length}</p>
                <p className="text-xs text-foreground-secondary">organises dans ta bibliotheque</p>
              </div>
              <div className="rounded-[1.4rem] border border-border-secondary bg-background-fog-thin p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground-tertiary">Favoris</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#171313]">{favoriteTracks.length}</p>
                <p className="text-xs text-foreground-secondary">titres sauvegardes</p>
              </div>
              <div className="rounded-[1.4rem] border border-border-secondary bg-background-fog-thin p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground-tertiary">A suivre</p>
                <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#171313]">{upNextTracks.length}</p>
                <p className="text-xs text-foreground-secondary">titres dans la queue</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/28" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={selectedPlaylist ? 'Rechercher dans ce dossier...' : 'Rechercher un dossier ou une piste...'}
                  className="h-12 w-full rounded-full border border-black/[0.08] bg-black/[0.04] pl-11 pr-11 text-sm text-[#171313] outline-none placeholder:text-black/28 focus:border-black/[0.16]"
                />
                {search.trim() ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/[0.06] text-black/42 transition hover:bg-black hover:text-white"
                    aria-label="Effacer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="synaura-no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-black/[0.04] p-1">
                <TabButton active={tab === 'playlists'} onClick={() => { setTab('playlists'); setSelectedPlaylistId(null); }}>
                  Dossiers
                </TabButton>
                <TabButton active={tab === 'favorites'} onClick={() => { setTab('favorites'); setSelectedPlaylistId(null); }}>
                  Favoris
                </TabButton>
                <TabButton active={tab === 'recent'} onClick={() => { setTab('recent'); setSelectedPlaylistId(null); }}>
                  Recents
                </TabButton>
                <TabButton active={tab === 'queue'} onClick={() => { setTab('queue'); setSelectedPlaylistId(null); }}>
                  A suivre
                </TabButton>
              </div>
            </div>

            {tab !== 'playlists' && tab !== 'queue' ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-fog-thin px-4 py-2 text-xs text-foreground-secondary">
                  <Clock3 className="h-4 w-4" />
                  <select
                    value={trackSort}
                    onChange={(e) => setTrackSort(e.target.value as any)}
                    className="bg-transparent pr-3 outline-none"
                  >
                    <option value="recent">Recent</option>
                    <option value="title">Titre</option>
                    <option value="plays">Ecoutes</option>
                    <option value="duration">Duree</option>
                  </select>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-fog-thin px-4 py-2 text-xs text-foreground-secondary">
                  <Grid className="h-4 w-4" />
                  <select
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value as any)}
                    className="bg-transparent pr-3 outline-none"
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

                {genreFilter !== 'all' || trackSort !== 'recent' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGenreFilter('all');
                      setTrackSort('recent');
                    }}
                    className="h-10 rounded-full border border-border-secondary bg-background-fog-thin px-4 text-xs font-bold text-foreground-secondary transition hover:bg-black hover:text-white"
                  >
                    Reinitialiser
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="hidden xl:block">
            <div
              className="rounded-[1.75rem] p-4 text-[#fffaf2]"
              style={{ background: 'linear-gradient(145deg, #171313 0%, #2a1f1b 55%, #171313 100%)' }}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/42">Ancrage home</p>
                  <p className="text-lg font-black tracking-[-0.04em]">Home feeling.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/48">
                La bibliotheque garde ses playlists, ses likes et sa queue, mais elle parle maintenant la meme langue que ton accueil.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  void header;

  if (loading) {
    return (
      <SynauraAppShell>
        <SynauraTopBar searchHref="/discover" searchLabel="Explorer le catalogue Synaura..." />
        <SynauraRouteNav />
        <SynauraAnnouncementStrip />
        <div className={cx(LIBRARY_SCOPE_CLASS, 'px-1 pb-20')}>
          <LibraryPageSkeleton />
        </div>
        <style jsx global>{LIBRARY_SCOPE_CSS}</style>
      </SynauraAppShell>
    );
  }

  if (!userId) {
    return (
      <SynauraAppShell>
        <SynauraTopBar searchHref="/discover" searchLabel="Explorer le catalogue Synaura..." />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <div className={cx(LIBRARY_SCOPE_CLASS, 'min-h-[70vh] px-4 py-10')}>
        <SynauraPanel className="mx-auto max-w-xl p-6 text-center">
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
        </SynauraPanel>
      </div>
      <style jsx global>{LIBRARY_SCOPE_CSS}</style>
      </SynauraAppShell>
    );
  }

  if (error) {
    return (
      <SynauraAppShell>
        <SynauraTopBar searchHref="/discover" searchLabel="Explorer le catalogue Synaura..." />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <div className={cx(LIBRARY_SCOPE_CLASS, 'min-h-[70vh] px-4 py-10')}>
        <SynauraPanel className="mx-auto max-w-xl p-6">
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
        </SynauraPanel>
      </div>
      <style jsx global>{LIBRARY_SCOPE_CSS}</style>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell>
      <SynauraTopBar searchHref="/discover" searchLabel="Explorer le catalogue Synaura..." />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <div className={cx(LIBRARY_SCOPE_CLASS, 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start')}>
        <main className="min-w-0">
          <div className="min-h-screen bg-background-primary text-foreground-primary">
            {synauraHeader}

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
                      src={selectedPlaylist.coverUrl || '/default-cover.svg'}
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
                  subtitle={`${upNextTracks.length} titre(s)`}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        clearUpNext();
                      }}
                      className="h-11 px-4 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition"
                      disabled={upNextTracks.length === 0}
                    >
                      Vider
                    </button>
                  }
                />

                <div className="mt-4 rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
                  <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between">
                    <div className="text-sm text-foreground-secondary">Activer “À suivre”</div>
                    <button
                      type="button"
                      onClick={toggleUpNextEnabled}
                      className={cx(
                        'h-7 w-12 rounded-full border border-border-secondary transition relative',
                        upNextEnabled ? 'bg-overlay-on-primary' : 'bg-background-tertiary',
                      )}
                      aria-label="Toggle à suivre"
                    >
                      <span
                        className={cx(
                          'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background-primary transition',
                          upNextEnabled ? 'left-6' : 'left-1',
                        )}
                      />
                    </button>
                  </div>

                  <div className="px-4 py-3 text-sm text-foreground-secondary border-b border-border-secondary/60">
                    Prochains titres
                  </div>

                  <div className="divide-y divide-border-secondary/40">
                    {upNextTracks.length ? (
                      upNextTracks.map((t: any) => (
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
                            onClick={() => removeFromUpNext(t._id)}
                            className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-red-500/15 hover:border-red-500/30 transition grid place-items-center"
                            aria-label="Retirer"
                          >
                            <Trash2 className="h-4 w-4 text-red-300" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-sm text-foreground-secondary">
                        Rien à suivre pour le moment. Ajoute des titres via “Lire ensuite” / “Ajouter à la file”.
                      </div>
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
          </div>
        </main>

        <aside className="hidden space-y-4 xl:block">
          <SynauraInkPanel className="p-4">
            <p className="mb-3 text-sm font-black">Bibliotheque vivante</p>
            <div className="rounded-[1.4rem] bg-white/8 p-4">
              <p className="text-3xl font-black leading-none">Queue.</p>
              <p className="text-3xl font-black leading-none text-white/55">Favorites.</p>
              <p className="mt-3 text-sm leading-6 text-white/45">
                Ta lecture, tes likes et tes playlists gardent leur logique complete, dans une bibliotheque maintenant vraiment alignee sur la home.
              </p>
            </div>
          </SynauraInkPanel>

          <SynauraPanel className="p-4">
            <p className="mb-3 text-sm font-black">Repères rapides</p>
            <div className="grid gap-2">
              <div className="rounded-2xl bg-black/[0.045] p-3">
                <p className="text-xl font-black">{playlists.length}</p>
                <p className="text-xs text-black/40">dossiers</p>
              </div>
              <div className="rounded-2xl bg-black/[0.045] p-3">
                <p className="text-xl font-black">{favoriteTracks.length}</p>
                <p className="text-xs text-black/40">favoris</p>
              </div>
              <div className="rounded-2xl bg-black/[0.045] p-3">
                <p className="text-xl font-black">{recentTracks.length}</p>
                <p className="text-xs text-black/40">recents</p>
              </div>
              <div className="rounded-2xl bg-black/[0.045] p-3">
                <p className="text-xl font-black">{upNextTracks.length}</p>
                <p className="text-xs text-black/40">a suivre</p>
              </div>
            </div>
          </SynauraPanel>
        </aside>
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
                    className={cx(LIBRARY_MODAL_CLASS, 'w-[92vw] max-w-md rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden')}
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
                    className={cx(LIBRARY_MODAL_CLASS, 'w-[92vw] max-w-[460px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden')}
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
                    className={cx(LIBRARY_MODAL_CLASS, 'w-[92vw] max-w-[520px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden')}
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
                    className={cx(LIBRARY_MODAL_CLASS, 'w-[92vw] max-w-md rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden')}
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
      <style jsx global>{LIBRARY_SCOPE_CSS}</style>
    </SynauraAppShell>
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
        'h-10 shrink-0 rounded-full px-4 text-sm font-black transition',
        active
          ? 'bg-[#171313] text-[#fffaf2] shadow-[0_10px_24px_rgba(23,19,19,0.14)]'
          : 'text-black/45 hover:bg-black/[0.06] hover:text-[#171313]',
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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground-tertiary">Collection</div>
        <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#171313]">{title}</div>
        <div className="mt-1 text-sm text-foreground-secondary">{subtitle}</div>
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
  const cover = playlist.coverUrl || '/default-cover.svg';
  const count = playlist.trackCount || playlist.tracks?.length || 0;

  if (viewMode === 'list') {
    return (
      <div className="overflow-hidden rounded-[1.8rem] border border-border-secondary bg-background-tertiary shadow-[0_16px_40px_rgba(30,25,20,0.08)]">
        <button type="button" className="w-full text-left" onClick={onOpen}>
          <div className="flex items-center gap-3 p-3.5">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[1.1rem] border border-border-secondary bg-background-fog-thin">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt={playlist.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-black tracking-[-0.03em] text-[#171313]">{playlist.name}</div>
              <div className="mt-1 truncate text-xs text-foreground-secondary">
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
                className="grid h-10 w-10 place-items-center rounded-full bg-[#171313] text-[#fffaf2] transition hover:scale-[1.03]"
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
                className="grid h-10 w-10 place-items-center rounded-full border border-red-500/18 bg-red-500/[0.08] transition hover:bg-red-500/[0.12]"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-[#b42318]" />
              </button>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-[1.9rem] border border-border-secondary bg-background-tertiary shadow-[0_18px_42px_rgba(30,25,20,0.08)]">
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="aspect-square bg-background-fog-thin border-b border-border-secondary/60 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={playlist.name} className="h-full w-full object-cover" />
        </div>
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black tracking-[-0.03em] text-[#171313]">{playlist.name}</div>
              <div className="mt-1 text-xs text-foreground-secondary truncate">
                {count} piste{count > 1 ? 's' : ''} • {playlist.isPublic ? 'Public' : 'Privé'}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#171313] text-[#fffaf2] transition opacity-0 group-hover:opacity-100 hover:scale-[1.03]"
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
  const cover = track.coverUrl || '/default-cover.svg';
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-[1.5rem] px-3 py-2.5 transition',
        isActive ? 'bg-[#171313] text-[#fffaf2]' : 'hover:bg-black/[0.035]',
        disabled && 'opacity-60',
      )}
    >
      <div
        className={cx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-black',
          isActive ? 'bg-white/10 text-white/72' : 'bg-black/[0.05] text-black/36',
        )}
      >
        {index + 1}
      </div>
      <button
        type="button"
        onClick={onPlay}
        disabled={disabled}
        className={cx(
          'grid h-11 w-11 shrink-0 place-items-center rounded-full transition',
          isActive ? 'bg-[#fffaf2] text-[#171313]' : 'border border-border-secondary bg-background-fog-thin hover:bg-black hover:text-white',
        )}
        aria-label="Lire"
      >
        {isActive && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div
        className={cx(
          'h-11 w-11 shrink-0 overflow-hidden rounded-[1rem] border',
          isActive ? 'border-white/10 bg-white/10' : 'border-border-secondary bg-background-tertiary',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={track.title} className="h-full w-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className={cx('truncate text-sm font-black tracking-[-0.03em]', isActive ? 'text-[#fffaf2]' : 'text-foreground-primary')}>{track.title || 'Titre'}</div>
        <div className={cx('truncate text-xs', isActive ? 'text-white/52' : 'text-foreground-tertiary')}>{track.artist?.name || 'Artiste'}</div>
      </div>

      <div className={cx('hidden items-center gap-4 text-xs sm:flex', isActive ? 'text-white/48' : 'text-foreground-tertiary')}>
        <span className="tabular-nums">{formatDuration(track.duration || 0)}</span>
        <span className="tabular-nums">{formatCompact(track.plays || 0)} ecoutes</span>
      </div>

      <button
        type="button"
        onClick={onToggleLike}
        disabled={disabled || likeLoading}
        className={cx(
          'grid h-10 w-10 place-items-center rounded-full border transition',
          isActive ? 'border-white/12 bg-white/10 text-white' : 'border-border-secondary bg-background-fog-thin hover:bg-black hover:text-white',
          liked && !isActive && 'border-red-500/22 text-[#b42318]',
        )}
        aria-label="Favori"
      >
        <Heart className={cx('h-4 w-4', liked && (isActive ? 'fill-white' : 'fill-[#ef4444]'))} />
      </button>

      <button
        type="button"
        className={cx(
          'grid h-10 w-10 place-items-center rounded-full border transition',
          isActive ? 'border-white/12 bg-white/10 text-white' : 'border-border-secondary bg-background-fog-thin hover:bg-black hover:text-white',
        )}
        aria-label="Plus"
        onClick={onMore}
      >
        <MoreVertical className={cx('h-4 w-4', isActive ? 'text-white/72' : 'text-foreground-tertiary')} />
      </button>
    </div>
  );
}

