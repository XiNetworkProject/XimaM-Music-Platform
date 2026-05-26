"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar, useAudioPlayer } from '@/app/providers';
import SynauraShutdownNotice from '@/components/SynauraShutdownNotice';
import { getRouteChrome } from '@/lib/routeChrome';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useSidebar();
  const { audioState } = useAudioPlayer();
  const pathname = usePathname();
  const chrome = getRouteChrome(pathname);
  const playerVisible = audioState.showPlayer && audioState.tracks.length > 0;
  
  return (
    <div
      className={`flex-1 flex flex-col ${
        chrome.useFullScreenLayout ? '' : isSidebarOpen ? 'lg:pl-[220px]' : 'lg:pl-[72px]'
      } overflow-x-hidden max-w-full w-full transition-[padding] duration-200`}
      style={
        playerVisible && !chrome.suppressGlobalPlayerPadding
          ? { paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }
          : undefined
      }
    >
      {chrome.showGlobalShutdownNotice ? <SynauraShutdownNotice /> : null}
      {children}
    </div>
  );
}
