'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Activity,
  Award,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Headphones,
  Heart,
  Loader2,
  Map,
  Medal,
  Music2,
  Pause,
  Play,
  RadioTower,
  Radar,
  RefreshCw,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Vote,
  Wand2,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import TrackCover from '@/components/TrackCover';
import { SynauraAppShell, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import type {
  CityArtist,
  CityAward,
  CityBadge,
  CityEvent,
  CityPulseTrack,
  CityShowcaseItem,
  CityTrack,
  SynauraCityData,
} from '@/lib/synauraCity';

const iconMap: Record<string, typeof Sparkles> = {
  rocket: Rocket,
  'person-add': Users,
  sparkles: Sparkles,
  happy: Star,
  heart: Heart,
  trophy: Trophy,
  telescope: Radar,
  chatbubbles: Activity,
  image: Wand2,
  calendar: CalendarDays,
  'color-wand': Wand2,
  flash: Zap,
  sunny: Star,
  gift: Award,
  moon: Star,
  headset: Headphones,
  ribbon: Medal,
  megaphone: RadioTower,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/city', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.dayKey) throw new Error(data?.error || 'Impossible de charger la ville.');
      setCity(data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Impossible de charger la ville.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const currentId = audio.audioState.tracks[audio.audioState.currentTrackIndex]?._id;
  const play = useCallback((track: CityTrack) => {
    if (currentId === track._id && audio.audioState.isPlaying) {
      audio.pause();
      return;
    }
    void audio.playTrack(playerTrack(track));
  }, [audio, currentId]);

  const battle = city?.events.find((event) => event.kind === 'battle') || null;
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
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Vote impossible.');
    } finally {
      setVoting(false);
    }
  }, [battle, load, session?.user, voting]);

  if (loading && !city) {
    return (
      <SynauraAppShell>
        <SynauraTopBar primaryHref="/city" primaryLabel="City" />
        <div className="grid min-h-[60vh] place-items-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm font-black text-black/[0.45]">La ville se reveille...</p>
          </div>
        </div>
      </SynauraAppShell>
    );
  }

  if (!city) {
    return (
      <SynauraAppShell>
        <SynauraTopBar primaryHref="/city" primaryLabel="City" />
        <div className="mx-auto max-w-xl rounded-[2rem] bg-[#fffaf2] p-8 text-center shadow-xl">
          <Map className="mx-auto h-8 w-8 text-[#7C5CFF]" />
          <h1 className="mt-3 text-2xl font-black">La ville fait une courte pause</h1>
          <p className="mt-2 text-sm font-bold text-black/[0.48]">{error}</p>
          <button onClick={() => void load()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" /> Reessayer
          </button>
        </div>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1500px]">
      <SynauraTopBar primaryHref="/upload" primaryLabel="Participer" secondaryHref="/ai-generator" secondaryLabel="Creer" />
      <SynauraRouteNav />
      <style>{`
        @keyframes citySignal { 0%,100% { transform: scaleY(.35); opacity:.45 } 50% { transform: scaleY(1); opacity:1 } }
        @keyframes cityScan { 0% { transform: scale(.25); opacity:.8 } 100% { transform: scale(1.15); opacity:0 } }
        .city-signal span { transform-origin: bottom; animation: citySignal 1.1s ease-in-out infinite; }
        .city-signal span:nth-child(2) { animation-delay:.12s }.city-signal span:nth-child(3) { animation-delay:.24s }.city-signal span:nth-child(4) { animation-delay:.36s }.city-signal span:nth-child(5) { animation-delay:.48s }
      `}</style>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#171313] px-5 py-6 text-[#fffaf2] shadow-[0_26px_80px_rgba(23,19,19,.26)] sm:px-8 sm:py-9 lg:px-12 lg:py-11">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,75,122,.38),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(0,194,203,.30),transparent_32%),radial-gradient(circle_at_58%_100%,rgba(124,92,255,.30),transparent_42%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] ring-1 ring-white/[0.12]">
              <RadioTower className="h-4 w-4 text-[#7ef2ed]" /> En direct de Synaura City
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.96] tracking-tight sm:text-6xl lg:text-7xl">{city.cityMood.title}</h1>
            <p className="mt-4 max-w-2xl text-sm font-bold text-white/[0.56] sm:text-lg">{city.cityMood.subtitle} Reviens demain : la selection et les projecteurs auront bouge.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/upload" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313]"><Rocket className="h-4 w-4" /> Lancer un drop</Link>
              <Link href="/community" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-black text-white ring-1 ring-white/[0.14]"><Users className="h-4 w-4" /> Rejoindre la ville</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <CityStat label="Reactions" value={compact(city.cityMood.reactionsToday)} icon={Heart} color="#FF7B91" />
            <CityStat label="Nouveaux drops" value={compact(city.cityMood.newDrops)} icon={Music2} color="#7EF2ED" />
            <CityStat label="Signaux Pulse" value={compact(city.pulse.filter((track) => track.pulse >= 60).length)} icon={Activity} color="#B9A8FF" />
          </div>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-black text-red-700">{error}</div> : null}

      <Section title="La Vitrine du Jour" subtitle="Cinq raisons differentes de lancer la lecture aujourd hui." icon={Sparkles}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {city.showcase.map((item, index) => <ShowcaseCard key={item.id} item={item} index={index} playing={currentId === item.track._id && audio.audioState.isPlaying} onPlay={play} />)}
        </div>
      </Section>

      <Section title="Synaura Pulse" subtitle="Les sons qui font reagir la ville maintenant." icon={Activity} action={<Link href="/trending" className="text-xs font-black text-black/[0.48]">Toutes les tendances</Link>}>
        <div className="grid gap-3 lg:grid-cols-2">
          {city.pulse.slice(0, 6).map((track, index) => <PulseCard key={track._id} track={track} rank={index + 1} playing={currentId === track._id && audio.audioState.isPlaying} onPlay={play} />)}
        </div>
      </Section>

      <Section title="Nouveaux talents debarques" subtitle="Leurs premiers sons viennent d apparaitre sur la carte." icon={Rocket}>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
          {city.spotlightArtists.map((artist, index) => <ArtistBoosterCard key={artist.id} artist={artist} index={index} onPlay={play} />)}
        </div>
      </Section>

      {city.premieres.length ? (
        <Section title="Lancements officiels" subtitle="Les premiers instants comptent. Sois parmi les premiers a ecouter." icon={Clock3}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {city.premieres.slice(0, 4).map((track, index) => <PremiereCard key={track._id} track={track} index={index} playing={currentId === track._id && audio.audioState.isPlaying} onPlay={play} />)}
          </div>
        </Section>
      ) : null}

      <Section title="Evenements de la semaine" subtitle="Challenges, battle et rendez-vous qui font bouger la ville." icon={CalendarDays}>
        <div className="grid gap-4 lg:grid-cols-2">
          {city.events.map((event) => (
            event.kind === 'battle'
              ? <BattleCard key={event.id} event={event} voting={voting} playingId={currentId} isPlaying={audio.audioState.isPlaying} onPlay={play} onVote={vote} />
              : <EventCard key={event.id} event={event} onPlay={play} />
          ))}
        </div>
      </Section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <RadarSection tracks={city.radar} currentId={currentId} isPlaying={audio.audioState.isPlaying} onPlay={play} />
        <HallOfFame awards={city.hallOfFame} onPlay={play} />
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <Badges badges={city.listenerBadges} />
        <CreatorProgress artist={city.creatorCard} />
      </section>
    </SynauraAppShell>
  );
}

function Section({ title, subtitle, icon: Icon, action, children }: { title: string; subtitle: string; icon: typeof Sparkles; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#171313] text-white"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-0.5 text-xs font-bold text-black/[0.42] sm:text-sm">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CityStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Heart; color: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/[0.08] p-3 ring-1 ring-white/[0.12] sm:p-4">
      <Icon className="h-4 w-4" style={{ color }} />
      <p className="mt-4 truncate text-xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/[0.38] sm:text-[10px]">{label}</p>
    </div>
  );
}

function ShowcaseCard({ item, index, playing, onPlay }: { item: CityShowcaseItem; index: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  const Icon = iconMap[item.icon] || Sparkles;
  return (
    <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} onClick={() => onPlay(item.track)} className="group relative min-h-[260px] overflow-hidden rounded-[1.6rem] bg-[#171313] text-left text-white shadow-[0_18px_45px_rgba(23,19,19,.16)]">
      <TrackCover trackId={item.track._id} src={item.track.coverUrl} videoSrc={item.track.coverVideoUrl} posterSrc={item.track.coverVideoPosterUrl} title={item.track.title} autoPlayVideo={playing} className="absolute inset-0 h-full w-full rounded-none object-cover transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/[0.45] to-black/10" />
      <div className="relative flex h-full min-h-[260px] flex-col justify-between p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.35] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] backdrop-blur-xl"><Icon className="h-3 w-3" style={{ color: item.accent }} /> {item.label}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/[0.46]">{item.caption}</p>
          <h3 className="mt-1 line-clamp-2 text-xl font-black leading-tight">{item.track.title}</h3>
          <p className="mt-1 truncate text-xs font-bold text-white/[0.54]">{artistName(item.track)}</p>
        </div>
      </div>
    </motion.button>
  );
}

function PulseCard({ track, rank, playing, onPlay }: { track: CityPulseTrack; rank: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <button onClick={() => onPlay(track)} className="group flex min-w-0 items-center gap-3 rounded-[1.5rem] border border-black/[0.08] bg-[#fffaf2]/88 p-3 text-left shadow-[0_14px_38px_rgba(30,25,20,.08)] transition hover:-translate-y-0.5">
      <span className="w-6 text-center text-xs font-black text-black/[0.28]">{String(rank).padStart(2, '0')}</span>
      <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={playing} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-black">{track.title}</h3>
          <span className="shrink-0 rounded-full bg-[#7C5CFF]/10 px-2 py-1 text-[9px] font-black text-[#6D4AF1]">{track.pulseState}</span>
        </div>
        <p className="mt-1 truncate text-[11px] font-bold text-black/[0.42]">{artistName(track)} · {track.pulseReasons.join(' · ')}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.07]"><motion.div initial={{ width: 0 }} animate={{ width: `${track.pulse}%` }} transition={{ duration: .8 }} className="h-full rounded-full bg-gradient-to-r from-[#00C2CB] via-[#7C5CFF] to-[#FF4B7A]" /></div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-black">{track.pulse}%</p>
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30">Pulse</p>
      </div>
    </button>
  );
}

function ArtistBoosterCard({ artist, index, onPlay }: { artist: CityArtist; index: number; onPlay: (track: CityTrack) => void }) {
  return (
    <motion.article initial={{ opacity: 0, rotateY: -12 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: index * .08 }} className="w-[280px] shrink-0 snap-start overflow-hidden rounded-[1.7rem] border border-black/[0.08] bg-[#fffaf2] shadow-[0_16px_42px_rgba(30,25,20,.1)]">
      <div className="relative h-28 bg-[#171313]">
        {artist.featuredTrack ? <TrackCover trackId={artist.featuredTrack._id} src={artist.featuredTrack.coverUrl} title={artist.featuredTrack.title} className="h-full w-full rounded-none object-cover opacity-58" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF4B7A]/65 to-[#00C2CB]/45" />
        <span className="absolute left-3 top-3 rounded-full bg-black/[0.35] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white backdrop-blur-lg">Nouveau talent decouvert</span>
        <img src={artist.avatar || '/default-avatar.png'} alt="" className="absolute -bottom-7 left-4 h-16 w-16 rounded-2xl border-4 border-[#fffaf2] bg-white object-cover" />
      </div>
      <div className="p-4 pt-10">
        <h3 className="truncate text-xl font-black">{artist.name}</h3>
        <p className="truncate text-xs font-bold text-black/40">@{artist.username} · {artist.genre[0] || artist.levelName}</p>
        <div className="mt-3 flex gap-2 text-[10px] font-black text-black/[0.48]"><span>{compact(artist.totalPlays)} ecoutes</span><span>·</span><span>{compact(artist.totalLikes)} likes</span></div>
        <div className="mt-4 flex gap-2">
          <Link href={`/profile/${encodeURIComponent(artist.username)}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#171313] text-xs font-black text-white">Decouvrir</Link>
          {artist.featuredTrack ? <button onClick={() => onPlay(artist.featuredTrack!)} className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06]"><Play className="h-4 w-4" /></button> : null}
        </div>
      </div>
    </motion.article>
  );
}

function PremiereCard({ track, index, playing, onPlay }: { track: CityPulseTrack; index: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <motion.button initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * .06 }} onClick={() => onPlay(track)} className="group relative overflow-hidden rounded-[1.6rem] bg-[#171313] p-3 text-left text-white shadow-[0_18px_45px_rgba(23,19,19,.14)]">
      <div className="relative aspect-[16/11] overflow-hidden rounded-[1.15rem]">
        <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={playing} className="h-full w-full rounded-[1.15rem] object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute left-2 top-2 rounded-full bg-[#FF4B7A] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.1em]">Nouveau drop</span>
        <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
      </div>
      <p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-[#7ef2ed]">Disponible maintenant · Pulse {track.pulse}%</p>
      <h3 className="mt-1 truncate text-sm font-black">{track.title}</h3>
      <p className="mt-1 truncate text-[10px] font-bold text-white/40">Nouveau drop de {artistName(track)}</p>
    </motion.button>
  );
}

function EventCard({ event, onPlay }: { event: CityEvent; onPlay: (track: CityTrack) => void }) {
  const Icon = iconMap[event.icon] || CalendarDays;
  const first = event.tracks?.[0];
  return (
    <article className="relative min-h-[260px] overflow-hidden rounded-[1.8rem] bg-[#171313] p-5 text-white shadow-[0_20px_55px_rgba(23,19,19,.18)]">
      {first ? <TrackCover trackId={first._id} src={first.coverUrl} title={first.title} className="absolute inset-0 h-full w-full rounded-none object-cover opacity-30" /> : null}
      <div className="absolute inset-0 bg-gradient-to-br from-black/[0.85] via-black/[0.58] to-transparent" />
      <div className="relative flex h-full min-h-[220px] flex-col">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/[0.15]"><Icon className="h-5 w-5" style={{ color: event.accent }} /></span>
          {event.challengeTag ? <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black">{event.challengeTag}</span> : null}
        </div>
        <div className="mt-auto">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-white/[0.44]">{event.subtitle}</p>
          <h3 className="mt-1 text-2xl font-black">{event.title}</h3>
          <p className="mt-2 max-w-md text-xs font-bold leading-relaxed text-white/[0.52]">{event.description}</p>
          <div className="mt-4 flex gap-2">
            <Link href={event.kind === 'challenge' ? `/community?tag=${encodeURIComponent(event.challengeTag || '')}` : '/community'} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313]">Participer <ArrowRight className="h-3.5 w-3.5" /></Link>
            {first ? <button onClick={() => onPlay(first)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><Play className="h-4 w-4" /></button> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function BattleCard({ event, voting, playingId, isPlaying, onPlay, onVote }: { event: CityEvent; voting: boolean; playingId?: string; isPlaying: boolean; onPlay: (track: CityTrack) => void; onVote: (trackId: string) => void }) {
  const tracks = event.tracks || [];
  const total = tracks.reduce((sum, track) => sum + Number(event.voteCounts?.[track._id] || 0), 0) || 1;
  return (
    <article className="overflow-hidden rounded-[1.8rem] bg-[#171313] p-5 text-white shadow-[0_20px_55px_rgba(23,19,19,.18)]">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7ef2ed]">{event.subtitle}</p><h3 className="mt-1 text-2xl font-black">{event.title}</h3></div>
        <Vote className="h-6 w-6 text-[#FF7B91]" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {tracks.map((track) => {
          const selected = event.selectedTrackId === track._id;
          const percent = Math.round(Number(event.voteCounts?.[track._id] || 0) / total * 100);
          return (
            <div key={track._id} className={`overflow-hidden rounded-2xl border ${selected ? 'border-[#7ef2ed]' : 'border-white/[0.12]'} bg-white/[0.07] p-2`}>
              <button onClick={() => onPlay(track)} className="relative block aspect-square w-full overflow-hidden rounded-xl">
                <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} autoPlayVideo={playingId === track._id && isPlaying} className="h-full w-full rounded-xl object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-black/[0.18]"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">{playingId === track._id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span></span>
              </button>
              <p className="mt-2 truncate text-xs font-black">{track.title}</p>
              <p className="truncate text-[10px] font-bold text-white/[0.38]">{artistName(track)}</p>
              <button disabled={voting} onClick={() => onVote(track._id)} className={`mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[10px] font-black ${selected ? 'bg-[#7ef2ed] text-[#171313]' : 'bg-white/10 text-white'}`}>
                {selected ? <Check className="h-3.5 w-3.5" /> : null}{selected ? 'Ton vote' : `Voter · ${percent}%`}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function RadarSection({ tracks, currentId, isPlaying, onPlay }: { tracks: CityPulseTrack[]; currentId?: string; isPlaying: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#0d2829] p-5 text-white shadow-[0_20px_55px_rgba(13,40,41,.2)] sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-[#7ef2ed]/25 before:absolute before:inset-10 before:rounded-full before:border before:border-[#7ef2ed]/20 after:absolute after:inset-24 after:rounded-full after:border after:border-[#7ef2ed]/20" />
      <div className="relative">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7ef2ed] text-[#0d2829]"><Radar className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Radar des talents</h2><p className="text-xs font-bold text-white/[0.42]">Des pepites encore sous les 500 ecoutes.</p></div></div>
        <div className="mt-5 space-y-2">
          {tracks.slice(0, 5).map((track) => (
            <button key={track._id} onClick={() => onPlay(track)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.07] p-2.5 text-left ring-1 ring-white/[0.08]">
              <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{track.title}</p><p className="truncate text-[10px] font-bold text-white/40">{artistName(track)} · signal {track.pulse}%</p></div>
              {currentId === track._id && isPlaying ? <Pause className="h-4 w-4 text-[#7ef2ed]" /> : <ChevronRight className="h-4 w-4 text-white/[0.32]" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HallOfFame({ awards, onPlay }: { awards: CityAward[]; onPlay: (track: CityTrack) => void }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-black/[0.08] bg-[#fffaf2]/90 p-5 shadow-[0_18px_50px_rgba(30,25,20,.1)] sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#171313] text-[#FFD667]"><Trophy className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Hall of Fame</h2><p className="text-xs font-bold text-black/40">Les Synaura Awards de la semaine.</p></div></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {awards.map((award, index) => {
          const Icon = iconMap[award.icon] || Medal;
          const title = award.track?.title || award.artist?.name || 'Synaura';
          const subtitle = award.track ? artistName(award.track) : award.artist ? `@${award.artist.username}` : award.subtitle;
          return (
            <button key={award.id} onClick={() => award.track && onPlay(award.track)} className="flex min-w-0 items-center gap-3 rounded-2xl bg-black/[0.04] p-3 text-left">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-[#FFD667] text-[#171313]' : 'bg-white text-[#7C5CFF]'}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-xs font-black">{award.title}</p><p className="mt-0.5 truncate text-[10px] font-bold text-black/[0.38]">{title} · {subtitle}</p></div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Badges({ badges }: { badges: CityBadge[] }) {
  return (
    <section className="rounded-[2rem] border border-black/[0.08] bg-[#fffaf2]/90 p-5 shadow-[0_18px_50px_rgba(30,25,20,.08)] sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FF4B7A]/12 text-[#E93868]"><Medal className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Badges auditeur</h2><p className="text-xs font-bold text-black/40">Ta facon de soutenir la scene compte aussi.</p></div></div>
      <div className="mt-5 space-y-2">
        {badges.map((badge) => {
          const Icon = iconMap[badge.icon] || Award;
          return (
            <div key={badge.id} className={`flex items-center gap-3 rounded-2xl p-3 ${badge.unlocked ? 'bg-[#7C5CFF]/9' : 'bg-black/[0.035]'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${badge.unlocked ? 'bg-[#7C5CFF] text-white' : 'bg-white text-black/25'}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="text-xs font-black">{badge.title}</p><p className="mt-0.5 text-[10px] font-bold text-black/[0.38]">{badge.description}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-[#7C5CFF]" style={{ width: `${Math.min(100, badge.progress / badge.target * 100)}%` }} /></div></div>
              <span className="text-[10px] font-black text-black/[0.35]">{badge.progress}/{badge.target}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CreatorProgress({ artist }: { artist: CityArtist | null }) {
  const progress = artist ? Math.min(100, artist.xp / artist.nextLevelXp * 100) : 0;
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#171313] p-5 text-white shadow-[0_20px_55px_rgba(23,19,19,.18)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(0,194,203,.26),transparent_35%),radial-gradient(circle_at_15%_90%,rgba(255,75,122,.24),transparent_38%)]" />
      <div className="relative">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-[#7ef2ed]"><Target className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Carte artiste evolutive</h2><p className="text-xs font-bold text-white/40">Ton activite construit ton statut dans la ville.</p></div></div>
        {artist ? (
          <div className="mt-6">
            <div className="flex items-center gap-3"><img src={artist.avatar || '/default-avatar.png'} alt="" className="h-16 w-16 rounded-2xl bg-white/[0.08] object-cover" /><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#7ef2ed]">Niveau {artist.level}</p><h3 className="mt-1 text-2xl font-black">{artist.levelName}</h3><p className="text-xs font-bold text-white/[0.38]">{artist.xp} XP · {artist.trackCount} sons</p></div></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-[#00C2CB] via-[#7C5CFF] to-[#FF4B7A]" /></div>
            <p className="mt-2 text-[10px] font-black text-white/[0.36]">{artist.nextLevelXp - artist.xp > 0 ? `${artist.nextLevelXp - artist.xp} XP avant le prochain niveau` : 'Niveau maximum atteint'}</p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white/[0.07] p-5 text-center ring-1 ring-white/[0.10]"><Award className="mx-auto h-7 w-7 text-[#7ef2ed]" /><p className="mt-3 text-sm font-black">Publie ton premier son pour creer ta carte artiste.</p><Link href="/upload" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313]">Commencer</Link></div>
        )}
      </div>
    </section>
  );
}
