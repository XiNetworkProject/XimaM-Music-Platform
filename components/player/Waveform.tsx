'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { MOMENT_REACTION_META, type MomentReactionType } from '@/lib/momentReactions';
import type { MomentReactionCluster } from '@/hooks/useMomentReactions';

export type WaveformMarker = {
  id: string;
  timestampSeconds: number;
  content: string;
  user: { id: string; username: string; name: string; avatar?: string };
};

interface WaveformProps {
  /** null tant que la vraie waveform n'a pas encore été calculée/chargée. */
  peaks: number[] | null;
  duration: number;
  loading?: boolean;
  getAudioElement: () => HTMLAudioElement | null;
  onSeek: (time: number) => void;
  markers?: WaveformMarker[];
  onMarkerSeek?: (marker: WaveformMarker) => void;
  /** Réactions rapides (emoji) regroupées par moment — complètent les commentaires,
   * ne les remplacent pas : marqueur visuel distinct (pastille teintée par type). */
  reactionClusters?: MomentReactionCluster[];
  onReactionClusterSeek?: (cluster: MomentReactionCluster) => void;
  compact?: boolean;
  className?: string;
  /** dark = carte/lecteur sombre (TikTokPlayer) ; light = carte crème Synaura (Scroll). */
  variant?: 'dark' | 'light';
}

function fmtTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const THEME = {
  dark: {
    dimBar: 'bg-white/[0.16]',
    loadingWrap: 'bg-white/[0.06]',
    loadingLabel: 'text-white/30',
    timeLabel: 'text-white/50',
    markerDot: 'bg-white/70 shadow-[0_0_0_3px_rgba(0,0,0,0.35)]',
    bubble: 'border-white/10 bg-[#141019]/95',
    bubbleName: 'text-white',
    bubbleText: 'text-white/78',
    bubbleAvatarBg: 'bg-white/10 ring-1 ring-white/10',
    bubbleAvatarInitial: 'text-white/60',
    bubbleTimeChip: 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white',
    reactionChip: 'bg-white/10 text-white/82',
  },
  light: {
    dimBar: 'bg-black/[0.1]',
    loadingWrap: 'bg-black/[0.045]',
    loadingLabel: 'text-black/32',
    timeLabel: 'text-black/42',
    markerDot: 'bg-[#171313]/55 shadow-[0_0_0_3px_rgba(255,250,242,0.92)]',
    bubble: 'border-black/[0.08] bg-[#fffaf2]/98',
    bubbleName: 'text-[#171313]',
    bubbleText: 'text-black/72',
    bubbleAvatarBg: 'bg-black/[0.06] ring-1 ring-black/[0.06]',
    bubbleAvatarInitial: 'text-black/50',
    bubbleTimeChip: 'bg-black/[0.06] text-black/60 hover:bg-[#171313] hover:text-white',
    reactionChip: 'bg-black/[0.05] text-black/72',
  },
} as const;

const WaveformBars = memo(function WaveformBars({ peaks, variant, dimClass }: { peaks: number[]; variant: 'dim' | 'played'; dimClass: string }) {
  return (
    <div className="absolute inset-0 flex items-center gap-[2px]">
      {peaks.map((p, i) => (
        <div
          key={i}
          className={`min-h-[3px] flex-1 rounded-full ${
            variant === 'played' ? 'bg-gradient-to-t from-[#7357C6] to-[#4A9EAA]' : dimClass
          }`}
          style={{ height: `${Math.max(8, p * 100)}%` }}
        />
      ))}
    </div>
  );
});

export default function Waveform({
  peaks,
  duration,
  loading,
  getAudioElement,
  onSeek,
  markers = [],
  onMarkerSeek,
  reactionClusters = [],
  onReactionClusterSeek,
  compact = false,
  className = '',
  variant = 'dark',
}: WaveformProps) {
  const theme = THEME[variant];
  const containerRef = useRef<HTMLDivElement>(null);
  const playedClipRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  const [openMarkerId, setOpenMarkerId] = useState<string | null>(null);
  const [openReactionClusterId, setOpenReactionClusterId] = useState<string | null>(null);
  const [scrubBubble, setScrubBubble] = useState<{ shown: boolean; left: number; value: number }>({ shown: false, left: 0, value: 0 });

  const commitSeek = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const value = (x / rect.width) * duration;
    setScrubBubble({ shown: true, left: x, value });
    onSeek(value);
  }, [duration, onSeek]);

  const hideScrubBubble = useCallback(() => setScrubBubble((prev) => ({ ...prev, shown: false })), []);

  // rAF : met à jour la portion "jouée" et le temps sans re-render React,
  // même logique que le SeekBar existant du player.
  useEffect(() => {
    let raf = 0;
    let lastPct = -1;
    const tick = () => {
      const audio = getAudioElement();
      const time = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const dur = duration || (audio && Number.isFinite(audio.duration) ? audio.duration : 0);
      const pct = dur > 0 ? Math.max(0, Math.min(100, (time / dur) * 100)) : 0;
      if (pct !== lastPct) {
        if (playedClipRef.current) playedClipRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        if (timeRef.current) timeRef.current.textContent = fmtTime(time);
        lastPct = pct;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getAudioElement, duration]);

  useEffect(() => {
    if (durRef.current) durRef.current.textContent = fmtTime(duration);
  }, [duration]);

  const openMarker = markers.find((m) => m.id === openMarkerId) || null;
  const openCluster = reactionClusters.find((c) => c.id === openReactionClusterId) || null;
  const barsHeight = compact ? 'h-8' : 'h-16';

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={`group relative w-full ${barsHeight} cursor-pointer select-none`}
        onPointerDown={(e) => { setOpenMarkerId(null); setOpenReactionClusterId(null); commitSeek(e.clientX); }}
        onPointerMove={(e) => e.buttons === 1 && commitSeek(e.clientX)}
        onPointerUp={hideScrubBubble}
        onPointerLeave={hideScrubBubble}
        onTouchStart={(e) => { setOpenMarkerId(null); setOpenReactionClusterId(null); commitSeek(e.touches[0].clientX); }}
        onTouchMove={(e) => commitSeek(e.touches[0].clientX)}
        onTouchEnd={hideScrubBubble}
      >
        {peaks && peaks.length ? (
          <>
            <WaveformBars peaks={peaks} variant="dim" dimClass={theme.dimBar} />
            <div ref={playedClipRef} className="absolute inset-0" style={{ clipPath: 'inset(0 100% 0 0)' }}>
              <WaveformBars peaks={peaks} variant="played" dimClass={theme.dimBar} />
            </div>
          </>
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center rounded-full ${theme.loadingWrap} ${loading ? 'animate-pulse' : ''}`}>
            {loading ? <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${theme.loadingLabel}`}>Analyse du son…</span> : null}
          </div>
        )}

        {!compact && duration
          ? markers.map((marker) => {
              const left = Math.max(0, Math.min(100, (marker.timestampSeconds / duration) * 100));
              return (
                <button
                  key={marker.id}
                  type="button"
                  aria-label={`Commentaire à ${fmtTime(marker.timestampSeconds)} par ${marker.user.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenReactionClusterId(null);
                    setOpenMarkerId((current) => (current === marker.id ? null : marker.id));
                  }}
                  className="absolute -top-1.5 z-10 grid h-4 w-4 -translate-x-1/2 place-items-center"
                  style={{ left: `${left}%` }}
                >
                  <span className={`h-2 w-2 rounded-full transition-transform group-hover:scale-125 ${theme.markerDot}`} />
                </button>
              );
            })
          : null}

        {!compact && duration
          ? reactionClusters.map((cluster) => {
              const left = Math.max(0, Math.min(100, (cluster.timestampSeconds / duration) * 100));
              const meta = MOMENT_REACTION_META[cluster.topType];
              return (
                <button
                  key={cluster.id}
                  type="button"
                  aria-label={`${cluster.total} réaction${cluster.total > 1 ? 's' : ''} à ${fmtTime(cluster.timestampSeconds)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMarkerId(null);
                    setOpenReactionClusterId((current) => (current === cluster.id ? null : cluster.id));
                  }}
                  className="absolute -top-6 z-10 -translate-x-1/2 transition-transform hover:scale-110"
                  style={{ left: `${left}%` }}
                >
                  <span
                    className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-black shadow-[0_2px_8px_rgba(0,0,0,0.22)]"
                    style={{ backgroundColor: `${meta.color}24`, color: meta.color, border: `1px solid ${meta.color}55` }}
                  >
                    <span>{meta.emoji}</span>
                    {cluster.total > 1 ? <span className="tabular-nums">{cluster.total}</span> : null}
                  </span>
                </button>
              );
            })
          : null}

        {scrubBubble.shown && (
          <div className="pointer-events-none absolute -top-8 z-20" style={{ left: Math.max(0, scrubBubble.left - 20) }}>
            <div className="rounded-lg border border-white/10 bg-black/80 px-2 py-1 text-[11px] font-mono tabular-nums text-white shadow-lg backdrop-blur-sm">
              {fmtTime(scrubBubble.value)}
            </div>
          </div>
        )}
      </div>

      {!compact ? (
        <div className={`mt-2 flex items-center justify-between text-[11px] font-medium tabular-nums ${theme.timeLabel}`}>
          <span ref={timeRef}>0:00</span>
          <span ref={durRef}>0:00</span>
        </div>
      ) : null}

      <AnimatePresence>
        {openMarker ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={`mt-2 rounded-[1.1rem] border p-3 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl ${theme.bubble}`}
          >
            <div className="flex items-start gap-2.5">
              <div className={`grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full ${theme.bubbleAvatarBg}`}>
                {openMarker.user.avatar ? (
                  <img src={openMarker.user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className={`text-[11px] font-black ${theme.bubbleAvatarInitial}`}>{openMarker.user.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={`text-xs font-black ${theme.bubbleName}`}>{openMarker.user.name}</span>
                  <button
                    type="button"
                    onClick={() => { onSeek(openMarker.timestampSeconds); onMarkerSeek?.(openMarker); }}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums transition ${theme.bubbleTimeChip}`}
                  >
                    <MessageCircle className="h-2.5 w-2.5" />
                    {fmtTime(openMarker.timestampSeconds)}
                  </button>
                </div>
                <p className={`mt-1 text-[13px] leading-5 ${theme.bubbleText}`}>{openMarker.content}</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {openCluster ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={`mt-2 flex items-center justify-between gap-3 rounded-[1.1rem] border p-3 shadow-[0_18px_44px_rgba(0,0,0,0.22)] backdrop-blur-xl ${theme.bubble}`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.entries(openCluster.byType) as [MomentReactionType, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <span key={type} className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black tabular-nums ${theme.reactionChip}`}>
                    {MOMENT_REACTION_META[type].emoji} {count}
                  </span>
                ))}
            </div>
            <button
              type="button"
              onClick={() => { onSeek(openCluster.timestampSeconds); onReactionClusterSeek?.(openCluster); }}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums transition ${theme.bubbleTimeChip}`}
            >
              {fmtTime(openCluster.timestampSeconds)}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
