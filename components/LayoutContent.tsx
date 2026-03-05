"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar, useAudioPlayer } from '@/app/providers';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useSidebar();
  const { audioState } = useAudioPlayer();
  const pathname = usePathname();
  
  const isMeteoPage = pathname?.includes('/meteo/login') || pathname?.includes('/meteo/dashboard');
  const isAuthPage = pathname?.startsWith('/auth');
  const isFullScreen = isMeteoPage || isAuthPage;
  const isStudioPage = pathname?.startsWith('/ai-generator');
  const playerVisible = audioState.showPlayer && audioState.tracks.length > 0;
  
  return (
    <div
      className={`flex-1 flex flex-col ${isFullScreen ? '' : isSidebarOpen ? 'lg:pl-[220px]' : 'lg:pl-[72px]'} overflow-x-hidden max-w-full w-full transition-[padding] duration-200`}
      style={playerVisible && !isStudioPage && !isAuthPage ? { paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' } : undefined}
    >
      {children}
    </div>
  );
}
