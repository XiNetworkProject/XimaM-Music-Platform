'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, RotateCw, Sparkles } from 'lucide-react';
import BoosterDialog from './BoosterDialog';
import RewardWheel from './RewardWheel';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import {
  WHEEL_SEGMENTS,
  wheelLanding,
  type WheelOutcome,
  type WheelResponse,
} from './wheelModel';

export default function DailyRewardWheel({
  onSpin,
  onClose,
  onInventory,
  canSpin,
  availableIn,
  preview = false,
}: {
  onSpin: () => Promise<WheelResponse>;
  onClose: () => void;
  onInventory: () => void;
  canSpin: boolean;
  availableIn?: string;
  preview?: boolean;
}) {
  const [phase, setPhase] = useState<
    'ready' | 'spinning' | 'settling' | 'result' | 'error'
  >('ready');
  const [result, setResult] = useState<WheelOutcome | null>(null);
  const [error, setError] = useState('');
  const rotor = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const alive = useRef(true);
  const started = useRef(false);
  const motion = useLivingMotion();
  const immediate = !motion.preferred || motion.constrained;
  const skipMotion = useRef(immediate);
  skipMotion.current = immediate;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      animation.current?.cancel();
    };
  }, []);
  useEffect(() => {
    if (!immediate || !animation.current) return;
    if (phase === 'settling') animation.current.finish();
    else if (phase === 'spinning') animation.current.cancel();
  }, [immediate, phase]);

  const spin = async () => {
    if (started.current || !canSpin) return;
    started.current = true;
    setPhase('spinning');
    const node = rotor.current;
    let looping: Animation | null = null;
    if (node && !skipMotion.current) {
      looping = node.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: 800, iterations: Infinity, easing: 'linear' }
      );
      animation.current = looping;
    }
    try {
      const response = await onSpin();
      if (!alive.current) return;
      const current = (Number(looping?.currentTime ?? 0) / 800) * 360;
      if (node) node.style.transform = `rotate(${current}deg)`;
      looping?.cancel();
      animation.current = null;
      if (!response.ok) {
        setError(response.error);
        setPhase('error');
        return;
      }
      const landing = wheelLanding(response.result.index, current);
      setPhase('settling');
      if (node) {
        node.style.transform = `rotate(${landing}deg)`;
        if (!skipMotion.current) {
          const settling = node.animate(
            [
              { transform: `rotate(${current}deg)` },
              { transform: `rotate(${landing}deg)` },
            ],
            { duration: 4200, easing: 'cubic-bezier(.12,.7,.12,1)' }
          );
          animation.current = settling;
          await settling.finished;
          animation.current = null;
        }
      }
      if (!alive.current) return;
      setResult(response.result);
      setPhase('result');
    } catch {
      if (!alive.current) return;
      animation.current?.cancel();
      animation.current = null;
      setError(
        'Impossible de confirmer le résultat. Vérifie tes récompenses avant de relancer un tour.'
      );
      setPhase('error');
    }
  };
  const busy = phase === 'spinning' || phase === 'settling';
  const won = result && result.reward.kind !== 'none';
  return (
    <BoosterDialog
      title="La roue Synaura"
      onClose={onClose}
      className="bw-dialog"
    >
      <div
        className="bw-scene"
        data-phase={phase}
        data-motion={immediate ? 'off' : 'on'}
      >
        <div className="bw-stage">
          <span className="bw-orbit bw-orbit-one" />
          <span className="bw-orbit bw-orbit-two" />
          <RewardWheel
            rotorRef={rotor}
            winningIndex={result?.index}
            active={busy || !!won}
          />
          {won && (
            <div className="bw-celebration" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      '--angle': `${i * 137.5}deg`,
                      '--delay': `${(i % 4) * 70}ms`,
                      '--spark-color': WHEEL_SEGMENTS[i % 7].color,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
          <span className="bw-stage-note">
            {preview
              ? 'APERÇU · AUCUN TOUR CONSOMMÉ'
              : 'UN TOUR OFFERT TOUTES LES 24 H'}
          </span>
        </div>
        <div className="bw-content">
          <span className="bw-kicker">TON RENDEZ-VOUS CHANCE</span>
          <div
            className="bw-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <h3>
              {phase === 'error' ? (
                'Un instant…'
              ) : busy ? (
                'Ça tourne…'
              ) : result ? (
                result.reward.kind === 'none' ? (
                  'À demain !'
                ) : (
                  result.reward.label
                )
              ) : (
                <>
                  À toi <br />
                  de <em>tourner.</em>
                </>
              )}
            </h3>
            <p>
              {phase === 'error'
                ? error
                : busy
                ? 'La roue trouve ton prochain petit bonus.'
                : result
                ? result.reward.kind === 'booster'
                  ? preview
                    ? 'Un booster dans cet aperçu. Aucun gain réel.'
                    : 'Ton booster est dans ta réserve. À toi de choisir quand l’activer.'
                  : result.reward.kind === 'credits'
                  ? preview
                    ? 'Des crédits dans cet aperçu. Aucun gain réel.'
                    : 'Tes crédits IA sont ajoutés à ton solde. À toi de créer.'
                  : 'Pas de gain cette fois. Un nouveau tour t’attend demain.'
                : 'Des crédits pour créer. Des boosts pour rayonner. Un tour, et on voit.'}
            </p>
          </div>
          {phase === 'ready' ? (
            <>
              <button
                className="bw-spin-button"
                onClick={spin}
                disabled={!canSpin}
              >
                <RotateCw size={19} />
                {canSpin ? 'Faire tourner' : 'De retour demain'}
              </button>
              {!canSpin && (
                <p className="bw-cooldown">
                  {availableIn
                    ? `Prochain tour dans ${availableIn}`
                    : 'Ton tour a déjà été joué.'}
                </p>
              )}
            </>
          ) : busy ? (
            <div className="bw-running">
              <span />
              {phase === 'spinning' ? 'Tour en cours' : 'Le résultat approche'}
            </div>
          ) : (
            <button
              className="bw-spin-button"
              onClick={
                result?.reward.kind === 'booster' ? onInventory : onClose
              }
            >
              {result?.reward.kind === 'booster' ? 'Voir ma réserve' : 'Fermer'}
              <ArrowRight size={18} />
            </button>
          )}
          <div className="bw-legend" aria-label="Récompenses et probabilités">
            {WHEEL_SEGMENTS.map((segment, i) => (
              <div key={segment.key} data-selected={result?.index === i}>
                <i style={{ background: segment.color }} />
                <span>{segment.label}</span>
                <small>{segment.weight} %</small>
              </div>
            ))}
          </div>
          <span className="bw-free">
            <Sparkles size={12} />
            Gratuit. Rien à miser.
          </span>
        </div>
      </div>
    </BoosterDialog>
  );
}
