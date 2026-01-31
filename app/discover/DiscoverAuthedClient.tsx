'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Upload, Tv } from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import {
  ArtistTile,
  HorizontalScroller,
  PlaylistTile,
  type DiscoverArtistLite,
  type DiscoverPlaylistLite,
  SectionHeader,
  TrackRow,
  TrackTile,
} from './DiscoverTiles';

type ModeId = 'home' | 'trending' | 'new' | 'ai' | 'playlists';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function uniqById<T extends { _id: string }>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    if (!item?._id) continue;
    if (seen.has(item._id)) continue;
    seen.add(item._id);
    out.push(item);
  }
  return out;
}

export default function DiscoverAuthedClient({
  displayName,
  initialForYou,
  initialTrending,
  initialNew,
  initialPlaylists,
  initialArtists,
}: {
  displayName: string;
  initialForYou: DiscoverTrackLite[];
  initialTrending: DiscoverTrackLite[];
  initialNew: DiscoverTrackLite[];
  initialPlaylists: DiscoverPlaylistLite[];
  initialArtists: DiscoverArtistLite[];
}) {
  const [mode, setMode] = useState<ModeId>('home');
  const [q, setQ] = useState('');

  const [forYou, setForYou] = useState<DiscoverTrackLite[]>(initialForYou);
  const [trending, setTrending] = useState<DiscoverTrackLite[]>(initialTrending);
  const [newest, setNewest] = useState<DiscoverTrackLite[]>(initialNew);
  const [playlists, setPlaylists] = useState<DiscoverPlaylistLite[]>(initialPlaylists);
  const [artists, setArtists] = useState<DiscoverArtistLite[]>(initialArtists);
  const [recent, setRecent] = useState<DiscoverTrackLite[]>([]);

  // Pull "continue listening"
  useEffect(() => {
    try {
      const raw = localStorage.getItem('discover.recentTracks');
      const list = raw ? (JSON.parse(raw) as DiscoverTrackLite[]) : [];
      setRecent(Array.isArray(list) ? list.slice(0, 16) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  // Refresh léger
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const [fy, tr, nw, pl, ar] = await Promise.all([
          fetch('/api/ranking/feed?limit=36&ai=1&strategy=reco', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/ranking/feed?limit=36&ai=1&strategy=trending', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/recommendations/personal?limit=36', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/playlists/popular?limit=18', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/artists?sort=trending&limit=12', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        ]);
        if (Array.isArray((fy as any)?.tracks)) setForYou((fy as any).tracks);
        if (Array.isArray((tr as any)?.tracks)) setTrending((tr as any).tracks);
        if (Array.isArray((nw as any)?.tracks)) setNewest((nw as any).tracks);
        if (Array.isArray((pl as any)?.playlists)) setPlaylists((pl as any).playlists);
        if (Array.isArray((ar as any)?.artists)) setArtists((ar as any).artists);
      } catch {
        // silent
      }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const allTracks = useMemo(() => uniqById([...(recent || []), ...(forYou || []), ...(trending || []), ...(newest || [])]), [
    recent,
    forYou,
    trending,
    newest,
  ]);

  const searchResults = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return allTracks
      .filter((t) => {
        const a = t.artist?.artistName || t.artist?.name || t.artist?.username || '';
        return `${t.title} ${a}`.toLowerCase().includes(query);
      })
      .slice(0, 24);
  }, [q, allTracks]);

  const quickPicks = useMemo(() => {
    const pick = uniqById([...(forYou || []), ...(trending || []), ...(newest || [])]);
    return pick.slice(0, 8);
  }, [forYou, trending, newest]);

  const modes: Array<{ id: ModeId; label: string }> = [
    { id: 'home', label: 'Accueil' },
    { id: 'trending', label: 'Tendances' },
    { id: 'new', label: 'Nouveautés' },
    { id: 'ai', label: 'IA' },
    { id: 'playlists', label: 'Playlists' },
  ];

  const modeTracks = useMemo(() => {
    if (mode === 'trending') return trending;
    if (mode === 'new') return newest;
    if (mode === 'ai') return allTracks.filter((t) => Boolean(t.isAI));
    return allTracks;
  }, [mode, trending, newest, allTracks]);

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 py-6 md:py-8 space-y-6">
        {/* Top bar */}
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-foreground-tertiary">Découvrir</div>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">
                {greeting()}, {displayName}.
              </h1>
              <p className="mt-2 text-sm text-foreground-secondary">
                Tendances, nouveautés, artistes, playlists — et lecture en 1 clic.
              </p>
            </div>

            <div className="w-full md:w-[520px]">
              <div className="h-11 rounded-2xl border border-border-secondary bg-white/5 flex items-center gap-2 px-3">
                <Search className="h-4 w-4 text-foreground-tertiary" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher une track ou un artiste…"
                  className="bg-transparent outline-none w-full text-sm text-foreground-primary placeholder:text-foreground-tertiary"
                />
                <Link
                  href="/studio"
                  className="h-8 px-3 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-xs font-semibold"
                >
                  <Sparkles className="h-4 w-4" />
                  Studio IA
                </Link>
              </div>
            </div>
          </div>

          {/* Mode chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`h-9 px-4 rounded-2xl border text-sm font-semibold transition ${
                  mode === m.id ? 'border-white/30 bg-white/10 text-white' : 'border-border-secondary bg-white/5 text-foreground-secondary hover:bg-white/10'
                }`}
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setQ('');
                notify.success('Découvrir', 'Recherche réinitialisée.');
              }}
              className="h-9 px-4 rounded-2xl border border-border-secondary bg-white/5 text-sm text-foreground-secondary hover:bg-white/10 transition"
            >
              Reset
            </button>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/upload"
                className="h-9 px-4 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-sm"
              >
                <Upload className="h-4 w-4" />
                Uploader
              </Link>
              <Link
                href="/tv"
                className="h-9 px-4 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center gap-2 text-sm"
              >
                <Tv className="h-4 w-4" />
                TV
              </Link>
            </div>
          </div>
        </section>

        {/* Search results */}
        {q.trim() ? (
          <section className="space-y-3">
            <SectionHeader title="Résultats" subtitle="Tracks correspondantes (lecture 1 clic)" />
            <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {searchResults.map((t) => (
                <TrackRow key={t._id} track={t} />
              ))}
              {!searchResults.length ? <div className="text-sm text-foreground-tertiary">Aucun résultat.</div> : null}
            </div>
          </section>
        ) : mode !== 'home' ? (
          <section className="space-y-3">
            <SectionHeader title={modes.find((m) => m.id === mode)?.label || 'Découvrir'} />
            {mode === 'playlists' ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {playlists.map((p) => (
                  <div key={p._id} className="w-full">
                    <PlaylistTile playlist={p} />
                  </div>
                ))}
                {!playlists.length ? <div className="text-sm text-foreground-tertiary">Aucune playlist.</div> : null}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {modeTracks.slice(0, 40).map((t) => (
                  <TrackRow key={t._id} track={t} />
                ))}
                {!modeTracks.length ? <div className="text-sm text-foreground-tertiary">Aucune track.</div> : null}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Quick picks */}
            <section className="space-y-3">
              <SectionHeader title="À la une" subtitle="Sélection rapide" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                {quickPicks.map((t) => (
                  <TrackRow key={t._id} track={t} />
                ))}
              </div>
            </section>

            {recent.length ? (
              <section className="space-y-3">
                <SectionHeader title="Reprendre" subtitle="Dernières écoutes (local)" />
                <HorizontalScroller>
                  {recent.slice(0, 12).map((t) => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            ) : null}

            <section className="space-y-3">
              <SectionHeader title="Pour toi" subtitle="Recommandations" />
              <HorizontalScroller>
                {forYou.slice(0, 16).map((t) => (
                  <TrackTile key={t._id} track={t} />
                ))}
              </HorizontalScroller>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Tendances" subtitle="Ce qui tourne maintenant" />
              <HorizontalScroller>
                {trending.slice(0, 16).map((t) => (
                  <TrackTile key={t._id} track={t} />
                ))}
              </HorizontalScroller>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Nouveautés" subtitle="Tout juste publié" />
              <HorizontalScroller>
                {newest.slice(0, 16).map((t) => (
                  <TrackTile key={t._id} track={t} />
                ))}
              </HorizontalScroller>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Artistes du moment" subtitle="À suivre" />
              <HorizontalScroller>
                {artists.slice(0, 12).map((a) => (
                  <ArtistTile key={a._id} artist={a} />
                ))}
              </HorizontalScroller>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Playlists populaires" subtitle="Pour enchaîner sans réfléchir" />
              <HorizontalScroller>
                {playlists.slice(0, 12).map((p) => (
                  <PlaylistTile key={p._id} playlist={p} />
                ))}
              </HorizontalScroller>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

