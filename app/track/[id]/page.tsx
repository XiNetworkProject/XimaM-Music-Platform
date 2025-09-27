'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/app/providers';

export const dynamic = 'force-dynamic';

export default function TrackDeepLinkPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { playTrack, setShowPlayer, setIsMinimized } = useAudioPlayer();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAI = useMemo(() => id?.toString().startsWith('ai-'), [id]);
  const cleanId = useMemo(() => isAI ? id.toString().slice(3) : id?.toString(), [id, isAI]);
  const autoplay = search.get('autoplay') !== '0';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cleanId) { setError('ID invalide'); return; }
        const api = isAI ? `/api/ai/tracks/${cleanId}` : `/api/tracks/${cleanId}`;
        const res = await fetch(api, { cache: 'no-store' });
        if (!res.ok) throw new Error('Track introuvable');
        const t = await res.json();
        if (cancelled) return;
        if (autoplay) {
          // Normaliser la piste au format du player
          const normalized = (() => {
            if (t && t._id && t.audioUrl) return t; // déjà au bon format (IA)
            return {
              _id: t.id || cleanId,
              title: t.title,
              artist: {
                _id: t.artist_id || 'unknown',
                name: t.artist || t.artist_name || 'Artiste inconnu',
                username: t.artist || t.artist_name || 'unknown',
                avatar: t.coverUrl || null,
              },
              audioUrl: t.audioUrl,
              coverUrl: t.coverUrl || null,
              duration: t.duration || 0,
              likes: [],
              comments: [],
              plays: t.plays || 0,
              genre: t.genre || [],
              isLiked: false,
            } as any;
          })();
          await playTrack(normalized);
          try {
            setShowPlayer(true);
            setIsMinimized(false);
          } catch {}
        }
        // Rediriger vers l'accueil après injection au player
        router.replace('/');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Erreur');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cleanId, isAI, autoplay, playTrack, router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white/80">
      {loading ? 'Chargement…' : (error ? `Erreur: ${error}` : 'Lecture…')}
    </div>
  );
}


