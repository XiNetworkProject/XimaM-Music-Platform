'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  Headphones,
  Heart,
  Loader2,
  Medal,
  Music2,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Users,
  Vote,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import TrackCover from '@/components/TrackCover';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import { SynauraButton, SynauraGhostButton } from '@/components/synaura/SynauraButton';
import SynauraColorBand from '@/components/synaura/SynauraColorBand';
import SynauraCountdownBanner from '@/components/synaura/SynauraCountdownBanner';
import SynauraCreatorSpotlight from '@/components/synaura/SynauraCreatorSpotlight';
import SynauraEventCard from '@/components/synaura/SynauraEventCard';
import SynauraPulseBadge from '@/components/synaura/SynauraPulseBadge';
import SynauraPulseBar from '@/components/synaura/SynauraPulseBar';
import SynauraSectionHeader from '@/components/synaura/SynauraSectionHeader';
import SynauraTickerBanner from '@/components/synaura/SynauraTickerBanner';
import SynauraBattleDuel from '@/components/synaura/SynauraBattleDuel';
import type { CityAward, CityBadge, CityEvent, CityPulseTrack, CityTrack, SynauraCityData } from '@/lib/synauraCity';

type MyTrack = {
  id: string;
  title: string;
  coverUrl?: string | null;
  coverVideoPosterUrl?: string | null;
};

function compact(value: number | undefined) {
  const numberValue = Number(value || 0);
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return String(numberValue);
}

function artistName(track: CityTrack) {
  return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura';
}

function playerTrack(track: CityTrack) {
  return {
    ...track,
    artist: {
      _id: track.artist?._id || 'synaura',
      name: artistName(track),
      username: track.artist?.username || 'synaura',
      avatar: track.artist?.avatar || undefined,
    },
    duration: Number(track.duration || 0),
    likes: [],
    comments: [],
    plays: Number(track.plays || 0),
    coverUrl: track.coverUrl || undefined,
  };
}

export default function SynauraCityPage() {
  const { data: session } = useSession();
  const audio = useAudioPlayer();
  const [city, setCity] = useState<SynauraCityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [actingEventId, setActingEventId] = useState<string | null>(null);
  const [pickerEvent, setPickerEvent] = useState<CityEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CityEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [celebrationEvent, setCelebrationEvent] = useState<CityEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/city', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.dayKey) throw new Error(data?.error || 'Impossible de charger les events.');
      setCity(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Impossible de charger les events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailEvent || !city) return;
    const refreshed = city.events.find((event) => event.id === detailEvent.id);
    if (refreshed && refreshed !== detailEvent) setDetailEvent(refreshed);
  }, [city, detailEvent]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!city || typeof window === 'undefined') return;
    const winner = city.events.find((event) => event.userIsWinner && event.celebration && window.localStorage.getItem(`synaura.city.win.seen.${event.id}`) !== '1');
    if (winner) setCelebrationEvent(winner);
  }, [city]);

  const closeCelebration = useCallback(() => {
    if (celebrationEvent && typeof window !== 'undefined') window.localStorage.setItem(`synaura.city.win.seen.${celebrationEvent.id}`, '1');
    setCelebrationEvent(null);
  }, [celebrationEvent]);

  const currentId = audio.audioState.tracks[audio.audioState.currentTrackIndex]?._id;
  const play = useCallback((track: CityTrack) => {
    if (currentId === track._id && audio.audioState.isPlaying) {
      audio.pause();
      return;
    }
    void audio.playTrack(playerTrack(track));
  }, [audio, currentId]);

  const battle = city?.currentVoteSession || city?.events.find((event) => event.kind === 'battle' && event.isLive) || null;
  const vote = useCallback(async (trackId: string) => {
    if (!battle || voting) return;
    if (!session?.user) {
      window.location.href = '/auth/signin';
      return;
    }
    setVoting(true);
    try {
      const response = await fetch('/api/city/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: battle.id, trackId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Vote impossible.');
      setToast('Ton vote est enregistre.');
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Vote impossible.');
    } finally {
      setVoting(false);
    }
  }, [battle, load, session?.user, voting]);

  const openParticipate = useCallback((event: CityEvent) => {
    if (!session?.user) {
      window.location.href = '/auth/signin';
      return;
    }
    setPickerEvent(event);
  }, [session?.user]);

  const participate = useCallback(async (event: CityEvent, trackId: string) => {
    if (actingEventId) return;
    setActingEventId(event.id);
    setError(null);
    try {
      const response = await fetch(`/api/city/events/${encodeURIComponent(event.id)}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Participation impossible.');
      setPickerEvent(null);
      setToast(`Ton son participe maintenant a "${event.title}".`);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Participation impossible.');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, load]);

  const claim = useCallback(async (event: CityEvent) => {
    if (actingEventId) return;
    if (!session?.user) {
      window.location.href = '/auth/signin';
      return;
    }
    setActingEventId(event.id);
    try {
      const response = await fetch(`/api/city/events/${encodeURIComponent(event.id)}/claim`, { method: 'POST' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Recompense impossible.');
      setToast(data?.message || 'Boost x1,35 actif pendant 24 h.');
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Recompense impossible.');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, load, session?.user]);

  const tickerText = useMemo(() => {
    if (!city) return 'Synaura Pulse est en live · les events arrivent';
    const fire = city.pulse.filter((track) => track.pulse >= 78).length;
    const votes = city.events.reduce((sum, event) => sum + Number(event.totalVotes || 0), 0);
    return `Synaura Pulse est en live · ${fire} sons montent · ${city.events.filter((event) => event.isLive).length} events ouverts · ${votes} votes`;
  }, [city]);

  if (loading && !city) {
    return (
      <SynauraAppShell contentClassName="max-w-[1500px]">
        <SynauraTopBar />
        <SynauraRouteNav />
        <div className="grid min-h-[62vh] place-items-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#7c5cff]" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-black/40">Pulse se met a jour</p>
          </div>
        </div>
      </SynauraAppShell>
    );
  }

  if (!city) {
    return (
      <SynauraAppShell contentClassName="max-w-[1500px]">
        <SynauraTopBar />
        <SynauraRouteNav />
        <SynauraPanel className="mx-auto mt-12 max-w-xl p-8 text-center">
          <Activity className="mx-auto h-8 w-8 text-[#7c5cff]" />
          <h1 className="mt-3 text-2xl font-black">Pulse fait une courte pause</h1>
          <p className="mt-2 text-sm font-bold text-black/45">{error}</p>
          <SynauraButton className="mt-5" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>Reessayer</SynauraButton>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1500px]">
      <SynauraTopBar secondaryHref="/ai-generator" secondaryLabel="Studio" primaryHref="/upload" primaryLabel="Publier" />
      <SynauraRouteNav />

      <div className="space-y-7 sm:space-y-10">
        <SynauraTickerBanner text={tickerText} tone="coral" />

        <SynauraColorBand tone="sunset" className="p-5 sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <span className="inline-flex h-9 items-center gap-2 rounded-full bg-white/70 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#7c5cff]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#2bc96f]" />
                Events en direct
              </span>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.96] tracking-tight text-[#171313] sm:text-6xl">
                Tout ce qui fait vibrer Synaura, maintenant.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-black/52 sm:text-base">
                Battles, challenges, nouveaux talents et titres qui prennent de la vitesse. Les donnees bougent chaque jour.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/upload" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#171313] px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(23,19,19,0.18)] transition hover:-translate-y-0.5">
                  <Rocket className="h-4 w-4" /> Publier dans un event
                </Link>
                <Link href="/discover" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/72 px-6 text-sm font-black text-[#171313] transition hover:bg-white">
                  <Headphones className="h-4 w-4" /> Ecouter Pulse
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <MoodStat label="Reactions" value={compact(city.cityMood.reactionsToday)} icon={<Heart className="h-4 w-4" />} color="#ff6f61" />
              <MoodStat label="Drops" value={compact(city.cityMood.newDrops)} icon={<Music2 className="h-4 w-4" />} color="#00a7b2" />
              <MoodStat label="En feu" value={compact(city.pulse.filter((track) => track.pulse >= 78).length)} icon={<Flame className="h-4 w-4" />} color="#7c5cff" />
            </div>
          </div>
        </SynauraColorBand>

        <SynauraCountdownBanner
          current={city.currentVoteSession || null}
          next={city.nextVoteSession || null}
          onOpen={() => setDetailEvent(city.currentVoteSession || city.nextVoteSession || null)}
          onNotify={() => setToast('Rappel activé pour la prochaine session de vote.')}
        />

        {error ? <div className="rounded-[1.2rem] border border-[#ff6f61]/20 bg-[#ff6f61]/10 px-4 py-3 text-center text-sm font-black text-[#a73c34]">{error}</div> : null}

        <section className="space-y-4">
          <SynauraSectionHeader eyebrow="Cette semaine" title="En live maintenant" description="Vote, participe ou viens simplement decouvrir ce qui bouge." icon={<CalendarDays className="h-6 w-6 text-[#7c5cff]" />} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {city.events.map((event) => (
              <SynauraEventCard
                key={event.id}
                event={event}
                onPrimary={() => {
                  if (event.claimStatus === 'available') void claim(event);
                  else if (event.kind === 'battle') document.getElementById('battle-live')?.scrollIntoView({ behavior: 'smooth' });
                  else if (event.activeBoost) setDetailEvent(event);
                  else openParticipate(event);
                }}
                onSecondary={() => setDetailEvent(event)}
              />
            ))}
          </div>
        </section>

        {battle ? <BattlePanel event={battle} voting={voting} currentId={currentId} isPlaying={audio.audioState.isPlaying} onPlay={play} onVote={vote} onClaim={() => void claim(battle)} /> : null}

        <section className="space-y-4">
          <SynauraSectionHeader eyebrow="Synaura Pulse" title="Sons en feu" description="Les signaux recents comptent davantage que les vieux classements." href="/discover" icon={<Activity className="h-6 w-6 text-[#ff6f61]" />} />
          <SynauraPanel className="divide-y divide-black/[0.06] p-2 sm:p-3">
            {city.pulse.slice(0, 7).map((track, index) => (
              <PulseRow key={track._id} track={track} rank={index + 1} playing={currentId === track._id && audio.audioState.isPlaying} onPlay={play} />
            ))}
          </SynauraPanel>
        </section>

        <section className="space-y-4">
          <SynauraSectionHeader eyebrow="Spotlight" title="Nouveaux talents" description="Le radar a detecte des artistes a ecouter avant tout le monde." href="/discover" icon={<Sparkles className="h-6 w-6 text-[#00a7b2]" />} />
          <div className="synaura-no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {city.spotlightArtists.map((artist) => <SynauraCreatorSpotlight key={artist.id} artist={artist} />)}
          </div>
        </section>

        <section className="space-y-4">
          <SynauraSectionHeader eyebrow="Participer" title="Challenges" description="Chaque brief est une porte d'entree vers la vitrine Synaura." icon={<Target className="h-6 w-6 text-[#7c5cff]" />} />
          <div className="grid gap-3 lg:grid-cols-2">
            {city.events.filter((event) => event.kind !== 'battle').map((event, index) => (
              <SynauraColorBand key={event.id} tone={index % 3 === 0 ? 'violet' : index % 3 === 1 ? 'coral' : 'cyan'} className="p-5 sm:p-6">
                <div className="flex h-full flex-col justify-between gap-5 sm:flex-row sm:items-end">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/42">{event.challengeTag || event.subtitle}</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">{event.title}</h3>
                    <p className="mt-2 max-w-lg text-sm font-bold text-black/52">{event.description}</p>
                    <p className="mt-3 text-xs font-black text-[#7c5cff]">{event.reward?.title || 'Mise en avant Synaura'}</p>
                    {event.activeBoost ? <p className="mt-2 text-xs font-black text-[#7357c6]">Boost x1,35 actif jusqu'au {new Date(event.activeBoost.expiresAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p> : null}
                  </div>
                  <SynauraButton className="shrink-0" onClick={() => event.claimStatus === 'available' ? void claim(event) : event.activeBoost ? setDetailEvent(event) : openParticipate(event)}>
                    {event.claimStatus === 'available' ? 'Activer le boost' : event.activeBoost ? 'Boost x1,35 actif' : event.userParticipation ? 'Changer de son' : 'Participer'}
                  </SynauraButton>
                </div>
              </SynauraColorBand>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <RadarPanel tracks={city.radar} currentId={currentId} isPlaying={audio.audioState.isPlaying} onPlay={play} />
          <HallOfFame awards={city.hallOfFame} onPlay={play} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <BadgesPanel badges={city.listenerBadges} />
          <CreatorProgress city={city} />
        </section>
      </div>

      <TrackPickerModal event={pickerEvent} busy={Boolean(actingEventId)} onClose={() => setPickerEvent(null)} onPick={(trackId) => pickerEvent && void participate(pickerEvent, trackId)} />
      <EventDetailModal
        event={detailEvent}
        voting={voting}
        currentId={currentId}
        isPlaying={audio.audioState.isPlaying}
        onClose={() => setDetailEvent(null)}
        onPlay={play}
        onVote={(trackId) => void vote(trackId)}
        onParticipate={(event) => {
          setDetailEvent(null);
          openParticipate(event);
        }}
      />

      <AnimatePresence>
        {celebrationEvent ? (
          <motion.div className="fixed inset-0 z-[140] grid place-items-center bg-[#171313]/72 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 30, scale: 0.92 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.94 }} className="relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-[#171313] p-5 text-white shadow-[0_32px_120px_rgba(23,19,19,.55)] sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(255,111,97,.34),transparent_38%),radial-gradient(circle_at_90%_10%,rgba(124,92,255,.38),transparent_42%)]" />
              <div className="relative">
                <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="grid h-14 w-14 place-items-center rounded-[1.15rem] bg-[#ffd667] text-[#171313]"><Trophy className="h-7 w-7" /></motion.div>
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9a90]">Victoire Synaura</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{celebrationEvent.celebration?.title}</h2>
                <p className="mt-3 text-sm font-bold leading-6 text-white/58">{celebrationEvent.celebration?.message}</p>
                <SynauraBattleDuel event={celebrationEvent} />
                <div className="mt-2 rounded-[1.2rem] bg-white/8 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Gain disponible</p>
                  <p className="mt-1 text-sm font-black">{celebrationEvent.reward?.title || 'Mise en avant Synaura'}</p>
                  <p className="mt-1 text-xs font-bold text-white/45">{celebrationEvent.reward?.description || 'Ton titre passe sous les projecteurs.'}</p>
                </div>
                <div className="mt-5 flex gap-2">
                  <SynauraButton className="flex-1 bg-white text-[#171313]" onClick={() => { void claim(celebrationEvent); closeCelebration(); }}>Activer mon gain</SynauraButton>
                  <SynauraGhostButton onClick={closeCelebration}>Plus tard</SynauraGhostButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }} className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#171313] px-5 py-3 text-sm font-black text-white shadow-[0_18px_55px_rgba(23,19,19,0.24)] sm:bottom-6">
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </SynauraAppShell>
  );
}

function MoodStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="min-w-0 rounded-[1.25rem] border border-black/[0.06] bg-white/62 p-3 sm:p-4">
      <span style={{ color }}>{icon}</span>
      <p className="mt-4 truncate text-xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.12em] text-black/38 sm:text-[10px]">{label}</p>
    </div>
  );
}

function PulseRow({ track, rank, playing, onPlay }: { track: CityPulseTrack; rank: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <button onClick={() => onPlay(track)} className="group flex w-full min-w-0 items-center gap-3 rounded-[1.25rem] p-2.5 text-left transition hover:bg-black/[0.035] sm:p-3">
      <span className="hidden w-7 shrink-0 text-center text-xs font-black text-black/24 sm:block">{String(rank).padStart(2, '0')}</span>
      <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={playing} className="h-14 w-14 shrink-0 rounded-[1rem] object-cover sm:h-16 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-black sm:text-base">{track.title}</h3>
          <SynauraPulseBadge state={track.pulseState} pulse={track.pulse} className="hidden sm:inline-flex" />
        </div>
        <p className="mt-1 truncate text-[11px] font-bold text-black/42">{artistName(track)} · {track.pulseReasons.join(' · ')}</p>
        <SynauraPulseBar value={track.pulse} className="mt-2 max-w-xl" />
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#171313] text-white transition group-hover:scale-105">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
    </button>
  );
}

function BattlePanel({ event, voting, currentId, isPlaying, onPlay, onVote, onClaim }: { event: CityEvent; voting: boolean; currentId?: string; isPlaying: boolean; onPlay: (track: CityTrack) => void; onVote: (trackId: string) => void; onClaim: () => void }) {
  const tracks = event.tracks || [];
  const total = tracks.reduce((sum, track) => sum + Number(event.voteCounts?.[track._id] || 0), 0) || 1;
  const canVote = Boolean(event.isLive);
  return (
    <section id="battle-live" className="scroll-mt-32">
      <SynauraInkPanel className="p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,111,97,.26),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(124,92,255,.28),transparent_38%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff9a90]">Battle IA en cours</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Quel son merite la vitrine ?</h2>
              <p className="mt-2 text-sm font-bold text-white/48">{event.totalVotes || 0} votes aujourd'hui. Ecoute avant de choisir.</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-white/10"><Vote className="h-6 w-6" /></span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><SynauraBattleDuel event={event} /></div>
            {tracks.map((track) => {
              const selected = event.selectedTrackId === track._id;
              const percent = Math.round((Number(event.voteCounts?.[track._id] || 0) / total) * 100);
              const playing = currentId === track._id && isPlaying;
              return (
                <div key={track._id} className={`rounded-[1.5rem] p-3 transition ${selected ? 'bg-white/14 ring-2 ring-[#ff9a90]' : 'bg-white/[0.07] ring-1 ring-white/10'}`}>
                  <button onClick={() => onPlay(track)} className="flex w-full min-w-0 items-center gap-3 text-left">
                    <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} className="h-20 w-20 shrink-0 rounded-[1.1rem] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black">{track.title}</p>
                      <p className="mt-1 truncate text-xs font-bold text-white/42">{artistName(track)}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#00c2cb] via-[#7c5cff] to-[#ff6f61]" style={{ width: `${percent}%` }} /></div>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#171313]">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
                  </button>
                  <button disabled={voting || !canVote} onClick={() => onVote(track._id)} className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-xs font-black transition disabled:opacity-50 ${selected ? 'bg-[#ff9a90] text-[#171313]' : 'bg-white/10 text-white hover:bg-white/16'}`}>
                    {selected ? <Check className="h-4 w-4" /> : <Vote className="h-4 w-4" />}
                    {selected ? 'Ton vote' : canVote ? `Voter · ${percent}%` : `Résultat · ${percent}%`}
                  </button>
                </div>
              );
            })}
          </div>
          {event.claimStatus === 'available' ? <SynauraButton className="mt-4 w-full bg-white text-[#171313]" onClick={onClaim}>Activer le boost x1,35</SynauraButton> : null}
          {event.activeBoost ? <p className="mt-4 rounded-full bg-white/10 px-4 py-3 text-center text-xs font-black text-white">Boost x1,35 actif jusqu'au {new Date(event.activeBoost.expiresAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p> : null}
        </div>
      </SynauraInkPanel>
    </section>
  );
}

function RadarPanel({ tracks, currentId, isPlaying, onPlay }: { tracks: CityPulseTrack[]; currentId?: string; isPlaying: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <SynauraColorBand tone="cyan" className="p-5 sm:p-6">
      <SynauraSectionHeader eyebrow="Detection" title="Radar des talents" description="Des pepites encore peu ecoutees, mais deja tres prometteuses." icon={<Radar className="h-6 w-6 text-[#00a7b2]" />} />
      <div className="mt-5 space-y-2">
        {tracks.slice(0, 5).map((track) => (
          <button key={track._id} onClick={() => onPlay(track)} className="flex w-full min-w-0 items-center gap-3 rounded-[1.15rem] bg-white/62 p-2.5 text-left transition hover:bg-white">
            <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} className="h-12 w-12 shrink-0 rounded-[0.9rem] object-cover" />
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{track.title}</p><p className="mt-0.5 truncate text-[10px] font-bold text-black/42">{artistName(track)} · signal {track.pulse}%</p></div>
            {currentId === track._id && isPlaying ? <Pause className="h-4 w-4 text-[#00a7b2]" /> : <ChevronRight className="h-4 w-4 text-black/30" />}
          </button>
        ))}
      </div>
    </SynauraColorBand>
  );
}

function HallOfFame({ awards, onPlay }: { awards: CityAward[]; onPlay: (track: CityTrack) => void }) {
  return (
    <SynauraPanel className="p-5 sm:p-6">
      <SynauraSectionHeader eyebrow="Gagnants recents" title="Hall of Fame" description="Les meilleurs moments de la semaine, sans ceremonie interminable." icon={<Trophy className="h-6 w-6 text-[#c88700]" />} />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {awards.map((award, index) => (
          <button key={award.id} onClick={() => award.track && onPlay(award.track)} className="flex min-w-0 items-center gap-3 rounded-[1.15rem] bg-black/[0.035] p-3 text-left transition hover:bg-black/[0.06]">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] ${index === 0 ? 'bg-[#ffd667] text-[#171313]' : 'bg-[#7c5cff]/12 text-[#5b3fe8]'}`}><Medal className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-xs font-black">{award.title}</p><p className="mt-1 truncate text-[10px] font-bold text-black/42">{award.track?.title || award.artist?.name || award.subtitle}</p></div>
          </button>
        ))}
      </div>
    </SynauraPanel>
  );
}

function BadgesPanel({ badges }: { badges: CityBadge[] }) {
  return (
    <SynauraPanel className="p-5 sm:p-6">
      <SynauraSectionHeader eyebrow="Auditeurs" title="Badges de soutien" description="Decouvrir et soutenir tot compte autant que publier." icon={<Award className="h-6 w-6 text-[#ff6f61]" />} />
      <div className="mt-5 space-y-2">
        {badges.slice(0, 5).map((badge) => (
          <div key={badge.id} className={`flex items-center gap-3 rounded-[1.15rem] p-3 ${badge.unlocked ? 'bg-[#7c5cff]/10' : 'bg-black/[0.035]'}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] ${badge.unlocked ? 'bg-[#7c5cff] text-white' : 'bg-black/[0.05] text-black/30'}`}><Award className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-black">{badge.title}</p><p className="mt-0.5 line-clamp-1 text-[10px] font-bold text-black/42">{badge.description}</p><SynauraPulseBar value={(badge.progress / Math.max(1, badge.target)) * 100} className="mt-2" /></div>
            <span className="text-[10px] font-black text-black/35">{badge.progress}/{badge.target}</span>
          </div>
        ))}
      </div>
    </SynauraPanel>
  );
}

function CreatorProgress({ city }: { city: SynauraCityData }) {
  const artist = city.creatorCard;
  const progress = artist ? Math.min(100, (artist.xp / Math.max(1, artist.nextLevelXp)) * 100) : 0;
  return (
    <SynauraColorBand tone="violet" className="p-5 sm:p-6">
      <SynauraSectionHeader eyebrow="Progression artiste" title="Ta carte evolutive" description="Publier, participer et recevoir des reactions fait progresser ton niveau." icon={<Target className="h-6 w-6 text-[#7c5cff]" />} />
      {artist ? (
        <div className="mt-6 rounded-[1.4rem] bg-white/62 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1rem] bg-[#171313] text-xl font-black text-white">{artist.level}</div>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7c5cff]">Niveau {artist.level}</p><h3 className="mt-1 truncate text-xl font-black">{artist.levelName}</h3><p className="mt-0.5 text-xs font-bold text-black/42">{artist.xp} XP · {artist.trackCount} sons</p></div>
          </div>
          <SynauraPulseBar value={progress} className="mt-5" />
          <p className="mt-2 text-[10px] font-black text-black/38">{Math.max(0, artist.nextLevelXp - artist.xp)} XP avant le prochain niveau</p>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.4rem] bg-white/62 p-5 text-center">
          <Music2 className="mx-auto h-7 w-7 text-[#7c5cff]" />
          <p className="mt-3 text-sm font-black">Publie ton premier son pour lancer ta progression.</p>
          <Link href="/upload" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white">Commencer <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      )}
    </SynauraColorBand>
  );
}

function TrackPickerModal({ event, busy, onClose, onPick }: { event: CityEvent | null; busy: boolean; onClose: () => void; onPick: (trackId: string) => void }) {
  const [tracks, setTracks] = useState<MyTrack[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!event) {
      setTracks(null);
      setSelected(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    fetch('/api/users/tracks', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || 'Impossible de charger tes sons.');
        if (!cancelled) setTracks(Array.isArray(data?.tracks) ? data.tracks : []);
      })
      .catch((nextError) => {
        if (!cancelled) setLoadError(nextError instanceof Error ? nextError.message : 'Impossible de charger tes sons.');
      });
    return () => { cancelled = true; };
  }, [event]);

  return (
    <AnimatePresence>
      {event ? (
        <motion.div className="fixed inset-0 z-[100] grid place-items-end bg-black/35 p-2 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(event: React.MouseEvent) => event.stopPropagation()} className="max-h-[82vh] w-full max-w-xl overflow-hidden rounded-[1.8rem] border border-black/[0.08] bg-[#fffaf2] shadow-[0_30px_90px_rgba(23,19,19,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-5">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7c5cff]">Participer a l'event</p><h2 className="mt-1 text-2xl font-black">{event.title}</h2><p className="mt-1 text-xs font-bold text-black/42">Choisis un son deja publie.</p></div>
              <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.05]"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
              {!tracks && !loadError ? <div className="grid min-h-36 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#7c5cff]" /></div> : null}
              {loadError ? <p className="rounded-[1rem] bg-[#ff6f61]/10 p-4 text-center text-sm font-black text-[#a73c34]">{loadError}</p> : null}
              {tracks?.length === 0 ? <p className="rounded-[1rem] bg-black/[0.035] p-5 text-center text-sm font-black">Tu n'as pas encore de son publie.</p> : null}
              {tracks?.map((track) => (
                <button key={track.id} onClick={() => setSelected(track.id)} className={`flex w-full items-center gap-3 rounded-[1.2rem] p-3 text-left transition ${selected === track.id ? 'bg-[#7c5cff]/12 ring-2 ring-[#7c5cff]/35' : 'bg-black/[0.035] hover:bg-black/[0.055]'}`}>
                  <TrackCover trackId={track.id} src={track.coverUrl || track.coverVideoPosterUrl} title={track.title} className="h-12 w-12 shrink-0 rounded-[0.9rem] object-cover" />
                  <p className="min-w-0 flex-1 truncate text-sm font-black">{track.title}</p>
                  {selected === track.id ? <Check className="h-5 w-5 text-[#7c5cff]" /> : null}
                </button>
              ))}
            </div>
            <div className="flex gap-2 border-t border-black/[0.07] p-4">
              <SynauraGhostButton className="flex-1" onClick={onClose}>Annuler</SynauraGhostButton>
              <SynauraButton className="flex-1" disabled={!selected || busy} onClick={() => selected && onPick(selected)}>{busy ? 'Inscription...' : 'Inscrire ce son'}</SynauraButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function EventDetailModal({
  event,
  voting,
  currentId,
  isPlaying,
  onClose,
  onPlay,
  onVote,
  onParticipate,
}: {
  event: CityEvent | null;
  voting: boolean;
  currentId?: string;
  isPlaying: boolean;
  onClose: () => void;
  onPlay: (track: CityTrack) => void;
  onVote: (trackId: string) => void;
  onParticipate: (event: CityEvent) => void;
}) {
  if (!event) return null;
  const participants = event.participants?.length
    ? event.participants
    : (event.tracks || []).map((track) => ({
        id: `track-${track._id}`,
        eventId: event.id,
        userId: String(track.artist?._id || ''),
        username: track.artist?.username || null,
        name: artistName(track),
        avatar: track.artist?.avatar || null,
        trackId: track._id,
        status: 'contender' as const,
        track,
      }));

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[110] grid place-items-end bg-black/42 p-2 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div initial={{ y: 34, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(click: React.MouseEvent) => click.stopPropagation()} className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[1.9rem] border border-black/[0.08] bg-[#fffaf2] shadow-[0_32px_100px_rgba(23,19,19,0.28)]">
          <div className="relative overflow-hidden border-b border-black/[0.07] bg-[#171313] p-5 text-white sm:p-6">
            <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `linear-gradient(135deg, ${event.accent || '#7c5cff'}88, transparent 62%)` }} />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/52">{event.isLive ? 'En live maintenant' : event.status === 'scheduled' ? 'Bientot ouvert' : 'Event Synaura'}</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">{event.title}</h2>
                <p className="mt-2 max-w-xl text-sm font-bold text-white/58">{event.description}</p>
                <div className="mt-4 flex gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className="rounded-full bg-white/10 px-3 py-2">{participants.length} inscrit{participants.length > 1 ? 's' : ''}</span>
                  {event.kind === 'battle' ? <span className="rounded-full bg-white/10 px-3 py-2">{event.totalVotes || 0} votes</span> : null}
                </div>
              </div>
              <button onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/16"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
            {participants.length ? participants.map((participant) => {
              const track = participant.track;
              if (!track) return null;
              const selected = event.selectedTrackId === track._id;
              return (
                <div key={participant.id} className={`flex min-w-0 items-center gap-3 rounded-[1.25rem] p-3 ${selected ? 'bg-[#7c5cff]/12 ring-2 ring-[#7c5cff]/25' : 'bg-black/[0.035]'}`}>
                  <button onClick={() => onPlay(track)} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem]">
                    <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/16 text-white">{currentId === track._id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{track.title}</p>
                    <p className="mt-1 truncate text-xs font-bold text-black/42">{participant.name}{participant.username ? ` · @${participant.username}` : ''}</p>
                  </div>
                  {event.kind === 'battle' ? (
                    <button disabled={!event.isLive || voting} onClick={() => onVote(track._id)} className={`h-10 shrink-0 rounded-full px-4 text-xs font-black ${selected ? 'bg-[#7c5cff] text-white' : 'bg-[#171313] text-white disabled:opacity-35'}`}>
                      {selected ? 'Voté' : 'Voter'}
                    </button>
                  ) : null}
                </div>
              );
            }) : <div className="rounded-[1.2rem] bg-black/[0.035] p-6 text-center text-sm font-black text-black/42">Aucun son inscrit pour le moment. Le premier peut etre le tien.</div>}
          </div>
          {event.kind !== 'battle' && !event.isEnded ? (
            <div className="border-t border-black/[0.07] p-4">
              <SynauraButton className="w-full" onClick={() => onParticipate(event)}>{event.userParticipation ? 'Changer mon son inscrit' : 'Inscrire un de mes sons'}</SynauraButton>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
