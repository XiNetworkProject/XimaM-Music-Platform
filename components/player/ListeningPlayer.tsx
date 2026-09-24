'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import Link from '@/components/navigation/HandoffLink';
import { ArrowUpRight, ChevronDown, Expand, ListMusic, Loader2, Mic2, MoreHorizontal, Pause, Play, Repeat, Repeat1, Share2, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { useTrackActions } from '@/components/actions/useTrackActions';
import TrackCover from '@/components/TrackCover';
import LikeButton from '@/components/LikeButton';
import './listening-player.css';

const clock = (value: number) => {
  const seconds = Math.floor(Number.isFinite(value) ? Math.max(0, value) : 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
const nameOf = (track: any) => typeof track.artist === 'string' ? track.artist : track.artist?.name || track.artist?.username || 'Synaura';
const isPrivate = (track: any) => /^(ai-|gen-|radio-)/.test(track._id) || track.isAI;
const likesCount = (value: unknown) => Array.isArray(value) ? value.length : Number(value) || 0;

function PlayingBars() {
  return <span className="lp-playing-bars" aria-hidden="true"><i /><i /><i /><i /></span>;
}

function Position({ compact = false }: { compact?: boolean }) {
  const { audioState, seek } = useAudioPlayer();
  const { currentTime, duration } = useAudioTime();
  const total = duration || audioState.duration || 0;
  const current = Math.min(total, Math.max(0, currentTime || 0));
  return <div className={`lp-position ${compact ? 'lp-position--compact' : ''}`}>
    <span>{clock(current)}</span>
    <input type="range" aria-label="Position dans le morceau" aria-valuetext={`${clock(current)} sur ${clock(total)}`} min={0} max={total || 1} step={.1} disabled={!total} value={current} onChange={event => seek(Number(event.target.value))} style={{ '--lp-progress': `${total ? current / total * 100 : 0}%` } as CSSProperties} />
    <span>{clock(total)}</span>
  </div>;
}

function Transport({ large = false }: { large?: boolean }) {
  const { audioState, play, pause, nextTrack, previousTrack, toggleShuffle, cycleRepeat } = useAudioPlayer();
  return <div className={`lp-transport ${large ? 'lp-transport--large' : ''}`}>
    {large && <button className="lp-icon lp-mode-control" aria-label="Lecture aléatoire" aria-pressed={audioState.shuffle} onClick={toggleShuffle}><Shuffle size={19} /></button>}
    <button className="lp-icon lp-previous" aria-label="Morceau précédent" onClick={previousTrack}><SkipBack size={large ? 25 : 19} fill="currentColor" /></button>
    <button className="lp-play" aria-label={audioState.isPlaying ? 'Mettre en pause' : 'Reprendre la lecture'} onClick={() => audioState.isPlaying ? pause() : void play()} disabled={audioState.isLoading}>{audioState.isLoading ? <Loader2 className="lp-spinner" size={large ? 28 : 20} /> : audioState.isPlaying ? <Pause size={large ? 28 : 20} fill="currentColor" /> : <Play size={large ? 28 : 20} fill="currentColor" />}</button>
    <button className="lp-icon lp-next" aria-label="Morceau suivant" onClick={nextTrack}><SkipForward size={large ? 25 : 19} fill="currentColor" /></button>
    {large && <button className="lp-icon lp-mode-control" aria-label={`Répétition : ${audioState.repeat === 'one' ? 'ce morceau' : audioState.repeat === 'all' ? 'la file' : 'désactivée'}`} aria-pressed={audioState.repeat !== 'none'} onClick={cycleRepeat}>{audioState.repeat === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}</button>}
  </div>;
}

export function PlayerDock({ onOpen, onQueue, extraActions }: { onOpen: () => void; onQueue: () => void; extraActions?: ReactNode }) {
  const { audioState, setVolume, toggleMute, play } = useAudioPlayer();
  const living = useLivingMotion();
  const current = audioState.tracks[audioState.currentTrackIndex];
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  useEffect(() => { if (menuRef.current) menuRef.current.open = false; }, [current?._id]);
  if (!current) return null;
  return <aside className="listening-dock" aria-label="Lecture en cours" data-playing={audioState.isPlaying} data-motion={living.enabled} data-pilot-audio-id={current._id}>
    <div className="lp-dock-glow" aria-hidden="true" />
    <div className="lp-dock-main">
      <button className="lp-now" onClick={onOpen} aria-label={`Ouvrir le lecteur : ${current.title}`}>
        <span className="lp-dock-cover"><TrackCover trackId={current._id} src={current.coverUrl} videoSrc={current.coverVideoUrl} title={current.title} autoPlayVideo={audioState.isPlaying} className="h-full w-full" rounded="rounded-xl" /><span className="lp-cover-expand"><Expand size={18} /></span></span>
        <span className="lp-now-copy"><strong>{current.title}</strong><span>{nameOf(current)}</span></span>
        <PlayingBars />
      </button>
      <div className="lp-dock-center"><Transport /><Position compact /></div>
      <div className="lp-dock-actions">
        {!isPrivate(current) && <span className="lp-dock-like"><LikeButton trackId={current._id} initialIsLiked={current.isLiked} initialLikesCount={likesCount(current.likes)} showCount={false} variant="minimal" /></span>}
        <div className="lp-volume"><button className="lp-icon" aria-label={audioState.isMuted ? 'Activer le son' : 'Couper le son'} onClick={toggleMute}>{audioState.isMuted || !audioState.volume ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" aria-label="Volume" min={0} max={1} step={.01} value={audioState.isMuted ? 0 : audioState.volume} onChange={event => setVolume(Number(event.target.value))} /></div>
        <button className="lp-icon" onClick={onQueue} aria-label="File de lecture"><ListMusic size={21} /></button>
        {extraActions && <details ref={menuRef} className="lp-more" onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary aria-label="Toutes les actions du lecteur"><MoreHorizontal size={21} /></summary><div className="lp-more-menu" onClickCapture={event => { if ((event.target as Element).closest('button,a') && menuRef.current) menuRef.current.open = false; }}>{extraActions}</div></details>}
      </div>
    </div>
    {audioState.error && <div className="lp-error" role="status"><span>La lecture a été interrompue.</span><button onClick={() => void play()}>Réessayer</button></div>}
  </aside>;
}

/** A view of the current AudioCore session. Opening it never builds a new queue. */
export function ListeningRoom({ open, onClose, onQueue }: { open: boolean; onClose: () => void; onQueue: () => void }) {
  const { audioState, playTrack, setVolume, toggleMute } = useAudioPlayer();
  const actions = useTrackActions();
  const living = useLivingMotion();
  const closeButton = useRef<HTMLButtonElement>(null);
  const track = audioState.tracks[audioState.currentTrackIndex];
  const next = audioState.tracks.slice(audioState.currentTrackIndex + 1, audioState.currentTrackIndex + 4);
  if (!track) return null;
  const openSurface = (surface: 'lyrics' | 'track-options') => { onClose(); actions.open(track, surface); };
  return <SynauraOverlay open={open} onClose={onClose} ariaLabel={`Lecture : ${track.title}`} initialFocusRef={closeButton} showClose={false} size="full" presentation="modal" className="listening-room-overlay">
    <div className="listening-room" data-playing={audioState.isPlaying} data-motion={living.enabled}>
      <div className="lr-atmosphere" aria-hidden="true"><TrackCover src={track.coverUrl} title={track.title} animationEnabled={false} className="lr-backdrop-cover" /><div className="lr-halo lr-halo-one" /><div className="lr-halo lr-halo-two" /><div className="lr-orbit" /></div>
      <header className="lr-header"><button ref={closeButton} className="lp-icon" aria-label="Réduire le lecteur" onClick={onClose}><ChevronDown size={25} /></button><span><img src="/brand/v2/reference-symbol.svg" alt="" />La chambre sonore</span><button className="lp-icon" aria-label="Options du morceau" onClick={() => openSurface('track-options')}><MoreHorizontal size={24} /></button></header>
      <div className="lr-stage">
        <div className="lr-artwork"><div className="lr-artwork-halo" /><div className="lr-artwork-frame" key={track._id}><TrackCover trackId={track._id} src={track.coverUrl} videoSrc={track.coverVideoUrl} title={track.title} alt={`Pochette de ${track.title}`} autoPlayVideo={audioState.isPlaying} className="h-full w-full" rounded="rounded-[24px]" /></div><span className="lr-under-art"><PlayingBars /><span>{audioState.isPlaying ? 'Le son nous rapproche.' : 'À votre rythme.'}</span></span></div>
        <section className="lr-song" aria-label="Commandes de lecture">
          <div className="lr-kicker"><i />{isPrivate(track) ? 'VOTRE CRÉATION' : 'EN ÉCOUTE'}</div>
          <div className="lr-title-row"><h1 key={track._id}>{track.title}</h1>{!isPrivate(track) && <LikeButton trackId={track._id} initialIsLiked={track.isLiked} initialLikesCount={likesCount(track.likes)} size="lg" variant="minimal" showCount={false} />}</div>
          {track.artist?.username ? <Link className="lr-artist" href={`/profile/${encodeURIComponent(track.artist.username)}`} onClick={onClose}>{nameOf(track)}<ArrowUpRight size={17} /></Link> : <p className="lr-artist">{nameOf(track)}</p>}
          <Position /><Transport large />
          <div className="lr-tools"><button onClick={() => openSurface('lyrics')}><Mic2 size={19} /><span>Paroles</span></button><button onClick={() => { onClose(); onQueue(); }}><ListMusic size={19} /><span>À suivre</span></button><button onClick={() => { onClose(); void actions.share(track); }}><Share2 size={18} /><span>Partager</span></button><div className="lp-volume"><button className="lp-icon" aria-label={audioState.isMuted ? 'Activer le son' : 'Couper le son'} onClick={toggleMute}>{audioState.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input type="range" aria-label="Volume" min={0} max={1} step={.01} value={audioState.isMuted ? 0 : audioState.volume} onChange={event => setVolume(Number(event.target.value))} /></div></div>
          {!!next.length && <div className="lr-up-next"><div><span>LA SUITE DU VOYAGE</span><button onClick={() => { onClose(); onQueue(); }}>Voir la file <ArrowUpRight size={14} /></button></div>{next.map(item => <button key={item._id} className="lr-next-song" onClick={() => void playTrack(item._id)}><TrackCover src={item.coverUrl} title={item.title} animationEnabled={false} className="lr-next-cover" /><span><strong>{item.title}</strong><small>{nameOf(item)}</small></span><Play size={16} /></button>)}</div>}
        </section>
      </div>
    </div>
  </SynauraOverlay>;
}
