'use client';
import { memo, useEffect, useMemo, useRef } from 'react';
import { getBrowserAudioCore } from '@/lib/audio/AudioCore';
import { downsamplePeaks } from '@/lib/waveform';
import { momentTime, type MusicalCluster } from '@/lib/commentsModel';

export default memo(function MusicalWaveform({ trackId, peaks, duration, loading, clusters, selected, onSelect, onSeek }: {
  trackId: string; peaks: number[] | null; duration: number; loading: boolean;
  clusters: MusicalCluster[]; selected: string | null; onSelect: (cluster: MusicalCluster) => void; onSeek: (time: number) => void;
}) {
  const range = useRef<HTMLInputElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const bars = useMemo(() => downsamplePeaks(peaks || [], 90), [peaks]);
  useEffect(() => {
    const core = getBrowserAudioCore();
    const update = () => {
      const active = core?.getSnapshot().currentTrack?._id === trackId;
      const time = active ? core?.getTimeSnapshot().currentTime || 0 : 0;
      if (range.current) { range.current.value = String(time); range.current.setAttribute('aria-valuetext', momentTime(time)); range.current.disabled = !active || !duration; }
      if (clock.current) clock.current.textContent = momentTime(time);
      if (playhead.current) playhead.current.style.left = `${Math.max(0, Math.min(100, time / (duration || 1) * 100))}%`;
    };
    update();
    const offTime = core?.subscribeTime(update); const offState = core?.subscribe(update);
    return () => { offTime?.(); offState?.(); };
  }, [trackId, duration]);
  return <div data-musical-waveform className="py-2">
    <div className="relative h-12">
      <div aria-hidden="true" className="absolute inset-0 flex items-center gap-[2px] overflow-hidden rounded-md bg-[var(--syn-soft)] px-1">
        {bars.length ? bars.map((v, i) => <span key={i} className="min-w-0 flex-1 rounded-sm bg-[var(--syn-accent)] opacity-60" style={{ height: `${Math.max(3, Math.min(100, v * 100))}%` }} />) : <span className="w-full text-center text-[11px] text-[var(--syn-text-secondary)]">{loading ? 'Chargement de la waveform…' : 'Waveform indisponible'}</span>}
        {clusters.map(cluster => <span key={cluster.id} className="absolute inset-y-0 w-0.5 bg-[var(--syn-accent)]" style={{ left: `${Math.max(0, Math.min(100, cluster.timestampSeconds / (duration || 1) * 100))}%` }} />)}
        <div ref={playhead} className="absolute inset-y-0 w-0.5 bg-[var(--syn-text-primary)]" />
      </div>
      <input ref={range} type="range" aria-label="Position dans le morceau" min={0} max={duration || 1} step={0.1} defaultValue={0} onChange={e => onSeek(Number(e.target.value))} className="syn-interactive absolute inset-0 h-12 w-full cursor-pointer opacity-0 focus-visible:opacity-25" />
    </div>
    {clusters.length > 0 && <div className="mt-1 flex min-h-11 items-center gap-1" aria-label="Moments de la communauté">
      {clusters.map(cluster => <button type="button" key={cluster.id} aria-pressed={selected === cluster.id} aria-label={`${cluster.comments.length} commentaires et ${cluster.reactions.length} réactions à ${momentTime(cluster.timestampSeconds)}`} onClick={() => onSelect(cluster)} className={`syn-interactive min-h-11 min-w-11 max-w-20 flex-1 rounded-lg px-1 text-[11px] font-bold ${selected === cluster.id ? 'bg-[var(--syn-accent)] text-white' : 'bg-[var(--syn-soft)] text-[var(--syn-text-secondary)]'}`}><span className="block tabular-nums">{momentTime(cluster.timestampSeconds)}</span><span aria-hidden="true">{cluster.comments.length ? '●' : '♥'} {cluster.comments.length + cluster.reactions.length}</span></button>)}
    </div>}
    <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[var(--syn-text-secondary)]"><span ref={clock}>0:00</span><span>{momentTime(duration)}</span></div>
  </div>;
});
