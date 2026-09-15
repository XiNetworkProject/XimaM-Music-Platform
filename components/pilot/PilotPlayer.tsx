'use client';
import { Pause, Play, ListMusic, SkipForward } from 'lucide-react';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import { useTrackActions } from '@/components/actions/useTrackActions';
import PilotLink from './PilotLink';
import PilotImage from './PilotImage';

export default function PilotPlayer() {
  const { audioState, play, pause, nextTrack, seek } = useAudioPlayer();
  const time = useAudioTime();
  const actions = useTrackActions('discover');
  const track = audioState.tracks[audioState.currentTrackIndex];
  if (!track) return null;
  return <aside className="pilot-player" aria-label="Lecture en cours" data-pilot-audio-id={track._id}>
    <PilotImage src={track.coverUrl || '/default-cover.svg'} alt="" width={46} height={46} />
    <PilotLink href={`/track/${encodeURIComponent(track._id)}`} className="pilot-player-title"><strong>{track.title}</strong><span>{track.artist.name}</span></PilotLink>
    <button onClick={() => audioState.isPlaying ? pause() : void play()} aria-label={audioState.isPlaying ? 'Mettre en pause' : 'Reprendre la lecture'}>{audioState.isPlaying ? <Pause /> : <Play />}</button>
    <button onClick={() => nextTrack()} aria-label="Morceau suivant"><SkipForward /></button>
    <label className="pilot-player-progress"><span className="sr-only">Position de lecture</span><input type="range" min="0" max={audioState.duration || track.duration || 1} step="1" value={time.currentTime || 0} onChange={event => seek(Number(event.target.value))} /></label>
    <button onClick={event => actions.open(track, 'queue', event.currentTarget)} aria-label="File de lecture"><ListMusic /></button>
  </aside>;
}
