'use client';

import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="min-h-screen">
      {/* Contenu de la page sans blocage */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
} 