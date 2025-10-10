'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Share2, Music, Clock, Eye, Copy } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

interface Track {
  _id: string;
  title: string;
  artist: { username?: string; name?: string };
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
}

interface PlaylistView {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  isPublic: boolean;
  tracks: Track[];
}

function Skeleton() {
  return (
    <div className="min-h-screen text-[var(--text)]">
      <main className="container mx-auto px-4 pt-16 pb-24 max-w-4xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-28 h-28 rounded-lg bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-72 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-white/10 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

export default function PublicPlaylistPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const [data, setData] = useState<PlaylistView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/playlists/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('not ok');
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError('Dossier introuvable ou privé');
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const totalDuration = useMemo(() => (data?.tracks || []).reduce((a, t) => a + (t.duration || 0), 0), [data?.tracks]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor((seconds || 0) / 60);
    const secs = Math.floor((seconds || 0) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <Skeleton />;
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text)]">{error || 'Erreur'}</div>
    );
  }

  const share = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) await navigator.share({ title: data.name, url });
      else await navigator.clipboard.writeText(url);
      notify.success('Lien copié');
    } catch {}
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify.success('Lien copié');
    } catch {}
  };

  return (
    <div className="min-h-screen text-[var(--text)]">
      <main className="container mx-auto px-4 pt-16 pb-24 max-w-4xl">
        <div className="flex items-start gap-4 mb-6">
          <img
            src={(data.coverUrl || '/default-cover.jpg').replace('/upload/','/upload/f_auto,q_auto/')}
            alt={data.name}
            className="w-28 h-28 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Music size={18} className="text-[var(--color-primary)]" /> {data.name}
            </h1>
            <p className="text-[var(--text-muted)] text-sm line-clamp-3">{data.description}</p>
            <div className="flex items-center gap-3 text-xs text-white/60 mt-2">
              <span className="flex items-center gap-1"><Eye size={12} /> {data.isPublic ? 'Publique' : 'Privée'}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Barre sticky d’actions */}
        <div className="sticky top-[64px] z-10 mb-4 p-2 rounded-xl bg-[var(--surface)]/60 backdrop-blur border border-[var(--border)] flex items-center gap-2">
          <button className="w-12 h-12 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-full flex items-center justify-center transition-all">
            <Play size={20} />
          </button>
          <button onClick={share} className="p-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
            <Share2 size={18} />
          </button>
          <button onClick={copyLink} className="p-3 rounded-full bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
            <Copy size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {data.tracks.map((track, idx) => (
            <motion.div
              key={track._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
            >
              <span className="w-6 text-white/40 text-sm">{idx + 1}</span>
              <img src={track.coverUrl || '/default-cover.jpg'} alt={track.title} className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{track.title}</div>
                <div className="text-xs text-white/60 truncate">{track.artist?.name || track.artist?.username}</div>
              </div>
              <span className="text-xs text-white/40">{formatDuration(track.duration)}</span>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}


