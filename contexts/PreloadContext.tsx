'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAppPreload } from '@/hooks/useAppPreload';
import LoadingScreen from '@/components/LoadingScreen';

interface PreloadContextType {
  isLoading: boolean;
  progress: number;
  currentTask: string;
  error: string | null;
  refresh: () => Promise<any>;
}

const PreloadContext = createContext<PreloadContextType | undefined>(undefined);

export function PreloadProvider({ children }: { children: ReactNode }) {
  const preloadState = useAppPreload();

  return (
    <PreloadContext.Provider value={preloadState}>
      {children}
      {preloadState.isLoading && (
        <LoadingScreen
          progress={preloadState.progress}
          message={preloadState.currentTask}
          isPreloading={true}
        />
      )}
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
