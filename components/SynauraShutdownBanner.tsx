'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import {
  SHUTDOWN_END_DATE_LABEL,
  formatShutdownCountdown,
  getMsUntilShutdownEnd,
  isPastShutdownEnd,
  isShutdownAnnounced,
} from '@/lib/synauraShutdown';

function useCountdown(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[2.5rem]">
      <span className="text-lg sm:text-xl font-black tabular-nums text-white">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">{label}</span>
    </div>
  );
}

export default function SynauraShutdownBanner({
  variant = 'full',
}: {
  variant?: 'full' | 'compact' | 'sticky';
}) {
  const now = useCountdown();
  if (!isShutdownAnnounced(now)) return null;
  const pastEnd = isPastShutdownEnd(now);
  const msLeft = getMsUntilShutdownEnd(now);
  const cd = formatShutdownCountdown(msLeft);
  const showCountdown = !pastEnd && msLeft > 0;

  if (pastEnd && variant !== 'sticky') return null;

  if (variant === 'sticky') {
    if (pastEnd) return null;
    return (
      <div className="w-full bg-gradient-to-r from-red-950/90 via-rose-950/90 to-red-950/90 border-b border-red-500/30 text-white shrink-0 z-[60]">
        <Link
          href="/fermeture"
          className="flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold hover:bg-white/5 transition"
        >
          <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 animate-pulse" />
          <span className="text-center">
            <strong className="text-red-200">Synaura ferme définitivement</strong>
            {' — '}
            dernier accès le <strong>{SHUTDOWN_END_DATE_LABEL}</strong>
          </span>
          <ChevronRight className="w-4 h-4 text-white/50 shrink-0 hidden sm:block" />
        </Link>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href="/fermeture"
        className="group block relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/80 via-rose-950/60 to-[#1a0a0e] hover:border-red-400/50 transition-all"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.12),transparent_60%)]" />
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-300">
              Arrêt définitif
            </span>
          </div>
          <p className="text-sm font-bold text-white mb-1">Synaura ferme ses portes</p>
          <p className="text-xs text-white/40 mb-3">
            Dernier accès le {SHUTDOWN_END_DATE_LABEL}. Lire l&apos;annonce officielle.
          </p>
          {showCountdown && (
            <div className="flex items-center gap-2">
              <CountdownUnit value={cd.days} label="j" />
              <span className="text-white/30">:</span>
              <CountdownUnit value={cd.hours} label="h" />
              <span className="text-white/30">:</span>
              <CountdownUnit value={cd.minutes} label="m" />
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-950/90 via-[#1a0810] to-[#0a0a0e]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(190,18,60,0.1),transparent_50%)]" />

      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-bold shadow-lg shadow-red-500/30 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          ANNONCE OFFICIELLE
        </span>
      </div>

      <div className="relative p-5 sm:p-7 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-red-300/90">
            Fermeture définitive de Synaura
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3 max-w-3xl">
          Synaura s&apos;arrête définitivement
        </h2>

        <p className="text-sm sm:text-base text-white/55 mb-2 max-w-2xl leading-relaxed">
          Pour des raisons économiques — Synaura ne parvient plus à couvrir les frais d&apos;exploitation
          engagés ni à atteindre une base d&apos;utilisateurs suffisante — je suis contraint d&apos;arrêter
          le service. Cette décision est irréversible à ce stade.
        </p>
        <p className="text-sm text-white/40 mb-5 max-w-2xl">
          Une reprise future n&apos;est pas exclue, mais <strong className="text-white/70">aucune promesse</strong> n&apos;est
          faite. Après le <strong className="text-red-200">{SHUTDOWN_END_DATE_LABEL}</strong>, plus aucun
          contenu, compte ou fonctionnalité ne sera accessible.
        </p>

        {showCountdown && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-300/60 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Temps restant avant coupure totale
            </p>
            <div className="flex items-center gap-3 sm:gap-4 mb-6">
              <CountdownUnit value={cd.days} label="jours" />
              <span className="text-red-400/40 text-xl font-bold">:</span>
              <CountdownUnit value={cd.hours} label="heures" />
              <span className="text-red-400/40 text-xl font-bold">:</span>
              <CountdownUnit value={cd.minutes} label="min" />
              <span className="text-red-400/40 text-xl font-bold">:</span>
              <CountdownUnit value={cd.seconds} label="sec" />
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/fermeture"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Lire l&apos;annonce complète
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            href="/legal"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
          >
            Centre légal
          </Link>
        </div>
      </div>
    </section>
  );
}
