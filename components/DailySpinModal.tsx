'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, X } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type Status = {
  canSpin: boolean;
  lastSpunAt: string | null;
  nextAvailableAt: string | null;
  streak: number;
};

type SpinResult = {
  ok: true;
  index: number;
  resultKey: string;
  reward: { kind: 'none' | 'credits' | 'booster'; label: string; amount?: number; boosterKey?: string };
  rewardPayload: any;
  spunAt: string;
  nextAvailableAt: string;
  streak: number;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

// IMPORTANT: keep in sync with API wheel ordering
const SEGMENTS = [
  { key: 'lose', label: 'Rien' },
  { key: 'credits_10', label: '+10 credits' },
  { key: 'credits_25', label: '+25 credits' },
  { key: 'common_booster', label: 'Commun' },
  { key: 'rare_booster', label: 'Rare' },
  { key: 'epic_booster', label: 'Épique' },
  { key: 'legendary_booster', label: 'Légendaire' },
];

export default function DailySpinModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);

  const segmentAngle = 360 / SEGMENTS.length;

  const wheelBg = useMemo(() => {
    // opaque, premium, readable
    const colors = [
      'rgba(255,255,255,0.08)',
      'rgba(125, 211, 252, 0.18)',
      'rgba(167, 139, 250, 0.18)',
      'rgba(255,255,255,0.10)',
      'rgba(59, 130, 246, 0.18)',
      'rgba(168, 85, 247, 0.18)',
      'rgba(234, 179, 8, 0.20)',
    ];
    const stops = SEGMENTS.map((_, i) => {
      const c = colors[i % colors.length];
      const a0 = (i * 100) / SEGMENTS.length;
      const a1 = ((i + 1) * 100) / SEGMENTS.length;
      return `${c} ${a0}% ${a1}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/daily-spin', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setStatus(j as Status);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setSpinning(false);
    refresh();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!status?.nextAvailableAt) return;
    const id = window.setInterval(() => {
      // just trigger rerender via state copy
      setStatus((s) => (s ? { ...s } : s));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isOpen, status?.nextAvailableAt]);

  const spin = async () => {
    if (spinning || loading) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await fetch('/api/daily-spin', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(j as Status);
        return;
      }
      const r = j as SpinResult;

      // Rotate: multiple turns + land on server index (center of segment under pointer)
      const baseTurns = 4 + Math.floor(Math.random() * 3);
      const target = 360 - (r.index + 0.5) * segmentAngle;
      const nextRotation = rotation + baseTurns * 360 + target;
      setRotation(nextRotation);

      // reveal result after animation
      window.setTimeout(() => {
        setResult(r);
        setStatus({
          canSpin: false,
          lastSpunAt: r.spunAt,
          nextAvailableAt: r.nextAvailableAt,
          streak: r.streak,
        });
        setSpinning(false);
      }, 3600);
    } catch {
      setSpinning(false);
    }
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const now = Date.now();
  const nextAt = status?.nextAvailableAt ? new Date(status.nextAvailableAt).getTime() : null;
  const msLeft = nextAt ? nextAt - now : 0;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18 }}
          className="w-[92vw] max-w-[520px] rounded-3xl border border-border-secondary bg-background-tertiary shadow-2xl overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="p-4 border-b border-border-secondary/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-background-fog-thin border border-border-secondary grid place-items-center">
                  <Gift className="h-5 w-5 text-foreground-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground-primary">Roue quotidienne</div>
                  <div className="text-xs text-foreground-tertiary">1 spin / jour • parfois rien, souvent très bon.</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs text-foreground-tertiary">
              <div>Streak: <span className="text-foreground-primary font-semibold">{status?.streak ?? 0}</span></div>
              <div>
                {status?.canSpin
                  ? <span className="text-foreground-primary font-semibold">Disponible</span>
                  : nextAt
                    ? <span>Prochain spin: <span className="text-foreground-primary font-semibold">{formatCountdown(msLeft)}</span></span>
                    : null}
              </div>
            </div>

            <div className="relative mx-auto w-[280px] h-[280px]">
              {/* pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-b-[18px] border-l-transparent border-r-transparent border-b-overlay-on-primary drop-shadow" />
              </div>

              {/* wheel */}
              <div
                className={cx(
                  'absolute inset-0 rounded-full border border-border-secondary bg-background-primary shadow-[0_18px_60px_rgba(0,0,0,0.45)]',
                  spinning && 'opacity-95',
                )}
                style={{
                  background: wheelBg,
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 3.5s cubic-bezier(0.12, 0.9, 0.12, 1)' : undefined,
                }}
              />

              {/* center cap */}
              <div className="absolute inset-0 grid place-items-center">
                <div className="h-16 w-16 rounded-full border border-border-secondary bg-background-tertiary grid place-items-center shadow">
                  <div className="text-xs text-foreground-tertiary">SPIN</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-foreground-tertiary">
              {SEGMENTS.map((s) => (
                <div key={s.key} className="px-3 py-2 rounded-2xl border border-border-secondary bg-background-fog-thin text-foreground-secondary">
                  {s.label}
                </div>
              ))}
            </div>

            {result && (
              <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-3">
                <div className="text-sm font-semibold text-foreground-primary">Résultat</div>
                <div className="mt-1 text-sm text-foreground-secondary">
                  {result.reward.kind === 'none' ? 'Perdu… rien cette fois.' : result.reward.label}
                </div>
                {result.reward.kind !== 'none' ? (
                  <div className="mt-2 text-xs text-foreground-tertiary">
                    Récompense ajoutée automatiquement.
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-foreground-tertiary">
                    Reviens demain, les gros lots tombent.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border-secondary/60 flex gap-2">
            <button
              type="button"
              onClick={spin}
              disabled={loading || spinning || !status?.canSpin}
              className="flex-1 h-11 rounded-2xl bg-overlay-on-primary text-foreground-primary hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {spinning ? 'Ça tourne…' : status?.canSpin ? 'Tourner' : 'Indisponible'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

