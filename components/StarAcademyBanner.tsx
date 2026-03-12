'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const IMAGES = [
  '/images/star-academy/banner.png',
  '/images/star-academy/poster.png',
  '/images/star-academy/logo.png',
  '/images/star-academy/promo.png',
];

const INSCRIPTION_OPEN  = new Date('2026-03-17T00:00:00');
const INSCRIPTION_CLOSE = new Date('2026-04-17T00:00:00');
const PRESELECTION_END  = new Date('2026-05-01T00:00:00');

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function decompose(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl sm:text-2xl md:text-3xl font-black tabular-nums text-white drop-shadow-lg">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60 font-semibold">
        {label}
      </span>
    </div>
  );
}

export default function StarAcademyBanner({ variant = 'full' }: { variant?: 'full' | 'compact' | 'mini' }) {
  const now = useNow();
  const isBeforeOpen   = now < INSCRIPTION_OPEN.getTime();
  const isOpen         = now >= INSCRIPTION_OPEN.getTime() && now < INSCRIPTION_CLOSE.getTime();
  const isPreSelection = now >= INSCRIPTION_CLOSE.getTime() && now < PRESELECTION_END.getTime();
  const isLivePhase    = now >= PRESELECTION_END.getTime();

  const countdownTarget = isBeforeOpen
    ? INSCRIPTION_OPEN
    : isOpen
      ? INSCRIPTION_CLOSE
      : isPreSelection
        ? PRESELECTION_END
        : null;
  const cd = countdownTarget ? decompose(countdownTarget.getTime() - now) : decompose(0);
  const showCountdown = !!countdownTarget && countdownTarget.getTime() - now > 0;

  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (variant === 'mini') return;
    const id = setInterval(() => setSlide(s => (s + 1) % IMAGES.length), 4500);
    return () => clearInterval(id);
  }, [variant]);

  const prev = () => setSlide(s => (s - 1 + IMAGES.length) % IMAGES.length);
  const next = () => setSlide(s => (s + 1) % IMAGES.length);

  const statusLabel = isOpen ? 'OUVERT' : isPreSelection ? 'SELECTION' : isBeforeOpen ? `J-${cd.days}` : 'LIVES';
  const ctaLabel = isOpen ? "S'inscrire maintenant" : isPreSelection ? 'Suivre ma candidature' : isBeforeOpen ? 'En savoir plus' : 'Voir la page';
  const ctaHref = isOpen ? '/star-academy-tiktok/inscription' : isPreSelection ? '/star-academy-tiktok/suivi' : '/star-academy-tiktok';

  if (isLivePhase && variant === 'mini') return null;

  if (variant === 'mini') {
    return (
      <Link
        href="/star-academy-tiktok"
        className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] overflow-hidden bg-gradient-to-r from-violet-600/20 to-blue-600/20 hover:from-violet-600/30 hover:to-blue-600/30 text-violet-300 ring-1 ring-violet-500/30"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Star className="w-[18px] h-[18px] shrink-0 relative z-[1] fill-current" />
        <span className="truncate relative z-[1]">Star Academy</span>
        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full relative z-[1] shrink-0 ${
          isOpen ? 'bg-emerald-500/30 text-emerald-200' : isPreSelection ? 'bg-amber-500/30 text-amber-200' : 'bg-violet-500/30 text-violet-200'
        }`}>
          {statusLabel}
        </span>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={ctaHref}
        className="group block relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#1a0533] via-[#0d1b3e] to-[#0a0a1e] hover:border-violet-500/40 transition-all"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-32 h-32 opacity-30">
          <Image src="/images/star-academy/logo.png" alt="" fill className="object-contain" />
        </div>
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-300">Star Academy TikTok</span>
          </div>
          <p className="text-sm font-bold text-white mb-1">
            {isOpen
              ? "Inscriptions ouvertes !"
              : isPreSelection
                ? "Pre-selection en cours"
                : isBeforeOpen
                  ? "Inscriptions le 17 mars 2026"
                  : "Lives en cours"}
          </p>
          <p className="text-xs text-white/40 mb-3">
            {isOpen
              ? 'Candidatures jusqu\'au 17 avril 2026'
              : isPreSelection
                ? 'L\'equipe analyse chaque candidature'
                : 'Promo 2026 — Le reve commence ici'}
          </p>

          {showCountdown && (
            <div className="flex items-center gap-3 mb-3">
              <CountdownUnit value={cd.days} label="j" />
              <span className="text-white/30 text-lg font-bold">:</span>
              <CountdownUnit value={cd.hours} label="h" />
              <span className="text-white/30 text-lg font-bold">:</span>
              <CountdownUnit value={cd.minutes} label="m" />
              <span className="text-white/30 text-lg font-bold">:</span>
              <CountdownUnit value={cd.seconds} label="s" />
            </div>
          )}

          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-xs font-bold transition group-hover:scale-[1.03] ${
            isOpen ? 'bg-violet-500 hover:bg-violet-400' : isPreSelection ? 'bg-amber-500/60' : isBeforeOpen ? 'bg-violet-500/60' : 'bg-white/10'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            {ctaLabel}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#1a0533] via-[#0d1b3e] to-[#0a0a1e]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.12),transparent_50%)]" />

      <div className="absolute top-2 right-3 z-10">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-bold shadow-lg ${
          isOpen
            ? 'bg-emerald-500/90 shadow-emerald-500/30 animate-pulse'
            : isPreSelection
              ? 'bg-amber-500/90 shadow-amber-500/30 animate-pulse'
              : isBeforeOpen
                ? 'bg-violet-500/90 shadow-violet-500/30 animate-pulse'
                : 'bg-white/20'
        }`}>
          <Star className="w-3 h-3 fill-current" />
          {isOpen ? 'INSCRIPTIONS OUVERTES' : isPreSelection ? 'PRE-SELECTION' : isBeforeOpen ? 'BIENTOT' : 'LIVES'}
        </span>
      </div>

      <div className="relative flex flex-col md:flex-row items-center gap-4 md:gap-8 p-4 sm:p-6 md:p-8">
        {/* Carousel */}
        <div className="relative w-full md:w-[340px] lg:w-[400px] aspect-[3/4] md:aspect-[3/4] shrink-0 rounded-xl overflow-hidden group">
          {IMAGES.map((src, i) => (
            <div
              key={src}
              className="absolute inset-0 transition-all duration-700 ease-in-out"
              style={{
                opacity: i === slide ? 1 : 0,
                transform: i === slide ? 'scale(1)' : 'scale(1.05)',
              }}
            >
              <Image
                src={src}
                alt={`Star Academy TikTok ${i + 1}`}
                fill
                className="object-cover rounded-xl"
                sizes="(max-width: 768px) 100vw, 400px"
                priority={i === 0}
              />
            </div>
          ))}

          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100 z-10"
            aria-label="Image precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition opacity-0 group-hover:opacity-100 z-10"
            aria-label="Image suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setSlide(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/60'}`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-violet-300">
              Star Academy TikTok
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
            Promo 2026
          </h2>
          <p className="text-base sm:text-lg text-white/60 mb-1 font-semibold">
            Le reve commence ici
          </p>
          <p className="text-sm text-white/40 mb-5 max-w-md mx-auto md:mx-0">
            {isOpen
              ? "Les inscriptions sont ouvertes ! Candidatures jusqu'au 17 avril 2026."
              : isPreSelection
                ? "Les inscriptions sont fermees. L'equipe analyse chaque candidature. Resultats bientot !"
                : isBeforeOpen
                  ? "Synaura et Mixx Party presentent la Star Academy TikTok. Inscriptions a partir du 17 mars 2026."
                  : "Les lives ont commence ! Suivez l'aventure en direct."}
          </p>

          {showCountdown && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/60 mb-2">
                {isBeforeOpen ? 'Ouverture dans' : isOpen ? 'Fermeture dans' : 'Resultats dans'}
              </p>
              <div className="flex items-center gap-3 sm:gap-4 justify-center md:justify-start mb-6">
                <CountdownUnit value={cd.days} label="jours" />
                <span className="text-violet-400/50 text-2xl font-bold">:</span>
                <CountdownUnit value={cd.hours} label="heures" />
                <span className="text-violet-400/50 text-2xl font-bold">:</span>
                <CountdownUnit value={cd.minutes} label="min" />
                <span className="text-violet-400/50 text-2xl font-bold">:</span>
                <CountdownUnit value={cd.seconds} label="sec" />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <Link
              href={ctaHref}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all ${
                isOpen
                  ? 'bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-400 hover:to-blue-400 shadow-violet-500/25 hover:shadow-violet-500/40'
                  : isPreSelection
                    ? 'bg-gradient-to-r from-amber-500/60 to-orange-500/60 shadow-amber-500/15'
                    : isBeforeOpen
                      ? 'bg-gradient-to-r from-violet-500/60 to-blue-500/60 shadow-violet-500/15'
                      : 'bg-white/10 shadow-none'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {ctaLabel}
            </Link>
            <Link
              href="/star-academy-tiktok"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold transition hover:scale-[1.03] active:scale-[0.97]"
            >
              Voir la page
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
