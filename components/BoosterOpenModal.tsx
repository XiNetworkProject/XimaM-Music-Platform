'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X, Zap, Star, Crown, Gem } from 'lucide-react';
import Image from 'next/image';
import { InventoryItem } from '@/hooks/useBoosters';

interface BoosterOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBooster?: () => void;
  isOpening?: boolean;
  openedBooster?: InventoryItem | null;
  item?: { inventoryId: string; booster: InventoryItem['booster'] } | null;
}

export default function BoosterOpenModal({ 
  isOpen, 
  onClose, 
  onOpenBooster, 
  isOpening = false, 
  openedBooster,
  item
}: BoosterOpenModalProps) {
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'opening' | 'revealed' | 'tearing'>('idle');
  const [isHovered, setIsHovered] = useState(false);
  const [viewport, setViewport] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPhase('idle');
      return;
    }
    
    // Si on a déjà un booster ouvert, aller directement à la phase révélée
    if (openedBooster || item) {
      setPhase('revealed');
    } else {
      setPhase('idle');
    }
  }, [isOpen, openedBooster, item]);

  const handleOpenBooster = async () => {
    if (!onOpenBooster) return;
    
    // Effet de vibration simulé
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
    
    setPhase('shaking');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPhase('tearing');
    await new Promise(resolve => setTimeout(resolve, 800));
    setPhase('opening');
    await new Promise(resolve => setTimeout(resolve, 1200));
    setPhase('revealed');
    
    // Déclencher l'ouverture du booster
    await onOpenBooster();
  };

  const rarityConfig = useMemo(() => {
    const r = openedBooster?.booster?.rarity || item?.booster?.rarity || 'common';
    const configs = {
      common: {
        gradient: 'from-zinc-400 via-zinc-500 to-zinc-600',
        glow: 'shadow-zinc-500/50',
        icon: Sparkles,
        particles: 'bg-zinc-400',
        name: 'Booster Commun'
      },
      rare: {
        gradient: 'from-sky-400 via-blue-500 to-indigo-600',
        glow: 'shadow-blue-500/60',
        icon: Star,
        particles: 'bg-blue-400',
        name: 'Booster Rare'
      },
      epic: {
        gradient: 'from-fuchsia-400 via-purple-500 to-indigo-600',
        glow: 'shadow-purple-500/70',
        icon: Crown,
        particles: 'bg-purple-400',
        name: 'Booster Épique'
      },
      legendary: {
        gradient: 'from-yellow-400 via-orange-500 to-red-600',
        glow: 'shadow-orange-500/80',
        icon: Gem,
        particles: 'bg-yellow-400',
        name: 'Booster Légendaire'
      }
    };
    return configs[r as keyof typeof configs] || configs.common;
  }, [openedBooster?.booster?.rarity, item?.booster?.rarity]);

  const RarityIcon = rarityConfig.icon;
  const rarityKey = (openedBooster?.booster?.rarity || item?.booster?.rarity || 'common') as string;
  const isFoil = rarityKey !== 'common';
  const isLegendary = rarityKey === 'legendary';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Fond avec particules flottantes */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 ${rarityConfig.particles} rounded-full opacity-60`}
                initial={{
                  x: Math.random() * viewport.w,
                  y: Math.random() * viewport.h,
                  scale: 0
                }}
                animate={{
                  y: [null, -100],
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0" onClick={onClose} />
          
          <motion.div
            className="relative w-[95vw] max-w-[400px]"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 text-white/80 hover:text-white z-10"
              aria-label="Fermer"
            >
              <X className="w-7 h-7" />
            </button>

            {/* Carte 3D avec effets avancés */}
            <motion.div
              className={`relative aspect-[3/4] rounded-3xl p-2 bg-gradient-to-br ${rarityConfig.gradient} ${rarityConfig.glow} shadow-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)]`}
              animate={
                phase === 'shaking'
                  ? { 
                      rotateZ: [0, -5, 5, 0],
                      scale: [1, 1.05, 1],
                      x: [0, -3, 3, 0],
                      y: [0, -2, 2, 0]
                    }
                  : phase === 'tearing'
                  ? { 
                      scale: [1, 1.3],
                      rotateY: [0, 20],
                      rotateX: [0, -20],
                      rotateZ: [0, 5]
                    }
                  : phase === 'opening'
                  ? { 
                      rotateY: [0, 180],
                      scale: [1.3, 1.5],
                      z: [0, 200],
                      rotateX: [0, -30],
                      rotateZ: [0, 10]
                    }
                  : phase === 'revealed'
                  ? { 
                      rotateY: 180,
                      scale: 1.15,
                      y: -15,
                      rotateX: -5
                    }
                  : { 
                      rotateY: isHovered ? -6 : 0,
                      scale: isHovered ? 1.08 : 1,
                      y: 0,
                      rotateX: isHovered ? -3 : 0,
                      rotateZ: 0
                    }
              }
              transition={{ 
                duration: phase === 'shaking' ? 0.6 : phase === 'tearing' ? 0.7 : phase === 'opening' ? 1.0 : 0.8,
                repeat: phase === 'shaking' ? Infinity : 0,
                type: 'tween',
                ease: 'easeInOut'
              }}
              style={{ 
                transformStyle: 'preserve-3d',
                perspective: '1000px'
              }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
            >
              {/* Face avant - Booster fermé */}
              <motion.div 
                className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-black/80 via-black/70 to-black/80 border border-white/20 flex flex-col items-center justify-center overflow-hidden shadow-[inset_0_24px_60px_rgba(255,255,255,0.06),inset_0_-24px_60px_rgba(0,0,0,0.45)]"
                style={{ backfaceVisibility: 'hidden' }}
                animate={{
                  background: phase === 'shaking' 
                    ? ['from-black/80', 'from-red-900/60', 'from-black/80']
                    : phase === 'tearing'
                    ? ['from-black/80', 'from-yellow-900/40', 'from-black/80']
                    : 'from-black/80'
                }}
                transition={{ duration: 0.3, repeat: phase === 'shaking' || phase === 'tearing' ? Infinity : 0 }}
              >
                {/* Bandeau Synaura */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-purple-600/70 via-pink-600/70 to-fuchsia-600/70 backdrop-blur-md border-b border-white/10 flex items-center justify-center">
                  <div className="text-white/90 text-sm font-semibold tracking-wider">Synaura Booster</div>
                </div>

                {/* Texturing overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }} />

                {/* Sheen spécial légendaire (face avant) */}
                {isLegendary && (
                  <motion.div
                    className="pointer-events-none absolute -inset-1 rotate-12"
                    initial={{ x: '-150%', opacity: 0.0 }}
                    animate={{ x: phase === 'revealed' ? '150%' : '150%', opacity: 0.18 }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.0) 70%, transparent 100%)'
                    }}
                  />
                )}
                {/* Bandeau Synaura */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-r from-purple-600/70 via-pink-600/70 to-fuchsia-600/70 backdrop-blur-md border-b border-white/10 flex items-center justify-center">
                  <div className="text-white/90 text-sm font-semibold tracking-wider">Synaura Booster</div>
                </div>

                {/* Texturing overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }} />
                {/* Effet de déchirement */}
                {phase === 'tearing' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={{ x: '100%', opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                )}
                
                <motion.div
                  animate={{
                    scale: phase === 'shaking' ? [1, 1.15, 1] : phase === 'tearing' ? [1, 1.2, 1] : 1,
                    rotate: phase === 'shaking' ? [0, 8, -8, 0] : phase === 'tearing' ? [0, 15, -15, 0] : 0
                  }}
                  transition={{ duration: 0.3, repeat: phase === 'shaking' || phase === 'tearing' ? Infinity : 0, type: 'tween' }}
                  className="flex flex-col items-center gap-4"
                >
                  <div style={{ transform: 'translateZ(18px)' }}>
                  <motion.div
                    animate={{ 
                      rotate: phase === 'shaking' ? [0, 360] : phase === 'tearing' ? [0, 720] : 0,
                      scale: phase === 'shaking' ? [1, 1.3, 1] : phase === 'tearing' ? [1, 1.5, 1] : 1,
                      filter: phase === 'tearing' ? ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] : 'brightness(1)'
                    }}
                    transition={{ duration: 0.5, repeat: phase === 'shaking' || phase === 'tearing' ? Infinity : 0, type: 'tween' }}
                  >
                    <Zap className="w-16 h-16 text-white drop-shadow-lg" />
                  </motion.div>
                  </div>
                  
                  <div className="text-center mt-8">
                    <motion.div 
                      className="text-white text-xl font-bold mb-2"
                    animate={{
                      color: phase === 'tearing' ? ['#ffffff', '#ffd700', '#ffffff'] : '#ffffff'
                    }}
                    transition={{ duration: 0.3, repeat: phase === 'tearing' ? Infinity : 0, type: 'tween' }}
                    >
                      Booster Synaura
                    </motion.div>
                    <div className="text-white/70 text-sm mb-4">Mystère à découvrir</div>
                    
                    {phase === 'idle' && (
                      <motion.button
                        onClick={handleOpenBooster}
                        disabled={isOpening}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isOpening ? 'Ouverture...' : 'Ouvrir le booster'}
                      </motion.button>
                    )}
                  </div>

                {/* Logo Synaura en bas (face avant) */}
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center" style={{ transform: 'rotateY(0deg)' }}>
                  <div className="px-2 py-1 rounded-md bg-white/10 border border-white/20 backdrop-blur-sm flex items-center gap-2">
                    <Image src="/synaura_symbol.svg" alt="Synaura" width={18} height={18} />
                  </div>
                </div>
                </motion.div>
              </motion.div>

              {/* Face arrière - Récompense révélée */}
              <motion.div 
                className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-black/90 via-black/80 to-black/90 border border-white/30 p-6 overflow-hidden shadow-[inset_0_24px_60px_rgba(255,255,255,0.05),inset_0_-24px_60px_rgba(0,0,0,0.45)]"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'revealed' ? 1 : 0 }}
              >
                {/* Sheen spécial légendaire (face arrière) */}
                {isLegendary && (
                  <motion.div
                    className="pointer-events-none absolute -inset-1 -rotate-12"
                    initial={{ x: '-150%', opacity: 0.0 }}
                    animate={{ x: '150%', opacity: 0.22 }}
                    transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.0) 70%, transparent 100%)'
                    }}
                  />
                )}
                {/* Effet foil (reflet métal) pour rare/épique/légendaire */}
                {isFoil && (
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase === 'revealed' ? 0.35 : 0 }}
                    style={{
                      background: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.25) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.25) 75%, rgba(255,255,255,0.05) 100%)',
                      mixBlendMode: 'screen'
                    }}
                  />
                )}
                {/* Bandeau Synaura */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-r from-purple-600/60 via-pink-600/60 to-fuchsia-600/60 backdrop-blur-md border-b border-white/10 flex items-center justify-center">
                  <div className="text-white/90 text-xs font-semibold tracking-wider">Synaura</div>
                </div>

                {/* Texturing overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }} />
                {/* Effet de brillance */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: '-100%', opacity: 0 }}
                  animate={{ 
                    x: phase === 'revealed' ? ['100%', '-100%'] : '-100%',
                    opacity: phase === 'revealed' ? [0, 1, 0] : 0
                  }}
                  transition={{ duration: 2, repeat: phase === 'revealed' ? Infinity : 0, repeatDelay: 3, type: 'tween' }}
                />
                
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ 
                      scale: phase === 'revealed' ? 1 : 0, 
                      rotate: phase === 'revealed' ? 0 : -180,
                      filter: phase === 'revealed' ? ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] : 'brightness(1)'
                    }}
                    transition={{ delay: 0.3, type: 'tween', ease: 'easeOut' }}
                  >
                    <RarityIcon className={`w-20 h-20 ${rarityConfig.particles.replace('bg-', 'text-')} drop-shadow-2xl`} />
                  </motion.div>
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: phase === 'revealed' ? 0 : 20, opacity: phase === 'revealed' ? 1 : 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-2"
                  >
                    <motion.div 
                      className="text-xs uppercase tracking-wider text-white/60 font-semibold"
                    animate={{
                      color: phase === 'revealed' ? ['#ffffff60', '#ffd700', '#ffffff60'] : '#ffffff60'
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, type: 'tween' }}
                    >
                      {rarityConfig.name}
                    </motion.div>
                    <motion.div 
                      className="text-white text-2xl font-bold"
                    animate={{
                      scale: phase === 'revealed' ? [1, 1.05, 1] : 1,
                      textShadow: phase === 'revealed' ? ['0 0 0px', '0 0 20px', '0 0 0px'] : '0 0 0px'
                    }}
                    transition={{ duration: 1, repeat: Infinity, type: 'tween' }}
                    >
                      {openedBooster?.booster?.name || item?.booster?.name || 'Booster'}
                    </motion.div>
                    <div className="text-white/80 text-sm max-w-[80%] mx-auto">
                      {openedBooster?.booster?.description || item?.booster?.description || 'Récompense obtenue !'}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: phase === 'revealed' ? 1 : 0 }}
                    transition={{ delay: 0.7, type: 'tween', ease: 'easeOut' }}
                    className="bg-white/10 rounded-xl p-4 w-full backdrop-blur-sm border border-white/20"
                  >
                    <div className="text-white/90 text-sm mb-1">Multiplicateur</div>
                    <motion.div 
                      className="text-white text-xl font-bold"
                    animate={{
                      scale: phase === 'revealed' ? [1, 1.1, 1] : 1,
                      color: phase === 'revealed' ? ['#ffffff', '#00ff88', '#ffffff'] : '#ffffff'
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, type: 'tween' }}
                    >
                      x{openedBooster?.booster?.multiplier?.toFixed(2) || item?.booster?.multiplier?.toFixed(2) || '1.00'}
                    </motion.div>
                    <div className="text-white/70 text-xs mt-1">
                      Durée: {openedBooster?.booster?.duration_hours || item?.booster?.duration_hours || 6}h
                    </div>
                  </motion.div>
                </div>
                  </motion.div>

                {/* Logo Synaura en bas (face arrière) - garder lisible après flip */}
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center" style={{ transform: 'rotateY(180deg)' }}>
                  <div className="px-2 py-1 rounded-md bg-white/10 border border-white/20 backdrop-blur-sm flex items-center gap-2">
                    <Image src="/synaura_symbol.svg" alt="Synaura" width={18} height={18} />
                  </div>
                </div>
              {/* Épaisseur simulée (arêtes) */}
              <div className="pointer-events-none absolute -right-1 top-3 bottom-3 w-2 rounded-r-2xl bg-gradient-to-b from-white/30 via-white/10 to-black/40 opacity-60" />
              <div className="pointer-events-none absolute left-3 right-3 -bottom-1 h-2 rounded-b-2xl bg-gradient-to-r from-black/45 via-black/20 to-black/45 opacity-70" />
            </motion.div>

            {/* Effets de particules lors de la révélation */}
            <AnimatePresence>
              {phase === 'revealed' && (
                <motion.div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Explosion de particules */}
                  {[...Array(50)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-3 h-3 ${rarityConfig.particles} rounded-full shadow-lg`}
                      initial={{
                        x: 0,
                        y: 0,
                        scale: 0,
                        opacity: 1,
                        rotate: 0
                      }}
                      animate={{
                        x: (Math.random() - 0.5) * 600,
                        y: (Math.random() - 0.5) * 600,
                        scale: [0, 1.5, 0],
                        opacity: [1, 1, 0],
                        rotate: [0, 360]
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.01,
                        ease: 'easeOut'
                      }}
                    />
                  ))}
                  
                  {/* Particules en spirale */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={`spiral-${i}`}
                      className={`absolute w-2 h-2 ${rarityConfig.particles} rounded-full`}
                      initial={{
                        x: 0,
                        y: 0,
                        scale: 0,
                        opacity: 1
                      }}
                      animate={{
                        x: Math.cos(i * 0.3) * 300,
                        y: Math.sin(i * 0.3) * 300,
                        scale: [0, 1, 0],
                        opacity: [1, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: i * 0.05,
                        ease: 'easeOut'
                      }}
                    />
                  ))}
                  
                  {/* Halo lumineux */}
                  <motion.div
                    className="absolute inset-0 rounded-3xl opacity-30"
                    style={{
                      background: `radial-gradient(circle, ${rarityConfig.particles.replace('bg-', '')} 0%, transparent 70%)`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 3, opacity: [0, 1, 0] }}
                    transition={{ duration: 2.5, ease: 'easeOut' }}
                  />
                  
                  {/* Rayons de lumière */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`ray-${i}`}
                      className="absolute w-1 h-32 opacity-60"
                      style={{
                        background: `linear-gradient(to bottom, ${rarityConfig.particles.replace('bg-', '')}, transparent)`,
                        transformOrigin: 'bottom center',
                        left: '50%',
                        top: '50%',
                        marginLeft: '-0.5px',
                        marginTop: '-64px'
                      }}
                      initial={{ 
                        rotate: i * 45,
                        scaleY: 0,
                        opacity: 0
                      }}
                      animate={{ 
                        rotate: i * 45,
                        scaleY: [0, 1, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 1.5,
                        delay: 0.5 + i * 0.1,
                        ease: 'easeOut'
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


