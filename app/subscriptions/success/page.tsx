'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Crown, Loader2, Music, Settings, Sparkles } from 'lucide-react';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{
    name: string;
    price: number;
    currency: string;
    interval: string;
    status: string;
    nextBilling: string | null;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    (async () => {
      try {
        setLoading(true);
        setError('');

        if (sessionId) {
          const verifyRes = await fetch('/api/billing/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          if (!verifyRes.ok) {
            setError("Paiement vérifié, mais impossible de confirmer l'activation automatiquement.");
          }
        }

        const subRes = await fetch('/api/subscriptions/my-subscription', {
          headers: { 'Cache-Control': 'no-store' },
        });
        const subJson = await subRes.json().catch(() => null);
        const plan = subJson?.subscription || null;
        const userSub = subJson?.userSubscription || null;

        const nextBilling = userSub?.currentPeriodEnd
          ? new Date(userSub.currentPeriodEnd).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : null;

        if (plan?.name) {
          setSubscriptionData({
            name: String(plan.name),
            price: Number(plan.price || 0),
            currency: String(plan.currency || 'EUR'),
            interval: String(plan.interval || ''),
            status: String(userSub?.status || 'active'),
            nextBilling,
          });
        } else {
          setSubscriptionData(null);
        }
      } catch (e: any) {
        setError(e?.message || 'Erreur lors du chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  if (loading) {
    return (
      <SynauraAppShell contentClassName="flex min-h-screen items-center justify-center">
        <SynauraPanel className="max-w-md p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#171313]" />
          <h2 className="mt-4 text-xl font-black text-[#171313]">Activation en cours...</h2>
          <p className="mt-2 text-sm font-semibold text-black/48">On vérifie ton paiement et ton abonnement.</p>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-5xl">
      <SynauraTopBar searchLabel="Rechercher un son, un post ou un profil..." primaryHref="/upload" primaryLabel="Publier" secondaryHref="/settings?tab=compte" secondaryLabel="Compte" />

      <main className="space-y-5 pb-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <SynauraInkPanel className="p-6 text-center sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(16,185,129,0.26),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(124,92,255,0.24),transparent_34%),radial-gradient(circle_at_55%_100%,rgba(0,194,203,0.18),transparent_34%)]" />
            <div className="relative">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.6rem] bg-white text-[#171313] shadow-[0_16px_34px_rgba(255,255,255,0.16)]">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/48">Abonnement activé</p>
              <h1 className="mx-auto mt-3 max-w-2xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl">
                Tes avantages sont prêts.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6 text-white/60">
                Tu peux retourner créer, publier ou gérer ton abonnement depuis les paramètres.
              </p>
            </div>
          </SynauraInkPanel>
        </motion.div>

        <SynauraPanel className="p-5 sm:p-7">
          {error ? (
            <div className="mb-5 rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#171313] text-white">
              <Crown className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black text-[#171313]">
                {subscriptionData ? `Plan ${subscriptionData.name}` : 'Plan activé'}
              </h2>
              <p className="text-sm font-semibold text-black/44">
                Statut: {subscriptionData?.status || 'actif'}
              </p>
            </div>
          </div>

          {subscriptionData ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric label="Prix" value={`${Number.isFinite(subscriptionData.price) ? subscriptionData.price : 0}€/${subscriptionData.interval || 'mois'}`} />
              <Metric label="Prochain paiement" value={subscriptionData.nextBilling || '—'} />
              <Metric label="Avantages" value="Débloqués" />
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <NextStep icon={<Sparkles className="h-5 w-5" />} title="Créer avec tes crédits" text="Va dans le Studio pour utiliser tes avantages." />
            <NextStep icon={<Settings className="h-5 w-5" />} title="Gérer ton compte" text="Retrouve abonnement, sécurité et préférences dans les paramètres." />
          </div>
        </SynauraPanel>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => router.push('/')} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]">
            <Music className="h-4 w-4" />
            Retour à la musique
          </button>
          <button onClick={() => router.push('/subscriptions')} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-black/60 shadow-[0_14px_36px_rgba(30,25,20,0.08)] transition hover:bg-black hover:text-white">
            <Crown className="h-4 w-4" />
            Gérer l'abonnement
          </button>
        </div>

        <SynauraPanel className="p-5 text-center">
          <h3 className="text-sm font-black text-[#171313]">Merci pour ton soutien.</h3>
          <p className="mt-2 text-sm font-semibold text-black/48">
            Pour un souci de facturation: <a className="font-black underline" href="mailto:contact.syn@synaura.fr">contact.syn@synaura.fr</a>
          </p>
        </SynauraPanel>
      </main>
    </SynauraAppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dccfbb] bg-white/72 p-4 text-center">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-black/34">{label}</p>
      <p className="mt-1 text-lg font-black text-[#171313]">{value}</p>
    </div>
  );
}

function NextStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#dccfbb] bg-white/72 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#ff6f61]/12 text-[#ff6f61]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black text-[#171313]">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-5 text-black/48">{text}</p>
      </div>
    </div>
  );
}

export default function SubscriptionSuccess() {
  return (
    <Suspense
      fallback={
        <SynauraAppShell contentClassName="flex min-h-screen items-center justify-center">
          <SynauraPanel className="max-w-md p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#171313]" />
            <h2 className="mt-4 text-xl font-black text-[#171313]">Chargement...</h2>
          </SynauraPanel>
        </SynauraAppShell>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
