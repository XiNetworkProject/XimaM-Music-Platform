'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, AtSign, Eye, EyeOff, Sparkles } from 'lucide-react';
import EntryFrame from '@/components/enter/EntryFrame';
import SynauraEntryLoading from '@/components/enter/SynauraEntryLoading';
import { SynauraButton, SynauraIconButton, SynauraInput } from '@/components/ui/SynauraPrimitives';
import { recordEntryEvent } from '@/lib/entryAnalytics';
import { buildMemberContinueUrl, safeEntryTarget } from '@/lib/entryRouting';

type FormData = { name: string; username: string; email: string; password: string; confirmPassword: string };
type UserCount = { userCount: number; maxUsers: number; canRegister: boolean; remainingSlots: number };

const STEPS = [
  { eyebrow: '01 · Ton visage', title: 'Comment on t’appelle&nbsp;?', description: 'Ton nom et ton @ seront visibles autour des sons que tu partages.' },
  { eyebrow: '02 · Ton accès', title: 'Où peut-on te retrouver&nbsp;?', description: 'Cet email sert uniquement à sécuriser et retrouver ton compte.' },
  { eyebrow: '03 · Ta clé', title: 'Protège ton univers.', description: 'Choisis un mot de passe, puis tu pourras façonner ton monde musical.' },
] as const;

function GoogleMark() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>;
}

function SignUpContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = useMemo(() => safeEntryTarget(params.get('callbackUrl'), '/live'), [params]);
  const continueUrl = useMemo(() => buildMemberContinueUrl(callbackUrl), [callbackUrl]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userCount, setUserCount] = useState<UserCount | null>(null);

  useEffect(() => {
    recordEntryEvent('signup_start', { source: 'signup_page' });
    fetch('/api/auth/count-users')
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data && typeof data.canRegister === 'boolean') setUserCount(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session) router.replace(continueUrl);
  }, [status, session, router, continueUrl]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (form.password.length >= 6) score += 1;
    if (form.password.length >= 10) score += 1;
    if (/[A-Z]/.test(form.password) && /[a-z]/.test(form.password)) score += 1;
    if (/\d/.test(form.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(form.password)) score += 1;
    return Math.min(score, 5);
  }, [form.password]);

  const update = (name: keyof FormData, value: string) => {
    setForm((current) => ({ ...current, [name]: name === 'username' ? value.replace(/\s/g, '').toLowerCase() : value }));
    setError('');
  };

  const validate = (target = step) => {
    if (target === 0) {
      if (!form.name.trim()) return 'Ajoute ton nom affiché.';
      if (form.username.trim().length < 3) return 'Ton nom d’utilisateur doit contenir au moins 3 caractères.';
    }
    if (target === 1 && (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))) return 'Ajoute un email valide.';
    if (target === 2) {
      if (form.password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
      if (form.password !== form.confirmPassword) return 'Les deux mots de passe ne correspondent pas.';
    }
    return '';
  };

  const next = () => {
    const message = validate();
    if (message) return setError(message);
    setError('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) return next();
    if (userCount && !userCount.canRegister) return setError('Les inscriptions sont fermées pour le moment.');
    const message = validate(2);
    if (message) return setError(message);

    setIsLoading(true);
    setError('');
    try {
      const referralCode = typeof window !== 'undefined' ? localStorage.getItem('synaura_referral_code') || undefined : undefined;
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), username: form.username.trim().toLowerCase(), email: form.email.trim().toLowerCase(), password: form.password, referralCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Création du compte impossible.');
      if (referralCode) localStorage.removeItem('synaura_referral_code');
      recordEntryEvent('signup_complete', { provider: 'credentials' });
      const nextParams = new URLSearchParams({ message: 'Compte créé. Connecte-toi pour façonner ton univers.', callbackUrl });
      router.push(`/auth/signin?${nextParams.toString()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création du compte impossible.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') return <SynauraEntryLoading label={status === 'authenticated' ? 'Ouverture de ton univers…' : 'Synaura te reconnaît…'} />;

  const current = STEPS[step];
  return (
    <EntryFrame eyebrow="Créer ton compte" title="Fais une place à ta musique." description="Trois étapes utiles. Ensuite, deux choix musicaux suffisent pour commencer.">
      <div className="mb-6" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
        <div className="flex gap-1.5">{STEPS.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-[var(--syn-accent)]' : 'bg-[var(--syn-soft-strong)]'}`} />)}</div>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--syn-accent-coral)]" dangerouslySetInnerHTML={{ __html: current.eyebrow }} />
        <h2 className="mt-1 text-2xl font-black tracking-tight" dangerouslySetInnerHTML={{ __html: current.title }} />
        <p className="mt-1 text-sm font-semibold text-[var(--syn-text-secondary)]">{current.description}</p>
      </div>

      {error ? <div role="alert" className="mb-4 flex items-center gap-2 rounded-[var(--syn-radius-md)] bg-[color-mix(in_srgb,var(--syn-destructive)_12%,transparent)] p-3 text-sm font-bold text-[var(--syn-destructive)]"><AlertCircle className="h-4 w-4" /> {error}</div> : null}

      <form onSubmit={submit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          {step === 0 ? <><SynauraInput label="Nom affiché" required autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ton nom d’artiste ou ton prénom" /><SynauraInput label="Nom d’utilisateur" required autoComplete="username" value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="tonpseudo" hint={form.username ? `Ton profil sera synaura.fr/profile/${form.username}` : '3 caractères minimum, sans espace'} /></> : null}
          {step === 1 ? <><SynauraInput label="Email" type="email" required autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="toi@exemple.fr" /><div className="rounded-[var(--syn-radius-md)] bg-[var(--syn-soft)] p-4 text-sm font-semibold text-[var(--syn-text-secondary)]"><AtSign className="mb-2 h-4 w-4 text-[var(--syn-accent-blue)]" />Pas de newsletter automatique. Cet email sert à la connexion et à la récupération du compte.</div></> : null}
          {step === 2 ? <><div className="grid grid-cols-[1fr_auto] items-end gap-2"><SynauraInput label="Mot de passe" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} hint="6 caractères minimum" /><SynauraIconButton type="button" variant="secondary" label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</SynauraIconButton></div><div className="flex gap-1" aria-label={`Robustesse du mot de passe : ${passwordScore} sur 5`}>{[1,2,3,4,5].map((value) => <span key={value} className={`h-1.5 flex-1 rounded-full ${value <= passwordScore ? 'bg-[var(--syn-accent-blue)]' : 'bg-[var(--syn-soft-strong)]'}`} />)}</div><div className="grid grid-cols-[1fr_auto] items-end gap-2"><SynauraInput label="Confirme le mot de passe" type={showConfirm ? 'text' : 'password'} required autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /><SynauraIconButton type="button" variant="secondary" label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'} onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</SynauraIconButton></div></> : null}
        </div>

        <div className="mt-auto flex gap-2 pt-7">
          {step > 0 ? <SynauraButton type="button" variant="secondary" size="lg" onClick={() => { setError(''); setStep((currentStep) => currentStep - 1); }}><ArrowLeft className="h-4 w-4" /> Retour</SynauraButton> : null}
          <SynauraButton type="submit" variant="accent" size="lg" fullWidth loading={isLoading} disabled={Boolean(userCount && !userCount.canRegister)}>{step === STEPS.length - 1 ? <><Sparkles className="h-4 w-4" /> Créer mon compte</> : <>Continuer <ArrowRight className="h-4 w-4" /></>}</SynauraButton>
        </div>
      </form>

      {step === 0 ? <><div className="my-5 flex items-center gap-3" aria-hidden><span className="h-px flex-1 bg-[var(--syn-border)]" /><span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--syn-text-secondary)]">ou</span><span className="h-px flex-1 bg-[var(--syn-border)]" /></div><SynauraButton type="button" variant="secondary" fullWidth onClick={() => void signIn('google', { callbackUrl: continueUrl })}><GoogleMark /> Continuer avec Google</SynauraButton></> : null}
      <p className="mt-5 text-center text-xs font-semibold text-[var(--syn-text-secondary)]">Déjà un compte&nbsp;? <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-black text-[var(--syn-accent)]">Se connecter</Link></p>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--syn-text-secondary)]">En créant ton compte, tu acceptes les <Link href="/legal/cgu" className="underline">CGU</Link> et la <Link href="/legal/confidentialite" className="underline">politique de confidentialité</Link>.</p>
    </EntryFrame>
  );
}

export default function SignUpPage() {
  return <Suspense fallback={<SynauraEntryLoading label="Préparation de ton entrée…" />}><SignUpContent /></Suspense>;
}
