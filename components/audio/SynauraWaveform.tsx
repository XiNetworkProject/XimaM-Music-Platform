'use client';

import React, { useMemo } from 'react';

const SAMPLES = 200;
const VIEW_HEIGHT = 32;
const CENTER_Y = VIEW_HEIGHT / 2;
const AMP_SCALE = 12;

export type SynauraWaveformVariant = 'upload' | 'studio';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

type Props = {
  /** Amplitudes (0..1 ou brutes, seront normalisées). Si vide, affiche une forme de repli. */
  waveformData: number[];
  /** Progression lecture 0..1 */
  progress: number;
  /** Clic / seek par ratio 0..1 */
  onSeek?: (ratio: number) => void;
  /** 'upload' = style page upload (border-secondary, overlay), 'studio' = style IDE (indigo/cyan) */
  variant?: SynauraWaveformVariant;
  /** Hauteur du conteneur (default: h-12 pour upload, h-20 pour studio) */
  heightClass?: string;
  /** Durée en secondes (pour affichage timestamp et barre de progression) */
  duration?: number;
  /** Id unique pour les défs SVG (gradients) si plusieurs instances */
  idPrefix?: string;
  className?: string;
  /** Afficher le timestamp (current / total) sous la wave */
  showTimeLabel?: boolean;
  /** Afficher une barre de progression fine sur la wave (sous la forme) */
  showProgressBar?: boolean;
};

function normalizeToSamples(data: number[], targetLength: number): number[] {
  if (!data.length) return [];
  if (data.length === targetLength) {
    const max = Math.max(...data.map((n) => Math.abs(Number(n))), 0.0001);
    return data.map((n) => Math.max(0, Math.min(1, Math.abs(Number(n)) / max)));
  }
  const chunk = data.length / targetLength;
  const out: number[] = [];
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * chunk);
    const end = Math.min(data.length, Math.floor((i + 1) * chunk));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += Math.abs(Number(data[j]) || 0);
      count++;
    }
    out.push(count > 0 ? sum / count : 0);
  }
  const max = Math.max(...out, 0.0001);
  return out.map((v) => Math.max(0, Math.min(1, v / max)));
}

function buildFallbackWaveform(length: number): number[] {
  return Array.from({ length }, (_, i) => {
    const t = i / (length - 1);
    const s = Math.sin(t * Math.PI * 6) * 0.4 + 0.5;
    const v = Math.sin(t * Math.PI * 14 + 0.3) * 0.2;
    return Math.max(0.12, Math.min(0.98, s + v));
  });
}

export function SynauraWaveform({
  waveformData,
  progress,
  onSeek,
  variant = 'studio',
  heightClass = 'h-12',
  duration = 0,
  idPrefix = 'wave',
  className = '',
  showTimeLabel = false,
  showProgressBar = false,
}: Props) {
  const normalized = useMemo(() => {
    const raw = waveformData.length
      ? normalizeToSamples(waveformData, SAMPLES)
      : buildFallbackWaveform(SAMPLES);
    return raw;
  }, [waveformData]);

  const pathD = useMemo(() => {
    return normalized
      .map((amp, i) => {
        const x = (i / (SAMPLES - 1)) * 200;
        const y1 = CENTER_Y - amp * AMP_SCALE;
        const y2 = CENTER_Y + amp * AMP_SCALE;
        return `M${x} ${y1}l0 ${y2 - y1}`;
      })
      .join('');
  }, [normalized]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    onSeek(ratio);
  };

  const isUpload = variant === 'upload';
  const totalSec = Math.max(0, Number(duration) || 0);
  const prog = Math.max(0, Math.min(1, Number(progress) || 0));
  const currentSec = totalSec > 0 ? prog * totalSec : 0;

  return (
    <div
      className={`relative w-full ${heightClass} ${onSeek ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
      role={onSeek ? 'slider' : undefined}
      aria-valuenow={prog}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-label={onSeek ? 'Position dans le morceau' : undefined}
    >
      <div className="flex flex-col gap-1 h-full min-h-0">
        <div className="relative flex-1 min-h-[40px] w-full">
          <div
            className={`absolute inset-0 overflow-hidden rounded-2xl border ${
              isUpload
                ? 'border-border-secondary bg-background-tertiary text-foreground-secondary'
                : 'border-white/10 bg-white/[0.04]'
            }`}
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 200 ${VIEW_HEIGHT}`}
              preserveAspectRatio="none"
              fill="none"
              stroke={isUpload ? 'currentColor' : `url(#${idPrefix}-stroke)`}
              strokeWidth={isUpload ? 1.5 : 2}
              strokeLinecap="round"
              aria-hidden
            >
              {!isUpload && (
                <defs>
                  <linearGradient id={`${idPrefix}-stroke`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(129,140,248,0.55)" />
                    <stop offset="100%" stopColor="rgba(34,211,238,0.5)" />
                  </linearGradient>
                  <linearGradient id={`${idPrefix}-played`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(165,180,252,0.95)" />
                    <stop offset="100%" stopColor="rgba(103,232,249,0.95)" />
                  </linearGradient>
                  <clipPath id={`${idPrefix}-clip`}>
                    <rect x="0" y="0" width={200 * prog} height={VIEW_HEIGHT} />
                  </clipPath>
                </defs>
              )}
              {isUpload ? (
                <path d={pathD} />
              ) : (
                <>
                  <path d={pathD} opacity={0.85} />
                  <g clipPath={`url(#${idPrefix}-clip)`}>
                    <path d={pathD} stroke={`url(#${idPrefix}-played)`} strokeWidth={2.2} />
                  </g>
                </>
              )}
            </svg>
            {/* Barre de progression (style upload) ou overlay (studio) */}
            <div
              className={`absolute inset-y-0 left-0 rounded-l-2xl ${
                isUpload ? 'bg-overlay-on-primary/25' : 'bg-white/10'
              }`}
style={{ width: `${prog * 100}%` }}
        />
            {/* Curseur de position */}
            <div
              className={`absolute inset-y-0 w-0.5 rounded-full ${
                isUpload ? 'bg-foreground-primary' : 'bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
              }`}
              style={{ left: `${prog * 100}%` }}
            />
            {/* Option : barre de progression fine sur la wave (en bas du bloc) */}
            {showProgressBar && (
              <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-l-full bg-gradient-to-r from-indigo-400/90 to-cyan-400/90 transition-[width] duration-150"
                  style={{ width: `${prog * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
        {/* Option : timestamp (current / total) sous la wave */}
        {showTimeLabel && (
          <div
            className={`flex justify-between items-center text-[10px] tabular-nums ${
              isUpload ? 'text-foreground-tertiary' : 'text-white/60'
            }`}
          >
            <span>{formatTime(currentSec)}</span>
            <span>{formatTime(totalSec)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SynauraWaveform;
