'use client';

import { Zap } from 'lucide-react';

const KEYFRAMES = `
  @keyframes boost-halo-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes boost-icon-glow {
    0%, 100% { filter: drop-shadow(0 0 3px rgba(168,85,247,0.6)); }
    50% { filter: drop-shadow(0 0 8px rgba(245,158,11,0.8)); }
  }
  @keyframes boost-shimmer {
    0% { transform: translateX(-100%) rotate(15deg); }
    100% { transform: translateX(200%) rotate(15deg); }
  }
`;

interface BoostBadgeProps {
  variant?: 'compact' | 'card';
  multiplier?: number;
  className?: string;
}

export function BoostBadge({ variant = 'compact', multiplier, className = '' }: BoostBadgeProps) {
  if (variant === 'card') return <BoostBadgeCard multiplier={multiplier} className={className} />;
  return <BoostBadgeCompact multiplier={multiplier} className={className} />;
}

function BoostBadgeCompact({ multiplier, className }: { multiplier?: number; className: string }) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-violet-500/30 ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(245,158,11,0.2))',
          animation: 'boost-icon-glow 3s ease-in-out infinite',
        }}
      >
        <Zap className="w-3 h-3 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
        {multiplier && multiplier > 1 && (
          <span className="text-[9px] font-bold text-amber-300">x{Number(multiplier).toFixed(1)}</span>
        )}
      </div>
    </>
  );
}

function BoostBadgeCard({ multiplier, className }: { multiplier?: number; className: string }) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className={`absolute inset-0 pointer-events-none z-10 ${className}`}>
        {/* Halo glow */}
        <div
          className="absolute -inset-1 rounded-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(245,158,11,0.25), rgba(236,72,153,0.2))',
            filter: 'blur(8px)',
            animation: 'boost-halo-pulse 3s ease-in-out infinite',
          }}
        />
        {/* Top-right badge */}
        <div
          className="absolute top-1.5 right-1.5 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-violet-400/30"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(245,158,11,0.3))',
            backdropFilter: 'blur(8px)',
            animation: 'boost-icon-glow 3s ease-in-out infinite',
          }}
        >
          <Zap className="w-3 h-3 text-amber-400" style={{ fill: 'rgba(245,158,11,0.4)' }} />
          <span className="text-[9px] font-bold text-white/90">Boosted</span>
          {multiplier && multiplier > 1 && (
            <span className="text-[9px] font-bold text-amber-300">x{Number(multiplier).toFixed(1)}</span>
          )}
        </div>
        {/* Shimmer sweep */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 55%, transparent 60%)',
              animation: 'boost-shimmer 4s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </>
  );
}

export function BoostBadgeTikTok({ multiplier }: { multiplier?: number }) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-500/30"
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(245,158,11,0.2))',
          backdropFilter: 'blur(12px)',
          animation: 'boost-icon-glow 3s ease-in-out infinite',
        }}
      >
        <Zap className="w-3.5 h-3.5 text-amber-400" style={{ fill: 'rgba(245,158,11,0.3)' }} />
        <span className="text-[10px] font-bold text-white/90">Boosted</span>
        {multiplier && multiplier > 1 && (
          <span className="text-[10px] font-bold text-amber-300">x{Number(multiplier).toFixed(1)}</span>
        )}
      </div>
    </>
  );
}

export default BoostBadge;
