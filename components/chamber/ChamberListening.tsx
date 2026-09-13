'use client';

import { memo, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from '@/components/navigation/HandoffLink';
import { ArrowLeft, ArrowRight, ArrowUpRight, Headphones, ListMusic, Loader2, MessageCircle, MoreHorizontal, Pause, Play, RefreshCw, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { useProfilePeek } from '@/components/profile/useProfilePeek';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import { useTrackActions } from '@/components/actions/useTrackActions';
import { applyCdnToTracks } from '@/lib/cdn';
import { chamberTime, normalizeChamberCatalog, type ChamberTrack } from '@/lib/chamberCatalog';

const FALLBACK_COVER = '/brand/chambre/membrane-cobalt.png';

function ListeningTransport() {
  const player = useAudioPlayer();
  const time = useAudioTime();
  const actions = useTrackActions('other');
  const track = player.audioState.tracks[player.audioState.currentTrackIndex];
  const duration = time.duration || track?.duration || 0;
  if (!track) return <div className="cp-transport cp-transport-idle"><Headphones size={18} /><p>Choisissez un morceau.<span>La lecture commence uniquement avec Play.</span></p><span className="cp-transport-stamp">SYNAURA / LISTENING ROOM</span></div>;
  return <div className="cp-transport" aria-label="Lecteur Synaura" data-chamber-transport data-current-track-id={track._id} data-playing={player.audioState.isPlaying}>
    <Link href={`/track/${encodeURIComponent(track._id)}`} className="cp-transport-track"><SynauraImage src={track.coverUrl} fallbackSrc={FALLBACK_COVER} alt="" /><span><b>{track.title}</b><small>{track.artist.name}</small></span></Link>
    <div className="cp-transport-center"><div className="cp-transport-buttons"><button type="button" onClick={player.previousTrack} aria-label="Morceau précédent"><SkipBack size={17} /></button><button type="button" className="cp-transport-play" onClick={() => player.audioState.isPlaying ? player.pause() : void player.play().catch(() => {})} aria-label={player.audioState.isPlaying ? 'Mettre la musique en pause' : 'Reprendre la musique'}>{player.audioState.isLoading ? <Loader2 size={18} className="cp-spin" /> : player.audioState.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button type="button" onClick={player.nextTrack} aria-label="Morceau suivant"><SkipForward size={17} /></button></div><div className="cp-seek"><span>{chamberTime(time.currentTime)}</span><input type="range" min="0" max={Math.max(1, duration)} step="1" value={Math.min(time.currentTime, Math.max(1, duration))} disabled={!duration} aria-label="Position dans le morceau" aria-valuetext={`${chamberTime(time.currentTime)} sur ${chamberTime(duration)}`} onChange={event => player.seek(Number(event.target.value))} /><span>{chamberTime(duration)}</span></div></div>
    <div className="cp-transport-tools"><label className="cp-volume"><Volume2 size={16} /><input type="range" min="0" max="1" step="0.05" value={player.audioState.volume} aria-label="Volume" onChange={event => player.setVolume(Number(event.target.value))} /></label><button type="button" className="cp-transport-queue" onClick={event => actions.open(track, 'queue', event.currentTarget)} aria-label="Ouvrir la file de lecture"><ListMusic size={19} /></button><button type="button" onClick={event => actions.open(track, 'track-options', event.currentTarget)} aria-label="Options du morceau en lecture"><MoreHorizontal size={19} /></button></div>
    {player.audioState.error ? <p className="cp-audio-error" role="alert">{player.audioState.error}</p> : null}
  </div>;
}

function ChamberListening({ enabled, paused, onMotionToggle }: { enabled: boolean; paused: boolean; onMotionToggle: () => void }) {
  const { data: session, status: sessionStatus } = useSession();
  const player = useAudioPlayer();
  const openProfile = useProfilePeek('other');
  const openComments = useCommentsSurface('other');
  const actions = useTrackActions('other');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('Tout');
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['chamber-public-feed', session?.user?.id || 'guest', 'fresh', 18],
    enabled: enabled && sessionStatus !== 'loading',
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/ranking/feed?limit=18&ai=1&strategy=fresh', { signal });
      if (!response.ok) throw new Error('Le catalogue est momentanément indisponible.');
      return applyCdnToTracks(normalizeChamberCatalog(await response.json()));
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const catalog = useMemo(() => query.data || [], [query.data]);
  const genres = useMemo(() => Array.from(new Set(catalog.flatMap(track => track.genre || []))).slice(0, 4), [catalog]);
  const tracks = useMemo(() => filter === 'Tout' ? catalog : catalog.filter(track => track.genre?.includes(filter)), [catalog, filter]);
  const featured = tracks.find(track => track._id === selectedId) || tracks[0];
  const selectedIndex = featured ? tracks.findIndex(track => track._id === featured._id) : -1;
  const current = player.audioState.tracks[player.audioState.currentTrackIndex];
  const featuredPlaying = Boolean(featured && current?._id === featured._id && player.audioState.isPlaying);

  const playSelection = async (track: ChamberTrack) => {
    if (!track.audioUrl) { setNotice('Aucune source audio disponible pour ce morceau.'); return; }
    setNotice('');
    setSelectedId(track._id);
    if (current?._id === track._id) {
      if (player.audioState.isPlaying) player.pause();
      else await player.play().catch(() => setNotice('La lecture n’a pas démarré. Vous pouvez réessayer.'));
      return;
    }
    // The only queue replacement in this view belongs to an explicit Play action.
    const playable = tracks.filter(item => item.audioUrl);
    player.setQueueAndPlay(playable, Math.max(0, playable.findIndex(item => item._id === track._id)));
  };

  const inspectNeighbour = (step: number) => {
    const next = tracks[(selectedIndex + step + tracks.length) % tracks.length];
    if (next) setSelectedId(next._id); // Browsing never changes music or its queue.
  };
  const commentEntity = (track: ChamberTrack) => ({ type: 'track' as const, id: track._id, title: track.title, artist: track.artist.name, creatorId: track.artist._id, audioUrl: track.audioUrl, coverUrl: track.coverUrl, duration: track.duration, count: track.commentsCount });

  return <div className="cp-listening">
    <div className="cp-listening-heading"><div><p className="cp-eyebrow"><span /> VOTRE ESPACE D’ÉCOUTE</p><h2>Trouvez votre<br /><em>fréquence.</em></h2></div><p>Des morceaux. Des personnes.<br />Quelque chose qui reste.</p><button type="button" className="cp-motion-small" aria-pressed={paused} onClick={onMotionToggle} aria-label={paused ? 'Reprendre le mouvement du décor' : 'Arrêter le mouvement du décor'}>{paused ? <Play size={13} /> : <Pause size={13} />} Décor</button></div>
    <div className="cp-selection-bar"><span><span className="cp-blue-light" /> À DÉCOUVRIR</span><div className="cp-genre-filters" role="group" aria-label="Filtrer les morceaux par genre">{['Tout', ...genres].map(genre => <button type="button" key={genre} aria-pressed={filter === genre} onClick={() => setFilter(genre)}>{genre}</button>)}</div><Link href="/discover">Tout explorer <ArrowUpRight size={14} /></Link></div>

    {!enabled || query.isPending ? <div className="cp-loading" role="status"><div className="cp-cover-skeleton" /><div><span className="cp-blue-light" /><h3>La musique approche.</h3><p>Chargement du catalogue Synaura…</p></div></div> : query.isError ? <div className="cp-catalog-state" role="alert"><h3>Un instant de silence.</h3><p>{query.error.message}</p><button type="button" className="cp-button" onClick={() => void query.refetch()}><RefreshCw size={15} /> Réessayer</button></div> : !featured ? <div className="cp-catalog-state"><h3>Aucun morceau dans cette sélection.</h3><p>Essayez un autre genre ou revenez un peu plus tard.</p><button type="button" className="cp-button" onClick={() => setFilter('Tout')}>Voir tous les morceaux</button></div> : <div className="cp-music-grid">
      <article className="cp-featured" aria-label={`À découvrir : ${featured.title}`} data-featured-track-id={featured._id}>
        <div className="cp-featured-art"><div className="cp-art-halo" /><SynauraImage key={featured.coverUrl || featured._id} className="cp-cover" src={featured.coverUrl} fallbackSrc={FALLBACK_COVER} alt={`Pochette de ${featured.title}`} /><span className="cp-art-edition">SYNAURA / {String(selectedIndex + 1).padStart(2, '0')}</span><button type="button" className="cp-art-play" disabled={!featured.audioUrl} onClick={() => void playSelection(featured)} aria-label={`${featuredPlaying ? 'Mettre en pause' : 'Écouter'} ${featured.title}`}>{featuredPlaying ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}</button><div className="cp-art-caption"><span>{featured.isAI ? 'CRÉATION IA' : 'MORCEAU'}</span><span>{chamberTime(featured.duration)}</span></div></div>
        <div className="cp-featured-meta"><div className="cp-featured-kicker"><span>{featuredPlaying ? <><span className="cp-blue-light" /> EN ÉCOUTE</> : 'CHOISISSEZ CE QUI VOUS TRAVERSE'}</span><div className="cp-browse-arrows"><button type="button" disabled={tracks.length < 2} aria-label="Découvrir la pochette précédente sans lancer de lecture" onClick={() => inspectNeighbour(-1)}><ArrowLeft size={16} /></button><button type="button" disabled={tracks.length < 2} aria-label="Découvrir la pochette suivante sans lancer de lecture" onClick={() => inspectNeighbour(1)}><ArrowRight size={16} /></button></div></div><h3><Link href={`/track/${encodeURIComponent(featured._id)}`}>{featured.title}</Link></h3><button type="button" className="cp-artist" disabled={!featured.artist.username} onClick={event => openProfile(featured.artist.username, event.currentTarget)} data-context-surface-trigger-key={`chamber-profile-${featured._id}`}><SynauraImage src={featured.artist.avatar} fallbackSrc="/default-avatar.png" alt="" /><span>{featured.artist.name}</span><ArrowUpRight size={13} /></button></div>
        <div className="cp-featured-actions"><button type="button" onClick={event => openComments(commentEntity(featured), event.currentTarget)} data-context-surface-trigger-key={`chamber-comments-${featured._id}`}><MessageCircle size={16} /> Commentaires <span>{featured.commentsCount}</span></button><button type="button" onClick={event => actions.open(featured, 'playlist-picker', event.currentTarget)}><ListMusic size={17} /> Playlist</button><button type="button" onClick={event => actions.share(featured, event.currentTarget)} aria-label={`Partager ${featured.title}`}><ArrowUpRight size={18} /></button><button type="button" onClick={event => actions.open(featured, 'track-options', event.currentTarget)} aria-label={`Options de ${featured.title}`}><MoreHorizontal size={19} /></button></div>
      </article>

      <div className="cp-catalog"><div className="cp-catalog-heading"><p>Continuez l’exploration.</p><span>{String(tracks.length).padStart(2, '0')} MORCEAUX</span></div><ol aria-label="Morceaux Synaura">{tracks.map((track, index) => {
        const isPlaying = current?._id === track._id && player.audioState.isPlaying;
        return <li key={track._id} className={`cp-track-row ${featured._id === track._id ? 'cp-track-selected' : ''}`} data-catalog-track-id={track._id}>
          <button type="button" className="cp-row-play" disabled={!track.audioUrl} onClick={() => void playSelection(track)} aria-label={`${isPlaying ? 'Mettre en pause' : 'Écouter'} ${track.title}`}><span className="cp-row-number">{isPlaying ? <span className="cp-playing-bars" aria-hidden="true"><i /><i /><i /></span> : String(index + 1).padStart(2, '0')}</span><span className="cp-row-play-symbol">{isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</span></button>
          <button type="button" className="cp-row-track" aria-label={`Afficher ${track.title} sans lancer de lecture`} aria-pressed={featured._id === track._id} onClick={() => setSelectedId(track._id)}><SynauraImage src={track.coverUrl} fallbackSrc={FALLBACK_COVER} alt="" loading="lazy" /><span><b>{track.title}</b><small>{track.artist.name}</small></span></button><span className="cp-row-time">{chamberTime(track.duration)}</span><button type="button" className="cp-row-options" onClick={event => actions.open(track, 'track-options', event.currentTarget)} aria-label={`Options de ${track.title}`}><MoreHorizontal size={17} /></button>
        </li>;
      })}</ol><Link href="/live" className="cp-live-link">Entrer dans Live <ArrowUpRight size={17} /></Link></div>
    </div>}
    <div className="cp-listening-bottom"><span>LA MUSIQUE NE S’ARRÊTE PAS AUX MORCEAUX.</span><nav aria-label="Continuer dans Synaura"><Link href="/create">Créer <ArrowUpRight size={13} /></Link><Link href="/community">Rencontrer <ArrowUpRight size={13} /></Link><Link href="/library">Retrouver <ArrowUpRight size={13} /></Link></nav></div>
    <div role="status" className="cp-notice">{notice}</div>
    <ListeningTransport />
  </div>;
}

export default memo(ChamberListening);
