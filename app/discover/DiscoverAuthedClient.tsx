'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, X, Disc3, Play, Zap } from 'lucide-react';
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
  'Lo-Fi', 'Classical', 'Indie', 'Soul', 'Funk', 'Ambient', 'Metal',
  'Reggae', 'Latin', 'Afro',
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

function filterByGenre(tracks: DiscoverTrackLite[], genre: string | null): DiscoverTrackLite[] {
  if (!genre || genre === 'Tout') return tracks;
  const g = genre.toLowerCase();
  return tracks.filter(t => {
    const genres = Array.isArray((t as any)?.genre) ? (t as any).genre : (t as any)?.genre ? [(t as any).genre] : [];
    return genres.some((x: string) => String(x || '').toLowerCase().includes(g));
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
  const [activeGenre, setActiveGenre] = useState<string>(genreFilter || 'Tout');
  const [forYou, setForYou] = useState(initialForYou);
  const [trending, setTrending] = useState(initialTrending);
  const [newest, setNewest] = useState(initialNew);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [artists, setArtists] = useState(initialArtists);
  const [boostedTracks, setBoostedTracks] = useState<any[]>([]);

  const refreshData = useCallback(async () => {
    try {
      const [fy, tr, nw, pl, ar, bt] = await Promise.all([
        fetch('/api/ranking/feed?limit=50&ai=1&strategy=reco', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/tracks/trending?limit=50', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/tracks/recent?limit=40', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/playlists/popular?limit=18', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/artists?sort=trending&limit=16', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
        fetch('/api/tracks/boosted?limit=10', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
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
      if (Array.isArray(bt?.tracks)) setBoostedTracks(bt.tracks);
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
      .filter(t => {
        const a = t.artist?.artistName || t.artist?.name || t.artist?.username || '';
        return `${t.title} ${a}`.toLowerCase().includes(query);
      })
      .slice(0, 20);
  }, [q, allTracks]);

  const topHits = useMemo(() =>
    uniqById(filterByGenre(trending, activeGenre))
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 10),
  [trending, activeGenre]);

  const topHitIds = useMemo(() => new Set(topHits.map(t => t._id)), [topHits]);

  const displayTrending = useMemo(() =>
    filteredTrending.filter(t => !topHitIds.has(t._id)),
  [filteredTrending, topHitIds]);

  const trendingIds = useMemo(() => {
    const s = new Set(topHitIds);
    displayTrending.forEach(t => s.add(t._id));
    return s;
  }, [topHitIds, displayTrending]);

  const displayForYou = useMemo(() =>
    filteredForYou.filter(t => !trendingIds.has(t._id)),
  [filteredForYou, trendingIds]);

  const shownIds = useMemo(() => {
    const s = new Set(trendingIds);
    displayForYou.forEach(t => s.add(t._id));
    return s;
  }, [trendingIds, displayForYou]);

  const displayNewest = useMemo(() =>
    filteredNewest.filter(t => !shownIds.has(t._id)),
  [filteredNewest, shownIds]);

  const aiTracks = useMemo(() => filterByGenre(allTracks.filter(t => Boolean(t.isAI)), activeGenre).slice(0, 16), [allTracks, activeGenre]);

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
              {`${greeting()}, ${displayName}`}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              Explore, découvre et écoute sans limites.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => handlePlayAll(filteredForYou.length ? filteredForYou : filteredTrending)}
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
            {/* Top Hits */}
            {topHits.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `Top ${activeGenre}` : 'Top Hits'}
                  subtitle={isFiltered ? `Les meilleurs titres ${activeGenre}` : 'Les plus écoutés en ce moment'}
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
            {displayForYou.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `${activeGenre} pour toi` : 'Pour toi'}
                  subtitle="Basé sur tes goûts"
                />
                <HorizontalScroller>
                  {displayForYou.slice(0, 20).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Le meilleur des boosts */}
            {boostedTracks.length > 0 && (
              <section className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(245,158,11,0.08) 50%, rgba(236,72,153,0.1) 100%)' }}>
                <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: '1px solid rgba(168,85,247,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} />
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), rgba(245,158,11,0.4), transparent)' }} />
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl grid place-items-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))', boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}>
                        <Zap className="h-5 w-5 text-amber-400" style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' }} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black text-white leading-tight">Le meilleur des boosts</h2>
                        <p className="text-xs text-white/40 mt-0.5">Ces artistes boostent leurs pistes en ce moment</p>
                      </div>
                    </div>
                    <button onClick={() => router.push('/boosters')} className="shrink-0 h-9 px-4 rounded-xl text-xs font-bold transition-all" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(245,158,11,0.25))', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      Voir tout
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                    {boostedTracks.slice(0, 10).map((t: any) => {
                      const dur = t.duration || 0;
                      const durStr = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;
                      return (
                        <div key={t._id || t.id} className="group shrink-0 w-[155px] sm:w-[170px]">
                          <div className="relative rounded-xl overflow-hidden mb-2">
                            <div className="absolute -inset-[2px] rounded-xl z-0" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.5), rgba(245,158,11,0.4), rgba(236,72,153,0.4), rgba(168,85,247,0.5))', filter: 'blur(6px)', animation: 'boost-halo-pulse 3s ease-in-out infinite' }} />
                            <div className="relative z-[1] rounded-xl overflow-hidden">
                              <img src={t.coverUrl || '/default-cover.jpg'} alt={t.title} className="w-full aspect-square object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg'; }} />
                              <button onClick={() => { setTracks(boostedTracks as any); playTrack(t as any); }} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                </div>
                              </button>
                              <div className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-violet-400/30" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.5), rgba(245,158,11,0.4))', backdropFilter: 'blur(8px)' }}>
                                <Zap className="w-2.5 h-2.5 text-amber-300" style={{ fill: 'rgba(245,158,11,0.4)' }} />
                                <span className="text-[8px] font-bold text-white">Boosted</span>
                              </div>
                              {t.boostMultiplier && t.boostMultiplier > 1 && (
                                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-emerald-500/20">
                                  <span className="text-[9px] font-bold text-emerald-400">x{Number(t.boostMultiplier).toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-white truncate">{t.title}</div>
                          <div className="text-[10px] text-white/35 truncate">{t.artist?.name || t.artist?.username || 'Artiste'} · {durStr}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(10,10,21,0.6), rgba(245,158,11,0.1))', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <div className="flex items-center gap-4 p-4">
                      <div className="shrink-0 hidden sm:flex h-12 w-12 rounded-xl items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(245,158,11,0.2))', boxShadow: '0 0 15px rgba(168,85,247,0.15)' }}>
                        <Zap className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">Toi aussi, boost tes musiques !</div>
                        <div className="text-[11px] text-white/35 mt-0.5">Ouvre des boosters, utilise-les sur tes pistes et monte dans les classements.</div>
                      </div>
                      <button onClick={() => router.push('/boosters')} className="shrink-0 h-10 px-5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}>
                        Ouvrir mes boosters
                      </button>
                    </div>
                  </div>
                </div>
                <style>{`@keyframes boost-halo-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }`}</style>
              </section>
            )}

            {/* Tendances */}
            {displayTrending.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `Tendances ${activeGenre}` : 'Tendances'}
                  subtitle="Les plus écoutés"
                />
                <HorizontalScroller>
                  {displayTrending.slice(0, 20).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Nouveautés */}
            {displayNewest.length > 0 && (
              <section>
                <SectionHeader
                  title={isFiltered ? `Nouveautés ${activeGenre}` : 'Nouveautés'}
                  subtitle="Tout juste publié"
                />
                <HorizontalScroller>
                  {displayNewest.slice(0, 20).map(t => (
                    <TrackTile key={t._id} track={t} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Créations IA */}
            {aiTracks.length > 0 && (
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
            {!isFiltered && artists.length > 0 && (
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
            {!isFiltered && playlists.length > 0 && (
              <section>
                <SectionHeader title="Playlists populaires" subtitle="Compilations de la communauté" />
                <HorizontalScroller>
                  {playlists.slice(0, 12).map(p => (
                    <PlaylistTile key={p._id} playlist={p} />
                  ))}
                </HorizontalScroller>
              </section>
            )}

            {/* Empty state when genre has no results */}
            {isFiltered && displayForYou.length === 0 && displayTrending.length === 0 && displayNewest.length === 0 && topHits.length === 0 && (
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
          </>
        )}

        <div className="h-24" />
      </main>
    </div>
  );
}
