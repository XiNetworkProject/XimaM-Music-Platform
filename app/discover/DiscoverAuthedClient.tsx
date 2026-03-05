'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, X, TrendingUp, Music2, Users, ListMusic, Disc3 } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
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
  'Pop', 'Hip-Hop', 'Rock', 'Electronic', 'R&B', 'Jazz',
  'Lo-Fi', 'Classical', 'Indie', 'Soul', 'Funk', 'Ambient',
  'Metal', 'Reggae', 'Latin', 'Afro',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function uniqById<T extends { _id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter(item => {
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
  const router = useRouter();
  const { playTrack, setTracks } = useAudioPlayer();

  const [q, setQ] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(genreFilter || null);
  const [forYou, setForYou] = useState(initialForYou);
  const [trending, setTrending] = useState(initialTrending);
  const [newest, setNewest] = useState(initialNew);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [artists, setArtists] = useState(initialArtists);
  const [genreTracks, setGenreTracks] = useState<DiscoverTrackLite[]>([]);
  const [loadingGenre, setLoadingGenre] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const genreParam = activeGenre ? `&genre=${encodeURIComponent(activeGenre)}` : '';
      const [fy, tr, nw, pl, ar] = await Promise.all([
        fetch(`/api/ranking/feed?limit=36&ai=1&strategy=reco${genreParam}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch(`/api/ranking/feed?limit=36&ai=1&strategy=trending${genreParam}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/tracks/recent?limit=36', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/playlists/popular?limit=18', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/artists?sort=trending&limit=16', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
      ]);
      if (Array.isArray(fy?.tracks)) setForYou(fy.tracks);
      if (Array.isArray(tr?.tracks)) setTrending(tr.tracks);
      if (Array.isArray(nw?.tracks)) setNewest(nw.tracks);
      if (Array.isArray(pl?.playlists)) setPlaylists(pl.playlists.map((p: any) => ({
        _id: String(p?._id || p?.id || ''),
        name: String(p?.name || 'Playlist'),
        description: typeof p?.description === 'string' ? p.description : '',
        coverUrl: p?.coverUrl ?? null,
      })));
      if (Array.isArray(ar?.artists)) setArtists(ar.artists.map((a: any) => ({
        _id: String(a?._id || a?.id || ''),
        username: String(a?.username || ''),
        name: String(a?.name || a?.username || 'Artiste'),
        avatar: typeof a?.avatar === 'string' ? a.avatar : '',
        totalPlays: a?.totalPlays,
        totalLikes: a?.totalLikes,
        trackCount: a?.trackCount,
        isTrending: Boolean(a?.isTrending),
      })));
    } catch {}
  }, [activeGenre]);

  useEffect(() => {
    const t = setTimeout(refreshData, 600);
    return () => clearTimeout(t);
  }, [refreshData]);

  const handleGenreClick = useCallback(async (genre: string) => {
    if (activeGenre === genre) {
      setActiveGenre(null);
      setGenreTracks([]);
      router.replace('/discover', { scroll: false });
      return;
    }
    setActiveGenre(genre);
    setLoadingGenre(true);
    router.replace(`/discover?genre=${encodeURIComponent(genre)}`, { scroll: false });
    try {
      const res = await fetch(`/api/ranking/feed?limit=40&ai=1&genre=${encodeURIComponent(genre)}`, { cache: 'no-store' });
      const data = await res.json();
      setGenreTracks(Array.isArray(data?.tracks) ? data.tracks : []);
    } catch {
      setGenreTracks([]);
    } finally {
      setLoadingGenre(false);
    }
  }, [activeGenre, router]);

  const allTracks = useMemo(() => uniqById([...forYou, ...trending, ...newest]), [forYou, trending, newest]);

  const searchResults = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return allTracks
      .filter(t => {
        const a = t.artist?.artistName || t.artist?.name || t.artist?.username || '';
        return `${t.title} ${a}`.toLowerCase().includes(query);
      })
      .slice(0, 20);
  }, [q, allTracks]);

  const aiTracks = useMemo(() => allTracks.filter(t => Boolean(t.isAI)).slice(0, 16), [allTracks]);
  const topHits = useMemo(() => uniqById([...trending]).sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10), [trending]);

  const handlePlayAll = useCallback((tracks: DiscoverTrackLite[]) => {
    if (tracks.length) {
      setTracks(tracks as any);
      playTrack(tracks[0] as any);
    }
  }, [setTracks, playTrack]);

  const isSearching = q.trim().length > 0;

  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 space-y-6 md:space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {activeGenre ? activeGenre : `${greeting()}, ${displayName}`}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              {activeGenre ? `Les meilleurs titres ${activeGenre}` : 'Explore, découvre et écoute sans limites.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => handlePlayAll(forYou.length ? forYou : trending)}
              className="h-10 px-5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white hover:scale-[1.03] active:scale-[0.97] transition-all text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              <Disc3 className="w-4 h-4" />
              Mix aléatoire
            </button>
            <button
              onClick={() => router.push('/ai-generator')}
              className="h-10 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition text-sm font-semibold text-white inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Studio IA
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un titre, un artiste, un genre..."
              className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/25"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-white/30 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {isSearching ? (
          <section className="space-y-3">
            <SectionHeader title={`Résultats pour "${q}"`} />
            {searchResults.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                {searchResults.map((t, i) => (
                  <TrackRow key={t._id} track={t} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/30 py-8 text-center">Aucun résultat trouvé.</p>
            )}
          </section>
        ) : (
          <>
            {/* Genres */}
            <section>
              <SectionHeader title="Explorer par genre" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {GENRES.map(g => (
                  <GenreCard
                    key={g}
                    genre={g}
                    onClick={() => handleGenreClick(g)}
                  />
                ))}
              </div>
              {activeGenre && (
                <button
                  onClick={() => { setActiveGenre(null); setGenreTracks([]); router.replace('/discover', { scroll: false }); }}
                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition font-semibold"
                >
                  ✕ Réinitialiser le filtre
                </button>
              )}
            </section>

            {/* Genre filtered results */}
            {activeGenre && (
              <section>
                <SectionHeader title={`${activeGenre}`} subtitle={`${genreTracks.length} titres trouvés`} />
                {loadingGenre ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : genreTracks.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                    {genreTracks.map((t, i) => (
                      <TrackRow key={t._id} track={t} index={i} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/30 py-8 text-center">Aucun titre trouvé pour ce genre.</p>
                )}
              </section>
            )}

            {/* Top Hits (numbered list) */}
            {!activeGenre && topHits.length > 0 && (
              <section>
                <SectionHeader
                  title="Top Hits"
                  subtitle="Les plus écoutés en ce moment"
                  actionLabel="Tout lire"
                  onAction={() => handlePlayAll(topHits)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {topHits.map((t, i) => (
                    <TrackRow key={t._id} track={t} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Pour toi */}
            {!activeGenre && forYou.length > 0 && (
              <section>
                <SectionHeader title="Pour toi" subtitle="Basé sur tes goûts" actionLabel="Tout voir" actionHref="/?section=foryou" />
                <HorizontalScroller>
                  {forYou.slice(0, 16).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Tendances */}
            {!activeGenre && trending.length > 0 && (
              <section>
                <SectionHeader title="Tendances" subtitle="Ce qui cartonne maintenant" />
                <HorizontalScroller>
                  {trending.slice(0, 16).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Nouveautés */}
            {!activeGenre && newest.length > 0 && (
              <section>
                <SectionHeader title="Nouveautés" subtitle="Tout juste publié" />
                <HorizontalScroller>
                  {newest.slice(0, 16).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Créations IA */}
            {!activeGenre && aiTracks.length > 0 && (
              <section>
                <SectionHeader title="Créations IA" subtitle="Généré par intelligence artificielle" actionLabel="Créer" actionHref="/ai-generator" />
                <HorizontalScroller>
                  {aiTracks.map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Artistes */}
            {!activeGenre && artists.length > 0 && (
              <section>
                <SectionHeader title="Artistes du moment" subtitle="À suivre" />
                <HorizontalScroller>
                  {artists.slice(0, 12).map(a => (
                    <ArtistTile key={a._id} artist={a} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Playlists */}
            {!activeGenre && playlists.length > 0 && (
              <section>
                <SectionHeader title="Playlists populaires" subtitle="Compilations de la communauté" />
                <HorizontalScroller>
                  {playlists.slice(0, 12).map(p => (
                    <PlaylistTile key={p._id} playlist={p} />
                  ))}
                </HorizontalScroller>
              </section>
            )}
          </>
        )}

        {/* Spacer for mini player */}
        <div className="h-24" />
      </main>
    </div>
  );
}
