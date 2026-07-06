'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Compass, Radar as RadarIcon } from 'lucide-react';
import {
  SynauraAppShell,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import { useAudioPlayer } from '@/app/providers';
import { DISCOVER_MOODS, getMoodById, type MoodId } from '@/lib/discoverMoods';
import { COMMUNITY_CLUBS } from '@/lib/communityClubs';
import { type DiscoverTrackLite } from './DiscoverPlayButton';
import {
  CollectionSpotlight,
  HorizontalScroller,
  SectionHeader,
  TrackTile,
  type DiscoverPlaylistLite,
} from './DiscoverTiles';
import { MoodCard, ArtistDiscoverCard, type DiscoverArtistCardLite } from './DiscoverMoodTiles';

function MoodResultsView({ moodId, onBack }: { moodId: MoodId; onBack: () => void }) {
  const { setQueueAndPlay } = useAudioPlayer();
  const mood = getMoodById(moodId)!;
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<DiscoverTrackLite[]>([]);
  const [hasEnough, setHasEnough] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/discover/moods?mood=${encodeURIComponent(moodId)}&limit=40`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!mounted || !json) return;
        setTracks(Array.isArray(json.tracks) ? json.tracks : []);
        setHasEnough(Boolean(json.hasEnough));
      })
      .catch(() => {
        if (mounted) setHasEnough(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [moodId]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 text-xs font-black text-black/56 transition hover:bg-[#171313] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Toutes les ambiances
      </button>

      <div
        className="relative overflow-hidden rounded-[1.8rem] p-6 text-white sm:p-8"
        style={{ background: `linear-gradient(150deg, ${mood.gradient[0]}, ${mood.gradient[1]})` }}
      >
        <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">{mood.label}</h1>
        <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-white/72 sm:text-base">{mood.promise}</p>
      </div>

      {loading ? (
        <SynauraPanel className="grid min-h-[240px] place-items-center p-8">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-black/12 border-t-[#171313]" />
        </SynauraPanel>
      ) : hasEnough && tracks.length ? (
        <SynauraPanel className="p-4 sm:p-5">
          <SectionHeader
            title="Sélection réelle"
            subtitle={`${tracks.length} morceau${tracks.length > 1 ? 'x' : ''} dans cette ambiance`}
            actionLabel="Tout lire"
            onAction={() => setQueueAndPlay(tracks as any, 0)}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tracks.map((track) => (
              <TrackTile key={track._id} track={track} grid />
            ))}
          </div>
        </SynauraPanel>
      ) : (
        <SynauraPanel className="p-10 text-center">
          <Compass className="mx-auto h-10 w-10 text-black/20" />
          <p className="mt-4 text-base font-black text-black/60">Pas encore assez de morceaux pour cette ambiance.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-black/38">Reviens bientôt, ou explore une autre ambiance en attendant.</p>
          <button onClick={onBack} className="mt-5 inline-flex h-10 items-center rounded-full bg-[#171313] px-5 text-xs font-black text-white">
            Voir les autres ambiances
          </button>
        </SynauraPanel>
      )}
    </div>
  );
}

export default function DiscoverClient({
  initialMood,
  radarTracks,
  moodPreviews,
  collections,
  artists,
}: {
  initialMood: MoodId | null;
  radarTracks: DiscoverTrackLite[];
  moodPreviews: Record<string, string[]>;
  collections: DiscoverPlaylistLite[];
  artists: DiscoverArtistCardLite[];
}) {
  const router = useRouter();
  const { setQueueAndPlay } = useAudioPlayer();
  const [activeMood, setActiveMood] = useState<MoodId | null>(initialMood);

  const openMood = useCallback((moodId: MoodId) => {
    setActiveMood(moodId);
    router.replace(`/discover?mood=${moodId}`, { scroll: false });
  }, [router]);

  const closeMood = useCallback(() => {
    setActiveMood(null);
    router.replace('/discover', { scroll: false });
  }, [router]);

  const activeMoodConfig = useMemo(() => getMoodById(activeMood), [activeMood]);

  return (
    <SynauraAppShell contentClassName="max-w-[1160px]">
      <SynauraTopBar searchHref="/discover" searchLabel="Sons, artistes, playlists, clubs..." secondaryHref="/ai-generator" secondaryLabel="Studio" />
      <SynauraRouteNav />

      <div className="space-y-6 pb-24">
        {activeMoodConfig ? (
          <MoodResultsView moodId={activeMoodConfig.id} onBack={closeMood} />
        ) : (
          <>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Explorer</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#171313] sm:text-5xl">
                Choisis une ambiance et entre dans un univers.
              </h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-black/48 sm:text-base">
                Pas un flux personnalisé : un endroit pour choisir volontairement où aller.
              </p>
            </div>

            <SynauraPanel className="p-3 sm:p-4">
              <SynauraUniversalSearch placeholder="Sons, artistes, playlists, clubs..." />
            </SynauraPanel>

            <section>
              <div className="mb-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">8 ambiances</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#171313] sm:text-2xl">Explorer par ambiance</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {DISCOVER_MOODS.map((mood) => (
                  <MoodCard key={mood.id} mood={mood} covers={moodPreviews[mood.id] || []} onOpen={() => openMood(mood.id)} />
                ))}
              </div>
            </section>

            <section>
              <SynauraPanel className="p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] bg-[#7357C6]/12 text-[#7357C6]">
                    <RadarIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Radar Synaura</p>
                    <h2 className="text-xl font-black tracking-[-0.04em] text-[#171313] sm:text-2xl">Des sons encore peu écoutés qui méritent une chance.</h2>
                  </div>
                </div>
                {radarTracks.length ? (
                  <>
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setQueueAndPlay(radarTracks as any, 0)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/[0.055] px-4 text-xs font-black text-black/56 transition hover:bg-[#171313] hover:text-white"
                      >
                        Tout lire
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {radarTracks.map((track) => (
                        <TrackTile key={track._id} track={track} grid />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="rounded-[1.1rem] border border-dashed border-black/[0.12] p-6 text-center text-sm font-semibold text-black/42">
                    Pas encore de sons disponibles pour le Radar.
                  </p>
                )}
              </SynauraPanel>
            </section>

            {collections.length ? (
              <section>
                <CollectionSpotlight playlists={collections} />
              </section>
            ) : null}

            {artists.length ? (
              <section>
                <div className="mb-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Créateurs</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#171313] sm:text-2xl">Artistes à découvrir</h2>
                </div>
                <HorizontalScroller>
                  {artists.map((artist) => (
                    <ArtistDiscoverCard key={artist._id} artist={artist} />
                  ))}
                </HorizontalScroller>
              </section>
            ) : null}

            <section>
              <div className="rounded-[1.5rem] border border-black/[0.08] bg-black/[0.02] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Communauté</p>
                    <h2 className="text-base font-black tracking-[-0.03em] text-[#171313]">Créer avec d'autres</h2>
                  </div>
                  <Link href="/community" className="text-xs font-black text-black/44 hover:text-black">
                    Tous les Clubs
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COMMUNITY_CLUBS.map((club) => (
                    <Link
                      key={club.slug}
                      href={`/community/${club.slug}`}
                      className="flex items-center gap-2 rounded-[1rem] border border-black/[0.06] bg-white/70 p-2.5 transition hover:bg-white"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: club.accent }} />
                      <span className="min-w-0 flex-1 truncate text-xs font-black text-black/64">{club.name}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-black/28" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </SynauraAppShell>
  );
}
