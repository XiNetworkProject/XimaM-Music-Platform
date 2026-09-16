'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, ArrowLeft, Play, Pause, MoreHorizontal } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import { useTrackActions } from '@/components/actions/useTrackActions';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { DISCOVER_MOODS, type MoodId } from '@/lib/discoverMoods';
import { COMMUNITY_CLUBS } from '@/lib/communityClubs';
import type { DiscoverTrackLite } from '@/app/discover/DiscoverPlayButton';
import PilotLink from './PilotLink';
import PilotImage from './PilotImage';

type Artist = { _id: string; username: string; name: string; avatar?: string; bio?: string; leadTrack: DiscoverTrackLite };
type Discovery = { tracks: DiscoverTrackLite[]; artists: Artist[]; total: number };
type Collection = { id: string; title: string; subtitle?: string; coverUrl?: string; bannerUrl?: string; publicUrl?: string; slug?: string; playlistId: string; trackCount: number };
function usePilotData<T>(path: string, enabled = true) {
  const { data: session, status } = useSession();
  return useQuery<T>({ queryKey: ['v2-pilot', session?.user?.id || 'guest', path], enabled: enabled && status !== 'loading', staleTime: 5 * 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: false, retry: 1,
    queryFn: async ({ signal }) => { const response = await fetch(path, { signal }); if (!response.ok) throw new Error('Cet espace est momentanément indisponible.'); return response.json(); } });
}

function DiscoverRecord({ track, queue, large = false, number }: { track: DiscoverTrackLite; queue: DiscoverTrackLite[]; large?: boolean; number?: number }) {
  const { audioState, setQueueAndPlay, pause, play } = useAudioPlayer();
  const actions = useTrackActions('discover');
  const profile = useProfilePeek('discover');
  const current = audioState.tracks[audioState.currentTrackIndex]?._id === track._id;
  const playing = current && audioState.isPlaying;
  const toggle = () => { if (current) { playing ? pause() : void play(); return; } const playable = queue.filter(item => item.audioUrl); const index = playable.findIndex(item => item._id === track._id); if (index >= 0) void setQueueAndPlay(playable as Parameters<typeof setQueueAndPlay>[0], index); };
  return <article className={`pilot-record ${large ? 'pilot-record--large' : ''}`} data-track-id={track._id}>
    <button className="pilot-record-art" onClick={toggle} aria-label={`${playing ? 'Mettre en pause' : 'Écouter'} ${track.title}`} disabled={!track.audioUrl}>
      <PilotImage src={track.coverUrl || '/default-cover.svg'} alt="" loading={large ? 'eager' : 'lazy'} /><span className="pilot-record-play">{playing ? <Pause /> : <Play />}</span>
    </button>
    <div className="pilot-record-copy">{number != null && <span className="pilot-record-number">{String(number).padStart(2, '0')}</span>}<div><PilotLink href={`/track/${encodeURIComponent(track._id)}`}><h3>{track.title}</h3></PilotLink><button className="pilot-record-artist" data-context-surface-trigger-key={`pilot-discover-profile-${track._id}`} onClick={event => profile(track.artist?.username, event.currentTarget)}>{track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura'}</button></div><button aria-label={`Options de ${track.title}`} data-context-surface-trigger-key={`pilot-discover-options-${track._id}`} onClick={event => actions.open(track, 'track-options', event.currentTarget)}><MoreHorizontal /></button></div>
  </article>;
}

export default function PilotDiscover() {
  const [mood, setMood] = useState<MoodId | null>(null);
  const selection = usePilotData<Discovery>('/api/discover?sort=trending&limit=24');
  const newest = usePilotData<Discovery>('/api/discover?sort=newest&limit=12');
  const radar = usePilotData<{ tracks: DiscoverTrackLite[] }>('/api/discover/radar?limit=12');
  const collections = usePilotData<{ collections: Collection[] }>('/api/editorial-collections/featured');
  const moodQuery = usePilotData<{ tracks: DiscoverTrackLite[] }>(`/api/discover/moods?mood=${mood || ''}&limit=40`, Boolean(mood));
  const profile = useProfilePeek('discover');
  const tracks = selection.data?.tracks || [];
  const lead = tracks[0];
  const featuredArtist = selection.data?.artists.find(artist => artist._id !== lead?.artist?._id) || selection.data?.artists[0];
  const moodInfo = DISCOVER_MOODS.find(item => item.id === mood);
  return <div className="pilot-discover">
    <header className="pilot-discover-intro"><div><p className="pilot-kicker">Découvrir / Au-delà de vos habitudes</p><h1>Suivez votre<br /><em>fréquence.</em></h1></div><p>Un morceau vous arrête.<br />Une voix vous accompagne.<br />La suite reste à découvrir.</p></header>
    {selection.isPending ? <p className="pilot-state" role="status">À la recherche de votre prochaine écoute…</p> : selection.isError ? <div role="alert" className="pilot-state">La sélection n’a pas pu être chargée.<button onClick={() => void selection.refetch()}>Réessayer</button></div> : !lead ? <p className="pilot-state">La sélection se prépare. Explorez les ambiances ci-dessous.</p> : <div className="pilot-discover-opening">
      <section className="pilot-discover-feature"><p className="pilot-kicker">01 / Premier contact</p><DiscoverRecord track={lead} queue={tracks} large /><p className="pilot-feature-note">La bonne rencontre commence parfois par un son.</p></section>
      {featuredArtist && <section className="pilot-artist-story"><p className="pilot-kicker">Derrière le morceau</p><button className="pilot-artist-portrait" onClick={event => profile(featuredArtist.username, event.currentTarget)} aria-label={`Découvrir ${featuredArtist.name}`}><PilotImage src={featuredArtist.avatar || featuredArtist.leadTrack.coverUrl || '/default-cover.svg'} alt="" /></button><div><h2>{featuredArtist.name}</h2><p>{featuredArtist.bio || 'Entrez dans son univers. Découvrez les morceaux et la personne qui leur donne vie.'}</p><button className="pilot-text-link" data-context-surface-trigger-key={`pilot-discover-artist-${featuredArtist._id}`} onClick={event => profile(featuredArtist.username, event.currentTarget)}>Rencontrer l’artiste <ArrowUpRight size={17} /></button></div></section>}
    </div>}
    <section className="pilot-moods" aria-labelledby="pilot-moods-heading"><header><p className="pilot-kicker">02 / À l’intérieur</p><h2 id="pilot-moods-heading">Comment sonne<br />votre instant ?</h2></header><div className="pilot-mood-list">{DISCOVER_MOODS.map((item, index) => <button key={item.id} aria-pressed={mood === item.id} onClick={() => setMood(item.id)}><span className="pilot-mood-index">0{index + 1}</span><span>{item.label}<small>{item.promise}</small></span><ArrowUpRight size={19} /></button>)}</div>
      {moodInfo && <div className="pilot-mood-results"><button className="pilot-text-link" onClick={() => setMood(null)}><ArrowLeft size={17} />Fermer l’ambiance</button><h3>{moodInfo.label}</h3>{moodQuery.isPending ? <p role="status">Recherche des morceaux…</p> : moodQuery.isError ? <p role="alert">Impossible de charger cette ambiance. <button onClick={() => void moodQuery.refetch()}>Réessayer</button></p> : !moodQuery.data?.tracks.length ? <p>Pas encore de morceaux dans cette ambiance. Essayez une autre fréquence.</p> : <div className="pilot-mood-tracks">{moodQuery.data.tracks.map((track, index) => <DiscoverRecord key={track._id} track={track} queue={moodQuery.data!.tracks} number={index + 1} />)}</div>}</div>}
    </section>
    <section className="pilot-radar" aria-labelledby="pilot-radar-heading"><div className="pilot-radar-title"><p className="pilot-kicker">03 / Avant le bruit</p><h2 id="pilot-radar-heading">Encore discrets.<br /><em>Déjà singuliers.</em></h2><p>Des morceaux repérés par le Radar Synaura. Prenez une longueur d’écoute.</p><PilotLink className="pilot-text-link" href="/radar">Tout le Radar <ArrowUpRight size={17} /></PilotLink></div><div className="pilot-radar-records">{radar.isError ? <p role="alert">Radar indisponible. <button onClick={() => void radar.refetch()}>Réessayer</button></p> : radar.isPending ? <p role="status">Le Radar se prépare…</p> : radar.data?.tracks.slice(0, 5).map((track, index) => <DiscoverRecord key={track._id} track={track} queue={radar.data!.tracks} number={index + 1} />)}</div></section>
    {!!collections.data?.collections.length && <section className="pilot-collections"><p className="pilot-kicker">Des mondes à habiter</p>{collections.data.collections.filter(item => item.trackCount > 0).slice(0, 3).map(collection => <PilotLink key={collection.id} href={collection.publicUrl || `/playlists/${collection.slug || collection.playlistId}`}><PilotImage src={collection.bannerUrl || collection.coverUrl || '/default-cover.svg'} alt="" loading="lazy" /><div><span>{collection.trackCount} morceaux</span><h2>{collection.title}</h2><p>{collection.subtitle}</p></div><ArrowUpRight /></PilotLink>)}</section>}
    <section className="pilot-new-releases"><header><p className="pilot-kicker">04 / Tout juste arrivés</p><h2>Le prochain chapitre.</h2></header><div className="pilot-release-grid">{newest.isError ? <p role="alert">Nouveautés indisponibles. <button onClick={() => void newest.refetch()}>Réessayer</button></p> : newest.data?.tracks.slice(0, 6).map(track => <DiscoverRecord key={track._id} track={track} queue={newest.data!.tracks} />)}</div></section>
    <section className="pilot-community"><p className="pilot-kicker">La musique ne s’arrête pas aux morceaux.</p><h2>Et si on<br /><em>se rencontrait ?</em></h2><div>{COMMUNITY_CLUBS.map(club => <PilotLink key={club.slug} href={`/community/${club.slug}`}><span>{club.name}<small>{club.promise}</small></span><ArrowUpRight size={20} /></PilotLink>)}</div><PilotLink className="pilot-text-link" href="/city">Les événements de Synaura City <ArrowUpRight size={17} /></PilotLink></section>
    <footer className="pilot-discover-footer"><span>SYNAURA / LE SON NOUS RAPPROCHE.</span><PilotLink href="/live">Revenir dans Live <ArrowUpRight size={17} /></PilotLink></footer>
  </div>;
}
