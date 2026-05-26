'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import BottomNav from '@/components/BottomNav';
import TopSearchBar from '@/components/TopSearchBar';
import { useBoostNotifications } from '@/hooks/useBoostNotifications';
import { getRouteChrome } from '@/lib/routeChrome';

export function ConditionalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useBoostNotifications();
  const chrome = getRouteChrome(pathname);

  return (
    <>
      {chrome.showSidebar && <AppSidebar />}
      {children}
    </>
  );
}

export function ConditionalNavbar() {
  const pathname = usePathname();
  const chrome = getRouteChrome(pathname);
  if (!chrome.showTopSearch) return null;
  return <TopSearchBar />;
}

export function ConditionalBottomNav() {
  const pathname = usePathname();
  const chrome = getRouteChrome(pathname);
  if (!chrome.showBottomNav) return null;
  return <BottomNav />;
}
