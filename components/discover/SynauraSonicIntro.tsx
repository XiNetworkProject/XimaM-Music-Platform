'use client';

import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SynauraLogo from '@/components/brand/SynauraLogo';
import { SYNAURA_BRAND } from '@/lib/brand';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import { startSynauraSonicLogo, stopSynauraSonicLogo } from '@/lib/ui/entrySound';
import { SONIC_TIMELINE } from './synauraSonicScene.config';
import styles from './SynauraSonicIntro.module.css';

const loadSonicScene = () => import('./SynauraSonicScene');
const SynauraSonicScene = dynamic(loadSonicScene, { ssr: false });
const EXIT_DURATION_MS = 260;

type CompletionReason = 'sound' | 'silent' | 'skip';

function supportsWebGLRenderer() {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
      || canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

class SonicSceneBoundary extends Component<{
  children: ReactNode;
  onFailure: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') console.error('Synaura WebGL intro failed', error, info);
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SynauraSonicIntro({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: (reason: CompletionReason) => void;
}) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const debugFlags = (() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') {
      return { fallback: false, reduced: false };
    }
    const search = new URLSearchParams(window.location.search);
    return { fallback: search.get('sonicFallback') === '1', reduced: search.get('sonicReduced') === '1' };
  })();
  const reduced = prefersReducedMotion || debugFlags.reduced;
  const [phase, setPhase] = useState<'prompt' | 'preparing' | 'playing'>('prompt');
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const requestedSoundRef = useRef(false);
  const completionReasonRef = useRef<CompletionReason>('silent');
  const startingRef = useRef(false);

  const debugTime = (() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('sonicTime');
    if (raw === null) return null;
    const time = Number(raw);
    return Number.isFinite(time) ? Math.min(SONIC_TIMELINE.duration, Math.max(0, time)) : null;
  })();

  const finish = useCallback((reason: CompletionReason) => {
    stopSynauraSonicLogo(audioRef.current);
    recordEntryEvent('sonic_intro_complete', { reason, reducedMotion: reduced });
    onComplete(reason);
  }, [onComplete, reduced]);

  const startExperience = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    const played = requestedSoundRef.current ? await startSynauraSonicLogo(audioRef.current) : false;
    completionReasonRef.current = played ? 'sound' : 'silent';
    recordEntryEvent('sonic_intro_start', {
      sound: played,
      reducedMotion: reduced,
      renderer: webglAvailable && !webglFailed ? 'webgl' : 'fallback',
    });
    setPhase('playing');
  }, [reduced, webglAvailable, webglFailed]);

  const play = (withSound: boolean) => {
    if (phase !== 'prompt') return;
    requestedSoundRef.current = withSound;
    setPhase('preparing');
    if (webglAvailable === false || webglFailed) void startExperience();
  };

  const handleSceneFailure = useCallback(() => {
    setWebglFailed(true);
    if (phase === 'preparing') void startExperience();
  }, [phase, startExperience]);

  useEffect(() => {
    if (!open) return;
    setPhase('prompt');
    setWebglFailed(false);
    setWebglAvailable(debugFlags.fallback ? false : supportsWebGLRenderer());
    startingRef.current = false;
    requestedSoundRef.current = false;
    completionReasonRef.current = 'silent';
    void loadSonicScene();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => primaryRef.current?.focus(), 0);
    return () => {
      stopSynauraSonicLogo(audioRef.current);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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
  const useFallback = webglAvailable === false || webglFailed;

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
          data-renderer={useFallback ? 'fallback' : 'webgl'}
        >
          <audio ref={audioRef} src={SYNAURA_BRAND.sonicLogo} preload="metadata" />

          {phase === 'prompt' ? (
            <>
              <div className={styles.ambient} aria-hidden />
              <div className={styles.mist} aria-hidden />
              <div className={styles.orbit} aria-hidden />
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
            </>
          ) : (
            <div className={styles.cinema} aria-live="polite" aria-label="Signature visuelle Synaura en cours" data-sonic-cinema>
              {useFallback ? (
                <div
                  className={styles.webglFallback}
                  data-sonic-fallback
                  onAnimationEnd={(event) => {
                    if (event.currentTarget === event.target && phase === 'playing') finish(completionReasonRef.current);
                  }}
                >
                  <SynauraLogo size={reduced ? 250 : 360} className={styles.fallbackLogo} priority decorative />
                  <span className={styles.fallbackAura} aria-hidden />
                </div>
              ) : (
                <SonicSceneBoundary onFailure={handleSceneFailure}>
                  <SynauraSonicScene
                    active={phase === 'playing'}
                    reducedMotion={reduced}
                    debugTime={debugTime}
                    onReady={() => { if (phase === 'preparing') void startExperience(); }}
                    onComplete={() => finish(completionReasonRef.current)}
                    onContextLost={handleSceneFailure}
                  />
                </SonicSceneBoundary>
              )}
              <h1 id="sonic-intro-title" className="sr-only">Synaura</h1>
            </div>
          )}

          <button type="button" className={styles.skip} onClick={() => finish('skip')}>Passer</button>
        </motion.section>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
