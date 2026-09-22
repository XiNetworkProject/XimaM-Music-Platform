'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import BottomNav from '@/components/BottomNav';
import TopSearchBar from '@/components/TopSearchBar';
import { useBoostNotifications } from '@/hooks/useBoostNotifications';
import { getRouteChrome } from '@/lib/routeChrome';
import { usesUnifiedNavigation } from '@/lib/unifiedNavigation';
import AppNavigation from '@/components/navigation/AppNavigation';

export function ConditionalNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useBoostNotifications();
  const chrome = getRouteChrome(pathname);

  if (usesUnifiedNavigation(pathname)) return <div className="syn-unified-app"><AppNavigation />{children}</div>;

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
  if (usesUnifiedNavigation(pathname) || !chrome.showTopSearch) return null;
  return <TopSearchBar />;
}

export function ConditionalBottomNav() {
  const pathname = usePathname();
  const chrome = getRouteChrome(pathname);
  if (usesUnifiedNavigation(pathname) || !chrome.showBottomNav) return null;
  return <BottomNav />;
}
