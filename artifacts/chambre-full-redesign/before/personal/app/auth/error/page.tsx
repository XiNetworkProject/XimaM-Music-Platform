'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import EntryFrame from '@/components/enter/EntryFrame';
import SynauraEntryLoading from '@/components/enter/SynauraEntryLoading';
import { SynauraButton } from '@/components/ui/SynauraPrimitives';

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Tu as refusé l’accès. Rien n’a été créé ni modifié ; tu peux réessayer quand tu veux.",
  Configuration: "Le service de connexion n’est pas disponible pour le moment.",
  Verification: 'Ce lien de vérification est invalide ou a expiré.',
  OAuthSignin: "La connexion avec Google n’a pas pu démarrer.",
  OAuthCallback: "Le retour de Google n’a pas pu être finalisé.",
  Default: "Une erreur inattendue a interrompu la connexion.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  const errorMessage = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <EntryFrame
      eyebrow="Connexion interrompue"
      title="Reprends le fil."
      description="Ton univers reste intact. Choisis simplement comment revenir dans Synaura."
      compact
    >
      <div role="alert" className="my-auto rounded-[1.75rem] border border-[color-mix(in_srgb,var(--syn-danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--syn-danger)_8%,var(--syn-surface))] p-5 sm:p-7">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--syn-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--syn-danger)_12%,transparent)] text-[var(--syn-danger)]">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--syn-danger)]">{error}</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.035em]">La porte ne s’est pas ouverte.</h3>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--syn-text-secondary)]">{errorMessage}</p>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <SynauraButton onClick={() => window.location.assign('/auth/signin')}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Réessayer
        </SynauraButton>
        <Link href="/" className="syn-interactive inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--syn-border)] bg-[var(--syn-surface)] px-5 text-sm font-black hover:bg-[var(--syn-soft)]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Revenir à Discover
        </Link>
      </div>
    </EntryFrame>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<SynauraEntryLoading label="La connexion revient…" />}>
      <AuthErrorContent />
    </Suspense>
  );
}
