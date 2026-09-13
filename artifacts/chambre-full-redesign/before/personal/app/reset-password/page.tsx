'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, AlertCircle, Mail, Lock, KeyRound } from 'lucide-react';
import ServiceFrame from '@/components/v2/ServiceFrame';

export const dynamic = 'force-dynamic';

const inputClass = "w-full h-12 pl-10 pr-4 border border-[var(--v2-line)] rounded-lg text-sm text-[var(--v2-text)] bg-[var(--v2-surface)]";

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, code: code.trim(), password, email: email.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="v2-reset-layout">
        <header>
          <p className="v2-kicker">Ton compte Synaura</p>
          <h1 className="v2-heading mt-5">L’accès est rétabli.</h1>
        </header>
        <section className="v2-reset-form v2-panel" aria-label="Réinitialisation terminée">
          <Check className="h-7 w-7 text-[var(--syn-success)]" />
          <h2 className="mt-5 text-2xl">Mot de passe réinitialisé</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--v2-muted)]">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <Link href="/auth/signin" className="v2-action v2-action-primary mt-6 w-full">Se connecter</Link>
          <Link href="/" className="v2-action mt-3 w-full"><ArrowLeft className="h-4 w-4" /> Retour à l'accueil</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="v2-reset-layout">
      <header>
        <p className="v2-kicker">Ton compte Synaura</p>
        <h1 className="v2-heading mt-5">Retrouve ton accès.</h1>
        <p className="v2-intro mt-6">Réinitialise ton mot de passe à l’aide du code reçu.</p>
        <Link href="/auth/signin" className="v2-action mt-8"><ArrowLeft className="h-4 w-4" /> Retour à la connexion</Link>
      </header>
      <section className="v2-reset-form v2-panel" aria-label="Nouveau mot de passe">
        {!!error && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--syn-destructive)] p-4 text-sm text-[var(--syn-destructive)]">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm text-[var(--v2-muted)]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--v2-faint)]" />
              <input id="reset-email" className={inputClass} placeholder="vous@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div>
            <label htmlFor="reset-code" className="mb-2 block text-sm text-[var(--v2-muted)]">Code (6 chiffres)</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--v2-faint)]" />
              <input id="reset-code" className={inputClass} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} disabled={loading} />
            </div>
          </div>
          <div>
            <label htmlFor="reset-password" className="mb-2 block text-sm text-[var(--v2-muted)]">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--v2-faint)]" />
              <input id="reset-password" className={inputClass} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="v2-action v2-action-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> En cours...
              </span>
            ) : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="v2-personal v2-personal--reset-password">
      <ServiceFrame>
        <Suspense fallback={<p role="status" className="v2-empty">Chargement...</p>}>
          <ResetPasswordInner />
        </Suspense>
      </ServiceFrame>
    </div>
  );
}

