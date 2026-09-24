'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { coordinateSecondaryAudioElement } from '@/lib/audio/AudioCore';
import { toPublicMediaUrl } from '@/lib/mediaUrls';
import { pauseOtherVoiceMessages } from '@/lib/messagingClient';

const clock = (n: number) => `${Math.floor((n || 0) / 60)}:${String(Math.floor((n || 0) % 60)).padStart(2, '0')}`;
export default function VoiceMessage({ src, duration, own, accent }: { src: string; duration: number; own: boolean; accent: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(duration || 0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = audio.current; if (!element) return;
    const exclusive = () => pauseOtherVoiceMessages(element);
    element.addEventListener('play', exclusive);
    const release = coordinateSecondaryAudioElement(element, 'voice-message');
    return () => { element.pause(); element.removeEventListener('play', exclusive); release(); };
  }, [src]);
  return <div className="ms-voice-message" data-own={own} style={own ? { backgroundColor: accent } : undefined}>
    <audio ref={audio} data-synaura-voice="message" data-synaura-audio-policy="independent" src={toPublicMediaUrl(src) || undefined} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0); }} onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onDurationChange={e => { if (Number.isFinite(e.currentTarget.duration)) setLength(e.currentTarget.duration); }} onError={() => { setPlaying(false); setError(true); }} />
    <button aria-label={playing ? 'Mettre le vocal en pause' : 'Écouter le vocal'} onClick={async () => { if (!audio.current) return; setError(false); if (playing) audio.current.pause(); else try { await audio.current.play(); } catch { setError(true); } }}>{playing ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}</button>
    <div><input type="range" aria-label="Position dans le message vocal" min={0} max={length || 1} step={.1} value={Math.min(time, length || 1)} disabled={!length} onChange={e => { if (audio.current) audio.current.currentTime = Number(e.target.value); }} /><small>{error ? 'Lecture impossible · réessaie' : `${clock(time)} / ${clock(length)}`}</small></div>
    <button className="ms-voice-speed" aria-label={`Vitesse du vocal : ${speed} fois`} onClick={() => { const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; setSpeed(next); if (audio.current) audio.current.playbackRate = next; }}>{speed}×</button>
  </div>;
}
