'use client';

import { usePathname } from 'next/navigation';
import SynauraShutdownBanner from '@/components/SynauraShutdownBanner';
import { isPastShutdownEnd, isShutdownAnnounced } from '@/lib/synauraShutdown';

function isHiddenRoute(pathname: string | null) {
  if (!pathname) return true;
  return (
    pathname.includes('/meteo/login') ||
    pathname.includes('/meteo/dashboard') ||
    pathname.startsWith('/auth')
  );
}

/** Bannière globale sticky — visible pendant la période de préavis */
export default function SynauraShutdownNotice() {
  const pathname = usePathname();

  if (!isShutdownAnnounced() || isPastShutdownEnd()) return null;
  if (isHiddenRoute(pathname)) return null;
  if (pathname === '/') return null;
  if (pathname === '/fermeture' || pathname === '/arret') return null;

  return <SynauraShutdownBanner variant="sticky" />;
}
