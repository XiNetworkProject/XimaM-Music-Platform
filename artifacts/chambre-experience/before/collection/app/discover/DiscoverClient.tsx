'use client';

import '@/components/v2/music-v2.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Compass, Pause, Play } from 'lucide-react';
import {
  SynauraAppShell,
  SynauraPanel,
  SynauraRouteNav,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';
import RadarSection from '@/components/radar/RadarSection';
import TrackCover from '@/components/TrackCover';
import SynauraCityTeaser from '@/components/city/SynauraCityTeaser';
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

function compactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value || 0);
}

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
        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--syn-border)] bg-[var(--syn-surface)] px-4 text-xs font-black text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Toutes les ambiances
      </button>

      <div
        className="relative overflow-hidden rounded-[14px] p-6 text-white sm:rounded-[20px] sm:p-8"
        style={{ background: `linear-gradient(150deg, ${mood.gradient[0]}, ${mood.gradient[1]})` }}
      >
        <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">{mood.label}</h1>
        <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-white/72 sm:text-base">{mood.promise}</p>
      </div>

      {loading ? (
        <SynauraPanel className="grid min-h-[240px] place-items-center p-8">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[var(--syn-border)] border-t-[var(--syn-text-primary)]" />
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
          <Compass className="mx-auto h-10 w-10 text-[var(--syn-text-secondary)]" />
          <p className="mt-4 text-base font-black text-[var(--syn-text-primary)]">Pas encore assez de morceaux pour cette ambiance.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-[var(--syn-text-secondary)]">Reviens bientôt, ou explore une autre ambiance en attendant.</p>
          <button onClick={onBack} className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-[var(--syn-contrast-bg)] px-5 text-xs font-black text-[var(--syn-contrast-text)]">
            Voir les autres ambiances
          </button>
        </SynauraPanel>
      )}
    </div>
  );
}

function DiscoverLeadCard({
  track,
  queue,
  totalTracks,
}: {
  track: DiscoverTrackLite;
  queue: DiscoverTrackLite[];
  totalTracks: number;
}) {
  const { audioState, pause, play, setQueueAndPlay } = useAudioPlayer();
  const current = audioState.tracks[audioState.currentTrackIndex];
  const isCurrent = String(current?._id || (current as any)?.id || '') === track._id;
  const isPlaying = isCurrent && audioState.isPlaying;
  const artist = track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';

  const toggle = () => {
    if (isCurrent) {
      if (audioState.isPlaying) pause();
      else void play();
      return;
    }
    const index = Math.max(0, queue.findIndex((item) => item._id === track._id));
    void setQueueAndPlay(queue as any, index);
  };

  return (
<section className="v2-discover-lead" aria-label="Un morceau à découvrir">
      <TrackCover
        trackId={track._id}
        src={track.coverUrl}
        videoSrc={track.coverVideoUrl}
        posterSrc={track.coverVideoPosterUrl || track.coverUrl}
        title={track.title}
className="v2-discover-lead-art"
        rounded="rounded-none"
        objectFit="cover"
      />
<div className="v2-discover-lead-copy">
<p className="v2-kicker">Le son à suivre</p>
        <h2 className="mt-2 max-w-xl text-3xl font-black leading-[0.98] sm:text-5xl">{track.title}</h2>
        <p className="mt-2 text-sm font-bold text-white/68">{artist}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#F7F6F3] px-4 text-sm font-black text-[#111111] transition hover:opacity-90"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            {isPlaying ? 'Pause' : 'Ecouter'}
          </button>
          <Link
            href={`/track/${encodeURIComponent(track._id)}`}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-white/16 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/16"
          >
            Ouvrir le morceau
            <ArrowRight className="h-4 w-4" />
          </Link>
          {totalTracks ? (
            <span className="text-xs font-bold text-white/52">{compactCount(totalTracks)} sons publics</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DiscoverTrackRail({
  title,
  subtitle,
  tracks,
  edition,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  tracks: DiscoverTrackLite[];
  edition: 'releases' | 'hidden' | 'popular';
  eyebrow: string;
}) {
  if (!tracks.length) return null;
  return (
    <section className={`v2-discover-track-section chambre-discover-edition chambre-discover-edition--${edition}`} aria-labelledby={`discover-${edition}`}>
      <header className="chambre-discover-section-heading">
        <div>
          <p className="v2-kicker">{eyebrow}</p>
          <h2 id={`discover-${edition}`}>{title}</h2>
        </div>
        <p>{subtitle}</p>
      </header>
      <ol className="chambre-discover-records">
        {tracks.slice(0, edition === 'popular' ? 6 : 4).map((track, index) => (
          <li key={track._id} data-discover-track={track._id}>
            <span className="chambre-discover-record-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <TrackTile track={track} grid />
          </li>
        ))}
      </ol>
      {tracks.length > (edition === 'popular' ? 6 : 4) ? (
        <details className="chambre-discover-remainder">
          <summary>
            <span>Explorer la suite <span className="chambre-discover-remainder-count">{tracks.length - (edition === 'popular' ? 6 : 4)} autres morceaux</span></span>
            <ArrowRight size={18} aria-hidden="true" />
          </summary>
          <ol className="chambre-discover-records chambre-discover-records--continued" start={edition === 'popular' ? 7 : 5}>
            {tracks.slice(edition === 'popular' ? 6 : 4).map((track, index) => (
              <li key={track._id} data-discover-track={track._id}>
                <span className="chambre-discover-record-index" aria-hidden="true">{String(index + (edition === 'popular' ? 7 : 5)).padStart(2, '0')}</span>
                <TrackTile track={track} grid />
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

export default function DiscoverClient({
  initialMood,
  radarTracks,
  newestTracks,
  hiddenTracks,
  popularTracks,
  totalTracks,
  moodPreviews,
  collections,
  artists,
  favoriteMoodIds = [],
}: {
  initialMood: MoodId | null;
  radarTracks: DiscoverTrackLite[];
  newestTracks: DiscoverTrackLite[];
  hiddenTracks: DiscoverTrackLite[];
  popularTracks: DiscoverTrackLite[];
  totalTracks: number;
  moodPreviews: Record<string, string[]>;
  collections: DiscoverPlaylistLite[];
  artists: DiscoverArtistCardLite[];
  favoriteMoodIds?: string[];
}) {
  const router = useRouter();
  const [activeMood, setActiveMood] = useState<MoodId | null>(initialMood);

  const orderedMoods = useMemo(() => {
    if (!favoriteMoodIds.length) return DISCOVER_MOODS;
    return [...DISCOVER_MOODS].sort((a, b) => {
      const aFav = favoriteMoodIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteMoodIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [favoriteMoodIds]);

  const openMood = useCallback((moodId: MoodId) => {
    setActiveMood(moodId);
    router.replace(`/discover?mood=${moodId}`, { scroll: false });
  }, [router]);

  const closeMood = useCallback(() => {
    setActiveMood(null);
    router.replace('/discover', { scroll: false });
  }, [router]);

  const activeMoodConfig = useMemo(() => getMoodById(activeMood), [activeMood]);
  const leadTrack = radarTracks[0] || newestTracks[0] || hiddenTracks[0] || popularTracks[0] || null;
  const leadQueue = radarTracks.length ? radarTracks : newestTracks.length ? newestTracks : popularTracks;

  return (
<SynauraAppShell contentClassName="v2-music-shell v2-discover-shell">
      <SynauraTopBar searchHref="/discover" searchLabel="Sons, artistes, playlists, clubs..." secondaryHref="/ai-generator" secondaryLabel="AI Generator" />
      <SynauraRouteNav />


<div className="v2-discover" data-chambre-music="discover">
        {activeMoodConfig ? (
          <MoodResultsView moodId={activeMoodConfig.id} onBack={closeMood} />
        ) : (
          <>
            <div className="v2-discover-opening">
              <header className="v2-discover-intro">
                <p className="v2-kicker">Explorer / au-delà du déjà entendu</p>
                <h1 className="v2-heading">Suivez<br /><em>l’onde.</em></h1>
                <p className="v2-intro">Un morceau attire votre attention. Une voix vous retient. Le prochain univers est à une écoute d’ici.</p>
                <nav aria-label="Explorer cette page" className="v2-discover-index">
                  <a href="#ambiances">Ambiances <ArrowRight size={15} /></a>
                  <a href="#createurs">Créateurs <ArrowRight size={15} /></a>
                  <a href="#rencontres">Rencontres <ArrowRight size={15} /></a>
                </nav>
              </header>
              {leadTrack ? <DiscoverLeadCard track={leadTrack} queue={leadQueue} totalTracks={totalTracks} /> : null}
            </div>

            <section id="ambiances" className="v2-discover-moods chambre-discover-frequencies" aria-labelledby="discover-frequencies-title">
              <header className="chambre-discover-frequency-heading">
                <p className="v2-kicker">01 / choisir une sensation</p>
                <h2 id="discover-frequencies-title" className="mt-1 text-xl font-black text-[var(--syn-text-primary)] sm:text-2xl">Entrez dans votre ambiance.</h2>
                <p className="mt-1 text-sm text-[var(--syn-text-secondary)]">
                  De l’énergie brute aux heures suspendues. Des morceaux publiés, à explorer à votre rythme.
                </p>
                <span className="chambre-discover-frequency-line" aria-hidden="true" />
                <p className="chambre-discover-frequency-note">Un état d’esprit.<br />Plusieurs chemins pour l’écouter.</p>
              </header>
              <div className="v2-mood-grid">
                {orderedMoods.map((mood) => (
                  <MoodCard
                    key={mood.id}
                    mood={mood}
                    covers={moodPreviews[mood.id] || []}
                    onOpen={() => openMood(mood.id)}
                    highlighted={favoriteMoodIds.includes(mood.id)}
                  />
                ))}
              </div>
            </section>

            <div className="chambre-discover-radar">
              <p className="v2-kicker">02 / capter ce qui émerge</p>
              <RadarSection tracks={radarTracks as any} compact showViewAll />
            </div>

            <DiscoverTrackRail
              title="Tout juste publiés"
              subtitle="Les dernières sorties publiques, dans leur ordre réel de publication."
              tracks={newestTracks}
              edition="releases"
              eyebrow="03 / le journal des sorties"
            />

            <DiscoverTrackRail
              title="Pépites à découvrir"
              subtitle="Des morceaux encore peu écoutés, remontés hors des classements habituels."
              tracks={hiddenTracks}
              edition="hidden"
              eyebrow="04 / hors des sentiers battus"
            />

            {collections.length ? (
              <section className="chambre-discover-collections" aria-label="Collections Synaura">
                <p className="v2-kicker">Prolonger une sensation / les collections</p>
                <CollectionSpotlight playlists={collections} />
              </section>
            ) : null}

            <DiscoverTrackRail
              title="Plébiscités sur Synaura"
              subtitle="Les morceaux qui cumulent le plus d’amour et d’écoutes sur la plateforme."
              tracks={popularTracks}
              edition="popular"
              eyebrow="05 / la résonance collective"
            />

{artists.length ? (
              <section id="createurs" className="v2-discover-artists chambre-discover-portraits" aria-labelledby="discover-artists-title">
                <header className="chambre-discover-section-heading">
                  <div>
                    <p className="v2-kicker">06 / derrière les sons</p>
                    <h2 id="discover-artists-title">Artistes à découvrir</h2>
                  </div>
                  <p>
                    Entre directement dans leur univers avec un morceau réellement publié.
                  </p>
                </header>
                <HorizontalScroller>
                  {artists.map((artist) => (
                    <ArtistDiscoverCard key={artist._id} artist={artist} />
                  ))}
                </HorizontalScroller>
              </section>
            ) : null}

            <section id="rencontres" className="v2-discover-community chambre-discover-meeting">
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="v2-kicker">07 / se rencontrer</p>
                    <h2 className="text-base font-black text-[var(--syn-text-primary)]">Créer avec d'autres</h2>
                  </div>
                  <Link href="/community" className="text-xs font-black text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]">
                    Tous les Clubs
                  </Link>
                </div>
                <div className="chambre-discover-clubs grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COMMUNITY_CLUBS.map((club) => (
                    <Link
                      key={club.slug}
                      href={`/community/${club.slug}`}
                      className="flex items-center gap-2 rounded-[10px] border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-2.5 transition hover:bg-[var(--syn-soft-strong)]"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: club.accent }} />
                      <span className="min-w-0 flex-1 truncate text-xs font-black text-[var(--syn-text-primary)]">{club.name}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-[var(--syn-text-secondary)]" />
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="chambre-discover-events">
              <SectionHeader
                title="Événements Synaura"
                subtitle="Les rendez-vous, défis et scènes ouverts en ce moment."
              />
              <SynauraCityTeaser />
            </section>
          </>
        )}
      </div>
    </SynauraAppShell>
  );
}
