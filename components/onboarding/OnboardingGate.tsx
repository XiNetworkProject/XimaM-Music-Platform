'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const EXCLUDED_PREFIXES = ['/onboarding', '/auth', '/legal'];

/**
 * Composant sans rendu monte a la racine (app/providers.tsx). Verifie une seule
 * fois par chargement si l'utilisateur connecte a termine l'onboarding V1, et le
 * redirige vers /onboarding sinon, en conservant la page visee via callbackUrl.
 * Ne touche jamais la logique de connexion elle-meme (NextAuth callbacks/signin).
 */
export default function OnboardingGate() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (!pathname || EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    if (checked.current) return;
    checked.current = true;

    let mounted = true;
    fetch('/api/user/preferences', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted) return;
        const completed = Boolean(json?.preferences?.onboarding?.onboardingCompleted);
        if (!completed) {
          const search = typeof window !== 'undefined' ? window.location.search : '';
          const target = `${pathname}${search}`;
          router.replace(`/onboarding?callbackUrl=${encodeURIComponent(target)}`);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [status, session, pathname, router]);

  return null;
}
