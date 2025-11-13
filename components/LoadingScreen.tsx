'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface LoadingScreenProps {
  progress?: number;
  message?: string;
  isPreloading?: boolean;
}

const STEPS = [
  { key: 'boot', label: 'Initialisation du studio', threshold: 5 },
  { key: 'session', label: 'Connexion à votre session', threshold: 25 },
  { key: 'feed', label: 'Préparation du flux “Pour toi”', threshold: 50 },
  { key: 'ai', label: 'Réveil des IA musicales', threshold: 75 },
  { key: 'stage', label: 'Mise en place de la scène', threshold: 95 },
];

// Fond : grille + halos néon
function SoundGridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Gradient global */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#05010b] via-[#050214] to-[#020010]" />

      {/* Grille subtile */}
      <div
        className="absolute inset-[-1px] opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Halos néon */}
      <div
        className="absolute w-[420px] h-[420px] -top-[160px] -left-[120px] rounded-full blur-[100px] opacity-[0.5]"
        style={{
          background:
            'radial-gradient(circle, rgba(111,76,255,0.85) 0%, rgba(111,76,255,0.3) 30%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[380px] h-[380px] -bottom-[180px] -right-[60px] rounded-full blur-[90px] opacity-[0.45]"
        style={{
          background:
            'radial-gradient(circle, rgba(0,208,187,0.8) 0%, rgba(0,208,187,0.25) 35%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[520px] h-[520px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] rounded-full blur-[120px] opacity-[0.4]"
        style={{
          background:
            'radial-gradient(circle, rgba(235,102,255,0.9) 0%, rgba(235,102,255,0.3) 35%, transparent 70%)',
        }}
      />
    </div>
  );
}

// Particules discrètes
function Particles() {
  const particles = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const count = 22;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      delay: Math.random() * 4,
      duration: 4 + Math.random() * 3,
    }));
  }, []);

  if (!particles.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-[3px] h-[3px] rounded-full bg-cyan-300/50 shadow-[0_0_8px_rgba(45,255,230,0.7)]"
          initial={{ x: p.x, y: p.y, opacity: 0 }}
          animate={{
            y: [p.y, p.y - 40, p.y - 10],
            opacity: [0, 1, 0],
            scale: [0.8, 1.3, 0.9],
          }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Orbe central = cœur du nouveau design
function OrbLoader({
  progress,
  isPreloading,
}: {
  progress: number;
  isPreloading: boolean;
}) {
  const displayProgress =
    isPreloading && Number.isFinite(progress) ? Math.round(progress) : undefined;

  return (
    <div className="relative flex items-center justify-center">
      {/* Anneau externe lumineux */}
      <motion.div
        className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full border border-white/10 bg-gradient-to-br from-white/4 via-white/0 to-white/0"
        animate={{
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Halo pulsé */}
      <motion.div
        className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full blur-3xl bg-accent-brand/40"
        animate={{
          opacity: [0.3, 0.8, 0.3],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Anneaux « waveform » */}
      <div className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center">
        {Array.from({ length: 16 }).map((_, i) => {
          const delay = i * 0.08;
          return (
            <motion.div
              key={i}
              className="absolute w-[2px] rounded-full bg-gradient-to-b from-cyan-300/90 via-fuchsia-400/80 to-violet-500/70"
              style={{
                height: 28,
                transformOrigin: 'bottom center',
              }}
              animate={{
                scaleY: isPreloading
                  ? [0.4, 1.4, 0.6]
                  : [0.7, 1.1, 0.7],
                opacity: [0.3, 1, 0.5],
                rotate: 360 / 16 * i,
              }}
              transition={{
                duration: 1.6,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* Noyau + logo */}
      <motion.div
        className="relative w-32 h-32 md:w-36 md:h-36 rounded-3xl bg-gradient-to-br from-[#0f061f] via-[#150b2a] to-[#050111] border border-white/10 shadow-[0_0_40px_rgba(120,95,255,0.65)] flex items-center justify-center overflow-hidden"
        animate={{
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Overlay scanline */}
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_0_0,rgba(255,255,255,0.25),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(0,255,214,0.3),transparent_55%)] opacity-60 mix-blend-screen"
          animate={{
            opacity: [0.4, 0.85, 0.4],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Logo Synaura */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-1"
          animate={{
            y: [2, -2, 2],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src="/synaura_symbol.svg"
            alt="Synaura"
            width={64}
            height={64}
            className="drop-shadow-[0_0_22px_rgba(255,255,255,0.55)]"
          />
        </motion.div>

        {/* Petit text “LIVE” */}
        <motion.div
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 backdrop-blur"
          animate={{
            opacity: [0.4, 1, 0.4],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[9px] font-semibold tracking-[0.18em] text-white/80 uppercase">
            Sync
          </span>
        </motion.div>
      </motion.div>

      {/* Progress dans un anneau fin */}
      {isPreloading && typeof displayProgress === 'number' && (
        <div className="absolute -bottom-16 w-40 md:w-48 flex flex-col items-center gap-1">
          <div className="relative w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ['-100%', '150%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="uppercase tracking-[0.2em] text-[10px] text-white/50">
              Progression
            </span>
            <span className="font-semibold text-white/90">
              {String(displayProgress).padStart(2, '0')}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Steps à droite
function LoadingSteps({ progress }: { progress: number }) {
  return (
    <div className="w-full md:w-72 xl:w-80 bg-white/3 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45 mb-3">
        Préparation de l&apos;expérience
      </p>
      <div className="space-y-2.5">
        {STEPS.map((step, index) => {
          const status =
            progress >= step.threshold
              ? 'done'
              : index === 0 || progress >= (STEPS[index - 1]?.threshold ?? 0)
              ? 'current'
              : 'todo';

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={[
                  'flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-semibold',
                  status === 'done' && 'border-emerald-300/80 bg-emerald-400/10 text-emerald-200',
                  status === 'current' && 'border-cyan-300/80 bg-cyan-400/10 text-cyan-200',
                  status === 'todo' && 'border-white/15 bg-white/0 text-white/30',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {status === 'done' ? '✓' : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 leading-snug">
                  {step.label}
                </p>
                {status === 'current' && (
                  <motion.div
                    className="mt-0.5 h-[2px] w-14 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-transparent"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '3.5rem', opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-white/45 flex items-center justify-between gap-3">
        <span>Votre univers musical se prépare...</span>
        <motion.span
          className="inline-flex items-center gap-1"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/90 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
          <span>Live</span>
        </motion.span>
      </div>
    </div>
  );
}

export default function LoadingScreen({
  progress = 0,
  message,
  isPreloading = true,
}: LoadingScreenProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const hasProgress = Number.isFinite(progress) && progress >= 0 && progress <= 100;

  // Anti-hydratation chelou côté Next
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Progress lissé
  useEffect(() => {
    if (!isPreloading || !hasProgress) return;

    setAnimatedProgress((prev) => (prev > progress ? progress : prev));

    const id = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev >= progress) return progress;
        const delta = Math.max(0.6, (progress - prev) / 5);
        const next = prev + delta;
        return next > progress ? progress : next;
      });
    }, 45);

    return () => clearInterval(id);
  }, [progress, isPreloading, hasProgress]);

  const displayProgress = hasProgress ? animatedProgress : 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center text-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
      suppressHydrationWarning
    >
      <SoundGridBackground />
      {isMounted && typeof window !== 'undefined' && <Particles />}

      <div className="relative z-10 w-full max-w-6xl px-5 md:px-10 lg:px-14 py-8 md:py-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-stretch">
          {/* Bloc gauche : branding + message */}
          <div className="w-full md:w-72 xl:w-80 space-y-4 md:space-y-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-xl bg-accent-brand/60 opacity-60" />
                <div className="relative w-9 h-9 rounded-xl bg-black/70 border border-white/15 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/synaura_symbol.svg"
                    alt="Synaura"
                    width={20}
                    height={20}
                    className="drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.28em] text-white/50">
                  Synaura
                </span>
                <span className="text-sm font-semibold text-white/90">
                  Studio en cours de lancement
                </span>
              </div>
            </div>

            <div className="bg-white/3 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
              <p className="text-sm md:text-base font-semibold text-white/90 mb-1">
                {message ||
                  (isPreloading
                    ? 'Nous préparons votre univers sonore personnalisé...'
                    : 'Connexion à l’interface Synaura...')}
              </p>
              <p className="text-xs md:text-[13px] text-white/55 leading-relaxed">
                Vos playlists, vos créateurs, vos IA musicales. Tout se met en
                place en quelques secondes. Installez-vous, la scène se
                configure.
              </p>
            </div>

            <div className="hidden md:flex flex-col gap-1.5 text-[11px] text-white/45">
              <span>✨ Tip : vous pourrez reprendre là où vous vous êtes arrêté·e.</span>
              <span>🎧 Synaura adapte la page d’accueil en fonction de vos écoutes.</span>
            </div>
          </div>

          {/* Bloc centre : orbe */}
          <div className="flex-1 flex items-center justify-center relative min-h-[260px] md:min-h-[320px]">
            <OrbLoader progress={displayProgress} isPreloading={isPreloading} />
          </div>

          {/* Bloc droite : steps */}
          <div className="w-full md:w-72 xl:w-80">
            <LoadingSteps progress={displayProgress} />
          </div>
        </div>

        {/* Bas de page */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-white/40">
          <span>
            © {new Date().getFullYear()} Synaura — Plateforme de partage musical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/80 animate-pulse" />
            <span>Connexion sécurisée en cours...</span>
          </span>
        </div>
      </div>
    </div>
  );
}
