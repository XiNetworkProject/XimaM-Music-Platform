'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Compass, Sparkles, Upload, Tv, Search, Grid3X3, List, Music2 } from 'lucide-react';
import DiscoverPlayButton, { type DiscoverTrackLite } from './DiscoverPlayButton';
import { notify } from '@/components/NotificationCenter';

type PlaylistLite = {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string | null;
};

type TabId = 'pour-toi' | 'tendances' | 'nouveautes' | 'playlists';

function TrackCard({ track, compact }: { track: DiscoverTrackLite; compact?: boolean }) {
  const artistLabel =
    track.artist?.artistName || track.artist?.name || track.artist?.username || (track.isAI ? 'Créateur IA' : 'Artiste');

  return (
    <div className={`rounded-2xl border border-border-secondary bg-white/5 ${compact ? 'p-2' : 'p-3'} flex gap-3`}>
      <img
        src={track.coverUrl || '/default-cover.jpg'}
        className={compact ? 'w-12 h-12 rounded-xl object-cover border border-border-secondary' : 'w-14 h-14 rounded-xl object-cover border border-border-secondary'}
        alt=""
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{track.title}</div>
            <div className="text-xs text-foreground-tertiary truncate">{artistLabel}</div>
          </div>
          <div className="shrink-0">
            <DiscoverPlayButton track={track} />
          </div>
        </div>
        {compact ? null : (
          <div className="mt-2 text-xs text-foreground-tertiary">
            {track.isAI ? 'IA' : 'Musique'} • {typeof track.plays === 'number' ? `${track.plays} écoutes` : 'Nouveau'}
          </div>
        )}
      </div>
    </div>
  );
}

function HorizontalRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex gap-3 min-w-max pr-2">{children}</div>
    </div>
  );
}

export default function DiscoverAuthedClient({
  displayName,
  initialForYou,
  initialTrending,
  initialNew,
  initialPlaylists,
}: {
  displayName: string;
  initialForYou: DiscoverTrackLite[];
  initialTrending: DiscoverTrackLite[];
  initialNew: DiscoverTrackLite[];
  initialPlaylists: PlaylistLite[];
}) {
  const [tab, setTab] = useState<TabId>('pour-toi');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [q, setQ] = useState('');

  const [forYou, setForYou] = useState<DiscoverTrackLite[]>(initialForYou);
  const [trending, setTrending] = useState<DiscoverTrackLite[]>(initialTrending);
  const [newest, setNewest] = useState<DiscoverTrackLite[]>(initialNew);
  const [playlists, setPlaylists] = useState<PlaylistLite[]>(initialPlaylists);

  useEffect(() => {
    // Refresh léger côté client pour garder la page vivante (sans bloquer l’UX)
    const t = setTimeout(async () => {
      try {
        const [fy, tr, nw, pl] = await Promise.all([
          fetch('/api/ranking/feed?limit=24&ai=1&strategy=reco', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/ranking/feed?limit=24&ai=1&strategy=trending', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/recommendations/personal?limit=24', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/playlists/popular?limit=12', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        ]);
        if (Array.isArray((fy as any)?.tracks)) setForYou((fy as any).tracks);
        if (Array.isArray((tr as any)?.tracks)) setTrending((tr as any).tracks);
        if (Array.isArray((nw as any)?.tracks)) setNewest((nw as any).tracks);
        if (Array.isArray((pl as any)?.playlists)) setPlaylists((pl as any).playlists);
      } catch {
        // silent
      }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const activeTracks = useMemo(() => {
    const base = tab === 'tendances' ? trending : tab === 'nouveautes' ? newest : forYou;
    const query = q.trim().toLowerCase();
    if (!query) return base;
    return base.filter((t) => {
      const a = t.artist?.artistName || t.artist?.name || t.artist?.username || '';
      return `${t.title} ${a}`.toLowerCase().includes(query);
    });
  }, [tab, trending, newest, forYou, q]);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'pour-toi', label: 'Pour toi' },
    { id: 'tendances', label: 'Tendances' },
    { id: 'nouveautes', label: 'Nouveautés' },
    { id: 'playlists', label: 'Playlists' },
  ];

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-6 md:py-8 space-y-6">
        {/* Hero */}
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-foreground-tertiary">Découvrir</div>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">Salut {displayName}.</h1>
              <p className="mt-2 text-sm text-foreground-secondary">
                Une page simple comme Spotify: cherche, clique, écoute — et enchaîne.
              </p>
            </div>

            <div className="w-full md:w-[420px]">
              <div className="h-11 rounded-2xl border border-border-secondary bg-white/5 flex items-center gap-2 px-3">
                <Search className="h-4 w-4 text-foreground-tertiary" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher une track ou un artiste…"
                  className="bg-transparent outline-none w-full text-sm text-foreground-primary placeholder:text-foreground-tertiary"
                />
                <button
                  type="button"
                  className="h-8 w-8 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 grid place-items-center"
                  onClick={() => setView((v) => (v === 'list' ? 'grid' : 'list'))}
                  aria-label="Changer la vue"
                >
                  {view === 'list' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
            <Link href="/discover" className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3">
              <Compass className="h-5 w-5 text-foreground-secondary" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Explorer</div>
                <div className="text-xs text-foreground-tertiary truncate">Pour toi + tendances</div>
              </div>
            </Link>
            <Link href="/studio" className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-foreground-secondary" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Studio IA</div>
                <div className="text-xs text-foreground-tertiary truncate">Créer des sons</div>
              </div>
            </Link>
            <Link href="/upload" className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3">
              <Upload className="h-5 w-5 text-foreground-secondary" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Uploader</div>
                <div className="text-xs text-foreground-tertiary truncate">Publier une track</div>
              </div>
            </Link>
            <Link href="/tv" className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3">
              <Tv className="h-5 w-5 text-foreground-secondary" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">SYNAURA TV</div>
                <div className="text-xs text-foreground-tertiary truncate">Lives</div>
              </div>
            </Link>
          </div>
        </section>

        {/* Tabs */}
        <section className="flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`h-10 px-4 rounded-2xl border text-sm font-semibold transition ${
                tab === t.id ? 'border-white/30 bg-white/10 text-white' : 'border-border-secondary bg-white/5 text-foreground-secondary hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
          {tab !== 'playlists' ? (
            <button
              type="button"
              onClick={() => {
                setQ('');
                notify.success('Découvrir', 'Filtres réinitialisés.');
              }}
              className="h-10 px-4 rounded-2xl border border-border-secondary bg-white/5 text-sm text-foreground-secondary hover:bg-white/10 transition"
            >
              Reset
            </button>
          ) : null}
        </section>

        {/* Content */}
        {tab === 'playlists' ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Music2 className="h-5 w-5 text-foreground-secondary" />
              <h2 className="text-lg font-bold">Playlists populaires</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {playlists.map((p) => (
                <Link
                  key={p._id}
                  href={`/playlists/${encodeURIComponent(p._id)}`}
                  className="rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition p-3 flex gap-3"
                >
                  <img
                    src={p.coverUrl || '/default-cover.jpg'}
                    className="w-14 h-14 rounded-xl object-cover border border-border-secondary"
                    alt=""
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-foreground-tertiary line-clamp-2">{p.description || 'Playlist'}</div>
                  </div>
                </Link>
              ))}
              {!playlists.length ? <div className="text-sm text-foreground-tertiary">Aucune playlist.</div> : null}
            </div>
          </section>
        ) : view === 'grid' ? (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {activeTracks.map((t) => (
              <TrackCard key={t._id} track={t} compact />
            ))}
            {!activeTracks.length ? <div className="text-sm text-foreground-tertiary">Aucune track.</div> : null}
          </section>
        ) : (
          <section className="space-y-4">
            <HorizontalRow>
              {activeTracks.slice(0, 12).map((t) => (
                <div key={t._id} className="w-[420px] max-w-[86vw]">
                  <TrackCard track={t} />
                </div>
              ))}
            </HorizontalRow>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeTracks.slice(12, 24).map((t) => (
                <TrackCard key={t._id} track={t} compact />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

