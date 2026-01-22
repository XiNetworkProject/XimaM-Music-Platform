'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
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
  Shuffle,
  Sparkles,
  Trash2,
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

export default function LibraryClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const { audioState, setQueueAndPlay } = useAudioPlayer();
  const { toggleLikeBatch, isBatchLoading } = useBatchLikeSystem();
  const { incrementPlaysBatch } = useBatchPlaysSystem();

  const [tab, setTab] = useState<TabKey>('playlists');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');

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
    if (!q) return list;
    return list.filter((t) => t.title.toLowerCase().includes(q) || t.artist?.name?.toLowerCase().includes(q));
  }, [recentTracks, search]);

  const visibleFav = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = favoriteTracks || [];
    if (!q) return list;
    return list.filter((t) => t.title.toLowerCase().includes(q) || t.artist?.name?.toLowerCase().includes(q));
  }, [favoriteTracks, search]);

  const playTracks = useCallback(
    async (tracks: Track[], index: number, source: string) => {
      const list = (tracks || []).filter((t) => t && t._id && t.audioUrl && !isDisabledTrackId(t._id));
      if (!list.length) return;
      try {
        setQueueAndPlay(list as any, Math.min(Math.max(0, index), list.length - 1));
        const current = list[Math.min(Math.max(0, index), list.length - 1)];
        if (current?._id) incrementPlaysBatch(current._id, current.plays || 0).catch(() => null);
      } catch {
        notify.error('Lecture', 'Impossible de lancer la lecture');
      }
    },
    [incrementPlaysBatch, setQueueAndPlay],
  );

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

        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-inactive" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un dossier ou une piste…"
              className="w-full h-11 pl-10 pr-3 rounded-2xl border border-border-secondary bg-background-fog-thin text-sm text-foreground-primary placeholder:text-foreground-inactive outline-none focus:ring-2 focus:ring-overlay-on-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <TabButton active={tab === 'playlists'} onClick={() => { setTab('playlists'); setSelectedPlaylistId(null); }}>
              Dossiers
            </TabButton>
            <TabButton active={tab === 'favorites'} onClick={() => { setTab('favorites'); setSelectedPlaylistId(null); }}>
              Favoris
            </TabButton>
            <TabButton active={tab === 'recent'} onClick={() => { setTab('recent'); setSelectedPlaylistId(null); }}>
              Récents
            </TabButton>
          </div>
        </div>
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

      {/* Create playlist modal */}
      <AnimatePresence>
        {showCreate ? (
          <motion.div
            className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm"
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
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
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
      </AnimatePresence>
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
        onClick={() => {}}
      >
        <MoreVertical className="h-4 w-4 text-foreground-tertiary" />
      </button>
    </div>
  );
}

