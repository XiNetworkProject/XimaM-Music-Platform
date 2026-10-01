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
  const [gateState, setGateState] = useState<'checking' | 'ready' | 'redirecting' | 'error'>('checking');
  const offlineStudioLab = process.env.NODE_ENV !== 'production' && pathname === '/dev/studio';
  const offlineStatsLab = process.env.NODE_ENV !== 'production' && pathname === '/dev/stats';
  // Public catalogue, pricing and discussion lists remain readable without onboarding. Account
  // data and checkout keep their server-side session checks; private routes
  // and subscription success pages still go through this gate.
  const excluded = offlineStudioLab || offlineStatsLab || pathname === '/' || pathname === '/live' || pathname === '/search' || pathname === '/subscriptions' || pathname === '/community' || pathname === '/community/forum' || !pathname || EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (excluded || status === 'unauthenticated') {
      if (status === 'unauthenticated') checkedUser.current = null;
      setGateState('ready');
      return;
    }
    const userId = session?.user?.id;
    // A valid cookie is not a resolved profile (for example during a DB outage).
    if (status === 'authenticated' && !userId) {
      checkedUser.current = null;
      setGateState('error');
      return;
    }
    if (status === 'authenticated' && checkedUser.current === userId) {
      setGateState('ready');
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    checkedUser.current = null;
    setGateState('checking');
    const timeout = setTimeout(() => {
      if (!mounted) return;
      setGateState('error');
      controller.abort();
    }, 15000);
    const cleanup = () => { mounted = false; clearTimeout(timeout); controller.abort(); };
    if (status !== 'authenticated' || !userId) return cleanup;

    fetch('/api/user/preferences', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Profile check unavailable');
        return response.json();
      })
      .then((json) => {
        if (!mounted || controller.signal.aborted) return;
        if (!json?.preferences || typeof json.preferences !== 'object' || Array.isArray(json.preferences)) throw new Error('Invalid profile check');
        clearTimeout(timeout);
        checkedUser.current = userId;
        if (Boolean(json.preferences.onboarding?.onboardingCompleted)) {
          setGateState('ready');
          return;
        }
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const target = `${pathname}${search}`;
        setGateState('redirecting');
        router.replace(`/onboarding?callbackUrl=${encodeURIComponent(target)}`);
      })
      .catch(() => {
        if (!mounted || controller.signal.aborted) return;
        clearTimeout(timeout);
        setGateState('error');
      });
    return cleanup;
  }, [excluded, pathname, router, session?.user?.id, status]);

  if (excluded || status === 'unauthenticated') return <>{children}</>;
  if (status === 'authenticated' && checkedUser.current === session?.user?.id && gateState === 'ready') return <>{children}</>;
  if (gateState === 'error') return (
    <main className="grid min-h-[100svh] place-items-center bg-[var(--syn-background)] px-6 text-[var(--syn-text-primary)]">
      <section role="alert" className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Ta session n’a pas pu être vérifiée.</h1>
        <p className="mt-4 text-sm text-[var(--syn-text-secondary)]">Le service est momentanément indisponible. Ton compte n’a pas été déconnecté et aucun achat n’a été lancé.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-[var(--syn-accent)] px-6 font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Recharger et réessayer</button>
          <a href="/" className="inline-flex min-h-11 items-center px-3 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Retour à l’accueil</a>
        </div>
      </section>
    </main>
  );
  return <SynauraEntryLoading label={gateState === 'redirecting' ? 'Ton univers t’attend…' : 'Synaura te reconnaît…'} />;
}
