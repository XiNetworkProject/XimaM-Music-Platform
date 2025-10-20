"use client";

import React from 'react';
import { useSidebar } from '@/app/providers';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useSidebar();
  return (
    <div className={`flex-1 flex flex-col ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-24'} overflow-x-hidden max-w-full`}>
      {children}
    </div>
  );
}
