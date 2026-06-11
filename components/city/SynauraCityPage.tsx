'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Activity,
  Award,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Headphones,
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
  X,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import TrackCover from '@/components/TrackCover';
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

type MyTrack = {
  id: string;
  title: string;
  coverUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  createdAt?: string;
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
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

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
      setToast('Vote enregistre. Badge de jure debloque.');
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
      setToast(`Ton son est inscrit dans "${event.title}".`);
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
    setError(null);
    try {
      const response = await fetch(`/api/city/events/${encodeURIComponent(event.id)}/claim`, { method: 'POST' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Recompense impossible.');
      setToast('Recompense reclamee. Bien joue.');
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Recompense impossible.');
    } finally {
      setActingEventId(null);
    }
  }, [actingEventId, load, session?.user]);

  if (loading && !city) {
    return (
      <CityStandaloneShell>
        <div className="grid min-h-[78vh] place-items-center">
          <div className="relative text-center">
            <div className="absolute -inset-16 rounded-full bg-[#FF4B7A]/20 blur-3xl" />
            <Loader2 className="relative mx-auto h-10 w-10 animate-spin text-[#7ef2ed]" />
            <p className="relative mt-4 text-xs font-black uppercase tracking-[0.3em] text-white/50">Les neons s allument...</p>
          </div>
        </div>
      </CityStandaloneShell>
    );
  }

  if (!city) {
    return (
      <CityStandaloneShell>
        <div className="mx-auto mt-20 max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-white backdrop-blur-xl">
          <Map className="mx-auto h-8 w-8 text-[#7ef2ed]" />
          <h1 className="mt-3 text-2xl font-black">La ville fait une courte pause</h1>
          <p className="mt-2 text-sm font-bold text-white/50">{error}</p>
          <button onClick={() => void load()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#fffaf2] px-5 text-sm font-black text-[#171313] transition hover:-translate-y-0.5">
            <RefreshCw className="h-4 w-4" /> Reessayer
          </button>
        </div>
      </CityStandaloneShell>
    );
  }

  return (
    <CityStandaloneShell>
      {/* ───────────────────── Hero ───────────────────── */}
      <section className="relative overflow-hidden rounded-[2.2rem] border border-white/[0.08] bg-gradient-to-br from-[#1B0B26] via-[#12081C] to-[#04101A] px-5 py-8 text-[#fffaf2] shadow-[0_40px_140px_rgba(124,92,255,.22)] sm:px-9 sm:py-11 lg:px-12 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,75,122,.34),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(126,242,237,.22),transparent_30%),radial-gradient(circle_at_55%_110%,rgba(124,92,255,.30),transparent_44%)]" />
          <div className="city-scanline absolute inset-0 opacity-20" />
          <div className="city-skyline absolute inset-x-0 bottom-0 h-32 opacity-50" />
          <div className="city-orbit absolute -right-28 -top-28 h-80 w-80 rounded-full border border-[#7ef2ed]/20" />
        </div>
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.22em] ring-1 ring-white/10 backdrop-blur-xl">
              <span className="city-live-dot h-2 w-2 rounded-full bg-[#FF4B7A]" /> En direct de Synaura City
            </div>
            <h1 className="city-title-glow mt-6 max-w-4xl text-5xl font-black leading-[.9] tracking-[-0.06em] sm:text-7xl lg:text-[5.4rem]">{city.cityMood.title}</h1>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-relaxed text-white/55 sm:text-base">{city.cityMood.subtitle} Reviens demain : la selection et les projecteurs auront bouge.</p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/upload" className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#fffaf2] px-6 text-sm font-black text-[#171313] shadow-[0_0_40px_rgba(255,250,242,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_0_55px_rgba(255,250,242,.4)]">
                <Rocket className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:rotate-12" /> Lancer un drop
              </Link>
              <Link href="/community" className="inline-flex h-12 items-center gap-2 rounded-full bg-white/[0.07] px-6 text-sm font-black text-white ring-1 ring-white/15 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.12]">
                <Users className="h-4 w-4" /> Rejoindre la ville
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <CityStat label="Reactions" value={compact(city.cityMood.reactionsToday)} icon={Heart} color="#FF7B91" />
            <CityStat label="Nouveaux drops" value={compact(city.cityMood.newDrops)} icon={Music2} color="#7EF2ED" />
            <CityStat label="Signaux Pulse" value={compact(city.pulse.filter((track) => track.pulse >= 60).length)} icon={Activity} color="#B9A8FF" />
          </div>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-center text-sm font-black text-red-300">{error}</div> : null}

      <Section title="La Vitrine du Jour" subtitle="Cinq raisons differentes de lancer la lecture aujourd hui." icon={Sparkles}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {city.showcase.map((item, index) => <ShowcaseCard key={item.id} item={item} index={index} playing={currentId === item.track._id && audio.audioState.isPlaying} onPlay={play} />)}
        </div>
      </Section>

      <Section title="Synaura Pulse" subtitle="Les sons qui font reagir la ville maintenant." icon={Activity} action={<Link href="/trending" className="text-xs font-black text-white/40 transition hover:text-white/70">Toutes les tendances</Link>}>
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
              : <EventCard key={event.id} event={event} busy={actingEventId === event.id} onPlay={play} onParticipate={openParticipate} onClaim={claim} />
          ))}
        </div>
      </Section>

      <section className="mt-10 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <RadarSection tracks={city.radar} currentId={currentId} isPlaying={audio.audioState.isPlaying} onPlay={play} />
        <HallOfFame awards={city.hallOfFame} onPlay={play} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Badges badges={city.listenerBadges} />
        <CreatorProgress artist={city.creatorCard} />
      </section>

      <TrackPickerModal
        event={pickerEvent}
        busy={Boolean(actingEventId)}
        onClose={() => setPickerEvent(null)}
        onPick={(trackId) => pickerEvent && void participate(pickerEvent, trackId)}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: .96 }}
            className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-[#7ef2ed]/30 bg-[#0E1B1C]/95 px-5 py-3 text-sm font-black text-[#7ef2ed] shadow-[0_18px_60px_rgba(126,242,237,.25)] backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </CityStandaloneShell>
  );
}

function CityStandaloneShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="city-standalone relative min-h-screen overflow-hidden bg-[#08050E] px-3 py-4 text-[#fffaf2] sm:px-5 sm:py-6 lg:px-8">
      <style>{`
        @keyframes cityScan { 0% { transform: translateX(-35%) skewX(-18deg); opacity:0 } 30%,70% { opacity:.4 } 100% { transform: translateX(135%) skewX(-18deg); opacity:0 } }
        @keyframes cityMeteor { 0% { transform: translate3d(0,0,0) rotate(-18deg); opacity:0 } 12% { opacity:.9 } 100% { transform: translate3d(-78vw,74vh,0) rotate(-18deg); opacity:0 } }
        @keyframes cityOrbit { to { transform: rotate(360deg) } }
        @keyframes cityAurora { 0%,100% { transform: translate3d(0,0,0) scale(1) } 50% { transform: translate3d(-4%,3%,0) scale(1.12) } }
        @keyframes cityLive { 0%,100% { box-shadow: 0 0 0 0 rgba(255,75,122,.6) } 50% { box-shadow: 0 0 0 6px rgba(255,75,122,0) } }
        @keyframes cityGlow { 0%,100% { text-shadow: 0 0 32px rgba(255,75,122,.35), 0 0 90px rgba(124,92,255,.25) } 50% { text-shadow: 0 0 48px rgba(126,242,237,.4), 0 0 110px rgba(255,75,122,.3) } }
        .city-scanline { background: linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent); animation: cityScan 4.6s ease-in-out infinite; }
        .city-orbit { animation: cityOrbit 22s linear infinite; }
        .city-aurora { animation: cityAurora 11s ease-in-out infinite; }
        .city-aurora-2 { animation-duration: 16s; animation-delay: -6s; }
        .city-live-dot { animation: cityLive 1.6s ease-out infinite; }
        .city-title-glow { animation: cityGlow 5s ease-in-out infinite; }
        .city-meteor { animation: cityMeteor 9s linear infinite; }
        .city-meteor:nth-child(2) { animation-delay: 3.2s; top: 16%; right: -6%; }
        .city-meteor:nth-child(3) { animation-delay: 6.1s; top: 4%; right: 30%; }
        .city-skyline { background:
          linear-gradient(to top, rgba(8,5,14,.9), transparent),
          repeating-linear-gradient(90deg,
            rgba(255,255,255,.06) 0 14px, transparent 14px 22px,
            rgba(255,255,255,.045) 22px 30px, transparent 30px 44px,
            rgba(255,255,255,.07) 44px 52px, transparent 52px 70px);
          mask-image: linear-gradient(to top, black 30%, transparent 95%);
        }
        .city-card-hover { transition: transform .35s cubic-bezier(.2,.9,.25,1.2), box-shadow .35s ease; }
        .city-card-hover:hover { transform: translateY(-4px); }
      `}</style>
      <div className="pointer-events-none fixed inset-0">
        <div className="city-aurora absolute -left-40 -top-44 h-[34rem] w-[34rem] rounded-full bg-[#7C5CFF]/[0.16] blur-[110px]" />
        <div className="city-aurora city-aurora-2 absolute -right-44 top-1/4 h-[30rem] w-[30rem] rounded-full bg-[#FF4B7A]/[0.13] blur-[110px]" />
        <div className="city-aurora absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#00C2CB]/[0.10] blur-[110px]" />
      </div>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <span className="city-meteor absolute right-0 top-24 h-px w-40 rounded-full bg-gradient-to-l from-transparent via-[#7ef2ed] to-white/80 shadow-[0_0_22px_#7ef2ed]" />
        <span className="city-meteor absolute h-px w-32 rounded-full bg-gradient-to-l from-transparent via-[#ff4b7a] to-white/80 shadow-[0_0_22px_#ff4b7a]" />
        <span className="city-meteor absolute h-px w-44 rounded-full bg-gradient-to-l from-transparent via-[#b9a8ff] to-white/80 shadow-[0_0_22px_#b9a8ff]" />
      </div>
      <div className="relative mx-auto max-w-[1500px] pb-20">
        {children}
      </div>
    </main>
  );
}

function Section({ title, subtitle, icon: Icon, action, children }: { title: string; subtitle: string; icon: typeof Sparkles; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-[#7ef2ed] ring-1 ring-white/10"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
            <p className="mt-0.5 text-xs font-bold text-white/40 sm:text-sm">{subtitle}</p>
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
    <div className="min-w-0 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/[0.10] backdrop-blur-xl sm:p-4">
      <Icon className="h-4 w-4" style={{ color }} />
      <p className="mt-4 truncate text-xl font-black sm:text-3xl">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-[10px]">{label}</p>
    </div>
  );
}

function ShowcaseCard({ item, index, playing, onPlay }: { item: CityShowcaseItem; index: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  const Icon = iconMap[item.icon] || Sparkles;
  return (
    <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} onClick={() => onPlay(item.track)} className="city-card-hover group relative min-h-[280px] overflow-hidden rounded-[1.6rem] bg-[#100A18] text-left text-white ring-1 ring-white/[0.08] hover:shadow-[0_24px_70px_rgba(124,92,255,.25)]">
      <TrackCover trackId={item.track._id} src={item.track.coverUrl} videoSrc={item.track.coverVideoUrl} posterSrc={item.track.coverVideoPosterUrl} title={item.track.title} autoPlayVideo={playing} className="absolute inset-0 h-full w-full rounded-none object-cover transition duration-700 group-hover:scale-[1.06]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#08050E] via-[#08050E]/40 to-transparent" />
      <div className="relative flex h-full min-h-[280px] flex-col justify-between p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] backdrop-blur-xl ring-1 ring-white/10"><Icon className="h-3 w-3" style={{ color: item.accent }} /> {item.label}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fffaf2] text-[#171313] shadow-[0_0_24px_rgba(255,250,242,.3)] transition group-hover:scale-110">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: item.accent }}>{item.caption}</p>
          <h3 className="mt-1 line-clamp-2 text-xl font-black leading-tight">{item.track.title}</h3>
          <p className="mt-1 truncate text-xs font-bold text-white/50">{artistName(item.track)}</p>
        </div>
      </div>
    </motion.button>
  );
}

function PulseCard({ track, rank, playing, onPlay }: { track: CityPulseTrack; rank: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <button onClick={() => onPlay(track)} className="city-card-hover group flex min-w-0 items-center gap-3 rounded-[1.5rem] bg-white/[0.04] p-3 text-left ring-1 ring-white/[0.08] backdrop-blur-xl hover:bg-white/[0.07]">
      <span className="w-6 text-center text-xs font-black text-white/25">{String(rank).padStart(2, '0')}</span>
      <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={playing} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-black text-white">{track.title}</h3>
          <span className="shrink-0 rounded-full bg-[#7C5CFF]/20 px-2 py-1 text-[9px] font-black text-[#B9A8FF]">{track.pulseState}</span>
        </div>
        <p className="mt-1 truncate text-[11px] font-bold text-white/40">{artistName(track)} · {track.pulseReasons.join(' · ')}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"><motion.div initial={{ width: 0 }} animate={{ width: `${track.pulse}%` }} transition={{ duration: .8 }} className="h-full rounded-full bg-gradient-to-r from-[#00C2CB] via-[#7C5CFF] to-[#FF4B7A]" /></div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-black text-white">{track.pulse}%</p>
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">Pulse</p>
      </div>
    </button>
  );
}

function ArtistBoosterCard({ artist, index, onPlay }: { artist: CityArtist; index: number; onPlay: (track: CityTrack) => void }) {
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .07 }} className="city-card-hover w-[280px] shrink-0 snap-start overflow-hidden rounded-[1.7rem] bg-white/[0.04] ring-1 ring-white/[0.08] backdrop-blur-xl">
      <div className="relative h-28 bg-[#100A18]">
        {artist.featuredTrack ? <TrackCover trackId={artist.featuredTrack._id} src={artist.featuredTrack.coverUrl} title={artist.featuredTrack.title} className="h-full w-full rounded-none object-cover opacity-60" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF4B7A]/50 to-[#00C2CB]/35" />
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white backdrop-blur-lg">Nouveau talent decouvert</span>
        <img src={artist.avatar || '/default-avatar.png'} alt="" className="absolute -bottom-7 left-4 h-16 w-16 rounded-2xl border-4 border-[#140E1E] bg-[#140E1E] object-cover" />
      </div>
      <div className="p-4 pt-10">
        <h3 className="truncate text-xl font-black text-white">{artist.name}</h3>
        <p className="truncate text-xs font-bold text-white/40">@{artist.username} · {artist.genre[0] || artist.levelName}</p>
        <div className="mt-3 flex gap-2 text-[10px] font-black text-white/45"><span>{compact(artist.totalPlays)} ecoutes</span><span>·</span><span>{compact(artist.totalLikes)} likes</span></div>
        <div className="mt-4 flex gap-2">
          <Link href={`/profile/${encodeURIComponent(artist.username)}`} className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#fffaf2] text-xs font-black text-[#171313] transition hover:shadow-[0_0_24px_rgba(255,250,242,.3)]">Decouvrir</Link>
          {artist.featuredTrack ? <button onClick={() => onPlay(artist.featuredTrack!)} className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/10"><Play className="h-4 w-4" /></button> : null}
        </div>
      </div>
    </motion.article>
  );
}

function PremiereCard({ track, index, playing, onPlay }: { track: CityPulseTrack; index: number; playing: boolean; onPlay: (track: CityTrack) => void }) {
  return (
    <motion.button initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * .06 }} onClick={() => onPlay(track)} className="city-card-hover group relative overflow-hidden rounded-[1.6rem] bg-white/[0.04] p-3 text-left text-white ring-1 ring-white/[0.08] backdrop-blur-xl">
      <div className="relative aspect-[16/11] overflow-hidden rounded-[1.15rem]">
        <TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} posterSrc={track.coverVideoPosterUrl} title={track.title} autoPlayVideo={playing} className="h-full w-full rounded-[1.15rem] object-cover transition duration-700 group-hover:scale-[1.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="absolute left-2 top-2 rounded-full bg-[#FF4B7A] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[.1em] shadow-[0_0_18px_rgba(255,75,122,.5)]">Nouveau drop</span>
        <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
      </div>
      <p className="mt-3 text-[9px] font-black uppercase tracking-[.14em] text-[#7ef2ed]">Disponible maintenant · Pulse {track.pulse}%</p>
      <h3 className="mt-1 truncate text-sm font-black">{track.title}</h3>
      <p className="mt-1 truncate text-[10px] font-bold text-white/40">Nouveau drop de {artistName(track)}</p>
    </motion.button>
  );
}

function EventCard({
  event,
  busy,
  onPlay,
  onParticipate,
  onClaim,
}: {
  event: CityEvent;
  busy: boolean;
  onPlay: (track: CityTrack) => void;
  onParticipate: (event: CityEvent) => void;
  onClaim: (event: CityEvent) => void;
}) {
  const Icon = iconMap[event.icon] || CalendarDays;
  const first = event.tracks?.[0];
  const winner = event.winners?.[0];
  const participated = Boolean(event.userParticipation);
  const claimable = event.claimStatus === 'available';
  const action = claimable ? () => onClaim(event) : () => onParticipate(event);
  const label = busy
    ? 'Chargement...'
    : claimable
      ? 'Reclamer ma recompense'
      : participated
        ? 'Participation envoyee'
        : 'Participer avec un son';
  return (
    <article className="city-card-hover relative min-h-[280px] overflow-hidden rounded-[1.8rem] bg-[#100A18] p-5 text-white ring-1 ring-white/[0.08] hover:shadow-[0_24px_70px_rgba(255,75,122,.18)]">
      {first ? <TrackCover trackId={first._id} src={first.coverUrl} title={first.title} className="absolute inset-0 h-full w-full rounded-none object-cover opacity-25" /> : null}
      <div className="absolute inset-0 bg-gradient-to-br from-[#08050E]/95 via-[#08050E]/70 to-transparent" />
      <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-30 blur-3xl" style={{ backgroundColor: event.accent }} />
      <div className="relative flex h-full min-h-[240px] flex-col">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] ring-1 ring-white/[0.12]"><Icon className="h-5 w-5" style={{ color: event.accent }} /></span>
          <div className="flex flex-wrap justify-end gap-2">
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] ${event.isLive ? 'bg-[#FF4B7A]/20 text-[#FF7B91] ring-1 ring-[#FF4B7A]/30' : 'bg-white/[0.08] text-white/70'}`}>{event.isLive ? '· Live' : event.status || 'live'}</span>
            {event.challengeTag ? <span className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[10px] font-black text-white/70">{event.challengeTag}</span> : null}
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: event.accent }}>{event.subtitle}</p>
          <h3 className="mt-1 text-2xl font-black">{event.title}</h3>
          <p className="mt-2 max-w-md text-xs font-bold leading-relaxed text-white/50">{event.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black text-white/60">
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1.5">{event.participationCount || 0} participations</span>
            {event.reward ? <span className="rounded-full bg-white/[0.07] px-2.5 py-1.5">🏅 {event.reward.title}</span> : null}
            {winner ? <span className="rounded-full bg-[#FFD667] px-2.5 py-1.5 text-[#171313]">Winner: {winner.track?.title || winner.trackId}</span> : null}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              disabled={busy || (participated && !claimable)}
              onClick={action}
              className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-xs font-black transition disabled:opacity-60 ${claimable ? 'bg-[#FFD667] text-[#171313] shadow-[0_0_28px_rgba(255,214,103,.4)] hover:shadow-[0_0_40px_rgba(255,214,103,.55)]' : participated ? 'bg-white/[0.10] text-white/80' : 'bg-[#fffaf2] text-[#171313] hover:shadow-[0_0_28px_rgba(255,250,242,.35)]'}`}
            >
              {participated && !claimable ? <Check className="h-3.5 w-3.5" /> : null}
              {label}
              {!participated || claimable ? <ArrowRight className="h-3.5 w-3.5" /> : null}
            </button>
            {first ? <button onClick={() => onPlay(first)} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10 transition hover:bg-white/[0.14]"><Play className="h-4 w-4" /></button> : null}
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
    <article className="city-card-hover overflow-hidden rounded-[1.8rem] bg-[#100A18] p-5 text-white ring-1 ring-[#7ef2ed]/[0.15] hover:shadow-[0_24px_70px_rgba(126,242,237,.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#7ef2ed]">{event.subtitle}</p>
          <h3 className="mt-1 text-2xl font-black">{event.title}</h3>
          <p className="mt-1 text-[10px] font-black text-white/35">{event.totalVotes || 0} votes · {event.isLive ? 'en direct' : event.status || 'live'}</p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7ef2ed]/10 ring-1 ring-[#7ef2ed]/25"><Vote className="h-6 w-6 text-[#7ef2ed]" /></span>
      </div>
      {event.winnerTrackId ? <div className="mt-3 rounded-2xl bg-[#FFD667] px-3 py-2 text-xs font-black text-[#171313]">Gagnant: {tracks.find((track) => track._id === event.winnerTrackId)?.title || event.winnerTrackId}</div> : null}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {tracks.map((track) => {
          const selected = event.selectedTrackId === track._id;
          const percent = Math.round(Number(event.voteCounts?.[track._id] || 0) / total * 100);
          return (
            <div key={track._id} className={`overflow-hidden rounded-2xl p-2 ring-1 transition ${selected ? 'bg-[#7ef2ed]/[0.08] ring-[#7ef2ed]/50' : 'bg-white/[0.05] ring-white/[0.10]'}`}>
              <button onClick={() => onPlay(track)} className="relative block aspect-square w-full overflow-hidden rounded-xl">
                <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} autoPlayVideo={playingId === track._id && isPlaying} className="h-full w-full rounded-xl object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#fffaf2] text-[#171313]">{playingId === track._id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span></span>
              </button>
              <p className="mt-2 truncate text-xs font-black">{track.title}</p>
              <p className="truncate text-[10px] font-bold text-white/35">{artistName(track)}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-gradient-to-r from-[#00C2CB] to-[#7ef2ed] transition-all duration-700" style={{ width: `${percent}%` }} /></div>
              <button disabled={voting} onClick={() => onVote(track._id)} className={`mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[10px] font-black transition ${selected ? 'bg-[#7ef2ed] text-[#171313]' : 'bg-white/[0.08] text-white hover:bg-white/[0.14]'}`}>
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
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0A2426] to-[#071518] p-5 text-white ring-1 ring-[#7ef2ed]/[0.15] sm:p-6">
      <div className="city-orbit pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-[#7ef2ed]/20" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full border border-[#7ef2ed]/[0.12]" />
      <div className="relative">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#7ef2ed] text-[#0d2829]"><Radar className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Radar des talents</h2><p className="text-xs font-bold text-white/40">Des pepites encore sous les 500 ecoutes.</p></div></div>
        <div className="mt-5 space-y-2">
          {tracks.slice(0, 5).map((track) => (
            <button key={track._id} onClick={() => onPlay(track)} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5 text-left ring-1 ring-white/[0.07] transition hover:bg-white/[0.09]">
              <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{track.title}</p><p className="truncate text-[10px] font-bold text-white/40">{artistName(track)} · signal {track.pulse}%</p></div>
              {currentId === track._id && isPlaying ? <Pause className="h-4 w-4 text-[#7ef2ed]" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HallOfFame({ awards, onPlay }: { awards: CityAward[]; onPlay: (track: CityTrack) => void }) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-white/[0.04] p-5 ring-1 ring-white/[0.08] backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFD667]/15 text-[#FFD667] ring-1 ring-[#FFD667]/25"><Trophy className="h-5 w-5" /></span><div><h2 className="text-2xl font-black text-white">Hall of Fame</h2><p className="text-xs font-bold text-white/40">Les Synaura Awards de la semaine.</p></div></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {awards.map((award, index) => {
          const Icon = iconMap[award.icon] || Medal;
          const title = award.track?.title || award.artist?.name || 'Synaura';
          const subtitle = award.track ? artistName(award.track) : award.artist ? `@${award.artist.username}` : award.subtitle;
          return (
            <button key={award.id} onClick={() => award.track && onPlay(award.track)} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-left ring-1 ring-white/[0.06] transition hover:bg-white/[0.08]">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-[#FFD667] text-[#171313]' : 'bg-white/[0.08] text-[#B9A8FF]'}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="truncate text-xs font-black text-white">{award.title}</p><p className="mt-0.5 truncate text-[10px] font-bold text-white/40">{title} · {subtitle}</p></div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Badges({ badges }: { badges: CityBadge[] }) {
  return (
    <section className="rounded-[2rem] bg-white/[0.04] p-5 ring-1 ring-white/[0.08] backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FF4B7A]/15 text-[#FF7B91] ring-1 ring-[#FF4B7A]/25"><Medal className="h-5 w-5" /></span><div><h2 className="text-2xl font-black text-white">Badges auditeur</h2><p className="text-xs font-bold text-white/40">Ta facon de soutenir la scene compte aussi.</p></div></div>
      <div className="mt-5 space-y-2">
        {badges.map((badge) => {
          const Icon = iconMap[badge.icon] || Award;
          return (
            <div key={badge.id} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${badge.unlocked ? 'bg-[#7C5CFF]/[0.12] ring-[#7C5CFF]/30' : 'bg-white/[0.03] ring-white/[0.06]'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${badge.unlocked ? 'bg-[#7C5CFF] text-white shadow-[0_0_18px_rgba(124,92,255,.5)]' : 'bg-white/[0.06] text-white/25'}`}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1"><p className="text-xs font-black text-white">{badge.title}</p><p className="mt-0.5 text-[10px] font-bold text-white/40">{badge.description}</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-[#7C5CFF] transition-all duration-700" style={{ width: `${Math.min(100, badge.progress / badge.target * 100)}%` }} /></div></div>
              <span className="text-[10px] font-black text-white/35">{badge.progress}/{badge.target}</span>
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
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1B0B26] to-[#0A1B22] p-5 text-white ring-1 ring-white/[0.08] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(0,194,203,.22),transparent_35%),radial-gradient(circle_at_15%_90%,rgba(255,75,122,.20),transparent_38%)]" />
      <div className="relative">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.07] text-[#7ef2ed] ring-1 ring-white/10"><Target className="h-5 w-5" /></span><div><h2 className="text-2xl font-black">Carte artiste evolutive</h2><p className="text-xs font-bold text-white/40">Ton activite construit ton statut dans la ville.</p></div></div>
        {artist ? (
          <div className="mt-6">
            <div className="flex items-center gap-3"><img src={artist.avatar || '/default-avatar.png'} alt="" className="h-16 w-16 rounded-2xl bg-white/[0.07] object-cover ring-2 ring-[#7ef2ed]/30" /><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#7ef2ed]">Niveau {artist.level}</p><h3 className="mt-1 text-2xl font-black">{artist.levelName}</h3><p className="text-xs font-bold text-white/35">{artist.xp} XP · {artist.trackCount} sons</p></div></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-[#00C2CB] via-[#7C5CFF] to-[#FF4B7A]" /></div>
            <p className="mt-2 text-[10px] font-black text-white/35">{artist.nextLevelXp - artist.xp > 0 ? `${artist.nextLevelXp - artist.xp} XP avant le prochain niveau` : 'Niveau maximum atteint'}</p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-white/[0.05] p-5 text-center ring-1 ring-white/[0.08]"><Award className="mx-auto h-7 w-7 text-[#7ef2ed]" /><p className="mt-3 text-sm font-black">Publie ton premier son pour creer ta carte artiste.</p><Link href="/upload" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#fffaf2] px-4 text-xs font-black text-[#171313]">Commencer</Link></div>
        )}
      </div>
    </section>
  );
}

function TrackPickerModal({
  event,
  busy,
  onClose,
  onPick,
}: {
  event: CityEvent | null;
  busy: boolean;
  onClose: () => void;
  onPick: (trackId: string) => void;
}) {
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
    return () => {
      cancelled = true;
    };
  }, [event]);

  return (
    <AnimatePresence>
      {event ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 28, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: .96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(clickEvent: React.MouseEvent) => clickEvent.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#120B1C] text-white shadow-[0_40px_140px_rgba(0,0,0,.6)]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#7ef2ed]">{event.subtitle}</p>
                <h3 className="mt-1 text-xl font-black">Choisis ton son pour "{event.title}"</h3>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] transition hover:bg-white/[0.14]"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[46vh] overflow-y-auto p-3">
              {loadError ? (
                <p className="p-5 text-center text-sm font-bold text-red-300">{loadError}</p>
              ) : tracks === null ? (
                <div className="grid place-items-center p-8"><Loader2 className="h-6 w-6 animate-spin text-[#7ef2ed]" /></div>
              ) : tracks.length === 0 ? (
                <div className="p-6 text-center">
                  <Music2 className="mx-auto h-7 w-7 text-white/30" />
                  <p className="mt-3 text-sm font-black">Tu n as pas encore publie de son.</p>
                  <Link href="/upload" className="mt-4 inline-flex h-10 items-center rounded-full bg-[#fffaf2] px-5 text-xs font-black text-[#171313]">Publier un son</Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tracks.map((track) => {
                    const isSelected = selected === track.id;
                    return (
                      <button key={track.id} onClick={() => setSelected(track.id)} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left ring-1 transition ${isSelected ? 'bg-[#7ef2ed]/[0.10] ring-[#7ef2ed]/50' : 'bg-white/[0.04] ring-white/[0.06] hover:bg-white/[0.08]'}`}>
                        <img src={track.coverVideoPosterUrl || track.coverUrl || '/default-cover.jpg'} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white/[0.06] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{track.title}</p>
                          <p className="truncate text-[10px] font-bold text-white/40">{track.createdAt ? new Date(track.createdAt).toLocaleDateString('fr-FR') : 'Mon son'}</p>
                        </div>
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${isSelected ? 'bg-[#7ef2ed] text-[#171313]' : 'bg-white/[0.07]'}`}>{isSelected ? <Check className="h-3.5 w-3.5" /> : null}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t border-white/[0.07] p-4">
              <button
                disabled={!selected || busy}
                onClick={() => selected && onPick(selected)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#fffaf2] text-sm font-black text-[#171313] transition enabled:hover:shadow-[0_0_32px_rgba(255,250,242,.35)] disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {busy ? 'Inscription en cours...' : 'Inscrire ce son dans l event'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
