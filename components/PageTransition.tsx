'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="v2-route-enter relative min-h-screen" data-v2-route={pathname}>
      {children}
    </div>
  );
}
