'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Pause, Shuffle, Share2, ListPlus, Clock, Music, Disc3, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import BottomNav from '@/components/BottomNav';
import TrackCover from '@/components/TrackCover';

interface Track {
  _id: string;
  title: string;
  artist: { _id?: string; username?: string; name?: string; avatar?: string };
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
  genre?: string[];
  likes?: any;
  plays?: number;
  isLiked?: boolean;
  comments?: any;
  album?: string | null;
}

interface AlbumData {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  trackCount: number;
  duration: number;
  isPublic: boolean;
  isAlbum: boolean;
  tracks: Track[];
  createdBy: string;
  createdAt: string;
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-32">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8">
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="h-4 w-20 bg-white/5 rounded animate-pulse mx-auto sm:mx-0" />
            <div className="h-8 w-64 bg-white/5 rounded animate-pulse mx-auto sm:mx-0" />
            <div className="h-4 w-40 bg-white/5 rounded animate-pulse mx-auto sm:mx-0" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { audioState, setQueueAndPlay, addToUpNext, playTrack } = useAudioPlayer();

  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/playlists/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Album introuvable');
        const data = await res.json();
        setAlbum(data);
      } catch {
        setError('Album introuvable ou prive');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const totalDuration = useMemo(() => (album?.tracks || []).reduce((s, t) => s + (t.duration || 0), 0), [album]);
  const artistName = useMemo(() => album?.tracks?.[0]?.artist?.name || album?.tracks?.[0]?.artist?.username || 'Artiste', [album]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const fmtTotal = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
  };

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];
  const isPlayingAlbum = useMemo(() => {
    if (!album) return false;
    const albumIds = new Set(album.tracks.map((t) => t._id));
    return !!currentTrack && albumIds.has(currentTrack._id) && audioState.isPlaying;
  }, [album, currentTrack, audioState.isPlaying]);

  const playAlbum = useCallback((startIndex = 0) => {
    if (!album?.tracks.length) return;
    const tracks = album.tracks.map((t) => ({
      ...t,
      likes: t.likes || [],
      comments: t.comments || [],
      plays: t.plays || 0,
      album: album.name,
    }));
    setQueueAndPlay(tracks as any, startIndex);

    // Emit album context
    window.dispatchEvent(new CustomEvent('albumContext', {
      detail: { id: album._id, name: album.name, coverUrl: album.coverUrl || null, totalTracks: album.tracks.length }
    }));
  }, [album, setQueueAndPlay]);

  const shuffleAlbum = useCallback(() => {
    if (!album?.tracks.length) return;
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    const tracks = shuffled.map((t) => ({
      ...t,
      likes: t.likes || [],
      comments: t.comments || [],
      plays: t.plays || 0,
      album: album.name,
    }));
    setQueueAndPlay(tracks as any, 0);

    window.dispatchEvent(new CustomEvent('albumContext', {
      detail: { id: album._id, name: album.name, coverUrl: album.coverUrl || null, totalTracks: album.tracks.length }
    }));
  }, [album, setQueueAndPlay]);

  const shareAlbum = useCallback(async () => {
    if (!album) return;
    const url = `${window.location.origin}/album/${album._id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: album.name, text: `Ecoute ${album.name} sur Synaura`, url });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success('Lien copie', 'Le lien de l\'album a ete copie');
      }
    } catch {}
  }, [album]);

  const addAllToQueue = useCallback(() => {
    if (!album?.tracks.length) return;
    album.tracks.forEach((t) => {
      addToUpNext({ ...t, likes: t.likes || [], comments: t.comments || [], plays: t.plays || 0, album: album.name } as any, 'end');
    });
    notify.success('Ajoute', `${album.tracks.length} pistes ajoutees a la file`);
  }, [album, addToUpNext]);

  if (loading) return <Skeleton />;
  if (error || !album) {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Disc3 className="w-16 h-16 text-white/10 mx-auto" />
          <h1 className="text-xl font-bold text-white/60">{error || 'Album introuvable'}</h1>
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-full bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.1] transition">Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pb-32">
      {/* Background glow */}
      {album.coverUrl && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <img src={album.coverUrl} alt="" className="w-full h-96 object-cover blur-[100px] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a14]/80 to-[#0a0a14]" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-6 sm:pt-10">
        {/* Back button */}
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* ─── Hero ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8"
        >
          {/* Cover */}
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 flex-shrink-0 border border-white/[0.06]">
            {album.coverUrl ? (
              <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <Disc3 className="w-16 h-16 text-white/20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">Album</span>
            <h1 className="text-2xl sm:text-4xl font-black mt-1 leading-tight">{album.name}</h1>
            <p className="text-sm text-white/50 mt-1">{artistName}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-white/30 justify-center sm:justify-start">
              <span>{album.trackCount} titre{album.trackCount > 1 ? 's' : ''}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{fmtTotal(totalDuration)}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{new Date(album.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })}</span>
            </div>
            {album.description && (
              <p className="text-xs text-white/30 mt-2 line-clamp-2">{album.description}</p>
            )}
          </div>
        </motion.div>

        {/* ─── Actions ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => isPlayingAlbum ? playTrack(currentTrack!) : playAlbum(0)}
            className="h-11 px-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:opacity-90 transition flex items-center gap-2 shadow-lg shadow-violet-500/20"
          >
            {isPlayingAlbum ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlayingAlbum ? 'Pause' : 'Lecture'}
          </button>
          <button onClick={shuffleAlbum} className="h-11 w-11 rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition flex items-center justify-center" title="Aleatoire">
            <Shuffle className="w-4 h-4 text-white/60" />
          </button>
          <button onClick={addAllToQueue} className="h-11 w-11 rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition flex items-center justify-center" title="Ajouter a la file">
            <ListPlus className="w-4 h-4 text-white/60" />
          </button>
          <button onClick={shareAlbum} className="h-11 w-11 rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition flex items-center justify-center" title="Partager">
            <Share2 className="w-4 h-4 text-white/60" />
          </button>
        </motion.div>

        {/* ─── Track list ─────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.04] overflow-hidden"
        >
          {/* Header */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-white/20 border-b border-white/[0.04]">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Titre</span>
            <Clock className="w-3 h-3" />
          </div>

          {/* Tracks */}
          {album.tracks.map((track, idx) => {
            const isActive = currentTrack?._id === track._id;
            const isThisPlaying = isActive && audioState.isPlaying;
            return (
              <button
                key={track._id}
                type="button"
                onClick={() => playAlbum(idx)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition group',
                  isActive ? 'bg-violet-500/8' : 'hover:bg-white/[0.03]',
                ].join(' ')}
              >
                {/* Track number / play icon */}
                <span className="w-8 text-center flex-shrink-0">
                  {isThisPlaying ? (
                    <span className="flex items-center justify-center gap-px">
                      <span className="w-0.5 h-3 bg-violet-400 rounded-full animate-pulse" />
                      <span className="w-0.5 h-4 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-0.5 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <span className={`text-sm font-mono ${isActive ? 'text-violet-400' : 'text-white/20 group-hover:hidden'}`}>{idx + 1}</span>
                  )}
                  {!isThisPlaying && !isActive && (
                    <Play className="w-4 h-4 text-white/60 hidden group-hover:block mx-auto" />
                  )}
                </span>

                {/* Cover mini (mobile) */}
                <div className="sm:hidden w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <TrackCover src={track.coverUrl || album.coverUrl} title={track.title} className="w-full h-full" rounded="rounded-lg" objectFit="cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-violet-400' : 'text-white/80'}`}>{track.title}</p>
                  <p className="text-[11px] text-white/30 truncate">{track.artist?.name || track.artist?.username || artistName}</p>
                </div>

                {/* Duration */}
                <span className="text-xs text-white/20 tabular-nums flex-shrink-0">{fmt(track.duration)}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Footer info */}
        <div className="mt-6 text-xs text-white/20 text-center sm:text-left">
          {album.trackCount} titre{album.trackCount > 1 ? 's' : ''} — {fmtTotal(totalDuration)}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
