'use client';

import { useRef, useState, useEffect } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';
import TrackCover from '@/components/TrackCover';

export default function SharedSoundCard({ id, title, artist, cover, onOpen }: { id: string; title: string; artist: string; cover: string; onOpen: (path: string) => void }) {
  const { audioState, playTrack, play, pause } = useAudioPlayer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), [id]);
  const active = audioState.tracks[audioState.currentTrackIndex]?._id === id;
  const start = async () => {
    if (busy) return;
    if (active) { if (audioState.isPlaying) pause(); else void play(); return; }
    const request = new AbortController(); requestRef.current = request; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(id)}`, { signal: request.signal });
      const track = await response.json();
      if (!response.ok || !track.audioUrl) throw new Error('Ce morceau n’est plus disponible.');
      if (!request.signal.aborted) await playTrack(track);
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : 'Lecture impossible'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  };
  return <div><div className="ms-shared-sound"><button onClick={() => onOpen(`/track/${encodeURIComponent(id)}`)} aria-label={`Voir ${title}`}><TrackCover src={cover} title={title} size={55} animationEnabled={false} /><span><strong>{title}</strong><small>{artist}</small><small>SON SYNAURA</small></span></button><button className="ms-circle" disabled={busy} aria-label={active && audioState.isPlaying ? `Mettre ${title} en pause` : `Écouter ${title}`} onClick={() => void start()}>{busy ? <Loader2 className="animate-spin" size={18} /> : active && audioState.isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button></div>{error && <p className="ms-error" role="alert">{error}</p>}</div>;
}
