'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Gem, Package, Sparkles, Star, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { UButton } from '@/components/ui/UnifiedUI';

type BoosterRarity = 'common' | 'rare' | 'epic' | 'legendary';
type BoosterType = 'track' | 'artist';

export type PackReceivedItem = {
  inventory_id: string;
  booster: {
    id: string;
    key: string;
    name: string;
    description?: string;
    type: BoosterType;
    rarity: BoosterRarity;
    multiplier: number;
    duration_hours: number;
  };
};

const RARITY_CFG = {
  common: { gradient: 'from-zinc-500 to-zinc-700', color: '#a1a1aa', glow: 'rgba(161,161,170,0.3)', icon: Sparkles, label: 'Commun', rank: 0 },
  rare: { gradient: 'from-blue-400 to-indigo-600', color: '#60a5fa', glow: 'rgba(96,165,250,0.4)', icon: Star, label: 'Rare', rank: 1 },
  epic: { gradient: 'from-purple-400 to-fuchsia-600', color: '#a855f7', glow: 'rgba(168,85,247,0.4)', icon: Crown, label: 'Epique', rank: 2 },
  legendary: { gradient: 'from-amber-400 via-orange-500 to-red-500', color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', icon: Gem, label: 'Legendaire', rank: 3 },
} as const;

const KEYFRAMES = `
  @keyframes pack-tear {
    0% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
    50% { clip-path: polygon(10% 5%, 90% 3%, 95% 97%, 5% 95%); }
    100% { clip-path: polygon(20% 10%, 80% 8%, 85% 92%, 15% 90%); opacity: 0; transform: scale(1.1); }
  }
  @keyframes pack-foil {
    0% { transform: translateX(-150%) rotate(25deg); }
    100% { transform: translateX(250%) rotate(25deg); }
  }
  @keyframes card-flash {
    0% { opacity: 0; }
    30% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

export default function BoosterPackOpenModal({
  isOpen, onClose, packKey, received,
}: {
  isOpen: boolean;
  onClose: () => void;
  packKey: string | null;
  received: PackReceivedItem[];
}) {
  const [phase, setPhase] = useState<'pack' | 'tearing' | 'cards'>('pack');
  const [revealed, setRevealed] = useState(0);
  const [auto, setAuto] = useState(true);

  const sortedReceived = useMemo(() =>
    [...received].sort((a, b) => (RARITY_CFG[a.booster.rarity]?.rank ?? 0) - (RARITY_CFG[b.booster.rarity]?.rank ?? 0)),
    [received]
  );

  useEffect(() => {
    if (!isOpen) return;
    setPhase('pack');
    setRevealed(0);
    setAuto(true);
  }, [isOpen, packKey]);

  const startTear = () => {
    setPhase('tearing');
    setTimeout(() => setPhase('cards'), 1200);
  };

  useEffect(() => {
    if (phase !== 'cards' || !auto || revealed >= sortedReceived.length) return;
    const delay = revealed === 0 ? 500 : 600;
    const id = setTimeout(() => setRevealed(r => Math.min(sortedReceived.length, r + 1)), delay);
    return () => clearTimeout(id);
  }, [phase, auto, revealed, sortedReceived.length]);

  const title = useMemo(() => {
    if (packKey === 'starter_weekly') return 'Pack Starter';
    if (packKey === 'pro_weekly') return 'Pack Pro';
    return 'Pack';
  }, [packKey]);

  const packColor = packKey === 'pro_weekly' ? '#f59e0b' : '#8b5cf6';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="chambre-reward-overlay chambre-pack-overlay chambre-reward-stage fixed inset-0 z-[200]"
          role="dialog"
          aria-label="Ouverture du pack de boosters"
          data-reward-phase={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <style>{KEYFRAMES}</style>

          {/* Background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{ background: 'var(--v2-accent)', opacity: 0.3 }}
                initial={{ x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800), y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600), scale: 0 }}
                animate={{ y: [null, -100], scale: [0, 1, 0], opacity: [0, 0.5, 0] }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
              />
            ))}
          </div>

          <div className="absolute inset-0" onClick={onClose} />

          <button onClick={onClose} className="chambre-reward-close" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>

          {/* ═══ PACK PHASE — 3D pack visual ═══ */}
          {(phase === 'pack' || phase === 'tearing') && (
            <motion.div
              className="chambre-pack-opening relative z-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              style={phase === 'tearing' ? { animation: 'pack-tear 1.2s ease-in-out forwards' } : undefined}
            >
              <div className="chambre-pack-preview">
              {/* Glow behind pack */}
              <div className="absolute -inset-16 rounded-3xl pointer-events-none" style={{
                background: 'radial-gradient(ellipse, var(--v2-selected) 0%, transparent 60%)',
                filter: 'blur(40px)',
              }} />

              {/* Pack body */}
              <div className="chambre-pack-sealed relative aspect-[3/4] overflow-hidden"
                style={{
                  border: '1px solid var(--v2-line)',
                  background: 'linear-gradient(135deg, var(--v2-raised), var(--v2-bg))',
                  boxShadow: '0 20px 60px var(--v2-selected)',
                  transform: 'perspective(800px) rotateY(-5deg)',
                }}>
                {/* Top bar */}
                <div className="chambre-booster-seal-header" style={{ background: 'var(--v2-raised)', borderBottom: '1px solid var(--v2-line)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--v2-accent)' }}>Synaura</span>
                </div>

                {/* Center icon */}
                <div className="h-full flex items-center justify-center">
                  <Package className="w-16 h-16" style={{ color: 'var(--v2-accent)' }} />
                </div>

                {/* Title */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className="chambre-pack-preview-title">{title}</div>
                  <div className="chambre-reward-muted text-xs">{received.length} boosters</div>
                </div>

                {/* Foil sweep */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)', animation: 'pack-foil 3s ease-in-out infinite' }} />
                </div>

                {/* Tear lines during tearing */}
                {phase === 'tearing' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, transparent, var(--v2-accent), transparent)', filter: 'blur(1px) drop-shadow(0 0 4px var(--v2-accent))' }} />
                  </div>
                )}
              </div>
              </div>

              <section className="chambre-pack-opening-copy">
                <p className="chambre-reward-eyebrow">Votre collection s’agrandit</p>
                <h2>Plus d’élan.<br /><span>À révéler.</span></h2>
                <p className="chambre-reward-intro">Découvrez les boosters reçus, puis retrouvez leurs effets et leur durée dans votre inventaire.</p>
              {/* Open button */}
              {phase === 'pack' && (
                <motion.button
                  onClick={startTear}
                  className="chambre-reward-primary chambre-booster-open-button"
                  style={{ background: 'var(--v2-accent-fill)', boxShadow: '0 4px 24px var(--v2-selected)' }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Ouvrir le pack
                </motion.button>
              )}
              </section>
            </motion.div>
          )}

          {/* ═══ CARDS PHASE — reveal one by one ═══ */}
          {phase === 'cards' && (
            <motion.div
              className="chambre-pack-result relative z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180 }}
            >
              <div className="chambre-pack-result-panel" style={{ background: 'var(--v2-surface)' }}>
                {/* Header */}
                <div className="chambre-pack-result-header">
                  <div className="min-w-0">
                    <h2>{title}</h2>
                    <div className="chambre-reward-muted text-xs">{Math.min(revealed, sortedReceived.length)}/{sortedReceived.length} revele{sortedReceived.length > 1 ? 's' : ''}</div>
                  </div>
                  <div className="chambre-pack-tools">
                    <button type="button" onClick={() => { setAuto(false); setRevealed(sortedReceived.length); }} className="chambre-reward-secondary">Tout révéler</button>
                    <button type="button" onClick={() => setAuto(v => !v)} className="chambre-reward-secondary" aria-pressed={auto} aria-label="Révélation automatique">{auto ? 'Auto: ON' : 'Auto: OFF'}</button>
                  </div>
                </div>

                {/* Cards grid */}
                <div className="chambre-pack-result-body">
                  <div className="chambre-pack-cards">
                    {sortedReceived.map((it, idx) => {
                      const isRevealed = idx < revealed;
                      const cfg = RARITY_CFG[it.booster.rarity];
                      const Icon = cfg.icon;
                      const isLast = idx === sortedReceived.length - 1;
                      const isHighRarity = cfg.rank >= 2;

                      return (
                        <motion.div
                          key={it.inventory_id}
                          className="chambre-pack-card relative"
                          initial={{ opacity: 0, y: 15, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: Math.min(0.8, idx * 0.05) }}
                        >
                          <div className="chambre-pack-card-frame" style={{ border: `1px solid ${isRevealed ? 'var(--v2-accent)' : 'var(--v2-line)'}` }}>
                            {/* Background */}
                            <div className="absolute inset-0" style={{ background: isRevealed ? 'linear-gradient(135deg, var(--v2-raised), var(--v2-bg))' : 'var(--v2-bg)' }} />

                            {/* Flash on reveal for epic/legendary */}
                            {isRevealed && isHighRarity && (
                              <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.color, animation: 'card-flash 0.5s ease-out forwards' }} />
                            )}

                            {!isRevealed ? (
                              <div className="chambre-pack-card-waiting relative">
                                <div className="chambre-pack-question">?</div>
                                <div className="chambre-reward-muted text-xs">En attente</div>
                              </div>
                            ) : (
                              <motion.div
                                className="chambre-pack-card-content relative"
                                initial={{ rotateY: 90 }}
                                animate={{ rotateY: 0 }}
                                transition={{ duration: 0.3, type: 'spring' }}
                                style={{ transformStyle: 'preserve-3d' }}
                              >
                                {/* Top badge */}
                                <div className="flex items-center justify-between">
                                  <div className="chambre-pack-rarity">
                                    <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                                    <span style={{ color: 'var(--v2-text)' }}>{cfg.label}</span>
                                  </div>
                                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                                </div>

                                {/* Center icon */}
                                <div className="chambre-pack-card-symbol">
                                  <div className="relative">
                                    <div className="absolute inset-0 rounded-full blur-lg" style={{ background: cfg.glow, transform: 'scale(2)' }} />
                                    <Icon className="relative w-7 h-7" style={{ color: cfg.color }} />
                                  </div>
                                </div>

                                {/* Info */}
                                <div className="chambre-pack-card-info">
                                  <h3>{it.booster.name}</h3>
                                  <div className="chambre-pack-card-metrics">
                                    <span className="chambre-reward-muted">{it.booster.type === 'track' ? 'Piste' : 'Artiste'}</span>
                                    <span className="chambre-pack-multiplier">x{Number(it.booster.multiplier).toFixed(2)}</span>
                                  </div>
                                  <div className="chambre-reward-muted text-xs">{it.booster.duration_hours}h</div>
                                </div>

                                {/* Foil for rare+ */}
                                {cfg.rank >= 1 && (
                                  <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)', animation: 'pack-foil 2s ease-in-out infinite' }} />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                  {/* Actions */}
                  <div className="chambre-pack-result-footer">
                    {revealed < sortedReceived.length && (
                      <button type="button" onClick={() => { setAuto(false); setRevealed(r => Math.min(sortedReceived.length, r + 1)); }}
                        className="chambre-reward-primary"
                        style={{ background: 'var(--v2-accent-fill)' }}
                      >
                        Suivant
                      </button>
                    )}
                    <UButton variant="secondary" size="md" onClick={onClose} className="chambre-reward-secondary">
                      Fermer
                    </UButton>
                  </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
