'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X, Zap, Star, Crown, Gem } from 'lucide-react';
import Image from 'next/image';
import { InventoryItem } from '@/hooks/useBoosters';
import { UButton } from '@/components/ui/UnifiedUI';

interface BoosterOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBooster?: () => void;
  isOpening?: boolean;
  openedBooster?: InventoryItem | null;
  item?: { inventoryId: string; booster: InventoryItem['booster'] } | null;
}

type Phase = 'idle' | 'anticipation' | 'buildup' | 'explosion' | 'revealed';

const RARITY_CFG = {
  common: { gradient: 'from-zinc-400 to-zinc-600', color: '#a1a1aa', particles: '#a1a1aa', icon: Sparkles, label: 'Commun', glowColor: 'rgba(161,161,170,0.4)' },
  rare: { gradient: 'from-blue-400 to-indigo-600', color: '#60a5fa', particles: '#60a5fa', icon: Star, label: 'Rare', glowColor: 'rgba(96,165,250,0.5)' },
  epic: { gradient: 'from-purple-400 to-fuchsia-600', color: '#a855f7', particles: '#a855f7', icon: Crown, label: 'Epique', glowColor: 'rgba(168,85,247,0.5)' },
  legendary: { gradient: 'from-amber-400 via-orange-500 to-red-500', color: '#f59e0b', particles: '#f59e0b', icon: Gem, label: 'Legendaire', glowColor: 'rgba(245,158,11,0.6)' },
} as const;

const KEYFRAMES = `
  @keyframes bo-converge {
    0% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.5); }
    80% { opacity: 1; }
    100% { opacity: 0; transform: translate(0, 0) scale(0); }
  }
  @keyframes bo-crack-pulse {
    0%, 100% { opacity: 0.3; filter: blur(2px); }
    50% { opacity: 1; filter: blur(0); }
  }
  @keyframes bo-shake {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-4px, -2px); }
    20% { transform: translate(3px, 3px); }
    30% { transform: translate(-3px, 1px); }
    40% { transform: translate(4px, -3px); }
    50% { transform: translate(-2px, 4px); }
    60% { transform: translate(3px, -2px); }
    70% { transform: translate(-4px, 3px); }
    80% { transform: translate(2px, -4px); }
    90% { transform: translate(-3px, 2px); }
  }
  @keyframes bo-flash {
    0% { opacity: 0; }
    20% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes bo-foil {
    0% { transform: translateX(-150%) rotate(25deg); }
    100% { transform: translateX(250%) rotate(25deg); }
  }
  @keyframes bo-burst {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes bo-descend {
    0% { transform: translateY(-60px) scale(0.8); opacity: 0; filter: blur(8px); }
    100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
  }
`;

export default function BoosterOpenModal({
  isOpen, onClose, onOpenBooster, isOpening = false, openedBooster, item
}: BoosterOpenModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (!isOpen) { setPhase('idle'); return; }
    if (openedBooster || item) setPhase('revealed');
    else setPhase('idle');
  }, [isOpen, openedBooster, item]);

  const handleOpen = async () => {
    if (!onOpenBooster) return;
    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100, 50, 200]);

    setPhase('anticipation');
    await new Promise(r => setTimeout(r, 1500));
    setPhase('buildup');

    onOpenBooster();

    await new Promise(r => setTimeout(r, 1500));
    setPhase('explosion');
    await new Promise(r => setTimeout(r, 600));
    setPhase('revealed');
  };

  const rarity = (openedBooster?.booster?.rarity || item?.booster?.rarity || 'common') as keyof typeof RARITY_CFG;
  const cfg = RARITY_CFG[rarity];
  const Icon = cfg.icon;
  const boosterData = openedBooster?.booster || item?.booster;

  const particles = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      angle: (i / 60) * Math.PI * 2,
      dist: 100 + Math.random() * 300,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.3,
    })), []);

  const convergeParticles = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      sx: (Math.random() - 0.5) * 600,
      sy: (Math.random() - 0.5) * 600,
      dur: 1.5 + Math.random() * 1,
      delay: Math.random() * 1.5,
      size: 2 + Math.random() * 3,
    })), []);

  const crackLines = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i / 8) * 360,
      length: 30 + Math.random() * 50,
      width: 1 + Math.random() * 2,
    })), []);

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

          {/* Screen shake on explosion */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={phase === 'explosion' ? { x: [0, -6, 6, -4, 4, -2, 2, 0], y: [0, 4, -4, 2, -2, 3, -3, 0] } : {}}
            transition={{ duration: 0.4 }}
          >

            {/* Phase: anticipation — converging particles */}
            {(phase === 'anticipation' || phase === 'buildup') && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {convergeParticles.map(p => (
                  <div
                    key={p.id}
                    className="absolute left-1/2 top-1/2 rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      background: phase === 'buildup' ? cfg.color : 'rgba(255,255,255,0.6)',
                      // @ts-expect-error CSS custom props
                      '--sx': `${p.sx}px`,
                      '--sy': `${p.sy}px`,
                      animation: `bo-converge ${p.dur}s ease-in ${p.delay}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Flash on explosion */}
            {phase === 'explosion' && (
              <div className="absolute inset-0 pointer-events-none z-30" style={{ background: 'white', animation: 'bo-flash 0.6s ease-out forwards' }} />
            )}

            {/* Explosion particles */}
            {phase === 'explosion' && (
              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center overflow-hidden">
                {particles.map(p => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{ width: p.size, height: p.size, background: cfg.particles, boxShadow: `0 0 ${p.size * 2}px ${cfg.particles}` }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist, opacity: 0, scale: 0 }}
                    transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
                  />
                ))}
                {/* Burst ring */}
                <div className="absolute rounded-full border-2" style={{ width: 80, height: 80, borderColor: cfg.color, animation: 'bo-burst 0.8s ease-out forwards' }} />
              </div>
            )}

            {/* Close button */}
            <button onClick={onClose} className="absolute top-6 right-6 z-40 text-white/50 hover:text-white transition" aria-label="Fermer"><X className="w-7 h-7" /></button>

            {/* Background click */}
            <div className="absolute inset-0 z-0" onClick={phase === 'revealed' ? onClose : undefined} />

            {/* ═══ IDLE / ANTICIPATION / BUILDUP — Card front ═══ */}
            {(phase === 'idle' || phase === 'anticipation' || phase === 'buildup') && (
              <motion.div
                className="relative z-10 w-[240px] sm:w-[280px]"
                animate={
                  phase === 'anticipation'
                    ? { scale: [1, 1.02, 1], rotate: [0, -1, 1, 0] }
                    : phase === 'buildup'
                    ? {} : {}
                }
                transition={phase === 'anticipation' ? { duration: 1, repeat: Infinity } : {}}
                style={phase === 'buildup' ? { animation: 'bo-shake 0.15s linear infinite' } : undefined}
              >
                {/* Glow behind */}
                <div className="absolute inset-0 -inset-x-8 -inset-y-8 rounded-3xl pointer-events-none" style={{
                  background: `radial-gradient(ellipse, ${phase === 'buildup' ? cfg.glowColor : 'rgba(124,58,237,0.3)'} 0%, transparent 70%)`,
                  filter: 'blur(20px)',
                  opacity: phase === 'buildup' ? 0.9 : phase === 'anticipation' ? 0.6 : 0.3,
                  transition: 'opacity 0.5s',
                }} />

                {/* Card */}
                <div className="relative aspect-[3/4] rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#0f0a20] to-[#1a0a2e] overflow-hidden shadow-2xl shadow-violet-500/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-pink-600/10" />

                  {/* Header */}
                  <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-violet-600/50 to-pink-600/50 flex items-center justify-center border-b border-white/10">
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Synaura Booster</span>
                  </div>

                  {/* Noise texture */}
                  <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.9\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

                  {/* Center icon */}
                  <div className="h-full flex items-center justify-center">
                    <motion.div
                      animate={phase === 'buildup' ? { scale: [1, 1.3, 1], rotate: [0, 360] } : phase === 'anticipation' ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: phase === 'buildup' ? 0.4 : 2, repeat: Infinity }}
                    >
                      <Zap className="w-16 h-16 text-violet-400/70 drop-shadow-lg" />
                    </motion.div>
                  </div>

                  {/* Crack lines during buildup */}
                  {phase === 'buildup' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {crackLines.map(c => (
                        <div key={c.id} className="absolute" style={{
                          width: c.width,
                          height: c.length,
                          background: `linear-gradient(to bottom, ${cfg.color}, transparent)`,
                          transformOrigin: 'center top',
                          transform: `rotate(${c.angle}deg)`,
                          animation: 'bo-crack-pulse 0.5s ease-in-out infinite',
                          animationDelay: `${c.id * 0.1}s`,
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Bottom text */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <div className="text-xs text-white/40">Mystere a decouvrir</div>
                  </div>

                  {/* Foil sweep */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 60%)', animation: 'bo-foil 3s ease-in-out infinite' }} />
                  </div>

                  {/* Synaura logo */}
                  <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center">
                    <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                      <Image src="/synaura_symbol.svg" alt="" width={14} height={14} style={{ filter: 'brightness(0) invert(1) opacity(0.4)' }} />
                    </div>
                  </div>
                </div>

                {/* CTA button */}
                {phase === 'idle' && (
                  <motion.button
                    onClick={handleOpen}
                    disabled={isOpening}
                    className="mt-6 w-full h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-sm hover:from-violet-500 hover:to-pink-500 disabled:opacity-40 transition-all shadow-lg shadow-violet-500/30"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isOpening ? 'Ouverture...' : 'Ouvrir le booster'}
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* ═══ REVEALED — Result card ═══ */}
            {phase === 'revealed' && boosterData && (
              <motion.div
                className="relative z-10 w-[260px] sm:w-[300px]"
                style={{ animation: 'bo-descend 0.8s ease-out forwards' }}
              >
                {/* Persistent glow */}
                <div className="absolute -inset-10 rounded-3xl pointer-events-none" style={{
                  background: `radial-gradient(ellipse, ${cfg.glowColor} 0%, transparent 60%)`,
                  filter: 'blur(30px)',
                }} />

                {/* Revealed card */}
                <div className={`relative aspect-[3/4] rounded-2xl border bg-gradient-to-br from-[#0a0a15]/90 to-[#0a0a15]/80 overflow-hidden shadow-2xl`}
                  style={{ borderColor: cfg.color + '40' }}>

                  {/* Gradient accent top */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cfg.gradient}`} />

                  {/* Foil for rare+ */}
                  {rarity !== 'common' && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.08) 58%, transparent 65%)', animation: 'bo-foil 2.5s ease-in-out infinite' }} />
                    </div>
                  )}

                  {/* Holographic shimmer for legendary */}
                  {rarity === 'legendary' && (
                    <motion.div className="absolute inset-0 pointer-events-none"
                      animate={{ background: ['conic-gradient(from 0deg, rgba(255,200,0,0.05), rgba(255,100,0,0.05), rgba(255,200,0,0.05))', 'conic-gradient(from 120deg, rgba(255,200,0,0.05), rgba(255,100,0,0.05), rgba(255,200,0,0.05))', 'conic-gradient(from 240deg, rgba(255,200,0,0.05), rgba(255,100,0,0.05), rgba(255,200,0,0.05))'] }}
                      transition={{ duration: 3, repeat: Infinity }} />
                  )}

                  {/* Header */}
                  <div className="absolute top-0 left-0 right-0 h-9 bg-gradient-to-r from-white/5 to-white/[0.02] flex items-center justify-center border-b border-white/5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Synaura</span>
                  </div>

                  {/* Content */}
                  <div className="h-full flex flex-col items-center justify-center p-6 pt-12 text-center gap-3">
                    {/* Rarity badge */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-white/5`} style={{ borderColor: cfg.color + '40' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </motion.div>

                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className="relative"
                    >
                      <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: cfg.glowColor, transform: 'scale(2.5)' }} />
                      <Icon className="relative w-16 h-16" style={{ color: cfg.color, filter: `drop-shadow(0 0 12px ${cfg.color})` }} />
                    </motion.div>

                    {/* Name */}
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="space-y-1">
                      <div className="text-xl font-black text-white">{boosterData.name}</div>
                      <div className="text-xs text-white/40 max-w-[85%] mx-auto">{boosterData.description}</div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="flex items-center gap-4 mt-2"
                    >
                      <div className="text-center">
                        <motion.div
                          className="text-2xl font-black text-emerald-400"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          x{boosterData.multiplier?.toFixed(2)}
                        </motion.div>
                        <div className="text-[10px] text-white/30">Multiplicateur</div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="text-center">
                        <div className="text-2xl font-black text-white">{boosterData.duration_hours}h</div>
                        <div className="text-[10px] text-white/30">Duree</div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Synaura logo */}
                  <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center">
                    <Image src="/synaura_symbol.svg" alt="" width={14} height={14} style={{ filter: 'brightness(0) invert(1) opacity(0.2)' }} />
                  </div>
                </div>

                {/* Action buttons */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-5 flex gap-2">
                  <UButton variant="accent" size="lg" fullWidth onClick={onClose}>
                    Fermer
                  </UButton>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
