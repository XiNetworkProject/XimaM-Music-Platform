'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import SynauraEntryLoading from '@/components/enter/SynauraEntryLoading';

const EXCLUDED_PREFIXES = ['/onboarding', '/auth', '/enter', '/landing', '/legal'];

/**
 * Frontière de session pour les deep links : le contenu ciblé n'est monté
 * qu'après résolution de la session et, pour un membre, de l'onboarding.
 * La racine est décidée côté serveur et ne repasse pas par cette attente.
 */
export default function OnboardingGate({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const checkedUser = useRef<string | null>(null);
  const [gateState, setGateState] = useState<'checking' | 'ready' | 'redirecting'>('checking');
  const excluded = pathname === '/' || pathname === '/live' || !pathname || EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (excluded || status === 'unauthenticated') {
      setGateState('ready');
      return;
    }
    const userId = session?.user?.id;
    if (status !== 'authenticated' || !userId) return;
    if (checkedUser.current === userId) {
      setGateState('ready');
      return;
    }

    let mounted = true;
    setGateState('checking');
    fetch('/api/user/preferences', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((json) => {
        if (!mounted) return;
        checkedUser.current = userId;
        if (!json || Boolean(json?.preferences?.onboarding?.onboardingCompleted)) {
          setGateState('ready');
          return;
        }
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const target = `${pathname}${search}`;
        setGateState('redirecting');
        router.replace(`/onboarding?callbackUrl=${encodeURIComponent(target)}`);
      })
      .catch(() => { if (mounted) setGateState('ready'); });
    return () => { mounted = false; };
  }, [excluded, pathname, router, session?.user?.id, status]);

  if (excluded || status === 'unauthenticated') return <>{children}</>;
  if (status === 'authenticated' && checkedUser.current === session?.user?.id && gateState === 'ready') return <>{children}</>;
  return <SynauraEntryLoading label={gateState === 'redirecting' ? 'Ton univers t’attend…' : 'Synaura te reconnaît…'} />;
}
