'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import {
  ArrowRight,
  Check,
  ChevronsDown,
  Clock3,
  Music2,
  User as UserRound,
  Zap,
} from 'lucide-react';
import BoosterDialog from './BoosterDialog';
import { campaignDefinition } from '@/lib/boosters/campaigns';
import {
  CHARGE_MS,
  FRACTURE_MS,
  BURST_MS,
  openingPhase,
  tearProgress,
  TEAR_COMPLETE_AT,
} from './openingSequence';
import { useLivingMotion } from '@/components/ambient/useLivingMotion';
import { RARITIES, RARITY_LABEL, type Booster } from '@/lib/boosters/policy';
import './booster-opening.css';

export type OpeningReward = { inventory_id: string; booster: Booster };
type Props = {
  rewards: OpeningReward[] | null;
  onClose: () => void;
  onInventory: () => void;
  onSelect: (reward: OpeningReward) => void;
  preview?: boolean;
};

// Deterministic particles: no hydration jitter, no canvas loop, no audio player.
const PARTICLES = Array.from({ length: 32 }, (_, i) => {
  const angle = i * 2.399963;
  const distance = 135 + ((i * 37) % 170);
  return {
    '--x': `${Math.cos(angle) * distance}px`,
    '--y': `${Math.sin(angle) * distance}px`,
    '--delay': `${(i % 7) * 45}ms`,
    '--size': `${2 + (i % 3)}px`,
  } as CSSProperties;
});
const SHARDS = Array.from(
  { length: 12 },
  (_, i) =>
    ({
      '--angle': `${i * 30}deg`,
      '--travel': `${155 + (i % 4) * 30}px`,
      '--delay': `${(i % 3) * 30}ms`,
    } as CSSProperties)
);

function Capsule({ half }: { half: 'left' | 'right' }) {
  return (
    <div className={`bo-capsule-half bo-capsule-${half}`}>
      <div className="bo-capsule-face">
        <span className="bo-foil" />
        <span className="bo-engraving">SYNAURA</span>
        <div className="bo-emblem">
          <Zap strokeWidth={1} fill="currentColor" />
        </div>
        <span className="bo-pack-label">
          BOOSTER<span>RELEASE YOUR SOUND</span>
        </span>
      </div>
    </div>
  );
}

export default function BoosterOpening({
  rewards,
  onClose,
  onInventory,
  onSelect,
  preview = false,
}: Props) {
  const motion = useLivingMotion();
  const [skip, setSkip] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [tornAt, setTornAt] = useState<number | null>(null);
  const progressRef = useRef(0);
  const completed = useRef(false);
  const control = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{
    id: number;
    startY: number;
    start: number;
    height: number;
  } | null>(null);
  const started = useRef<number | null>(null);
  const readyAt = useRef<number | null>(null);
  const hasReward = !!rewards?.length;
  // A hidden tab only pauses the ambience; it must not finish the user's tear.
  const immediate = skip || !motion.preferred || motion.constrained;

  useEffect(() => {
    started.current ??= performance.now();
    if (hasReward && readyAt.current === null)
      readyAt.current = performance.now() - started.current;
    const tick = () => setElapsed(performance.now() - started.current!);
    tick();
    if (immediate) return;
    const start =
      tornAt !== null && readyAt.current !== null
        ? Math.max(tornAt, readyAt.current)
        : null;
    const now = performance.now() - started.current;
    const deadlines =
      start === null
        ? [CHARGE_MS]
        : [start + FRACTURE_MS, start + FRACTURE_MS + BURST_MS];
    const timers = deadlines
      .filter((at) => at > now)
      .map((at) => window.setTimeout(tick, Math.ceil(at - now) + 1));
    return () => timers.forEach(window.clearTimeout);
  }, [hasReward, immediate, tornAt]);

  const phase = openingPhase(
    elapsed,
    readyAt.current,
    immediate,
    tornAt,
    progress
  );
  const tearable = !immediate && tornAt === null;
  const completeTear = () => {
    if (completed.current) return;
    completed.current = true;
    progressRef.current = 1;
    setProgress(1);
    setDragging(false);
    setTornAt(performance.now() - (started.current ?? performance.now()));
    control.current?.closest('dialog')?.focus({ preventScroll: true });
  };
  const releasePointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const startTear = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      !tearable ||
      completed.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      gesture.current
    )
      return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      id: event.pointerId,
      startY: event.clientY,
      start: progressRef.current,
      height: event.currentTarget.getBoundingClientRect().height,
    };
    setDragging(true);
  };
  const moveTear = (event: PointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId || completed.current) return;
    event.preventDefault();
    const next = Math.max(
      progressRef.current,
      tearProgress(active.start, event.clientY - active.startY, active.height)
    );
    progressRef.current = next;
    setProgress(next);
    if (next >= TEAR_COMPLETE_AT) {
      completeTear();
      releasePointer(event);
    }
  };

  const revealed = hasReward && (phase === 'revealed' || immediate);
  const rarity =
    rewards?.reduce<Booster['rarity']>(
      (best, item) =>
        RARITIES.indexOf(item.booster.rarity) > RARITIES.indexOf(best)
          ? item.booster.rarity
          : best,
      'common'
    ) || 'rare';
  const colored = phase === 'burst' || revealed;
  const status = revealed
    ? preview
      ? 'Aperçu terminé. Aucune récompense attribuée.'
      : `${rewards!.length} boost${rewards!.length > 1 ? 's' : ''} ajouté${
          rewards!.length > 1 ? 's' : ''
        } à ta réserve.`
    : phase === 'waiting'
    ? 'Récupération du boost en cours…'
    : tearable
    ? 'Déchire la carte en glissant vers le bas. Au clavier, utilise Entrée ou Espace.'
    : 'Ouverture du booster…';

  return (
    <BoosterDialog
      title={preview ? 'Aperçu de l’ouverture' : 'Ouverture du booster'}
      className="bo-opening"
      onClose={onClose}
    >
      <div
        className="bo-experience"
        data-phase={revealed ? 'revealed' : phase}
        data-rarity={colored ? rarity : 'sealed'}
        data-motion={immediate || !motion.enabled ? 'off' : 'on'}
        data-dragging={dragging ? 'true' : 'false'}
        style={
          {
            '--tear': progress,
            '--tear-tip': `${progress * 100}%`,
          } as CSSProperties
        }
      >
        <div className="bo-space" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="bo-topline">
          <span>SYNAURA / BOOSTERS</span>
          <span>
            {preview ? 'APERÇU · SANS RÉCOMPENSE' : 'UN PEU PLUS LOIN'}
          </span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
        {!revealed ? (
          <>
            <div className="bo-arena">
              <div className="bo-orbits" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="bo-ground" aria-hidden="true" />
              <div className="bo-particles" aria-hidden="true">
                {PARTICLES.map((style, i) => (
                  <i key={i} style={style} />
                ))}
              </div>
              <div className="bo-capsule" aria-hidden="true">
                <Capsule half="left" />
                <Capsule half="right" />
                <div className="bo-core" />
                <span className="bo-seam" />
                <span className="bo-tear-front" />
                {tearable && progress === 0 && (
                  <span className="bo-tear-handle">
                    <ChevronsDown size={19} />
                  </span>
                )}
              </div>
              {tearable && (
                <button
                  ref={control}
                  className="bo-tear-control"
                  aria-label="Déchirer le booster"
                  aria-describedby="bo-tear-instruction"
                  onPointerDown={startTear}
                  onPointerMove={moveTear}
                  onPointerUp={releasePointer}
                  onPointerCancel={releasePointer}
                  onLostPointerCapture={releasePointer}
                  onClick={(event) => {
                    if (event.detail === 0) completeTear();
                  }}
                />
              )}
              {phase === 'burst' && (
                <div className="bo-impact" aria-hidden="true">
                  <span className="bo-shockwave" />
                  <span className="bo-shockwave bo-shockwave-second" />
                  <span className="bo-bloom" />
                  {SHARDS.map((style, i) => (
                    <i key={i} style={style} />
                  ))}
                </div>
              )}
            </div>
            <div className="bo-anticipation">
              <span className="bo-kicker">
                {phase === 'waiting'
                  ? 'ON RÉCUPÈRE TON BOOST'
                  : phase === 'burst'
                  ? 'LE VOILÀ.'
                  : progress > 0
                  ? 'ENCORE UN PEU…'
                  : 'À TOI DE JOUER'}
              </span>
              <h3>
                {phase === 'waiting'
                  ? 'Encore un instant…'
                  : phase === 'burst'
                  ? RARITY_LABEL[rarity]
                  : 'Déchire la carte.'}
              </h3>
              {tearable && (
                <p className="bo-tear-instruction" id="bo-tear-instruction">
                  {progress > 0 && !dragging
                    ? 'Reprends le geste pour finir de l’ouvrir.'
                    : 'Maintiens la carte et glisse vers le bas.'}
                  <span className="sr-only">
                    {' '}
                    Entrée ou Espace pour ouvrir au clavier.
                  </span>
                </p>
              )}
              {!skip && !immediate && (
                <button
                  className="bo-skip"
                  onClick={(event) => {
                    event.currentTarget
                      .closest('dialog')
                      ?.focus({ preventScroll: true });
                    setSkip(true);
                  }}
                >
                  Passer l’animation <ArrowRight size={14} />
                </button>
              )}
              {phase === 'waiting' && (
                <p>Tu peux fermer : la récupération continue.</p>
              )}
            </div>
          </>
        ) : (
          <div className="bo-results">
            <div className="bo-result-heading">
              <span className="bo-kicker">
                {preview ? 'EXEMPLE DE RÉVÉLATION' : 'À TOI DE JOUER'}
              </span>
              <h3>
                {rewards!.length > 1 ? 'Plus de possibilités.' : 'C’est à toi.'}
              </h3>
            </div>
            <div className="bo-cards" data-count={rewards!.length}>
              {rewards!.map((reward, i) => (
                <article
                  key={reward.inventory_id}
                  className="bo-reward"
                  data-rarity={reward.booster.rarity}
                  style={{ '--order': Math.min(i, 4) } as CSSProperties}
                >
                  <div className="bo-reward-art" aria-hidden="true">
                    <span className="bo-reward-orbit" />
                    <span className="bo-reward-halo" />
                    <div className="bo-reward-gem">
                      <Zap strokeWidth={1.15} fill="currentColor" />
                    </div>
                    <i />
                    <i />
                    <i />
                  </div>
                  <span className="bo-rarity">
                    {RARITY_LABEL[reward.booster.rarity]}
                  </span>
                  <h4>{reward.booster.name}</h4>
                  <div className="bo-reward-meta">
                    <span>
                      {reward.booster.type === 'credits' ? (
                        <Zap size={14} />
                      ) : reward.booster.type === 'artist' ? (
                        <UserRound size={14} />
                      ) : (
                        <Music2 size={14} />
                      )}
                      {reward.booster.type === 'credits'
                        ? 'Studio IA'
                        : reward.booster.type === 'artist'
                        ? 'Artiste'
                        : 'Morceau'}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {reward.booster.type === 'credits'
                        ? `+${
                            campaignDefinition(reward.booster.key)?.credits || 0
                          } crédits`
                        : `${reward.booster.duration_hours} h`}
                    </span>
                  </div>
                  {!preview && (
                    <button
                      className="bo-select"
                      onClick={() => onSelect(reward)}
                    >
                      Préparer l’activation <ArrowRight size={15} />
                    </button>
                  )}
                </article>
              ))}
            </div>
            <div className="bo-result-actions">
              <p>
                <Check size={15} />
                {preview
                  ? 'Démonstration visuelle · aucun boost utilisé'
                  : 'Dans ta réserve. Active-le quand tu veux.'}
              </p>
              <button className="bo-done" onClick={onInventory}>
                {preview ? 'Rejouer une ouverture' : 'Voir ma réserve'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </BoosterDialog>
  );
}
