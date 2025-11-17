"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/app/providers';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useSidebar();
  const pathname = usePathname();
  
  // Sur les pages météo, pas de padding car pas de sidebar
  const isMeteoPage = pathname?.includes('/meteo/login') || pathname?.includes('/meteo/dashboard');
  
  return (
    <div className={`flex-1 flex flex-col ${isMeteoPage ? '' : isSidebarOpen ? 'lg:pl-72' : 'lg:pl-24'} overflow-x-hidden max-w-full w-full`}>
      {children}
    </div>
  );
}
