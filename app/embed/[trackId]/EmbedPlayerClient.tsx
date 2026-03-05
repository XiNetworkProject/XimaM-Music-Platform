'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

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
    <div style={{
      width: '100%', minHeight: 80, background: 'linear-gradient(135deg, #0c0c16, #141428)',
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      fontFamily: "'Inter', system-ui, sans-serif", color: '#fff', boxSizing: 'border-box',
      borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <audio ref={audioRef} src={track.audioUrl} preload="metadata" />

      {/* Cover */}
      <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }} onClick={togglePlay}>
        <img src={track.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: playing ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.45)', transition: 'background 150ms',
        }}>
          {playing ? <Pause size={22} fill="#fff" stroke="#fff" /> : <Play size={22} fill="#fff" stroke="#fff" />}
        </div>
      </div>

      {/* Info + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </div>

        {/* Seek bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 30, textAlign: 'right' }}>{fmt(currentTime)}</span>
          <div
            onClick={seek}
            style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative' }}
          >
            <div style={{
              width: `${progress}%`, height: '100%', borderRadius: 2,
              background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', transition: 'width 100ms linear',
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 30 }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Synaura link */}
      <a
        href={`${baseUrl}/track/${track.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
          borderRadius: 8, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
          color: '#c4b5fd', fontSize: 10, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M9 8l6 4-6 4V8z" fill="currentColor"/>
        </svg>
        Synaura
      </a>
    </div>
  );
}
