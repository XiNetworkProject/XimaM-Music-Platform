'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Copy, Download, Heart, MessageCircle, Music2, Play, Share2, Sparkles } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import CommentDialog from '@/components/CommentDialog';
import { notify } from '@/components/NotificationCenter';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

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

function formatDuration(seconds: number) {
  const mins = Math.floor((seconds || 0) / 60);
  const secs = Math.floor((seconds || 0) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function imageUrl(url?: string | null) {
  if (!url) return '/default-cover.svg';
  return url.includes('/upload/') ? url.replace('/upload/', '/upload/f_auto,q_auto/') : url;
}

function trackArtist(track: Track) {
  return track.artist?.name || track.artist?.username || 'Synaura';
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
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
        setLikesCount(Object.fromEntries((json.tracks || []).map((track: Track) => [track._id, Number(track.likesCount || (Array.isArray(track.likes) ? track.likes.length : track.likes || 0))])));
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
  const cover = imageUrl(collection?.coverUrl || data?.coverUrl || data?.tracks?.[0]?.coverUrl);
  const banner = imageUrl(collection?.bannerUrl || collection?.coverUrl || data?.coverUrl || data?.tracks?.[0]?.coverUrl);

  const share = async (title = data?.name || 'Playlist Synaura', url = window.location.href) => {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      notify.success('Lien copie');
    } catch {}
  };

  const playAt = (index: number) => {
    if (!data?.tracks?.length) return;
    player.setQueueAndPlay(data.tracks as any, index);
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
      <SynauraAppShell>
        <SynauraTopBar compact />
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-72 animate-pulse rounded-[2rem] bg-white/70" />
          {Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[1.4rem] bg-white/70" />)}
        </div>
      </SynauraAppShell>
    );
  }

  if (error || !data) {
    return (
      <SynauraAppShell>
        <SynauraTopBar compact />
        <main className="mx-auto grid min-h-[55vh] max-w-xl place-items-center text-center">
          <SynauraPanel className="p-8">
            <Music2 className="mx-auto mb-4 h-9 w-9 text-black/35" />
            <h1 className="text-2xl font-black">Playlist introuvable</h1>
            <p className="mt-2 text-sm font-semibold text-black/50">{error || 'Cette collection n est pas disponible.'}</p>
          </SynauraPanel>
        </main>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="pb-[calc(var(--synaura-mobile-player-space)+2rem)]">
      <SynauraTopBar compact />
      <main className="mx-auto max-w-6xl space-y-5">
        <button type="button" onClick={() => router.back()} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/82 px-4 text-xs font-black text-black/58 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <section className="relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-[#171313] text-white shadow-[0_24px_80px_rgba(30,25,20,0.20)]">
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1] || colors[0]} 45%, ${colors[2] || colors[0]} 100%)` }} />
          <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 blur-[1px] saturate-[1.05]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,19,19,0.88),rgba(23,19,19,0.52),rgba(23,19,19,0.18))]" />
          <div className="relative grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_280px] sm:p-8 lg:p-10">
            <div className="flex min-h-[300px] flex-col justify-end">
              <p className="mb-3 inline-flex w-fit rounded-full bg-white/16 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/86 backdrop-blur">
                {collection?.badge || 'Playlist Synaura'}
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-[0.92] tracking-tight sm:text-6xl">
                {collection?.title || data.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-bold leading-relaxed text-white/78">
                {collection?.subtitle || data.description || 'Une selection musicale Synaura.'}
              </p>
              {collection?.description && collection.description !== collection.subtitle ? (
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/58">{collection.description}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => playAt(0)} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
                  <Play className="h-4 w-4 fill-current" />
                  Tout lire
                </button>
                <button type="button" onClick={() => share()} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/14 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                  <Share2 className="h-4 w-4" />
                  Partager
                </button>
                <button type="button" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => notify.success('Lien copie'))} className="grid h-12 w-12 place-items-center rounded-full bg-white/14 backdrop-blur transition hover:bg-white/20">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/66">
                <span>{data.tracks.length} titres</span>
                <span>·</span>
                <span>{formatDuration(totalDuration)}</span>
                {collection?.downloadEnabled ? <><span>·</span><span>download autorise</span></> : null}
              </div>
            </div>

            <div className="hidden items-end justify-end sm:flex">
              <div className="relative h-[280px] w-[280px]">
                <div className="absolute inset-0 rounded-[2rem] bg-white/14 blur-2xl" />
                <img src={cover} alt={data.name} className="relative h-full w-full rounded-[2rem] border border-white/20 object-cover shadow-[0_24px_80px_rgba(0,0,0,0.35)]" />
                <div className="absolute -bottom-4 -left-4 rounded-[1.4rem] bg-[#fffaf2] px-4 py-3 text-[#171313] shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/42">Collection</p>
                  <p className="text-sm font-black">{data.tracks.length} sons</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {data.tracks.map((track, idx) => {
              const active = player.audioState.tracks[player.audioState.currentTrackIndex]?._id === track._id;
              return (
                <motion.div
                  key={track._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.018 }}
                  className={`group flex items-center gap-3 rounded-[1.45rem] border p-3 transition ${active ? 'border-[#8B5CF6]/45 bg-white shadow-[0_16px_50px_rgba(124,92,246,0.16)]' : 'border-black/[0.08] bg-[#fffaf2]/90 hover:bg-white'}`}
                >
                  <button type="button" onClick={() => playAt(idx)} className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-black/[0.06]">
                    <img src={imageUrl(track.coverUrl || cover)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="relative grid h-8 w-8 place-items-center rounded-full bg-black/72 text-white backdrop-blur">
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="hidden w-7 text-right text-xs font-black text-black/28 sm:block">{String(idx + 1).padStart(2, '0')}</span>
                      <p className="truncate text-sm font-black text-[#171313] sm:text-base">{track.title}</p>
                    </div>
                    <p className="truncate text-xs font-bold text-black/48">{trackArtist(track)} {track.genre?.[0] ? `· ${track.genre[0]}` : ''}</p>
                  </div>
                  <div className="hidden text-xs font-black text-black/35 sm:block">{formatDuration(track.duration)}</div>
                  <button type="button" onClick={() => toggleLike(track)} className={`grid h-10 w-10 place-items-center rounded-full transition ${liked[track._id] ? 'bg-[#EC4899]/12 text-[#EC4899]' : 'bg-black/[0.045] text-black/48 hover:text-[#EC4899]'}`}>
                    <Heart className={`h-4 w-4 ${liked[track._id] ? 'fill-current' : ''}`} />
                  </button>
                  {collection?.commentsEnabled !== false ? (
                    <button type="button" onClick={() => setCommentTrack(track)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.045] text-black/48 transition hover:text-[#8B5CF6]">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button type="button" onClick={() => share(track.title, `${window.location.origin}/track/${track._id}`)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.045] text-black/48 transition hover:text-[#22D3EE]">
                    <Share2 className="h-4 w-4" />
                  </button>
                  {collection?.downloadEnabled && track.audioUrl ? (
                    <button type="button" onClick={() => downloadTrack(track)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.045] text-black/48 transition hover:text-[#171313]">
                      <Download className="h-4 w-4" />
                    </button>
                  ) : null}
                </motion.div>
              );
            })}
          </section>

          <aside className="space-y-4">
            <SynauraPanel className="p-5">
              <Sparkles className="mb-3 h-5 w-5 text-[#8B5CF6]" />
              <h2 className="text-xl font-black">A propos</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-black/55">
                {collection?.description || data.description || 'Une playlist Synaura a ecouter, partager et sauvegarder.'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="Titres" value={String(data.tracks.length)} />
                <Stat label="Duree" value={formatDuration(totalDuration)} />
                <Stat label="Likes" value={String(Object.values(likesCount).reduce((a, b) => a + Number(b || 0), 0))} />
                <Stat label="Acces" value={data.isPublic ? 'Public' : 'Prive'} />
              </div>
            </SynauraPanel>
            <SynauraPanel className="overflow-hidden p-0">
              <div className="p-5" style={{ background: `linear-gradient(135deg, ${colors[0]}22, ${colors[1] || colors[0]}18)` }}>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/42">Admin ready</p>
                <h3 className="mt-1 text-lg font-black">Collection reutilisable</h3>
                <p className="mt-1 text-sm font-semibold text-black/54">Cette page fonctionne pour Synaura Originals et toutes les prochaines collections officielles.</p>
              </div>
            </SynauraPanel>
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
    </SynauraAppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-black/[0.045] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/36">{label}</p>
      <p className="mt-1 text-sm font-black text-[#171313]">{value}</p>
    </div>
  );
}

