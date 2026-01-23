'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Gem, Sparkles, Star, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

function rarityCfg(r: BoosterRarity) {
  const cfg = {
    common: { gradient: 'from-zinc-400 via-zinc-500 to-zinc-600', particles: 'bg-zinc-400', icon: Sparkles, label: 'Commun' },
    rare: { gradient: 'from-sky-400 via-blue-500 to-indigo-600', particles: 'bg-blue-400', icon: Star, label: 'Rare' },
    epic: { gradient: 'from-fuchsia-400 via-purple-500 to-indigo-600', particles: 'bg-purple-400', icon: Crown, label: 'Épique' },
    legendary: { gradient: 'from-yellow-400 via-orange-500 to-red-600', particles: 'bg-yellow-400', icon: Gem, label: 'Légendaire' },
  } as const;
  return cfg[r] || cfg.common;
}

export default function BoosterPackOpenModal({
  isOpen,
  onClose,
  packKey,
  received,
}: {
  isOpen: boolean;
  onClose: () => void;
  packKey: string | null;
  received: PackReceivedItem[];
}) {
  const [viewport, setViewport] = useState({ w: 800, h: 600 });
  const [revealed, setRevealed] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setRevealed(0);
    setAuto(true);
  }, [isOpen, packKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (!auto) return;
    if (revealed >= received.length) return;
    const id = window.setTimeout(() => setRevealed((r) => Math.min(received.length, r + 1)), 420);
    return () => window.clearTimeout(id);
  }, [auto, isOpen, received.length, revealed]);

  const title = useMemo(() => {
    if (packKey === 'starter_weekly') return 'Pack Starter';
    if (packKey === 'pro_weekly') return 'Pack Pro';
    return 'Pack';
  }, [packKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Particules globales */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full opacity-60"
                initial={{ x: Math.random() * viewport.w, y: Math.random() * viewport.h, scale: 0 }}
                animate={{ y: [null, -120], scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            className="relative w-[95vw] max-w-[860px]"
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 text-white/80 hover:text-white z-10"
              aria-label="Fermer"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-black/70 to-black/55 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-gradient-to-r from-purple-600/30 via-pink-600/25 to-fuchsia-600/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white font-bold text-lg">{title}</div>
                    <div className="text-white/70 text-sm">
                      {received.length} récompense(s) • révélation {Math.min(revealed, received.length)}/{received.length}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { setAuto(false); setRevealed(received.length); }}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/10"
                    >
                      Tout révéler
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuto((v) => !v)}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/10"
                    >
                      {auto ? 'Auto: ON' : 'Auto: OFF'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {received.map((it, idx) => {
                    const isRevealed = idx < revealed;
                    const cfg = rarityCfg(it.booster.rarity);
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={it.inventory_id}
                        className="relative aspect-[3/4]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(0.6, idx * 0.03) }}
                      >
                        <div className={`absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br ${cfg.gradient}`}>
                          <motion.div
                            className="absolute inset-[1px] rounded-2xl bg-black/75 border border-white/10 overflow-hidden"
                            animate={{ scale: isRevealed ? 1.02 : 1 }}
                            transition={{ duration: 0.18 }}
                          >
                            {!isRevealed ? (
                              <div className="w-full h-full flex flex-col items-center justify-center">
                                <div className="text-white/70 text-sm font-semibold">?</div>
                                <div className="text-white/40 text-[10px] mt-1">révélation…</div>
                              </div>
                            ) : (
                              <motion.div
                                className="w-full h-full p-3 flex flex-col"
                                initial={{ rotateY: 90, opacity: 0 }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                transition={{ duration: 0.25 }}
                                style={{ transformStyle: 'preserve-3d' }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10">
                                    <Icon className="w-3 h-3 text-white" />
                                    <span className="text-[10px] text-white/90 font-semibold">{cfg.label}</span>
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${cfg.particles}`} />
                                </div>

                                <div className="mt-2 text-white font-bold text-xs leading-tight line-clamp-3">
                                  {it.booster.name}
                                </div>
                                <div className="mt-1 text-white/60 text-[10px]">
                                  {it.booster.type === 'track' ? 'Boost piste' : 'Boost artiste'}
                                </div>

                                <div className="mt-auto pt-3 space-y-1">
                                  <div className="text-[10px] text-white/70 flex items-center justify-between">
                                    <span>Multiplicateur</span>
                                    <span className="text-green-300 font-semibold">x{Number(it.booster.multiplier).toFixed(2)}</span>
                                  </div>
                                  <div className="text-[10px] text-white/70 flex items-center justify-between">
                                    <span>Durée</span>
                                    <span className="text-white/90 font-semibold">{Number(it.booster.duration_hours)}h</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  {revealed < received.length && (
                    <button
                      type="button"
                      onClick={() => { setAuto(false); setRevealed((r) => Math.min(received.length, r + 1)); }}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
                    >
                      Révéler suivant
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/10 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

