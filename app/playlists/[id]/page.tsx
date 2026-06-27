'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Copy,
  Download,
  Heart,
  ListPlus,
  MessageCircle,
  Music2,
  Pause,
  Play,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  X,
} from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import CommentDialog from '@/components/CommentDialog';
import { notify } from '@/components/NotificationCenter';

type Track = {
  _id: string;
  title: string;
  artist: { _id?: string; username?: string; name?: string; avatar?: string };
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
  genre?: string[];
  likes?: any;
  likesCount?: number;
  comments?: any;
  commentsCount?: number;
  plays?: number;
  isLiked?: boolean;
  album?: string | null;
};

type EditorialCollection = {
  id: string;
  playlistId: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  kind: string;
  bannerUrl: string | null;
  coverUrl: string | null;
  themeColors: string[];
  badge: string;
  isFeatured: boolean;
  isPublished: boolean;
  downloadEnabled: boolean;
  commentsEnabled: boolean;
};

type PlaylistView = {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  isPublic: boolean;
  isAlbum?: boolean;
  tracks: Track[];
  editorialCollection?: EditorialCollection | null;
  collection?: EditorialCollection | null;
};

function formatDuration(seconds: number, compact = false) {
  const total = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (compact && hours > 0) return `${hours}h ${mins}m`;
  if (compact) return `${mins}m ${secs}s`;
  return hours > 0
    ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${mins}:${String(secs).padStart(2, '0')}`;
}

function imageUrl(url?: string | null) {
  if (!url) return '/default-cover.svg';
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/f_auto,q_auto/') : url;
}

function trackArtist(track: Track) {
  return track.artist?.name || track.artist?.username || 'Synaura';
}

function trackLikeCount(track: Track) {
  if (typeof track.likesCount === 'number') return track.likesCount;
  if (typeof track.likes === 'number') return track.likes;
  if (Array.isArray(track.likes)) return track.likes.length;
  return 0;
}

function trackCommentsCount(track: Track) {
  if (typeof track.commentsCount === 'number') return track.commentsCount;
  if (typeof track.comments === 'number') return track.comments;
  if (Array.isArray(track.comments)) return track.comments.length;
  return 0;
}

function toPlayerTrack(track: Track) {
  return {
    ...track,
    likes: trackLikeCount(track),
    comments: trackCommentsCount(track),
    plays: track.plays || 0,
    coverUrl: imageUrl(track.coverUrl),
    artist: {
      _id: track.artist?._id || track.artist?.username || 'synaura',
      name: trackArtist(track),
      username: track.artist?.username || trackArtist(track),
      avatar: track.artist?.avatar,
    },
  };
}

export default function PublicPlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const player = useAudioPlayer();
  const [data, setData] = useState<PlaylistView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentTrack, setCommentTrack] = useState<Track | null>(null);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Tous');
  const [sort, setSort] = useState<'position' | 'title' | 'duration'>('position');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/playlists/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Playlist introuvable');
        const json = await res.json();
        if (json.isAlbum) {
          router.replace(`/album/${id}`);
          return;
        }
        if (cancelled) return;
        setData(json);
        setLiked(Object.fromEntries((json.tracks || []).map((track: Track) => [track._id, Boolean(track.isLiked)])));
        setLikesCount(Object.fromEntries((json.tracks || []).map((track: Track) => [track._id, trackLikeCount(track)])));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Playlist introuvable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const collection = data?.editorialCollection || data?.collection || null;
  const colors = collection?.themeColors?.length ? collection.themeColors : ['#8B5CF6', '#EC4899', '#22D3EE'];
  const totalDuration = useMemo(() => (data?.tracks || []).reduce((a, t) => a + (t.duration || 0), 0), [data?.tracks]);
  const totalLikes = useMemo(() => Object.values(likesCount).reduce((a, b) => a + Number(b || 0), 0), [likesCount]);
  const cover = imageUrl(collection?.coverUrl || data?.coverUrl || data?.tracks?.[0]?.coverUrl);
  const banner = imageUrl(collection?.bannerUrl || collection?.coverUrl || data?.coverUrl || data?.tracks?.[0]?.coverUrl);

  const genres = useMemo(() => {
    const values = new Set<string>();
    for (const track of data?.tracks || []) {
      (track.genre || []).forEach((entry) => entry && values.add(entry));
    }
    return ['Tous', ...Array.from(values).slice(0, 16)];
  }, [data?.tracks]);

  const visibleTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    let tracks = [...(data?.tracks || [])];
    if (genre !== 'Tous') tracks = tracks.filter((track) => (track.genre || []).some((entry) => entry.toLowerCase() === genre.toLowerCase()));
    if (q) {
      tracks = tracks.filter((track) => `${track.title} ${trackArtist(track)} ${(track.genre || []).join(' ')}`.toLowerCase().includes(q));
    }
    if (sort === 'title') tracks.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'duration') tracks.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return tracks;
  }, [data?.tracks, genre, query, sort]);

  const share = async (title = data?.name || 'Playlist Synaura', url?: string) => {
    const href = url || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      if (navigator.share) await navigator.share({ title, url: href });
      else await navigator.clipboard.writeText(href);
      notify.success('Lien copie');
    } catch {}
  };

  const copyLink = async () => {
    if (typeof window === 'undefined') return;
    await navigator.clipboard.writeText(window.location.href);
    notify.success('Lien copie');
  };

  const playTracks = (tracks: Track[], startIndex = 0) => {
    if (!tracks.length) return;
    player.setQueueAndPlay(tracks.map(toPlayerTrack) as any, Math.max(0, startIndex));
  };

  const playTrack = (track: Track) => {
    const index = visibleTracks.findIndex((item) => item._id === track._id);
    playTracks(visibleTracks, index >= 0 ? index : 0);
  };

  const shufflePlay = () => {
    const tracks = [...(data?.tracks || [])].sort(() => Math.random() - 0.5);
    playTracks(tracks, 0);
  };

  const queueTrack = (track: Track) => {
    player.addToUpNext(toPlayerTrack(track) as any, 'end');
    notify.success('Ajoute a la file', track.title);
  };

  const toggleLike = async (track: Track) => {
    const wasLiked = Boolean(liked[track._id]);
    setLiked((prev) => ({ ...prev, [track._id]: !wasLiked }));
    setLikesCount((prev) => ({ ...prev, [track._id]: Math.max(0, Number(prev[track._id] || 0) + (wasLiked ? -1 : 1)) }));
    try {
      const res = await fetch(`/api/tracks/${encodeURIComponent(track._id)}/like`, { method: wasLiked ? 'DELETE' : 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Like impossible');
      if (typeof json.likesCount === 'number') setLikesCount((prev) => ({ ...prev, [track._id]: json.likesCount }));
      if (typeof json.isLiked === 'boolean') setLiked((prev) => ({ ...prev, [track._id]: json.isLiked }));
    } catch (e: any) {
      setLiked((prev) => ({ ...prev, [track._id]: wasLiked }));
      setLikesCount((prev) => ({ ...prev, [track._id]: Math.max(0, Number(prev[track._id] || 0) + (wasLiked ? 1 : -1)) }));
      notify.error('Action impossible', e?.message || 'Connecte-toi pour liker');
    }
  };

  const downloadTrack = (track: Track) => {
    if (!collection?.downloadEnabled || !track.audioUrl) return;
    const a = document.createElement('a');
    a.href = track.audioUrl;
    a.download = `${track.title || 'synaura-track'}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171313] p-5 text-[#fffaf2]">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-80 animate-pulse rounded-[2.2rem] bg-white/10" />
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[1.4rem] bg-white/10" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#171313] p-5 text-center text-[#fffaf2]">
        <div className="max-w-sm rounded-[2rem] border border-white/10 bg-white/8 p-8 backdrop-blur">
          <Music2 className="mx-auto mb-4 h-9 w-9 text-white/40" />
          <h1 className="text-2xl font-black">Playlist introuvable</h1>
          <p className="mt-2 text-sm font-semibold text-white/54">{error || 'Cette collection n est pas disponible.'}</p>
          <button type="button" onClick={() => router.back()} className="mt-5 rounded-full bg-[#fffaf2] px-5 py-3 text-sm font-black text-[#171313]">
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-[#fffaf2]"
      style={{
        background: `radial-gradient(circle at 8% 0%, ${colors[0]}66, transparent 34%), radial-gradient(circle at 92% 8%, ${colors[1] || colors[0]}55, transparent 32%), linear-gradient(135deg, #171313 0%, ${colors[0]} 48%, ${colors[2] || colors[1] || colors[0]} 100%)`,
      }}
    >
      <img src={banner} alt="" className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-20 blur-3xl scale-110" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(23,19,19,0.38),rgba(23,19,19,0.90)_70%,rgba(23,19,19,0.96))]" />

      <main className="relative mx-auto max-w-7xl px-4 pb-32 pt-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 text-xs font-black text-white/80 backdrop-blur transition hover:bg-white/16">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={copyLink} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/10 text-white/80 backdrop-blur transition hover:bg-white/16">
              <Copy className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => share()} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 text-xs font-black text-white/80 backdrop-blur transition hover:bg-white/16">
              <Share2 className="h-4 w-4" />
              Partager
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/12 bg-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-48 saturate-[1.08]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,13,13,0.92),rgba(17,13,13,0.58),rgba(17,13,13,0.20))]" />
          <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
            <div className="flex min-h-[440px] flex-col justify-end">
              <p className="mb-3 inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/82 backdrop-blur">
                {collection?.badge || 'Playlist Synaura'}
              </p>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.88] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                {collection?.title || data.name}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-bold leading-7 text-white/78 sm:text-lg">
                {collection?.subtitle || data.description || 'Une selection musicale Synaura.'}
              </p>
              {collection?.description && collection.description !== collection.subtitle ? (
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/56">{collection.description}</p>
              ) : null}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => playTracks(data.tracks, 0)} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#fffaf2] px-6 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
                  <Play className="h-4 w-4 fill-current" />
                  Tout lire
                </button>
                <button type="button" onClick={shufflePlay} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/14 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                  <Shuffle className="h-4 w-4" />
                  Aleatoire
                </button>
                <button type="button" onClick={() => visibleTracks[0] && queueTrack(visibleTracks[0])} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/14 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                  <ListPlus className="h-4 w-4" />
                  Ajouter a la file
                </button>
              </div>
            </div>

            <div className="flex items-end justify-center lg:justify-end">
              <div className="relative w-full max-w-[360px]">
                <div className="absolute -inset-8 rounded-[3rem] bg-white/18 blur-3xl" />
                <img src={cover} alt={data.name} className="relative aspect-square w-full rounded-[2.2rem] border border-white/18 object-cover shadow-[0_30px_90px_rgba(0,0,0,0.42)]" />
                <div className="relative -mt-10 mx-5 grid grid-cols-3 gap-2 rounded-[1.6rem] border border-white/12 bg-[#171313]/74 p-3 backdrop-blur-xl">
                  <Stat label="Titres" value={String(data.tracks.length)} />
                  <Stat label="Duree" value={formatDuration(totalDuration, true)} />
                  <Stat label="Likes" value={String(totalLikes)} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-2 z-20 my-5 rounded-[1.7rem] border border-white/12 bg-[#171313]/70 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
            <div className="flex h-12 items-center gap-3 rounded-full bg-white/10 px-4">
              <Search className="h-4 w-4 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher dans la collection..."
                className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/36"
              />
              {query ? <button type="button" onClick={() => setQuery('')}><X className="h-4 w-4 text-white/45" /></button> : null}
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {genres.map((item) => (
                <button key={item} type="button" onClick={() => setGenre(item)} className={`h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${genre === item ? 'bg-[#fffaf2] text-[#171313]' : 'bg-white/10 text-white/58 hover:bg-white/16'}`}>
                  {item}
                </button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-10 rounded-full border border-white/12 bg-white/10 px-4 text-xs font-black text-white outline-none">
              <option value="position">Ordre officiel</option>
              <option value="title">Titre A-Z</option>
              <option value="duration">Les plus longs</option>
            </select>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="space-y-3">
            {visibleTracks.map((track, idx) => {
              const active = player.audioState.tracks[player.audioState.currentTrackIndex]?._id === track._id;
              const isPlaying = active && player.audioState.isPlaying;
              return (
                <motion.div
                  key={track._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.014, 0.22) }}
                  className={`group grid gap-3 rounded-[1.55rem] border p-3 backdrop-blur-xl transition sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
                    active ? 'border-white/38 bg-white/20 shadow-[0_18px_70px_rgba(255,255,255,0.10)]' : 'border-white/10 bg-white/9 hover:bg-white/13'
                  }`}
                >
                  <button type="button" onClick={() => playTrack(track)} className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-[1.25rem] bg-white/10">
                    <img src={imageUrl(track.coverUrl || cover)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="relative grid h-9 w-9 place-items-center rounded-full bg-[#171313]/78 text-white backdrop-blur">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                    </span>
                  </button>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="hidden w-8 text-right text-xs font-black text-white/32 sm:block">{String(idx + 1).padStart(2, '0')}</span>
                      <p className="truncate text-base font-black text-white">{track.title}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-white/48">
                      <span>{trackArtist(track)}</span>
                      {track.genre?.[0] ? <><span>·</span><span>{track.genre[0]}</span></> : null}
                      <span>·</span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button type="button" onClick={() => toggleLike(track)} className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black transition ${liked[track._id] ? 'bg-[#EC4899]/20 text-[#ffd8ee]' : 'bg-white/10 text-white/62 hover:text-white'}`}>
                      <Heart className={`h-4 w-4 ${liked[track._id] ? 'fill-current' : ''}`} />
                      {likesCount[track._id] || 0}
                    </button>
                    {collection?.commentsEnabled !== false ? (
                      <button type="button" onClick={() => setCommentTrack(track)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/62 transition hover:text-white">
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button type="button" onClick={() => queueTrack(track)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/62 transition hover:text-white">
                      <ListPlus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => share(track.title, `${window.location.origin}/track/${track._id}`)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/62 transition hover:text-white">
                      <Share2 className="h-4 w-4" />
                    </button>
                    {collection?.downloadEnabled && track.audioUrl ? (
                      <button type="button" onClick={() => downloadTrack(track)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/62 transition hover:text-white">
                        <Download className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
            {!visibleTracks.length ? (
              <div className="rounded-[1.6rem] border border-white/10 bg-white/10 p-8 text-center backdrop-blur">
                <Music2 className="mx-auto h-10 w-10 text-white/34" />
                <p className="mt-3 text-lg font-black">Aucun titre ici</p>
                <p className="mt-1 text-sm font-semibold text-white/50">Change la recherche ou le filtre de genre.</p>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <InfoCard title="A propos" icon={<Sparkles className="h-5 w-5" />}>
              <p className="text-sm font-semibold leading-6 text-white/62">
                {collection?.description || data.description || 'Une playlist Synaura a ecouter, partager et sauvegarder.'}
              </p>
            </InfoCard>
            <InfoCard title="Actions utiles" icon={<ListPlus className="h-5 w-5" />}>
              <div className="grid gap-2">
                <button type="button" onClick={() => playTracks(visibleTracks, 0)} className="rounded-2xl bg-[#fffaf2] px-4 py-3 text-left text-sm font-black text-[#171313]">Lire la selection visible</button>
                <button type="button" onClick={shufflePlay} className="rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-black text-white/78">Melanger toute la collection</button>
                <button type="button" onClick={copyLink} className="rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-black text-white/78">Copier le lien public</button>
              </div>
            </InfoCard>
            <InfoCard title="Details" icon={<Clock className="h-5 w-5" />}>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Titres" value={String(data.tracks.length)} />
                <Stat label="Duree" value={formatDuration(totalDuration, true)} />
                <Stat label="Likes" value={String(totalLikes)} />
                <Stat label="Acces" value={data.isPublic ? 'Public' : 'Prive'} />
              </div>
            </InfoCard>
          </aside>
        </div>
      </main>

      {commentTrack ? (
        <CommentDialog
          trackId={commentTrack._id}
          trackTitle={commentTrack.title}
          trackArtist={trackArtist(commentTrack)}
          initialComments={[]}
          isOpen={Boolean(commentTrack)}
          onClose={() => setCommentTrack(null)}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-white/10 p-3 text-white">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/42">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function InfoCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-[#171313]/58 p-5 text-white shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
      <div className="mb-3 flex items-center gap-2 text-white/82">
        {icon}
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}
