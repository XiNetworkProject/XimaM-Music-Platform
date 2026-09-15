'use client';
import { useEffect, useId, useRef, type ComponentProps } from 'react';
import { MessageCircle } from 'lucide-react';
import type Waveform from '@/components/player/Waveform';

type Props = ComponentProps<typeof Waveform> & { canSeek: boolean };
const time = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

/** New ink-like signal, on real peaks. Only explicit range/marker gestures seek. */
export default function PilotWaveform({ peaks, duration, loading, getAudioElement, onSeek, markers = [], onMarkerSeek, reactionClusters = [], canSeek }: Props) {
  const id = useId().replace(/:/g, '');
  const clip = useRef<SVGRectElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const current = getAudioElement()?.currentTime || 0;
      clip.current?.setAttribute('width', String(duration > 0 ? Math.min(1000, current / duration * 1000) : 0));
      if (slider.current && document.activeElement !== slider.current) slider.current.value = String(current);
      if (clock.current) clock.current.textContent = time(current);
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [duration, getAudioElement]);
  const samples = peaks?.length ? peaks.filter((_, index) => index % Math.max(1, Math.floor(peaks.length / 160)) === 0) : [];
  const path = samples.map((value, index) => {
    const x = index / Math.max(1, samples.length - 1) * 1000;
    const height = Math.max(1, Math.min(1, Math.abs(value)) * 25);
    return `M${x.toFixed(2)} ${(30 - height).toFixed(2)}V${(30 + height).toFixed(2)}`;
  }).join(' ');
  return <div className="pilot-signal">
    <div className="pilot-signal-line">
      <svg aria-hidden="true" viewBox="0 0 1000 60" preserveAspectRatio="none"><defs><clipPath id={id}><rect ref={clip} width="0" height="60" /></clipPath></defs><path d="M0 30H1000" stroke="#465874" strokeWidth=".8" /><path d={path} stroke="#667792" strokeWidth="2" strokeLinecap="round" /><path d={path} stroke="#d0ddff" strokeWidth="2" strokeLinecap="round" clipPath={`url(#${id})`} /></svg>
      <input ref={slider} aria-label="Position dans le morceau" type="range" min="0" max={duration || 1} step="1" defaultValue="0" disabled={!canSeek || !duration} onChange={event => onSeek(Number(event.target.value))} />
      {loading && !samples.length && <span className="pilot-signal-loading">Analyse du son…</span>}
    </div>
    <div className="pilot-signal-times"><span ref={clock}>0:00</span><span>{time(duration)}</span></div>
    {!!(markers.length || reactionClusters.length) && <div className="pilot-signal-social" aria-label="Moments musicaux">
      {markers.slice(0, 4).map(marker => <button key={marker.id} title={marker.content} aria-label={`Commentaire à ${time(marker.timestampSeconds)} par ${marker.user.name}`} onClick={() => { if (canSeek) onSeek(marker.timestampSeconds); onMarkerSeek?.(marker); }}><MessageCircle size={13} />{time(marker.timestampSeconds)}</button>)}
      {reactionClusters.slice(0, 3).map((cluster, index) => <button key={index} disabled={!canSeek} aria-label={`${cluster.total} réactions à ${time(cluster.timestampSeconds)}`} onClick={() => onSeek(cluster.timestampSeconds)}><span aria-hidden="true">♪</span>{time(cluster.timestampSeconds)} <small>×{cluster.total}</small></button>)}
    </div>}
  </div>;
}
