'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Gift, Headphones, Loader2, Share2, UserPlus, Users } from 'lucide-react';
import SynauraLogo from '@/components/brand/SynauraLogo';
import { SynauraAppShell, SynauraPanel } from '@/components/synaura/SynauraShell';

export default function JoinReferralPage() {
  const { code } = useParams<{ code: string }>();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          setReferrerName(data.referrerName || null);
          setValid(true);
        }
      } catch {
        // Le code reste utilisable visuellement, mais sans parrain validé.
      } finally {
        setLoading(false);
      }
    })();

    if (typeof window !== 'undefined') {
      localStorage.setItem('synaura_referral_code', code);
    }
  }, [code]);

  const signupHref = code ? `/auth/signup?callbackUrl=${encodeURIComponent('/')}` : '/auth/signup';
  const signinHref = code ? `/auth/signin?callbackUrl=${encodeURIComponent('/')}` : '/auth/signin';

  if (loading) {
    return (
      <SynauraAppShell className="v2-personal v2-personal--invitation" contentClassName="flex min-h-screen items-center justify-center">
        <div className="v2-panel p-8 text-center" role="status">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--v2-accent)]" />
          <p className="mt-3 text-sm text-[var(--v2-muted)]">Vérification de l'invitation...</p>
        </div>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell className="v2-personal v2-personal--invitation" contentClassName="max-w-7xl">
      <main className="v2-invitation chambre-invitation">
        <header className="v2-invitation-nav">
          <Link href="/" aria-label="Synaura — accueil"><SynauraLogo variant="lockup" size={42} priority decorative /></Link>
          <Link href="/" className="v2-action">Accueil <ArrowRight className="h-4 w-4" /></Link>
        </header>
        <section className="v2-invitation-copy">
          <p className="v2-kicker"><Gift className="h-4 w-4" /> {valid ? 'Invitation validée' : 'Invitation Synaura'}</p>
          <h1 className="v2-heading">{valid ? 'Quelqu’un t’attend déjà sur Synaura.' : 'Rejoins Synaura avec ce lien.'}</h1>
          <p className="v2-intro">
            {valid && referrerName ? (
              <><span className="text-[var(--v2-text)]">{referrerName}</span> t’invite à créer ton compte pour publier, suivre des artistes, commenter et partager des sons.</>
            ) : (
              <>Crée ton compte pour entrer dans le feed, publier tes créations et retrouver tes interactions au même endroit.</>
            )}
          </p>
          <div className="v2-invitation-uses">
            {[
              { icon: Headphones, label: 'Écouter' },
              { icon: Share2, label: 'Partager' },
              { icon: Users, label: 'Suivre' },
            ].map((item) => (
              <div key={item.label}><item.icon className="h-5 w-5" /><span>{item.label}</span></div>
            ))}
          </div>
        </section>
        <aside className="v2-invitation-signup">
          <SynauraPanel className="p-6 sm:p-8">
            <p className="v2-kicker">Bonus parrainage</p>
            <h2 className="mt-4 font-[var(--v2-font-display)] text-4xl">+50 crédits offerts</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--v2-muted)]">
              Crée ton compte avec ce lien et reçois 50 crédits bonus pour démarrer sur Synaura.
            </p>
            <div className="v2-invitation-code">
              <Check className="h-4 w-4 shrink-0 text-[var(--v2-accent)]" />
              <div className="min-w-0">
                <p className="text-sm">Code enregistré</p>
                <p className="mt-2 text-xs leading-6 text-[var(--v2-muted)]">Le code est gardé pour l'inscription. Tu peux créer ton compte maintenant.</p>
                {code ? <p className="mt-3 break-all font-mono text-xs text-[var(--v2-accent)]">{String(code)}</p> : null}
              </div>
            </div>
            <div className="grid gap-3">
              <Link href={signupHref} className="v2-action v2-action-primary justify-center">
                <UserPlus className="h-4 w-4" /> Créer mon compte <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={signinHref} className="v2-action justify-center">Déjà un compte ? Connexion</Link>
            </div>
            {!valid ? (
              <p className="mt-5 text-xs leading-6 text-[var(--v2-muted)]">
                Si le code n'est plus valide, tu peux quand même créer un compte Synaura normalement.
              </p>
            ) : null}
          </SynauraPanel>
        </aside>
      </main>
    </SynauraAppShell>
  );
}
