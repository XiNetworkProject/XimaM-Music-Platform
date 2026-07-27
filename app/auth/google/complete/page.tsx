'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const PENDING_IDENTITY_KEY = 'synaura.web.pending-google-identity.v1';

function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth/')) {
    return '/';
  }
  return value;
}

function CompleteGoogleAccount() {
  const { status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => safeCallbackUrl(searchParams.get('callbackUrl')),
    [searchParams],
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signup');
      return;
    }
    if (status !== 'authenticated') return;

    let active = true;
    void (async () => {
      try {
        const raw = localStorage.getItem(PENDING_IDENTITY_KEY);
        if (!raw) {
          window.location.replace(callbackUrl);
          return;
        }
        const pending = JSON.parse(raw);
        const response = await fetch('/api/auth/web/account', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pending,
            completeProfile: true,
            acceptTerms: true,
            acceptPrivacy: true,
          }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Profil incomplet');
        localStorage.removeItem(PENDING_IDENTITY_KEY);
        await update();
        if (active) {
          window.location.replace(callbackUrl);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Impossible de terminer le profil');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [callbackUrl, router, status, update]);

  return (
    <main className="w-full max-w-md rounded-2xl border border-black/[0.09] bg-[#fffaf2] p-7 text-center shadow-[0_24px_70px_rgba(44,33,19,0.16)]">
      <Image
        src="/brand/2026/synaura-symbol-2026.png"
        alt="Synaura"
        width={60}
        height={60}
        className="mx-auto h-14 w-14 object-contain"
        unoptimized
        priority
      />
      {error ? (
        <>
          <AlertCircle className="mx-auto mt-6 h-8 w-8 text-red-600" />
          <h1 className="mt-3 text-xl font-black text-[#171313]">Le compte Google est connecté</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/52">{error}</p>
          <Link href="/settings?tab=compte" className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#171313] px-5 text-sm font-black text-white">
            Compléter dans les paramètres
          </Link>
        </>
      ) : (
        <>
          {status === 'authenticated' ? (
            <CheckCircle2 className="mx-auto mt-6 h-8 w-8 text-emerald-600" />
          ) : (
            <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-black/40" />
          )}
          <h1 className="mt-3 text-xl font-black text-[#171313]">Finalisation du compte</h1>
          <p className="mt-2 text-sm font-semibold text-black/48">Tes informations sont en cours de synchronisation.</p>
        </>
      )}
    </main>
  );
}

export default function GoogleCompletePage() {
  return (
    <Suspense fallback={<Loader2 className="h-7 w-7 animate-spin text-black/40" />}>
      <CompleteGoogleAccount />
    </Suspense>
  );
}
