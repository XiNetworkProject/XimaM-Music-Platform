'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface LoadingScreenProps {
  progress?: number;
  message?: string;
  isPreloading?: boolean;
}

// Composant séparé pour les particules pour éviter les re-renders
function ParticlesEffect() {
  const particles = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    return Array.from({ length: 20 }, () => ({
      initialX: Math.random() * window.innerWidth,
      initialY: Math.random() * window.innerHeight,
      targetY: Math.random() * window.innerHeight,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" suppressHydrationWarning>
      {particles.map((particle, i) => (
          <motion.div
            key={i}
          className="absolute w-1 h-1 bg-accent-brand/30 rounded-full"
          initial={{ x: particle.initialX, y: particle.initialY, opacity: 0 }}
            animate={{
            y: [particle.initialY, particle.targetY], 
            opacity: [0, 1, 0], 
            scale: [1, 1.5, 1] 
            }}
            transition={{
            duration: particle.duration, 
              repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
            }}
          />
        ))}
      </div>
  );
}

export default function LoadingScreen({ progress = 0, message, isPreloading = true }: LoadingScreenProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [logoVisible, setLogoVisible] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/synaura_logotype.svg');
  const [logoSize, setLogoSize] = useState({ width: 280, height: 120 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setLogoVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setAnimatedProgress(prev => {
        if (prev >= progress) {
          clearInterval(intervalId);
          return progress;
        }
        return Math.min(prev + 3, progress);
      });
    }, 30);

    return () => clearInterval(intervalId);
  }, [progress]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden" suppressHydrationWarning>
      {/* Lueurs subtiles style Synaura */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div 
          className="absolute w-[600px] h-[600px] -top-[200px] -left-[200px] rounded-full blur-[120px] opacity-[0.15]"
          style={{
            background: 'radial-gradient(circle, rgba(110,86,207,0.6) 0%, rgba(110,86,207,0.2) 40%, transparent 70%)'
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] -top-[150px] -right-[150px] rounded-full blur-[100px] opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle, rgba(240,147,251,0.5) 0%, rgba(240,147,251,0.15) 40%, transparent 70%)'
          }}
        />
        <div 
          className="absolute w-[700px] h-[700px] -bottom-[300px] left-1/2 -translate-x-1/2 rounded-full blur-[140px] opacity-[0.1]"
          style={{
            background: 'radial-gradient(circle, rgba(0,211,167,0.4) 0%, rgba(0,211,167,0.1) 40%, transparent 70%)'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px] opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, rgba(110,86,207,0.3) 0%, transparent 60%)'
          }}
        />
      </div>

      {/* Particles effect */}
      {isMounted && typeof window !== 'undefined' && (
        <ParticlesEffect />
      )}
      
      {/* Contenu principal - Centré verticalement et horizontalement */}
      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center justify-center min-h-screen">
        {/* Logo animé */}
        {isMounted && (
          <AnimatePresence>
            {logoVisible && (
        <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  duration: 0.9, 
                  type: "spring",
                  stiffness: 120,
                  damping: 20
                }}
                className="relative mb-12"
              >
                {/* Glow effect amélioré */}
                <motion.div 
                  className="absolute inset-0 bg-accent-brand/25 blur-3xl rounded-full"
                  animate={{ 
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Logo principal */}
        <motion.div
                  animate={{
                    rotate: [0, 2, -2, 0],
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <Image
                    src={logoSrc}
                    alt="Synaura"
                    width={logoSize.width}
                    height={logoSize.height}
                    priority
                    className={`${
                      logoSize.width === 280 
                        ? 'w-[280px] h-[120px] md:w-[320px] md:h-[140px]' 
                        : 'w-[200px] h-[200px] md:w-[240px] md:h-[240px]'
                    } drop-shadow-2xl`}
                    onError={() => {
                      setLogoSrc('/synaura_symbol.svg');
                      setLogoSize({ width: 200, height: 200 });
                    }}
          />
        </motion.div>

                {/* Ripple effect amélioré */}
                {[...Array(2)].map((_, i) => (
        <motion.div
                    key={i}
                    className="absolute inset-0 border-2 border-accent-brand/15 rounded-full"
                    animate={{
                      scale: [1, 1.8 + i * 0.3, 2.5 + i * 0.5],
                      opacity: [0.4, 0.1, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: i * 0.5
                    }}
                  />
                ))}
        </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Message et barre de progression - Conteneur structuré */}
        {isMounted && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md space-y-6"
          >
            {/* Message */}
            <div className="text-center space-y-1">
        <motion.p
                key={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
                className="text-lg md:text-xl font-semibold text-white tracking-tight"
        >
                {message || (isPreloading ? 'Chargement...' : 'Initialisation...')}
        </motion.p>
      </div>

            {/* Barre de progression */}
            {isPreloading && (
              <div className="w-full space-y-3">
                <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-brand via-[#8b7af3] to-accent-brand rounded-full relative overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: `${animatedProgress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{
                        x: ['-100%', '200%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                  </motion.div>
                </div>
                
                {/* Pourcentage */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-tertiary/70 font-medium">
                    Progression
                  </span>
                  <span className="text-white/90 font-bold tracking-wider">
                    {Math.round(animatedProgress)}%
                  </span>
                </div>
              </div>
            )}

            {/* Loading dots (si pas de préchargement) */}
            {!isPreloading && (
              <div className="flex items-center justify-center gap-2 py-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-accent-brand rounded-full"
                    animate={{ 
                      scale: [1, 1.3, 1], 
                      opacity: [0.5, 1, 0.5],
                      y: [0, -4, 0]
                    }}
                    transition={{ 
                      duration: 1.2, 
                      repeat: Infinity, 
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Copyright - Position fixe en bas */}
        {isMounted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-8 left-0 right-0 text-center px-6"
          >
            <div className="space-y-1">
              <p className="text-xs text-white/50 font-medium tracking-wider">
                © {new Date().getFullYear()} Synaura
              </p>
              <p className="text-[10px] text-white/30 tracking-wide">
                Plateforme de partage musical
              </p>
            </div>
    </motion.div>
        )}
      </div>
    </div>
  );
}
