'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Gem, Gift, Sparkles, Star, X, Zap } from 'lucide-react';
import Image from 'next/image';
import { UButton } from '@/components/ui/UnifiedUI';

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

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

const SEGMENTS = [
  { key: 'lose', label: 'Rien', icon: X, color: 'rgba(255,255,255,0.06)', textColor: '#71717a', borderColor: '#3f3f46' },
  { key: 'credits_10', label: '+10', icon: Zap, color: 'rgba(125,211,252,0.12)', textColor: '#7dd3fc', borderColor: '#0ea5e9' },
  { key: 'credits_25', label: '+25', icon: Zap, color: 'rgba(167,139,250,0.15)', textColor: '#a78bfa', borderColor: '#8b5cf6' },
  { key: 'common_booster', label: 'Commun', icon: Sparkles, color: 'rgba(161,161,170,0.12)', textColor: '#a1a1aa', borderColor: '#71717a' },
  { key: 'rare_booster', label: 'Rare', icon: Star, color: 'rgba(59,130,246,0.15)', textColor: '#60a5fa', borderColor: '#3b82f6' },
  { key: 'epic_booster', label: 'Epique', icon: Crown, color: 'rgba(168,85,247,0.18)', textColor: '#a855f7', borderColor: '#9333ea' },
  { key: 'legendary_booster', label: 'Legend.', icon: Gem, color: 'rgba(234,179,8,0.20)', textColor: '#fbbf24', borderColor: '#f59e0b' },
];

const KEYFRAMES = `
  @keyframes ds-spin-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.05); }
    50% { box-shadow: 0 0 40px rgba(245,158,11,0.3), inset 0 0 30px rgba(245,158,11,0.1); }
  }
  @keyframes ds-pointer-bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-4px); }
  }
  @keyframes ds-confetti-fall {
    0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translateY(400px) rotate(720deg) scale(0.3); opacity: 0; }
  }
  @keyframes ds-pulse-glow {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.4); }
  }
  @keyframes ds-result-appear {
    0% { transform: scale(0.8) translateY(20px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
`;

export default function DailySpinModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const segmentAngle = 360 / SEGMENTS.length;

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/daily-spin', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setStatus(j as Status);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setSpinning(false);
    setShowConfetti(false);
    refresh();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !status?.nextAvailableAt) return;
    const id = window.setInterval(() => setStatus(s => s ? { ...s } : s), 1000);
    return () => window.clearInterval(id);
  }, [isOpen, status?.nextAvailableAt]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;
    const segAngle = (Math.PI * 2) / SEGMENTS.length;

    ctx.clearRect(0, 0, size, size);

    SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = seg.color;
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();

      const midAngle = startAngle + segAngle / 2;
      const textRadius = radius * 0.7;
      const tx = center + Math.cos(midAngle) * textRadius;
      const ty = center + Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = seg.textColor;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.label, 0, 0);
      ctx.restore();

      const iconRadius = radius * 0.45;
      const ix = center + Math.cos(midAngle) * iconRadius;
      const iy = center + Math.sin(midAngle) * iconRadius;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.fillStyle = seg.textColor;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(245,158,11,0.4)';
    ctx.stroke();

    const dotCount = 28;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dx = center + Math.cos(angle) * (radius + 1);
      const dy = center + Math.sin(angle) * (radius + 1);
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.15)';
      ctx.fill();
    }
  }, []);

  useEffect(() => { if (isOpen) drawWheel(); }, [isOpen, drawWheel]);

  const confettiPieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      color: ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'][i % 6],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    })), []);

  const spin = async () => {
    if (spinning || loading) return;
    setSpinning(true);
    setResult(null);
    setShowConfetti(false);

    try {
      const res = await fetch('/api/daily-spin', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setStatus(j as Status); setSpinning(false); return; }
      const r = j as SpinResult;

      const baseTurns = 5 + Math.floor(Math.random() * 3);
      const target = 360 - (r.index + 0.5) * segmentAngle;
      const nextRotation = rotation + baseTurns * 360 + target;
      setRotation(nextRotation);

      window.setTimeout(() => {
        setResult(r);
        if (r.reward.kind !== 'none') setShowConfetti(true);
        setStatus({
          canSpin: false,
          lastSpunAt: r.spunAt,
          nextAvailableAt: r.nextAvailableAt,
          streak: r.streak,
        });
        setSpinning(false);
      }, 4200);
    } catch { setSpinning(false); }
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const now = Date.now();
  const nextAt = status?.nextAvailableAt ? new Date(status.nextAvailableAt).getTime() : null;
  const msLeft = nextAt ? nextAt - now : 0;

  const isWin = result && result.reward.kind !== 'none';
  const resultSegment = result ? SEGMENTS[result.index] : null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <style>{KEYFRAMES}</style>

        {/* Confetti overlay */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
            {confettiPieces.map(p => (
              <div
                key={p.id}
                className="absolute"
                style={{
                  left: `${p.x}%`,
                  top: '-20px',
                  width: p.size,
                  height: p.size * 1.5,
                  background: p.color,
                  borderRadius: '1px',
                  animation: `ds-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
                  transform: `rotate(${p.rotation}deg)`,
                }}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="relative w-[92vw] max-w-[480px] rounded-2xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl overflow-hidden"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Golden top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          {/* Header */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 grid place-items-center">
                <Gift className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">Roue quotidienne</div>
                <div className="text-[11px] text-white/30">1 spin par jour · boosters & credits</div>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-white/40 hover:text-white transition" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Streak + availability */}
          <div className="px-4 pb-2 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-white/40">
              Streak: <span className="text-amber-400 font-bold">{status?.streak ?? 0}</span>
            </div>
            <div className="text-white/40">
              {status?.canSpin
                ? <span className="text-emerald-400 font-bold">Disponible</span>
                : nextAt ? <span>Prochain: <span className="text-white/60 font-semibold">{formatCountdown(msLeft)}</span></span> : null}
            </div>
          </div>

          {/* Wheel section */}
          <div className="px-4 py-4 flex items-center justify-center">
            <div className="relative" style={{ width: 310, height: 310 }}>
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full" style={{ animation: 'ds-spin-glow 3s ease-in-out infinite' }} />

              {/* Golden outer ring */}
              <div className="absolute inset-0 rounded-full" style={{ border: '3px solid rgba(245,158,11,0.3)', boxShadow: '0 0 20px rgba(245,158,11,0.1)' }} />

              {/* Pointer (top) */}
              <div className="absolute -top-3 left-1/2 z-10" style={{ animation: spinning ? undefined : 'ds-pointer-bounce 1.5s ease-in-out infinite' }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '12px solid transparent',
                  borderRight: '12px solid transparent',
                  borderTop: '20px solid #f59e0b',
                  transform: 'translateX(-50%)',
                  filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.5))',
                }} />
              </div>

              {/* Wheel canvas */}
              <div
                className="absolute inset-[3px] rounded-full overflow-hidden"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)' : undefined,
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="w-full h-full"
                />
              </div>

              {/* Center cap */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-16 w-16 rounded-full border-2 border-amber-500/30 bg-[#0f0a20] grid place-items-center shadow-lg shadow-amber-500/10">
                  <Image src="/synaura_symbol.svg" alt="" width={20} height={20} style={{ filter: 'brightness(0) invert(1) opacity(0.5)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Segments legend */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {SEGMENTS.map(s => {
                const Icon = s.icon;
                const isSpecial = s.key === 'legendary_booster' || s.key === 'epic_booster';
                return (
                  <div key={s.key} className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border border-white/5 bg-white/[0.02]" style={isSpecial ? { animation: 'ds-pulse-glow 3s ease-in-out infinite' } : undefined}>
                    <Icon className="w-3 h-3" style={{ color: s.textColor }} />
                    <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: s.textColor }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="px-4 pb-3">
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="rounded-xl border p-3"
                style={{
                  borderColor: isWin ? resultSegment?.borderColor + '40' : 'rgba(255,255,255,0.05)',
                  background: isWin ? resultSegment?.color : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="flex items-center gap-3">
                  {resultSegment && React.createElement(resultSegment.icon, { className: 'w-6 h-6 shrink-0', style: { color: resultSegment.textColor } })}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white">
                      {isWin ? result.reward.label : 'Perdu... rien cette fois'}
                    </div>
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {isWin ? 'Recompense ajoutee automatiquement.' : 'Reviens demain pour retenter ta chance !'}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Spin button */}
          <div className="p-4 border-t border-white/5">
            <button
              type="button"
              onClick={spin}
              disabled={loading || spinning || !status?.canSpin}
              className="w-full h-12 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: status?.canSpin
                  ? 'linear-gradient(135deg, #f59e0b, #ec4899)'
                  : 'rgba(255,255,255,0.05)',
                color: status?.canSpin ? 'white' : 'rgba(255,255,255,0.3)',
                boxShadow: status?.canSpin ? '0 4px 20px rgba(245,158,11,0.3)' : 'none',
              }}
            >
              {spinning ? 'La roue tourne...' : status?.canSpin ? 'Tourner la roue' : 'Indisponible'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
