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
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center"
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
                style={{ background: packColor, opacity: 0.3 }}
                initial={{ x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800), y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600), scale: 0 }}
                animate={{ y: [null, -100], scale: [0, 1, 0], opacity: [0, 0.5, 0] }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
              />
            ))}
          </div>

          <div className="absolute inset-0" onClick={onClose} />

          <button onClick={onClose} className="absolute top-6 right-6 z-40 text-white/40 hover:text-white transition" aria-label="Fermer">
            <X className="w-7 h-7" />
          </button>

          {/* ═══ PACK PHASE — 3D pack visual ═══ */}
          {(phase === 'pack' || phase === 'tearing') && (
            <motion.div
              className="relative z-10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              style={phase === 'tearing' ? { animation: 'pack-tear 1.2s ease-in-out forwards' } : undefined}
            >
              {/* Glow behind pack */}
              <div className="absolute -inset-16 rounded-3xl pointer-events-none" style={{
                background: `radial-gradient(ellipse, ${packColor}30 0%, transparent 60%)`,
                filter: 'blur(40px)',
              }} />

              {/* Pack body */}
              <div className="relative w-[200px] sm:w-[240px] aspect-[3/4] rounded-2xl overflow-hidden"
                style={{
                  border: `2px solid ${packColor}40`,
                  background: `linear-gradient(135deg, ${packColor}15 0%, rgba(10,10,21,0.95) 100%)`,
                  boxShadow: `0 20px 60px ${packColor}20`,
                  transform: 'perspective(800px) rotateY(-5deg)',
                }}>
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center" style={{ background: `${packColor}30`, borderBottom: `1px solid ${packColor}30` }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: packColor }}>Synaura</span>
                </div>

                {/* Center icon */}
                <div className="h-full flex items-center justify-center">
                  <Package className="w-16 h-16" style={{ color: `${packColor}60` }} />
                </div>

                {/* Title */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className="text-sm font-black text-white/80">{title}</div>
                  <div className="text-[10px] text-white/30">{received.length} boosters</div>
                </div>

                {/* Foil sweep */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)', animation: 'pack-foil 3s ease-in-out infinite' }} />
                </div>

                {/* Tear lines during tearing */}
                {phase === 'tearing' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${packColor}, transparent)`, filter: `blur(1px) drop-shadow(0 0 4px ${packColor})` }} />
                  </div>
                )}
              </div>

              {/* Open button */}
              {phase === 'pack' && (
                <motion.button
                  onClick={startTear}
                  className="mt-6 w-full h-12 rounded-xl font-bold text-white text-sm transition-all"
                  style={{ background: `linear-gradient(135deg, ${packColor}, ${packColor}cc)`, boxShadow: `0 4px 20px ${packColor}40` }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Ouvrir le pack
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ═══ CARDS PHASE — reveal one by one ═══ */}
          {phase === 'cards' && (
            <motion.div
              className="relative z-10 w-[95vw] max-w-[860px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180 }}
            >
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'linear-gradient(180deg, #0f0a20 0%, #0a0a15 100%)' }}>
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-base font-black text-white">{title}</div>
                    <div className="text-[11px] text-white/30">{Math.min(revealed, sortedReceived.length)}/{sortedReceived.length} revele{sortedReceived.length > 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => { setAuto(false); setRevealed(sortedReceived.length); }} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold border border-white/10 transition">Tout reveler</button>
                    <button type="button" onClick={() => setAuto(v => !v)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold border border-white/10 transition">{auto ? 'Auto: ON' : 'Auto: OFF'}</button>
                  </div>
                </div>

                {/* Cards grid */}
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {sortedReceived.map((it, idx) => {
                      const isRevealed = idx < revealed;
                      const cfg = RARITY_CFG[it.booster.rarity];
                      const Icon = cfg.icon;
                      const isLast = idx === sortedReceived.length - 1;
                      const isHighRarity = cfg.rank >= 2;

                      return (
                        <motion.div
                          key={it.inventory_id}
                          className="relative aspect-[3/4]"
                          initial={{ opacity: 0, y: 15, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: Math.min(0.8, idx * 0.05) }}
                        >
                          <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ border: `1px solid ${isRevealed ? cfg.color + '40' : 'rgba(255,255,255,0.05)'}` }}>
                            {/* Background */}
                            <div className="absolute inset-0" style={{ background: isRevealed ? `linear-gradient(135deg, ${cfg.color}10, rgba(10,10,21,0.9))` : 'rgba(10,10,21,0.9)' }} />

                            {/* Flash on reveal for epic/legendary */}
                            {isRevealed && isHighRarity && (
                              <div className="absolute inset-0 pointer-events-none" style={{ background: cfg.color, animation: 'card-flash 0.5s ease-out forwards' }} />
                            )}

                            {!isRevealed ? (
                              <div className="relative w-full h-full flex flex-col items-center justify-center">
                                <div className="text-2xl font-black text-white/10">?</div>
                                <div className="text-[9px] text-white/15 mt-1">en attente</div>
                              </div>
                            ) : (
                              <motion.div
                                className="relative w-full h-full p-2.5 flex flex-col"
                                initial={{ rotateY: 90 }}
                                animate={{ rotateY: 0 }}
                                transition={{ duration: 0.3, type: 'spring' }}
                                style={{ transformStyle: 'preserve-3d' }}
                              >
                                {/* Top badge */}
                                <div className="flex items-center justify-between">
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                                    <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
                                    <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                                  </div>
                                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
                                </div>

                                {/* Center icon */}
                                <div className="flex-1 flex items-center justify-center">
                                  <div className="relative">
                                    <div className="absolute inset-0 rounded-full blur-lg" style={{ background: cfg.glow, transform: 'scale(2)' }} />
                                    <Icon className="relative w-7 h-7" style={{ color: cfg.color }} />
                                  </div>
                                </div>

                                {/* Info */}
                                <div className="space-y-1">
                                  <div className="text-[10px] font-bold text-white leading-tight line-clamp-2">{it.booster.name}</div>
                                  <div className="flex items-center justify-between text-[9px]">
                                    <span className="text-white/30">{it.booster.type === 'track' ? 'Piste' : 'Artiste'}</span>
                                    <span className="text-emerald-400 font-bold">x{Number(it.booster.multiplier).toFixed(2)}</span>
                                  </div>
                                  <div className="text-[9px] text-white/20">{it.booster.duration_hours}h</div>
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

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    {revealed < sortedReceived.length && (
                      <button type="button" onClick={() => { setAuto(false); setRevealed(r => Math.min(sortedReceived.length, r + 1)); }}
                        className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all"
                        style={{ background: `linear-gradient(135deg, ${packColor}, ${packColor}cc)` }}
                      >
                        Suivant
                      </button>
                    )}
                    <UButton variant="secondary" size="md" onClick={onClose}>
                      Fermer
                    </UButton>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
