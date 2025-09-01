'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import SynauraLoader from './SynauraLoader';

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
      
      // Temps de chargement minimal pour une transition fluide
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [pathname, previousPath]);

  return (
    <div className="min-h-screen">
      {/* Indicateur de chargement stylé avec Synaura */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <SynauraLoader 
              size="lg" 
              text="Chargement..." 
              className="relative z-10"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenu de la page */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
} 