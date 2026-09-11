'use client';

import { useEffect, useState } from 'react';
import { ArtistDiscoverCard, type DiscoverArtistCardLite } from '@/app/discover/DiscoverMoodTiles';
import { SynauraAppShell, SynauraPanel } from '@/components/synaura/SynauraShell';
import { SynauraBadge } from '@/components/ui/SynauraPrimitives';
import { toPublicMediaUrl } from '@/lib/mediaUrls';

export default function DiscoverProfilePeekLab() {
  const [artist, setArtist] = useState<DiscoverArtistCardLite | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/users/popular?limit=8', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/ranking/feed?limit=20&ai=1&strategy=reco&session=profile-peek-discover-lab', { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([usersPayload, tracksPayload]) => {
      if (!active) return;
      const users = Array.isArray(usersPayload?.users) ? usersPayload.users : [];
      const tracks = Array.isArray(tracksPayload?.tracks) ? tracksPayload.tracks : [];
      const track = tracks.find((candidate: any) => users.some((user: any) => String(user?._id || user?.id) === String(candidate?.artist?._id)));
      const user = users.find((candidate: any) => String(candidate?._id || candidate?.id) === String(track?.artist?._id));
      if (!track || !user?.username) return;
      setArtist({
        _id: String(user._id || user.id),
        username: String(user.username),
        name: String(user.artistName || user.name || user.username),
        avatar: toPublicMediaUrl(user.avatar) || null,
        style: Array.isArray(track.genre) ? track.genre[0] || null : null,
        track: {
          ...track,
          coverUrl: toPublicMediaUrl(track.coverUrl || track.cover_url) || undefined,
          audioUrl: toPublicMediaUrl(track.audioUrl || track.audio_url) || track.audioUrl || track.audio_url,
        },
      } as DiscoverArtistCardLite);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <SynauraAppShell contentClassName="max-w-5xl">
      <main className="grid min-h-[80dvh] content-center gap-5" data-context-surface-origin="discover" tabIndex={-1}>
        <SynauraBadge tone="warning">Développement uniquement</SynauraBadge>
        <h1 className="text-4xl font-black text-[var(--syn-text-primary)]">Discover + Profile Peek</h1>
        <SynauraPanel className="p-6">
          {artist ? <ArtistDiscoverCard artist={artist} /> : <p className="text-sm font-semibold text-[var(--syn-text-secondary)]">Chargement de la card réelle…</p>}
        </SynauraPanel>
      </main>
    </SynauraAppShell>
  );
}
