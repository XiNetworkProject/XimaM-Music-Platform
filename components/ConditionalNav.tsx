'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import BottomNav from '@/components/BottomNav';
import TopSearchBar from '@/components/TopSearchBar';

function isHiddenRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.includes('/meteo/login') ||
    pathname.includes('/meteo/dashboard') ||
    pathname.startsWith('/auth')
  );
}

export function ConditionalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <>
      {!isHiddenRoute(pathname) && <AppSidebar />}
      {children}
    </>
  );
}

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (isHiddenRoute(pathname)) return null;
  if (pathname?.startsWith('/ai-generator')) return null;
  if (pathname?.startsWith('/library')) return null;
  if (pathname?.startsWith('/boosters')) return null;
  if (pathname?.startsWith('/star-academy-tiktok')) return null;
  if (pathname?.startsWith('/messages')) return null;
  return <TopSearchBar />;
}

export function ConditionalBottomNav() {
  const pathname = usePathname();
  if (isHiddenRoute(pathname)) return null;
  return <BottomNav />;
}

