'use client';

import { createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAppPreload } from '@/hooks/useAppPreload';

interface PreloadContextType {
  isLoading: boolean;
  progress: number;
  currentTask: string;
  error: string | null;
  refresh: () => Promise<any>;
}

const PreloadContext = createContext<PreloadContextType | undefined>(undefined);

export function PreloadProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const preloadState = useAppPreload(pathname === '/');

  return (
    <PreloadContext.Provider value={preloadState}>
      {children}
    </PreloadContext.Provider>
  );
}

export function usePreload() {
  const context = useContext(PreloadContext);
  if (context === undefined) {
    throw new Error('usePreload must be used within a PreloadProvider');
  }
  return context;
}
