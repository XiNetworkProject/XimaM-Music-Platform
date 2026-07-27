'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowRight, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react';

type MfaFactor = {
  id: string;
  type: string;
  status: string;
  friendlyName?: string | null;
};

function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth/')) {
    return '/';
  }
  return value;
}

function MfaContent() {
  const { status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => safeCallbackUrl(searchParams.get('callbackUrl')),
    [searchParams],
  );
  const [factor, setFactor] = useState<MfaFactor | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    if (status !== 'authenticated') return;

    let active = true;
    fetch('/api/auth/web/mfa', { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Vérification indisponible');
        return json?.data;
      })
      .then(async (data) => {
        if (!active) return;
        const factors = Array.isArray(data?.factors) ? data.factors as MfaFactor[] : [];
        const verifiedFactor = factors.find(
          (candidate) => candidate.type === 'totp' && candidate.status === 'verified',
        );
        if (!data?.required || !verifiedFactor) {
          await update();
          window.location.replace(callbackUrl);
          return;
        }
        setFactor(verifiedFactor);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Vérification indisponible');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [callbackUrl, router, status, update]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!factor || code.length !== 6) {
      setError('Entre le code à 6 chiffres.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const response = await fetch('/api/auth/web/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', factorId: factor.id, code }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Code incorrect');
      await update();
      window.location.replace(callbackUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code incorrect');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="w-full max-w-[470px]">
      <section className="overflow-hidden rounded-2xl border border-black/[0.09] bg-[#fffaf2] shadow-[0_24px_70px_rgba(44,33,19,0.16)]">
        <div className="border-b border-black/[0.08] px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/brand/2026/synaura-symbol-2026.png"
                alt="Synaura"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                unoptimized
                priority
              />
              <span>
                <span className="block text-lg font-black text-[#171313]">Synaura</span>
                <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-black/38">
                  Sécurité
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/48 transition hover:bg-[#171313] hover:text-white"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-7 sm:px-7 sm:py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#171313] text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-[#ff6f61]">
            Vérification en deux étapes
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[#171313]">
            Confirme que c&apos;est toi.
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-black/52">
            Entre le code affiché par ton application d&apos;authentification.
          </p>

          {error ? (
            <div role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          {loading || status === 'loading' ? (
            <div className="mt-7 flex items-center gap-3 rounded-xl bg-black/[0.04] px-4 py-4 text-sm font-bold text-black/48">
              <Loader2 className="h-4 w-4 animate-spin" />
              Préparation de la vérification...
            </div>
          ) : (
            <form onSubmit={verify} className="mt-7">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-black/48">
                  Code de sécurité
                </span>
                <span className="relative block">
                  <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/32" />
                  <input
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="123456"
                    aria-label="Code de sécurité à 6 chiffres"
                    className="h-14 w-full rounded-xl border border-[#d8cbb8] bg-white pl-11 pr-4 text-center font-mono text-xl font-black tracking-[0.32em] text-[#171313] outline-none transition placeholder:tracking-[0.2em] placeholder:text-black/22 focus:border-[#171313]/30 focus:ring-4 focus:ring-black/[0.05]"
                    disabled={verifying || !factor}
                  />
                </span>
              </label>
              <button
                type="submit"
                disabled={verifying || !factor || code.length !== 6}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171313] px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {verifying ? 'Vérification...' : 'Vérifier et continuer'}
              </button>
            </form>
          )}

          <div className="mt-5 border-t border-black/[0.08] pt-5 text-xs font-semibold leading-5 text-black/42">
            Le code change toutes les 30 secondes et fonctionne sans SMS ni reseau mobile.
          </div>
        </div>
      </section>
    </main>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<Loader2 className="h-7 w-7 animate-spin text-black/40" />}>
      <MfaContent />
    </Suspense>
  );
}
