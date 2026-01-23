'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import BottomNav from '@/components/BottomNav';
import TopSearchBar from '@/components/TopSearchBar';

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
  const isAIStudio = pathname?.startsWith('/ai-generator');
  const isLibrary = pathname?.startsWith('/library');
  const isBoosters = pathname?.startsWith('/boosters');
  
  if (isMeteoPage) return null;
  if (isAIStudio) return null; // pas de barre en haut dans le studio IA
  if (isLibrary) return null; // pas de barre de recherche globale sur la Library (elle a sa propre recherche)
  if (isBoosters) return null; // pas de barre de recherche globale sur Boosters (page déjà équipée)
  return <TopSearchBar />;
}

export function ConditionalBottomNav() {
  const pathname = usePathname();
  const isMeteoPage = pathname?.includes('/meteo/login') || pathname?.includes('/meteo/dashboard');
  
  if (isMeteoPage) return null;
  return <BottomNav />;
}

