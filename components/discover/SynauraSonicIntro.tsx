'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import SynauraLogo from '@/components/brand/SynauraLogo';
import { SYNAURA_BRAND } from '@/lib/brand';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import { startSynauraSonicLogo, stopSynauraSonicLogo } from '@/lib/ui/entrySound';
import styles from './SynauraSonicIntro.module.css';

// 3,2 s de son, puis 0,4 s de stabilisation visuelle avant la sortie.
const FULL_DURATION_MS = 3600;
const EXIT_DURATION_MS = 360;

export default function SynauraSonicIntro({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: (reason: 'sound' | 'silent' | 'skip') => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const [phase, setPhase] = useState<'prompt' | 'playing'>('prompt');
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const finishTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    finishTimer.current = null;
    exitTimer.current = null;
  }, []);

  const finish = useCallback((reason: 'sound' | 'silent' | 'skip') => {
    clearTimers();
    stopSynauraSonicLogo(audioRef.current);
    recordEntryEvent('sonic_intro_complete', { reason, reducedMotion: reduced });
    exitTimer.current = window.setTimeout(() => onComplete(reason), reduced ? 80 : EXIT_DURATION_MS);
  }, [clearTimers, onComplete, reduced]);

  const play = (withSound: boolean) => {
    if (phase === 'playing') return;
    const shouldPlaySound = withSound && !muted;
    setPhase('playing');
    const played = shouldPlaySound ? startSynauraSonicLogo(audioRef.current) : false;
    recordEntryEvent('sonic_intro_start', { sound: played, reducedMotion: reduced });
    const duration = reduced && !played ? 520 : FULL_DURATION_MS;
    finishTimer.current = window.setTimeout(() => finish(played ? 'sound' : 'silent'), duration);
  };

  useEffect(() => {
    if (!open) return;
    setPhase('prompt');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => primaryRef.current?.focus(), 0);
    return () => {
      clearTimers();
      stopSynauraSonicLogo(audioRef.current);
      document.body.style.overflow = previousOverflow;
    };
  }, [clearTimers, open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finish('skip');
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') || []);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (typeof document === 'undefined') return null;
  const portalRoot = document.getElementById('synaura-overlay-root') || document.body;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.section
          ref={rootRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sonic-intro-title"
          className={styles.root}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.08 : EXIT_DURATION_MS / 1000 }}
          onKeyDown={handleKeyDown}
          data-phase={phase}
          data-reduced-motion={reduced || undefined}
        >
          <audio ref={audioRef} src={SYNAURA_BRAND.sonicLogo} preload="metadata" />
          <div className={styles.ambient} aria-hidden />
          <div className={styles.mist} aria-hidden />
          <div className={styles.orbit} aria-hidden />

          {phase === 'prompt' ? (
            <motion.div className={styles.prompt} initial={{ opacity: 0, y: reduced ? 0 : 12 }} animate={{ opacity: 1, y: 0 }}>
              <SynauraLogo size={148} className={styles.promptLogo} priority />
              <p className={styles.eyebrow}>Une signature de 3,2 secondes</p>
              <h1 id="sonic-intro-title" className={styles.title}>Entre dans l’Aura.</h1>
              <p className={styles.description}>L’identité sonore ne démarre jamais seule. Choisis l’expérience complète, ou découvre Synaura en silence.</p>
              <div className={styles.actions}>
                <button ref={primaryRef} type="button" className={styles.primary} onClick={() => play(true)}>
                  <Volume2 className="mr-2 inline h-4 w-4" /> Découvrir avec le son
                </button>
                <button type="button" className={styles.secondary} onClick={() => play(false)}>
                  <VolumeX className="mr-2 inline h-4 w-4" /> Continuer sans le son
                </button>
              </div>
              <p className={styles.hint}>Le volume reste sous ton contrôle. Échap permet de passer.</p>
            </motion.div>
          ) : (
            <div className={styles.cinema} aria-live="polite" aria-label="Signature visuelle Synaura en cours">
              <span className={styles.energyPoint} aria-hidden />
              <span className={styles.signatureRing} aria-hidden />
              <div className={styles.logoReveal}><SynauraLogo size={272} priority /></div>
              <p id="sonic-intro-title" className={styles.wordmark}>Synaura</p>
              <p className={styles.tagline}>Écoute · crée · partage</p>
            </div>
          )}

          <button type="button" className={styles.skip} onClick={() => finish('skip')}>Passer</button>
        </motion.section>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
