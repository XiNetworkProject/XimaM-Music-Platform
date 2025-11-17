'use client';

import { usePathname } from 'next/navigation';
import AppNavbar from '@/components/AppNavbar';
import AppSidebar from '@/components/AppSidebar';
import BottomNav from '@/components/BottomNav';

export function ConditionalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Masquer la navbar et la sidebar sur les pages météo
  const isMeteoPage = pathname?.includes('/meteo/login') || pathname?.includes('/meteo/dashboard');
  
  return (
    <>
      {!isMeteoPage && <AppSidebar />}
      {children}
    </>
  );
}

export function ConditionalNavbar() {
  const pathname = usePathname();
  const isMeteoPage = pathname?.includes('/meteo/login') || pathname?.includes('/meteo/dashboard');
  
  if (isMeteoPage) return null;
  return <AppNavbar />;
}

export function ConditionalBottomNav() {
  const pathname = usePathname();
  const isMeteoPage = pathname?.includes('/meteo/login') || pathname?.includes('/meteo/dashboard');
  
  if (isMeteoPage) return null;
  return <BottomNav />;
}

