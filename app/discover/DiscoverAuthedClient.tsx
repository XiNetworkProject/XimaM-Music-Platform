'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Disc3, Music2, X } from 'lucide-react';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import {
  ArtistTile,
  GenreCard,
  HorizontalScroller,
  PlaylistTile,
  SectionHeader,
  TrackRow,
  TrackTile,
  type DiscoverArtistLite,
  type DiscoverPlaylistLite,
} from './DiscoverTiles';

const GENRES = [
  'Pop', 'Hip-Hop', 'Rock', 'Electronic', 'R&B', 'Jazz', 'Lo-Fi', 'Classical',
  'Indie', 'Soul', 'Funk', 'Ambient', 'Metal', 'Reggae', 'Latin', 'Afro',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function uniqById<T extends { _id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (!item?._id || seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });
}

export default function DiscoverAuthedClient({
  displayName,
  genreFilter,
  initialForYou,
  initialTrending,
  initialNew,
  initialPlaylists,
  initialArtists,
}: {
  displayName: string;
  genreFilter?: string | null;
  initialForYou: DiscoverTrackLite[];
  initialTrending: DiscoverTrackLite[];
  initialNew: DiscoverTrackLite[];
  initialPlaylists: DiscoverPlaylistLite[];
  initialArtists: DiscoverArtistLite[];
}) {
  const [q, setQ] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(genreFilter || null);

  const [forYou, setForYou] = useState<DiscoverTrackLite[]>(initialForYou);
  const [trending, setTrending] = useState<DiscoverTrackLite[]>(initialTrending);
  const [newest, setNewest] = useState<DiscoverTrackLite[]>(initialNew);
  const [playlists, setPlaylists] = useState<DiscoverPlaylistLite[]>(initialPlaylists);
  const [artists, setArtists] = useState<DiscoverArtistLite[]>(initialArtists);

  const loadGenreData = useCallback(async (genre: string | null) => {
    const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
    try {
      const [fy, tr] = await Promise.all([
        fetch(`/api/ranking/feed?limit=36&ai=1&strategy=reco${genreParam}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/ranking/feed?limit=36&ai=1&strategy=trending${genreParam}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ]);
      if (Array.isArray((fy as any)?.tracks)) setForYou((fy as any).tracks);
      if (Array.isArray((tr as any)?.tracks)) setTrending((tr as any).tracks);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const [fy, tr, nw, pl, ar] = await Promise.all([
          fetch('/api/ranking/feed?limit=36&ai=1&strategy=reco', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/ranking/feed?limit=36&ai=1&strategy=trending', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/tracks/recent?limit=36', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/playlists/popular?limit=18', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/artists?sort=trending&limit=16', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        ]);
        if (Array.isArray((fy as any)?.tracks)) setForYou((fy as any).tracks);
        if (Array.isArray((tr as any)?.tracks)) setTrending((tr as any).tracks);
        if (Array.isArray((nw as any)?.tracks)) setNewest((nw as any).tracks);
        if (Array.isArray((pl as any)?.playlists)) setPlaylists(
          (pl as any).playlists.map((p: any) => ({
            _id: String(p?._id || p?.id || ''),
            name: String(p?.name || 'Playlist'),
            description: typeof p?.description === 'string' ? p.description : '',
            coverUrl: p?.coverUrl ?? null,
          }))
        );
        if (Array.isArray((ar as any)?.artists)) setArtists(
          (ar as any).artists.map((a: any) => ({
            _id: String(a?._id || a?.id || ''),
            username: String(a?.username || ''),
            name: String(a?.name || a?.username || 'Artiste'),
            avatar: typeof a?.avatar === 'string' ? a.avatar : '',
            totalPlays: typeof a?.totalPlays === 'number' ? a.totalPlays : undefined,
            trackCount: typeof a?.trackCount === 'number' ? a.trackCount : undefined,
            isTrending: Boolean(a?.isTrending),
          }))
        );
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const allTracks = useMemo(
    () => uniqById([...(forYou || []), ...(trending || []), ...(newest || [])]),
    [forYou, trending, newest],
  );

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

  const genreFiltered = useMemo(() => {
    if (!activeGenre) return null;
    const g = activeGenre.toLowerCase();
    return allTracks.filter((t) => {
      const genres = Array.isArray((t as any)?.genre) ? (t as any).genre : (t as any)?.genre ? [(t as any).genre] : [];
      return genres.some((x: any) => String(x || '').toLowerCase().includes(g));
    });
  }, [activeGenre, allTracks]);

  const handleGenreClick = (genre: string) => {
    if (activeGenre === genre) {
      setActiveGenre(null);
    } else {
      setActiveGenre(genre);
      loadGenreData(genre);
    }
  };

  const isSearching = q.trim().length > 0;
  const isBrowsingGenre = activeGenre && !isSearching;

  const topChart = useMemo(() => {
    return [...trending].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10);
  }, [trending]);

  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 space-y-6 md:space-y-8">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {activeGenre ? activeGenre : 'Découvrir'}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              {activeGenre
                ? `Les meilleurs titres ${activeGenre}`
                : 'Explore la bibliothèque publique de Synaura'}
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-[400px] lg:w-[480px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un titre, artiste, genre..."
                className="w-full h-10 pl-10 pr-10 rounded-full bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
                >
                  <X className="w-3 h-3 text-white/60" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Genre filter chips ─── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveGenre(null); }}
            className={`h-8 px-4 rounded-full text-xs font-bold transition-all ${
              !activeGenre
                ? 'bg-white text-black'
                : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            Tout
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => handleGenreClick(g)}
              className={`h-8 px-4 rounded-full text-xs font-bold transition-all ${
                activeGenre === g
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* ─── Search Results ─── */}
        {isSearching ? (
          <section>
            <SectionHeader title={`Résultats pour "${q}"`} subtitle={`${searchResults.length} titre${searchResults.length > 1 ? 's' : ''}`} />
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                {searchResults.map((t, i) => (
                  <TrackRow key={t._id} track={t} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Music2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Aucun résultat pour "{q}"</p>
              </div>
            )}
          </section>
        ) : isBrowsingGenre && genreFiltered ? (
          /* ─── Genre Browse ─── */
          <section>
            <SectionHeader title={`${activeGenre}`} subtitle={`${genreFiltered.length} titre${genreFiltered.length > 1 ? 's' : ''} disponibles`} />
            {genreFiltered.length > 0 ? (
              <>
                <HorizontalScroller>
                  {genreFiltered.slice(0, 16).map((t) => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
                {genreFiltered.length > 16 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                    {genreFiltered.slice(16, 40).map((t, i) => (
                      <TrackRow key={t._id} track={t} index={i + 16} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Disc3 className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">Aucun titre {activeGenre} pour le moment</p>
              </div>
            )}
          </section>
        ) : (
          /* ─── Full Discover Home ─── */
          <>
            {/* Genres Grid */}
            <section>
              <SectionHeader title="Parcourir par genre" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {GENRES.map((g) => (
                  <GenreCard key={g} genre={g} onClick={() => handleGenreClick(g)} />
                ))}
              </div>
            </section>

            {/* Pour toi */}
            {forYou.length > 0 && (
              <section>
                <SectionHeader
                  title="Pour toi"
                  actionLabel="Voir tout"
                  actionHref="/"
                />
                <HorizontalScroller>
                  {forYou.slice(0, 20).map((t) => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Top Chart + Tendances side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Top 10 */}
              <div className="lg:col-span-2">
                <SectionHeader title="Top 10" subtitle="Les plus écoutés" />
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-1">
                  {topChart.map((t, i) => (
                    <TrackRow key={t._id} track={t} index={i} />
                  ))}
                  {topChart.length === 0 && (
                    <p className="text-white/20 text-sm text-center py-8">Pas encore de données</p>
                  )}
                </div>
              </div>

              {/* Trending tiles */}
              <div className="lg:col-span-3">
                <SectionHeader title="Tendances" subtitle="Ce qui monte en ce moment" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {trending.slice(0, 9).map((t) => (
                    <TrackTile key={t._id} track={t} grid />
                  ))}
                </div>
              </div>
            </div>

            {/* Nouveautés */}
            {newest.length > 0 && (
              <section>
                <SectionHeader title="Nouveautés" subtitle="Fraîchement publié" />
                <HorizontalScroller>
                  {newest.slice(0, 20).map((t) => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Artistes */}
            {artists.length > 0 && (
              <section>
                <SectionHeader title="Artistes à suivre" subtitle="Les créateurs du moment" />
                <HorizontalScroller>
                  {artists.map((a) => (
                    <ArtistTile key={a._id} artist={a} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Playlists */}
            {playlists.length > 0 && (
              <section>
                <SectionHeader title="Playlists populaires" subtitle="Pour enchaîner sans réfléchir" />
                <HorizontalScroller>
                  {playlists.map((p) => (
                    <PlaylistTile key={p._id} playlist={p} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* IA Tracks */}
            {allTracks.filter((t) => t.isAI).length > 0 && (
              <section>
                <SectionHeader title="Créations IA" subtitle="Généré par la communauté" />
                <HorizontalScroller>
                  {allTracks.filter((t) => t.isAI).slice(0, 16).map((t) => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
