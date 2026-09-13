'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import SynauraLogo from '@/components/brand/SynauraLogo';
import { SynauraImage } from '@/components/ui/SynauraImage';

interface TrackData {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  isAI: boolean;
}

export default function EmbedPlayerClient({ track }: { track: TrackData }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); }
    else { audio.play().catch(() => {}); }
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="v2-embed" style={{
      width: '100%', minHeight: 88, background: 'var(--v2-surface, #10141e)',
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
      fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--v2-text, #eff1f8)', boxSizing: 'border-box',
      borderRadius: 12, border: '1px solid var(--v2-line, #30384a)',
    }}>
      <style jsx>{`
        .v2-embed :is(button,a):focus-visible { outline: 2px solid var(--v2-focus,#b6d4ff); outline-offset: 3px; }
        @media (max-width: 360px) { .v2-embed { gap: 10px!important; padding: 10px!important; } .v2-embed-link { padding: 0!important; } }
        @media (prefers-reduced-motion: reduce) { .v2-embed-progress { transition: none!important; } }
      `}</style>
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      {/* Cover */}
      <button type="button" aria-label={`${playing ? 'Mettre en pause' : 'Lire'} : ${track.title}`} style={{ position: 'relative', width: 56, height: 56, padding: 0, border: 0, background: 'var(--v2-raised, #191f2c)', borderRadius: 8, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }} onClick={togglePlay}>
        <SynauraImage src={track.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: playing ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.45)', transition: 'background 150ms',
        }}>
          {playing ? <Pause size={22} fill="#fff" stroke="#fff" /> : <Play size={22} fill="#fff" stroke="#fff" />}
        </div>
      </button>

      {/* Info + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 12, marginTop: 3, color: 'var(--v2-muted, #b0b8ca)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </div>

        {/* Seek bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'var(--v2-faint, #929db4)', width: 30, textAlign: 'right' }}>{fmt(currentTime)}</span>
          <div
            onClick={seek}
            style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--v2-line, #30384a)', cursor: 'pointer', position: 'relative' }}
          >
            <div className="v2-embed-progress" style={{
              width: `${progress}%`, height: '100%', borderRadius: 2,
              background: 'var(--v2-accent, #b9a3eb)', transition: 'width 100ms linear',
            }} />
          </div>
          <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'var(--v2-faint, #929db4)', width: 30 }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Synaura link */}
      <a
        className="v2-embed-link"
        aria-label={`Ouvrir ${track.title} sur Synaura`}
        href={`${baseUrl}/track/${track.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px', minHeight: 44,
          borderRadius: 6, background: 'transparent',
          color: 'var(--v2-muted, #b0b8ca)', textDecoration: 'none', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <SynauraLogo variant="symbol" size={30} decorative />
      </a>
    </div>
  );
}
