'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Disc3, Play, Search, Sparkles, X, Zap } from 'lucide-react';
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
import SynauraEventsRail from '@/components/synaura/SynauraEventsRail';
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
  'Lo-Fi', 'Classical', 'Indie', 'Soul', 'Funk', 'Ambient', 'Metal',
  'Reggae', 'Latin', 'Afro',
];
const DISCOVER_TABS = ['Tout', 'Sons', 'IA', 'Artistes', 'Albums', 'Playlists'] as const;
type DiscoverTab = typeof DISCOVER_TABS[number];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon apres-midi';
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

function filterByGenre(tracks: DiscoverTrackLite[], genre: string | null): DiscoverTrackLite[] {
  if (!genre || genre === 'Tout') return tracks;
  const g = genre.toLowerCase();
  return tracks.filter((t) => {
    const genres = Array.isArray((t as any)?.genre) ? (t as any).genre : (t as any)?.genre ? [(t as any).genre] : [];
    return genres.some((x: string) => String(x || '').toLowerCase().includes(g));
  });
}

function DiscoverAside({
  activeGenre,
  topHits,
  artistsCount,
  boostedCount,
  recommendedCount,
}: {
  activeGenre: string;
  topHits: number;
  artistsCount: number;
  boostedCount: number;
  recommendedCount: number;
}) {
  return (
    <aside className="hidden space-y-4 xl:block">
      <SynauraInkPanel className="p-4">
        <p className="mb-3 text-sm font-black">Tempo decouverte</p>
        <div className="rounded-[1.4rem] bg-white/8 p-4">
          <p className="text-3xl font-black leading-none">For you.</p>
          <p className="text-3xl font-black leading-none text-white/55">Then trending.</p>
          <p className="mt-3 text-sm leading-6 text-white/45">
            Toute la logique actuelle reste branchee. On refait seulement la facon de la montrer.
          </p>
        </div>
      </SynauraInkPanel>

      <SynauraPanel className="p-4">
        <p className="mb-3 text-sm font-black">Repères rapides</p>
        <div className="grid gap-2">
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{recommendedCount}</p>
            <p className="text-xs text-black/40">titres visibles</p>
          </div>
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{topHits}</p>
            <p className="text-xs text-black/40">top hits</p>
          </div>
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{artistsCount}</p>
            <p className="text-xs text-black/40">artistes chauds</p>
          </div>
          <div className="rounded-2xl bg-black/[0.045] p-3">
            <p className="text-xl font-black">{boostedCount}</p>
            <p className="text-xs text-black/40">boosts visibles</p>
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
  const { setQueueAndPlay } = useAudioPlayer();

  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState<DiscoverTab>('Tout');
  const [activeGenre, setActiveGenre] = useState<string>(genreFilter || 'Tout');
  const [forYou, setForYou] = useState(initialForYou);
  const [trending, setTrending] = useState(initialTrending);
  const [newest, setNewest] = useState(initialNew);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [artists, setArtists] = useState(initialArtists);
  const [boostedTracks, setBoostedTracks] = useState<any[]>([]);
  const [albums, setAlbums] = useState<DiscoverAlbumLite[]>([]);

  const refreshData = useCallback(async () => {
    try {
      const [fy, tr, nw, pl, ar, bt, alb] = await Promise.all([
        fetch('/api/ranking/feed?limit=50&ai=1&strategy=reco', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/tracks/trending?limit=50', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/tracks/recent?limit=40', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/playlists/popular?limit=18', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/artists?sort=trending&limit=16', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/tracks/boosted?limit=10', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/playlists/albums?limit=20', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ]);
      if (Array.isArray(fy?.tracks)) setForYou(fy.tracks);
      if (Array.isArray(tr?.tracks)) setTrending(tr.tracks);
      if (Array.isArray(nw?.tracks)) setNewest(nw.tracks);
      if (Array.isArray(pl?.playlists)) {
        setPlaylists(
          pl.playlists.map((p: any) => ({
            _id: String(p?._id || p?.id || ''),
            name: String(p?.name || 'Playlist'),
            description: typeof p?.description === 'string' ? p.description : '',
            coverUrl: p?.coverUrl ?? null,
          })),
        );
      }
      if (Array.isArray(ar?.artists)) {
        setArtists(
          ar.artists.map((a: any) => ({
            _id: String(a?._id || a?.id || ''),
            username: String(a?.username || ''),
            name: String(a?.name || a?.username || 'Artiste'),
            avatar: typeof a?.avatar === 'string' ? a.avatar : '',
            totalPlays: a?.totalPlays,
            totalLikes: a?.totalLikes,
            trackCount: a?.trackCount,
            isTrending: Boolean(a?.isTrending),
          })),
        );
      }
      if (Array.isArray(bt?.tracks)) setBoostedTracks(bt.tracks);
      if (Array.isArray(alb?.albums)) setAlbums(alb.albums);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(refreshData, 600);
    return () => clearTimeout(t);
  }, [refreshData]);

  const handleGenreClick = useCallback((genre: string) => {
    setActiveGenre(genre);
    if (genre === 'Tout') {
      router.replace('/discover', { scroll: false });
    } else {
      router.replace(`/discover?genre=${encodeURIComponent(genre)}`, { scroll: false });
    }
  }, [router]);

  const isFiltered = activeGenre !== 'Tout';

  const filteredForYou = useMemo(() => filterByGenre(forYou, activeGenre), [forYou, activeGenre]);
  const filteredTrending = useMemo(() => filterByGenre(trending, activeGenre), [trending, activeGenre]);
  const filteredNewest = useMemo(() => filterByGenre(newest, activeGenre), [newest, activeGenre]);

  const allTracks = useMemo(() => uniqById([...forYou, ...trending, ...newest]), [forYou, trending, newest]);

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
        .slice(0, 10),
    [trending, activeGenre],
  );

  const topHitIds = useMemo(() => new Set(topHits.map((t) => t._id)), [topHits]);

  const displayTrending = useMemo(
    () => filteredTrending.filter((t) => !topHitIds.has(t._id)),
    [filteredTrending, topHitIds],
  );

  const trendingIds = useMemo(() => {
    const s = new Set(topHitIds);
    displayTrending.forEach((t) => s.add(t._id));
    return s;
  }, [topHitIds, displayTrending]);

  const displayForYou = useMemo(
    () => filteredForYou.filter((t) => !trendingIds.has(t._id)),
    [filteredForYou, trendingIds],
  );

  const shownIds = useMemo(() => {
    const s = new Set(trendingIds);
    displayForYou.forEach((t) => s.add(t._id));
    return s;
  }, [trendingIds, displayForYou]);

  const displayNewest = useMemo(
    () => filteredNewest.filter((t) => !shownIds.has(t._id)),
    [filteredNewest, shownIds],
  );

  const aiTracks = useMemo(
    () => filterByGenre(allTracks.filter((t) => Boolean(t.isAI)), activeGenre).slice(0, 16),
    [allTracks, activeGenre],
  );

  const handlePlayAll = useCallback((tracks: DiscoverTrackLite[]) => {
    if (tracks.length) {
      setQueueAndPlay(tracks as any, 0);
    }
  }, [setQueueAndPlay]);

  const isSearching = q.trim().length > 0;
  const recommendedCount = filteredForYou.length || filteredTrending.length || filteredNewest.length;

  return (
    <SynauraAppShell>
      <SynauraTopBar searchHref="/discover" searchLabel="Rechercher un son, un genre ou un artiste..." />
      <SynauraRouteNav />
      <SynauraAnnouncementStrip />
      <SynauraEventsRail variant="discover" className="mx-auto mb-5 max-w-[1080px]" />

      <div className="mx-auto grid max-w-[1080px] gap-5">
        <main className="min-w-0 space-y-5 pb-28">
          <SynauraHero
            eyebrow="Découverte personnalisée"
            title={`${greeting()}, ${displayName}`}
            description="Tes recommandations, tes tendances et tes nouveautés vivent maintenant dans la même grammaire que la home Synaura."
            actions={
              <>
                <button
                  onClick={() => handlePlayAll(filteredForYou.length ? filteredForYou : filteredTrending)}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  <Disc3 className="h-4 w-4" />
                  Mix pour toi
                </button>
                <button
                  onClick={() => router.push('/ai-generator')}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-black/[0.06] px-5 text-sm font-black text-black/65 transition hover:bg-black hover:text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Studio
                </button>
              </>
            }
            aside={
              <div className="rounded-[1.7rem] bg-[#171313] p-4 text-[#fffaf2]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Session du jour</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/8 p-3">
                    <p className="text-2xl font-black">{recommendedCount}</p>
                    <p className="text-xs text-white/45">titres visibles</p>
                  </div>
                  <div className="rounded-2xl bg-white/8 p-3">
                    <p className="text-2xl font-black">{artists.length}</p>
                    <p className="text-xs text-white/45">artistes chauds</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <button onClick={() => handlePlayAll(filteredForYou.length ? filteredForYou : filteredTrending)} className="rounded-2xl bg-white text-left px-3 py-2 text-xs font-black text-[#171313]">
                    Mix quotidien
                  </button>
                  <button onClick={() => { setActiveTab('Sons'); handlePlayAll(topHits.length ? topHits : filteredTrending); }} className="rounded-2xl bg-white/10 text-left px-3 py-2 text-xs font-black text-white/70">
                    Top hebdo
                  </button>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/45">
                  {activeGenre === 'Tout' ? 'Le flux assemble recommandations, tendances et nouveautes en un seul mouvement.' : `Focus actuel : ${activeGenre}.`}
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

              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {DISCOVER_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${
                      activeTab === tab
                        ? 'bg-[#171313] text-white shadow-[0_12px_28px_rgba(23,19,19,0.18)]'
                        : 'bg-black/[0.045] text-black/48 hover:bg-black/[0.08] hover:text-black'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <SynauraFilterTabs items={GENRES} active={activeGenre} onChange={handleGenreClick} />
            </div>
          </SynauraPanel>

          {isSearching ? (
            <SynauraInkPanel className="p-4 sm:p-5">
              <SectionHeader title={`Résultats pour "${q}"`} subtitle="Titres qui correspondent à ta recherche" />
              {searchResults.length ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map((t, i) => (
                    <TrackRow key={t._id} track={t} index={i} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-8 text-center">
                  <Disc3 className="mx-auto h-10 w-10 text-white/24" />
                  <p className="mt-3 text-sm font-black text-white/70">Aucun résultat trouvé.</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs font-semibold leading-5 text-white/38">Essaie un autre style ou crée une piste IA pour lancer une nouvelle direction.</p>
                  <button onClick={() => router.push('/ai-generator')} className="mt-4 inline-flex h-10 items-center rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313]">
                    Ouvrir le Studio IA
                  </button>
                </div>
              )}
            </SynauraInkPanel>
          ) : (
            <>
              {(activeTab === 'Tout' || activeTab === 'Sons') && topHits.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `Top ${activeGenre}` : 'Top Hits'}
                    subtitle={isFiltered ? `Les meilleurs titres ${activeGenre}` : 'Les plus écoutés en ce moment'}
                    actionLabel="Tout lire"
                    onAction={() => handlePlayAll(topHits)}
                  />
                  <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                    {topHits.map((t, i) => (
                      <TrackRow key={t._id} track={t} index={i} />
                    ))}
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Sons') && displayForYou.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `${activeGenre} pour toi` : 'Pour toi'}
                    subtitle="Base sur tes gouts"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {displayForYou.slice(0, 6).map((t) => (
                      <TrackTile key={t._id} track={t} grid />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {displayForYou.slice(0, 20).map((t) => (
                        <TrackTile key={t._id} track={t} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Albums') && albums.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title="Albums & EPs"
                    subtitle="Les sorties completes a ecouter"
                    actionLabel="Voir tout"
                    actionHref="/discover?section=albums"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {albums.slice(0, 6).map((album) => (
                      <AlbumTile key={album._id} album={album} />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {albums.map((album) => (
                        <AlbumTile key={album._id} album={album} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Sons') && boostedTracks.length > 0 ? (
                <SynauraPanel
                  className="p-4 sm:p-6"
                  style={{ background: 'linear-gradient(135deg, rgba(255,246,215,0.92) 0%, rgba(255,228,241,0.84) 55%, rgba(255,250,242,0.96) 100%)' }}
                >
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(245,158,11,0.28))' }}
                      >
                        <Zap className="h-5 w-5 text-[#171313]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black leading-tight text-[#171313]">Le meilleur des boosts</h2>
                        <p className="mt-0.5 text-xs text-black/45">Ces artistes poussent leurs pistes en ce moment.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/boosters')}
                      className="w-full rounded-xl bg-[#171313] px-4 py-2 text-xs font-bold text-white transition hover:scale-[1.02] sm:w-auto"
                    >
                      Voir tout
                    </button>
                  </div>
                  <div className="synaura-no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {boostedTracks.slice(0, 10).map((t: any) => {
                      const dur = t.duration || 0;
                      const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
                      return (
                        <div key={t._id || t.id} className="group w-[138px] shrink-0 sm:w-[170px]">
                          <div className="relative mb-2 overflow-hidden rounded-xl">
                            <img
                              src={t.coverUrl || '/default-cover.svg'}
                              alt={t.title}
                              className="aspect-square w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/default-cover.svg';
                              }}
                            />
                            <button
                              onClick={() => {
                                const index = boostedTracks.findIndex((item: any) => String(item?._id || item?.id) === String(t?._id || t?.id));
                                setQueueAndPlay(boostedTracks as any, Math.max(0, index));
                              }}
                              className="absolute inset-0 flex items-center justify-center bg-black/28 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                                <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                              </div>
                            </button>
                            <div className="absolute right-1.5 top-1.5 rounded-full bg-[#171313] px-2 py-0.5 text-[8px] font-bold text-white">
                              Boosted
                            </div>
                          </div>
                          <div className="truncate text-xs font-semibold text-[#171313]">{t.title}</div>
                          <div className="truncate text-[10px] text-black/45">
                            {t.artist?.name || t.artist?.username || 'Artiste'} · {durStr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SynauraPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Sons') && displayTrending.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `Tendances ${activeGenre}` : 'Tendances'}
                    subtitle="Les plus écoutés"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {displayTrending.slice(0, 6).map((t) => (
                      <TrackTile key={t._id} track={t} grid />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {displayTrending.slice(0, 20).map((t) => (
                        <TrackTile key={t._id} track={t} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Sons') && displayNewest.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title={isFiltered ? `Nouveautés ${activeGenre}` : 'Nouveautés'}
                    subtitle="Tout juste publié"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {displayNewest.slice(0, 6).map((t) => (
                      <TrackTile key={t._id} track={t} grid />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {displayNewest.slice(0, 20).map((t) => (
                        <TrackTile key={t._id} track={t} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'IA') && aiTracks.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader
                    title="Créations IA"
                    subtitle="Généré par intelligence artificielle"
                    actionLabel="Créer"
                    actionHref="/ai-generator"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {aiTracks.slice(0, 6).map((t) => (
                      <TrackTile key={t._id} track={t} grid />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {aiTracks.map((t) => (
                        <TrackTile key={t._id} track={t} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Artistes') && !isFiltered && artists.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader title="Artistes du moment" subtitle="A suivre" />
                  <div className="grid grid-cols-3 gap-3 sm:hidden">
                    {artists.slice(0, 6).map((a) => (
                      <ArtistTile key={a._id} artist={a} />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {artists.slice(0, 12).map((a) => (
                        <ArtistTile key={a._id} artist={a} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {(activeTab === 'Tout' || activeTab === 'Playlists') && !isFiltered && playlists.length > 0 ? (
                <SynauraInkPanel className="p-4 sm:p-5">
                  <SectionHeader title="Playlists populaires" subtitle="Compilations de la communaute" />
                  <div className="grid grid-cols-2 gap-3 sm:hidden">
                    {playlists.slice(0, 6).map((p) => (
                      <PlaylistTile key={p._id} playlist={p} />
                    ))}
                  </div>
                  <div className="hidden sm:block">
                    <HorizontalScroller>
                      {playlists.slice(0, 12).map((p) => (
                        <PlaylistTile key={p._id} playlist={p} />
                      ))}
                    </HorizontalScroller>
                  </div>
                </SynauraInkPanel>
              ) : null}

              {isFiltered && displayForYou.length === 0 && displayTrending.length === 0 && displayNewest.length === 0 && topHits.length === 0 ? (
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
            </>
          )}
        </main>

      </div>
    </SynauraAppShell>
  );
}
