'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Search, Sparkles, UserPlus, X } from 'lucide-react';
import StarAcademyBanner from '@/components/StarAcademyBanner';
import {
  SynauraAppShell,
  SynauraAnnouncementStrip,
  SynauraFilterTabs,
  SynauraHero,
  SynauraInkPanel,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';
import { useAudioPlayer } from '@/app/providers';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import {
  AlbumTile,
  ArtistTile,
  HorizontalScroller,
  PlaylistTile,
  SectionHeader,
  TrackRow,
  TrackTile,
  type DiscoverAlbumLite,
  type DiscoverArtistLite,
  type DiscoverPlaylistLite,
} from './DiscoverTiles';

const GENRES = [
  'Tout', 'Pop', 'Hip-Hop', 'Rap', 'Rock', 'Electronic', 'R&B', 'Jazz',
  'Lo-Fi', 'Classical', 'Indie', 'Soul', 'Funk', 'Ambient',
];

function uniqById<T extends { _id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((item) => {
    if (!item?._id || seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });
}

function filterByGenre(tracks: DiscoverTrackLite[], genre: string | null): DiscoverTrackLite[] {
  if (!genre || genre === 'Tout') return tracks;
  const g = genre.toLowerCase();
  return tracks.filter((t) => {
    const genres = Array.isArray((t as any)?.genre) ? (t as any).genre : (t as any)?.genre ? [(t as any).genre] : [];
    return genres.some((x: string) => String(x || '').toLowerCase().includes(g));
  });
}

function DiscoverGuestAside({
  activeGenre,
  topHits,
  playlists,
  artists,
}: {
  activeGenre: string;
  topHits: number;
  playlists: number;
  artists: number;
}) {
  return (
    <aside className="hidden space-y-4 xl:block">
      <SynauraInkPanel className="p-4">
        <p className="mb-3 text-sm font-black">Entree libre</p>
        <div className="rounded-[1.4rem] bg-white/8 p-4">
          <p className="text-3xl font-black leading-none">Discover.</p>
          <p className="text-3xl font-black leading-none text-white/55">Listen first.</p>
          <p className="mt-3 text-sm leading-6 text-white/45">
            Tu peux deja ecouter, explorer et sentir la direction du nouveau Synaura avant meme de te connecter.
          </p>
        </div>
      </SynauraInkPanel>

      <SynauraPanel className="p-4">
        <p className="mb-3 text-sm font-black">Repères rapides</p>
        <div className="grid gap-2">
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{topHits}</p>
            <p className="text-xs text-black/40">top hits</p>
          </div>
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{artists}</p>
            <p className="text-xs text-black/40">artistes en avant</p>
          </div>
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{playlists}</p>
            <p className="text-xs text-black/40">playlists visibles</p>
          </div>
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{activeGenre}</p>
            <p className="text-xs text-black/40">filtre actif</p>
          </div>
        </div>
      </SynauraPanel>
    </aside>
  );
}

export default function DiscoverGuestClient({
  genreFilter,
  trending,
  newest,
  playlists,
  artists,
  albums,
}: {
  genreFilter?: string | null;
  trending: DiscoverTrackLite[];
  newest: DiscoverTrackLite[];
  playlists: DiscoverPlaylistLite[];
  artists: DiscoverArtistLite[];
  albums?: DiscoverAlbumLite[];
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
      .filter((t) => {
        const a = t.artist?.artistName || t.artist?.name || t.artist?.username || '';
        const genres = Array.isArray((t as any)?.genre) ? (t as any).genre.join(' ') : String((t as any)?.genre || '');
        return `${t.title} ${a} ${genres}`.toLowerCase().includes(query);
      })
      .slice(0, 20);
  }, [q, allTracks]);

  const topHits = useMemo(
    () =>
      uniqById(filterByGenre(trending, activeGenre))
        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
        .slice(0, 8),
    [trending, activeGenre],
  );

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
    <SynauraAppShell>
      <SynauraTopBar searchHref="/discover" searchLabel="Rechercher un son, un genre ou un artiste..." />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
        <main className="min-w-0 space-y-5 pb-28">
          <SynauraHero
            eyebrow="Catalogue ouvert"
            title="Decouvre, ecoute, enchaine."
            description="Des milliers de titres a ecouter gratuitement. Cree un compte plus tard pour garder tes favoris et pousser la personnalisation plus loin."
            actions={
              <>
                <Link
                  href="/auth/signup"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  <UserPlus className="h-4 w-4" />
                  Creer un compte
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-black/[0.06] px-5 text-sm font-black text-black/65 transition hover:bg-black hover:text-white"
                >
                  Se connecter
                </Link>
                <button
                  onClick={() => handlePlayAll(trending)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-black/[0.06] px-5 text-sm font-black text-black/65 transition hover:bg-black hover:text-white"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Ecouter
                </button>
              </>
            }
            aside={
              <div className="rounded-[1.7rem] bg-[#171313] p-4 text-[#fffaf2]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Sans friction</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/8 p-3">
                    <p className="text-2xl font-black">{topHits.length}</p>
                    <p className="text-xs text-white/45">top hits</p>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-3">
                    <p className="text-2xl font-black">{artists.length}</p>
                    <p className="text-xs text-white/45">artistes</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/45">
                  {activeGenre === 'Tout' ? 'Entre par les tendances, puis ouvre ce qui te parle.' : `Focus actuel : ${activeGenre}.`}
                </p>
              </div>
            }
          />

          <SynauraPanel className="p-4 sm:p-5">
            <div className="grid gap-4">
              <div className="relative">
                <div className="flex h-11 items-center gap-3 rounded-xl border border-black/[0.08] bg-black/[0.04] px-4 transition-colors focus-within:border-black/[0.18]">
                  <Search className="h-4 w-4 shrink-0 text-black/35" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher un titre, un artiste ou un genre..."
                    className="w-full bg-transparent text-sm text-[#171313] outline-none placeholder:text-black/28"
                  />
                  {q ? (
                    <button type="button" onClick={() => setQ('')} className="text-black/35 transition hover:text-black">
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <StarAcademyBanner variant="compact" />

              <SynauraFilterTabs items={GENRES} active={activeGenre} onChange={handleGenreClick} />
            </div>
          </SynauraPanel>

          {isSearching ? (
            <SynauraInkPanel className="p-4 sm:p-5">
              <SectionHeader title={`Resultats pour "${q}"`} subtitle="Titres qui correspondent a ta recherche" />
              {searchResults.length ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map((t, i) => (
                    <TrackRow key={t._id} track={t} index={i} />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-white/35">Aucun resultat trouve.</p>
              )}
            </SynauraInkPanel>
          ) : (
            <>
              {topHits.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `Top ${activeGenre}` : 'Top Hits'}
                    subtitle={isFiltered ? `Les meilleurs titres ${activeGenre}` : 'Les plus ecoutes'}
                  />
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    {topHits.map((t, i) => (
                      <TrackRow key={t._id} track={t} index={i} />
                    ))}
                  </div>
                </SynauraInkPanel>
              ) : null}

              {filteredTrending.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `Tendances ${activeGenre}` : 'Tendances'}
                    subtitle="Ce qui cartonne"
                  />
                  <HorizontalScroller>
                    {filteredTrending.slice(0, 16).map((t) => (
                      <TrackTile key={t._id} track={t} />
                    ))}
                  </HorizontalScroller>
                </SynauraInkPanel>
              ) : null}

              {filteredNewest.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `Nouveautes ${activeGenre}` : 'Nouveautes'}
                    subtitle="Tout juste publie"
                  />
                  <HorizontalScroller>
                    {filteredNewest.slice(0, 16).map((t) => (
                      <TrackTile key={t._id} track={t} />
                    ))}
                  </HorizontalScroller>
                </SynauraInkPanel>
              ) : null}

              {!isFiltered && albums && albums.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title="Albums & EPs"
                    subtitle="Les sorties completes a ecouter"
                    actionLabel="Voir tout"
                    actionHref="/discover?section=albums"
                  />
                  <HorizontalScroller>
                    {albums.slice(0, 16).map((album) => (
                      <AlbumTile key={album._id} album={album} />
                    ))}
                  </HorizontalScroller>
                </SynauraInkPanel>
              ) : null}

              {!isFiltered && artists.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader title="Artistes du moment" />
                  <HorizontalScroller>
                    {artists.slice(0, 12).map((a) => (
                      <ArtistTile key={a._id} artist={a} />
                    ))}
                  </HorizontalScroller>
                </SynauraInkPanel>
              ) : null}

              {!isFiltered && playlists.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader title="Playlists populaires" />
                  <HorizontalScroller>
                    {playlists.slice(0, 12).map((p) => (
                      <PlaylistTile key={p._id} playlist={p} />
                    ))}
                  </HorizontalScroller>
                </SynauraInkPanel>
              ) : null}

              {isFiltered && filteredTrending.length === 0 && filteredNewest.length === 0 ? (
                <SynauraPanel className="py-16 text-center">
                  <p className="text-lg font-semibold text-black/60">Aucun titre {activeGenre} trouve</p>
                  <p className="mt-1 text-sm text-black/35">Essaie un autre genre ou reviens a "Tout".</p>
                  <button
                    onClick={() => handleGenreClick('Tout')}
                    className="mt-4 h-10 rounded-full bg-[#171313] px-5 text-sm font-semibold text-white transition hover:scale-[1.02]"
                  >
                    Voir tout
                  </button>
                </SynauraPanel>
              ) : null}

              {!isFiltered ? (
                <SynauraPanel className="p-6 text-center">
                  <h3 className="text-lg font-bold text-[#171313]">Envie d'aller plus loin ?</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-black/45">
                    Cree un compte pour des recommandations personnalisees et la creation musicale IA.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/auth/signup"
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-6 text-sm font-bold text-white transition hover:scale-[1.02]"
                    >
                      Creer un compte
                    </Link>
                    <Link
                      href="/ai-generator"
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-black/[0.06] px-6 text-sm font-semibold text-black/65 transition hover:bg-black hover:text-white"
                    >
                      <Sparkles className="h-4 w-4" />
                      Studio IA
                    </Link>
                  </div>
                </SynauraPanel>
              ) : null}
            </>
          )}
        </main>

        <DiscoverGuestAside
          activeGenre={activeGenre}
          topHits={topHits.length}
          playlists={playlists.length}
          artists={artists.length}
        />
      </div>
    </SynauraAppShell>
  );
}
