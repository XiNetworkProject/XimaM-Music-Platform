'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TikTokStyleMediaScroller, { type TikTokMediaItem } from '@/components/TikTokStyleMediaScroller';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';

type ApiTrack = {
  _id: string;
  title: string;
  artist?: { name?: string; username?: string };
  coverUrl?: string;
  audioUrl?: string;
};

export default function FeedClient() {
  const { audioState, setTracks, playTrack } = useAudioPlayer();
  const [tracks, setLocalTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGesture, setHasGesture] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasBoundQueueRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/tracks?sort=trending&limit=100', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Erreur chargement tracks');
        const list = (data?.tracks || []) as ApiTrack[];
        setLocalTracks(Array.isArray(list) ? list : []);
      } catch (e: any) {
        notify.error('Feed', e?.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Préparer la queue du player une seule fois quand on a des tracks
  useEffect(() => {
    if (!tracks.length) return;
    if (hasBoundQueueRef.current) return;
    hasBoundQueueRef.current = true;

    // Adapter au type Track du player (même shape que /api/tracks)
    const playerTracks = tracks
      .filter((t) => t && t._id && t.audioUrl)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        artist: {
          _id: 'unknown',
          name: t.artist?.name || t.artist?.username || 'Unknown',
          username: t.artist?.username || 'unknown',
          avatar: undefined,
        },
        audioUrl: t.audioUrl || '',
        coverUrl: t.coverUrl,
        duration: 0,
        likes: [],
        comments: [],
        plays: 0,
        isLiked: false,
        genre: [],
      }));

    setTracks(playerTracks);
  }, [setTracks, tracks]);

  const items: TikTokMediaItem[] = useMemo(() => {
    return tracks
      .filter((t) => t && t._id)
      .map((t) => ({
        id: t._id,
        type: 'track' as const,
        title: t.title,
        subtitle: t.artist?.name || t.artist?.username || '',
        coverUrl: t.coverUrl || '/default-cover.jpg',
      }));
  }, [tracks]);

  // Autoplay comportement: jouer la track active après le 1er geste utilisateur
  useEffect(() => {
    if (!hasGesture) return;
    const current = items[activeIndex];
    if (!current || current.type !== 'track') return;
    // playTrack par id (déjà dans audioState.tracks via setTracks)
    playTrack(current.id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, hasGesture]);

  if (loading) {
    return <div className="min-h-[60vh] text-foreground-inactive">Chargement…</div>;
  }

  if (!items.length) {
    return <div className="min-h-[60vh] text-foreground-inactive">Aucune piste à afficher.</div>;
  }

  return (
    <div className="w-full">
      {!hasGesture && (
        <div className="mb-3 rounded-2xl border border-border-secondary bg-background-fog-thin p-3 text-sm text-foreground-secondary">
          Astuce: clique/tape une fois dans le feed pour autoriser l’autoplay audio (restriction navigateur).
        </div>
      )}

      <TikTokStyleMediaScroller
        items={items}
        heightOffsetPx={120}
        activeIndex={activeIndex}
        onActiveIndexChange={(i) => setActiveIndex(i)}
        onUserGesture={() => setHasGesture(true)}
        renderItem={(item, state) => {
          if (item.type !== 'track') return null;
          return (
            <div className="absolute inset-0">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.coverUrl || '/default-cover.jpg'})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

              <div className="absolute bottom-6 left-5 right-5">
                <div className="text-white text-lg font-semibold line-clamp-2">{item.title}</div>
                <div className="text-white/75 text-sm line-clamp-1">{item.subtitle}</div>
                <div className="mt-3 text-white/60 text-xs">
                  {state.isActive ? 'Lecture auto (après geste)' : 'Défile pour changer'}
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

