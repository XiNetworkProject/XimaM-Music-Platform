'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Play, Sparkles, UserPlus, X } from 'lucide-react';
import StarAcademyBanner from '@/components/StarAcademyBanner';
import { useAudioPlayer } from '@/app/providers';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import {
  ArtistTile,
  HorizontalScroller,
  PlaylistTile,
  SectionHeader,
  TrackRow,
  TrackTile,
  type DiscoverArtistLite,
  type DiscoverPlaylistLite,
} from './DiscoverTiles';

const GENRES = [
  'Tout', 'Pop', 'Hip-Hop', 'Rap', 'Rock', 'Electronic', 'R&B', 'Jazz',
  'Lo-Fi', 'Classical', 'Indie', 'Soul', 'Funk', 'Ambient',
];

function uniqById<T extends { _id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item?._id || seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });
}

function filterByGenre(tracks: DiscoverTrackLite[], genre: string | null): DiscoverTrackLite[] {
  if (!genre || genre === 'Tout') return tracks;
  const g = genre.toLowerCase();
  return tracks.filter(t => {
    const genres = Array.isArray((t as any)?.genre) ? (t as any).genre : (t as any)?.genre ? [(t as any).genre] : [];
    return genres.some((x: string) => String(x || '').toLowerCase().includes(g));
  });
}

export default function DiscoverGuestClient({
  genreFilter,
  trending,
  newest,
  playlists,
  artists,
}: {
  genreFilter?: string | null;
  trending: DiscoverTrackLite[];
  newest: DiscoverTrackLite[];
  playlists: DiscoverPlaylistLite[];
  artists: DiscoverArtistLite[];
}) {
  const router = useRouter();
  const { playTrack, setTracks } = useAudioPlayer();
  const [q, setQ] = useState('');
  const [activeGenre, setActiveGenre] = useState<string>(genreFilter || 'Tout');

  const isFiltered = activeGenre !== 'Tout';
  const filteredTrending = useMemo(() => filterByGenre(trending, activeGenre), [trending, activeGenre]);
  const filteredNewest = useMemo(() => filterByGenre(newest, activeGenre), [newest, activeGenre]);
  const allTracks = useMemo(() => uniqById([...trending, ...newest]), [trending, newest]);

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

  const topHits = useMemo(() =>
    uniqById(filterByGenre(trending, activeGenre))
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 8),
  [trending, activeGenre]);

  const handleGenreClick = useCallback((genre: string) => {
    setActiveGenre(genre);
    if (genre === 'Tout') {
      router.replace('/discover', { scroll: false });
    } else {
      router.replace(`/discover?genre=${encodeURIComponent(genre)}`, { scroll: false });
    }
  }, [router]);

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

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-transparent border border-white/[0.08] p-6 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_60%)]" />
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Découvre, écoute, enchaîne.
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/50 max-w-xl">
              Des milliers de titres à écouter gratuitement. Crée un compte pour sauvegarder tes favoris et créer de la musique avec l'IA.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/auth/signup"
                className="h-10 px-5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white hover:scale-[1.03] active:scale-[0.97] transition-all text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                <UserPlus className="w-4 h-4" />
                Créer un compte
              </Link>
              <Link
                href="/auth/signin"
                className="h-10 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition text-sm font-semibold text-white"
              >
                Se connecter
              </Link>
              <button
                onClick={() => handlePlayAll(trending)}
                className="h-10 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition text-sm font-semibold text-white inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Écouter
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.08] focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un titre, un artiste..."
              className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/25"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-white/30 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Star Academy TikTok promo */}
        <StarAcademyBanner variant="compact" />

        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => handleGenreClick(g)}
              className={`shrink-0 h-8 px-4 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${
                activeGenre === g
                  ? 'bg-white text-black shadow-md'
                  : 'bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

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
            {/* Top Hits */}
            {topHits.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `Top ${activeGenre}` : 'Top Hits'}
                  subtitle={isFiltered ? `Les meilleurs titres ${activeGenre}` : 'Les plus écoutés'}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {topHits.map((t, i) => (
                    <TrackRow key={t._id} track={t} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Tendances */}
            {filteredTrending.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `Tendances ${activeGenre}` : 'Tendances'}
                  subtitle="Ce qui cartonne"
                />
                <HorizontalScroller>
                  {filteredTrending.slice(0, 16).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Nouveautés */}
            {filteredNewest.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `Nouveautés ${activeGenre}` : 'Nouveautés'}
                  subtitle="Tout juste publié"
                />
                <HorizontalScroller>
                  {filteredNewest.slice(0, 16).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Artistes */}
            {!isFiltered && artists.length > 0 && (
              <section>
                <SectionHeader title="Artistes du moment" />
                <HorizontalScroller>
                  {artists.slice(0, 12).map(a => (
                    <ArtistTile key={a._id} artist={a} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Playlists */}
            {!isFiltered && playlists.length > 0 && (
              <section>
                <SectionHeader title="Playlists populaires" />
                <HorizontalScroller>
                  {playlists.slice(0, 12).map(p => (
                    <PlaylistTile key={p._id} playlist={p} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Empty state */}
            {isFiltered && filteredTrending.length === 0 && filteredNewest.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-lg font-semibold text-white/50">Aucun titre {activeGenre} trouvé</p>
                <p className="text-sm text-white/25 mt-1">Essaye un autre genre ou reviens à "Tout"</p>
                <button
                  onClick={() => handleGenreClick('Tout')}
                  className="mt-4 h-9 px-5 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition"
                >
                  Voir tout
                </button>
              </div>
            )}

            {/* CTA */}
            {!isFiltered && (
              <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-white/[0.06] p-6 text-center">
                <h3 className="text-lg font-bold text-white">Envie de plus ?</h3>
                <p className="text-sm text-white/40 mt-1 max-w-md mx-auto">
                  Crée un compte pour des recommandations personnalisées et la création musicale IA.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Link
                    href="/auth/signup"
                    className="h-10 px-6 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold inline-flex items-center gap-2 transition-all hover:scale-[1.03] shadow-lg shadow-indigo-500/25"
                  >
                    Créer un compte
                  </Link>
                  <Link
                    href="/ai-generator"
                    className="h-10 px-6 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold inline-flex items-center gap-2 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    Studio IA
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        <div className="h-24" />
      </main>
    </div>
  );
}
