'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import EntryFrame from '@/components/enter/EntryFrame';
import SynauraEntryLoading from '@/components/enter/SynauraEntryLoading';
import { SynauraButton, SynauraIconButton, SynauraInput } from '@/components/ui/SynauraPrimitives';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import { buildMemberContinueUrl, safeEntryTarget } from '@/lib/entryRouting';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => safeEntryTarget(searchParams.get('callbackUrl'), '/live'), [searchParams]);
  const continueUrl = useMemo(() => buildMemberContinueUrl(callbackUrl), [callbackUrl]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const successMessage = searchParams.get('message');

  useEffect(() => {
    if (status === 'authenticated' && session) router.replace(continueUrl);
  }, [status, session, router, continueUrl]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Remplis ton email et ton mot de passe.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', { email: email.trim().toLowerCase(), password, redirect: false });
      if (result?.error) {
        setError('Email ou mot de passe incorrect.');
        return;
      }
      recordEntryEvent('login_complete', { provider: 'credentials' });
      router.replace(continueUrl);
    } catch {
      setError('Connexion impossible pour le moment.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return <SynauraEntryLoading label={status === 'authenticated' ? 'Ouverture de Live Synaura…' : 'Synaura te reconnaît…'} />;
  }

  return (
    <EntryFrame eyebrow="Connexion" title="Ravi de te revoir." description="Retrouve directement ton écoute, tes créations et les personnes que tu suis.">
      <div className="flex flex-1 flex-col">
        {successMessage ? <div role="status" className="mb-4 flex items-center gap-2 rounded-[var(--syn-radius-md)] border border-[color-mix(in_srgb,var(--syn-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--syn-success)_12%,transparent)] p-3 text-sm font-bold text-[var(--syn-success)]"><Check className="h-4 w-4" /> {successMessage}</div> : null}
        {error ? <div role="alert" className="mb-4 flex items-center gap-2 rounded-[var(--syn-radius-md)] border border-[color-mix(in_srgb,var(--syn-destructive)_32%,transparent)] bg-[color-mix(in_srgb,var(--syn-destructive)_12%,transparent)] p-3 text-sm font-bold text-[var(--syn-destructive)]"><AlertCircle className="h-4 w-4" /> {error}</div> : null}

        <SynauraButton type="button" variant="secondary" size="lg" fullWidth onClick={() => void signIn('google', { callbackUrl: continueUrl })}><GoogleMark /> Continuer avec Google</SynauraButton>
        <div className="my-5 flex items-center gap-3" aria-hidden><span className="h-px flex-1 bg-[var(--syn-border)]" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--syn-text-secondary)]">ou avec email</span><span className="h-px flex-1 bg-[var(--syn-border)]" /></div>

        <form onSubmit={submit} className="space-y-4">
          <SynauraInput label="Email" type="email" name="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} placeholder="toi@exemple.fr" />
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <SynauraInput label="Mot de passe" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="Ton mot de passe" />
            <SynauraIconButton type="button" variant="secondary" label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</SynauraIconButton>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs font-black">
            <Link href="/auth/forgot-password" className="text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]">Mot de passe oublié&nbsp;?</Link>
            <Link href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-[var(--syn-accent)]">Créer un compte</Link>
          </div>
          <SynauraButton type="submit" variant="accent" size="lg" fullWidth loading={isLoading}><LockKeyhole className="h-4 w-4" /> Se connecter</SynauraButton>
        </form>

        <p className="mt-auto pt-7 text-center text-[11px] font-semibold leading-relaxed text-[var(--syn-text-secondary)]">En te connectant, tu acceptes les <Link href="/legal/cgv" className="underline">CGV</Link> et la <Link href="/legal/confidentialite" className="underline">politique de confidentialité</Link>.</p>
      </div>
    </EntryFrame>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<SynauraEntryLoading label="Préparation de la connexion…" />}><SignInContent /></Suspense>;
}
