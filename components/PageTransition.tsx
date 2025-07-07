'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);

  useEffect(() => {
    if (previousPath !== pathname) {
      setIsLoading(true);
      setPreviousPath(pathname);
      
      // Simuler un temps de chargement minimal pour une transition fluide
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [pathname, previousPath]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="min-h-screen"
      >
        {/* Indicateur de chargement subtil */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed top-4 right-4 z-50"
            >
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu de la page */}
        <div className="relative">
          {children}
        </div>

        {/* Effet de transition en arrière-plan */}
        <motion.div
          className="fixed inset-0 pointer-events-none z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0.1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 