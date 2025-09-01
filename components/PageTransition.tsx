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
      
      // Temps de chargement minimal pour une transition fluide
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [pathname, previousPath]);

  return (
    <div className="min-h-screen">
      {/* Indicateur de chargement subtil */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-50">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Contenu de la page */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
} 