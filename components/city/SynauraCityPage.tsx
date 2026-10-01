'use client';

import Link from '@/components/navigation/HandoffLink';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Check,
  Loader2,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Trophy,
  Vote,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import TrackCover from '@/components/TrackCover';
import { SynauraAppShell, SynauraPanel, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';
import { SynauraButton, SynauraGhostButton } from '@/components/synaura/SynauraButton';
import SynauraBattleDuel from '@/components/synaura/SynauraBattleDuel';
import CityExperience from './CityExperience';
import CityDialog from './CityDialog';
import type { CityEvent, CityTrack, SynauraCityData } from '@/lib/synauraCity';

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
    <SynauraAppShell contentClassName="max-w-[1500px] experience-refresh city-refresh">
      <SynauraTopBar secondaryHref="/ai-generator" secondaryLabel="Créer avec l’IA" primaryHref="/upload" primaryLabel="Publier" />
      <SynauraRouteNav />

      <CityExperience
        city={city}
        currentId={currentId}
        isPlaying={audio.audioState.isPlaying}
        error={error}
        busy={Boolean(actingEventId)}
        onPlay={play}
        onOpen={setDetailEvent}
        onParticipate={openParticipate}
        onClaim={(event) => void claim(event)}
      />

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
                <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="grid h-14 w-14 place-items-center rounded-[1.15rem] bg-[#ffd667] text-[var(--v2-bg)]"><Trophy className="h-7 w-7" /></motion.div>
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
        <CityDialog label={`Participer : ${event.title}`} onClose={onClose}>
          <div className="city-dialog-panel city-dialog-picker">
            <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-5">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7c5cff]">Rejoindre le rendez-vous</p><h2 className="mt-1 text-2xl font-black">{event.title}</h2><p className="mt-1 text-xs font-bold text-black/42">Choisissez un son déjà publié.</p></div>
              <button onClick={onClose} aria-label="Fermer la sélection de son" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.05]"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
              {!tracks && !loadError ? <div className="grid min-h-36 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#7c5cff]" /></div> : null}
              {loadError ? <p className="rounded-[1rem] bg-[#ff6f61]/10 p-4 text-center text-sm font-black text-[#a73c34]">{loadError}</p> : null}
              {tracks?.length === 0 ? <p className="rounded-[1rem] bg-black/[0.035] p-5 text-center text-sm font-black">Vous n’avez pas encore de son publié.</p> : null}
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
          </div>
        </CityDialog>
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
      <CityDialog label={event.title} onClose={onClose}>
        <div className="city-dialog-panel">
          <div className="relative overflow-hidden border-b border-black/[0.07] bg-[#171313] p-5 text-white sm:p-6">
            <div className="absolute inset-0 opacity-70" style={{ backgroundImage: `linear-gradient(135deg, ${event.accent || '#7c5cff'}88, transparent 62%)` }} />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/52">{event.isLive ? 'En cours' : event.status === 'scheduled' ? 'À venir' : 'Rendez-vous Synaura'}</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">{event.title}</h2>
                <p className="mt-2 max-w-xl text-sm font-bold text-white/58">{event.description}</p>
                <div className="mt-4 flex gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className="rounded-full bg-white/10 px-3 py-2">{participants.length} inscrit{participants.length > 1 ? 's' : ''}</span>
                  {event.kind === 'battle' ? <span className="rounded-full bg-white/10 px-3 py-2">{event.totalVotes || 0} votes</span> : null}
                </div>
              </div>
              <button onClick={onClose} aria-label="Fermer l’événement" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/16"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="max-h-[52vh] space-y-2 overflow-y-auto p-4">
            {participants.length ? participants.map((participant) => {
              const track = participant.track;
              if (!track) return null;
              const selected = event.selectedTrackId === track._id;
              return (
                <div key={participant.id} className={`flex min-w-0 items-center gap-3 rounded-[1.25rem] p-3 ${selected ? 'bg-[#7c5cff]/12 ring-2 ring-[#7c5cff]/25' : 'bg-black/[0.035]'}`}>
                  <button onClick={() => onPlay(track)} aria-label={`${currentId === track._id && isPlaying ? 'Mettre en pause' : 'Écouter'} ${track.title}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem]">
                    <TrackCover trackId={track._id} src={track.coverUrl} title={track.title} className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/16 text-white">{currentId === track._id && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{track.title}</p>
                    <p className="mt-1 truncate text-xs font-bold text-black/42">{participant.name}{participant.username ? ` · @${participant.username}` : ''}</p>
                    {event.kind === 'battle' && <p className="mt-2 text-xs text-black/42">{event.voteCounts?.[track._id] || 0} votes · {Math.round(((event.voteCounts?.[track._id] || 0) / Math.max(1, event.totalVotes || 0)) * 100)} %</p>}
                  </div>
                  {event.kind === 'battle' ? (
                    <button disabled={!event.isLive || voting} onClick={() => onVote(track._id)} aria-label={`${selected ? 'Vote enregistré pour' : 'Voter pour'} ${track.title}`} className={`h-10 shrink-0 rounded-full px-4 text-xs font-black ${selected ? 'bg-[#7c5cff] text-white' : 'bg-[#171313] text-white disabled:opacity-35'}`}>
                      {selected ? 'Voté' : 'Voter'}
                    </button>
                  ) : null}
                </div>
              );
            }) : <div className="rounded-[1.2rem] bg-black/[0.035] p-6 text-center text-sm font-black text-black/42">Aucun son inscrit pour le moment. Le premier peut être le vôtre.</div>}
            {event.reward && <div className="city-dialog-reward"><Trophy size={18} /><div><strong>{event.reward.title}</strong><p>{event.reward.description}</p>{event.activeBoost && <p>Boost ×{event.activeBoost.multiplier} actif jusqu’au {new Date(event.activeBoost.expiresAt).toLocaleString('fr-FR')}</p>}</div></div>}
          </div>
          {event.kind !== 'battle' && !event.isEnded ? (
            <div className="border-t border-black/[0.07] p-4">
              <SynauraButton className="w-full" onClick={() => onParticipate(event)}>{event.userParticipation ? 'Changer mon son inscrit' : 'Inscrire un de mes sons'}</SynauraButton>
            </div>
          ) : null}
        </div>
      </CityDialog>
    </AnimatePresence>
  );
}
