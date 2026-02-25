'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Crown, Star, Music, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

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
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    (async () => {
      try {
        setLoading(true);
        setError('');

        // Vérifier le checkout si on a un session_id
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

        // Charger le plan actuel réel
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
      <div className="min-h-screen bg-background-primary text-foreground-primary flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-border-secondary bg-background-fog-thin p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground-tertiary" />
          <h2 className="mt-4 text-lg font-semibold">Activation en cours…</h2>
          <p className="mt-1 text-sm text-foreground-tertiary">
            On vérifie ton paiement et on charge ton abonnement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <main className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 pt-10 pb-32">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-3xl border border-border-secondary bg-emerald-500/10">
                <CheckCircle size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Abonnement activé
            </h1>
            <p className="mt-2 text-sm md:text-base text-foreground-secondary">
              Tes avantages Premium sont maintenant disponibles.
            </p>
          </motion.div>

          {/* Subscription Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-8"
          >
            {error && (
              <div className="mb-4 rounded-2xl border border-border-secondary bg-yellow-500/10 p-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-border-secondary">
                <Crown size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold truncate">
                  {subscriptionData ? `Plan ${subscriptionData.name}` : 'Plan activé'}
                </h2>
                <p className="text-sm text-foreground-tertiary">
                  {subscriptionData ? `Statut: ${subscriptionData.status}` : 'Statut: actif'}
                </p>
              </div>
            </div>

            {subscriptionData && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border-secondary bg-white/5 p-4 text-center">
                  <div className="text-xs text-foreground-tertiary">Prix</div>
                  <div className="mt-1 text-lg font-semibold">
                    {Number.isFinite(subscriptionData.price) ? subscriptionData.price : 0}€
                    <span className="text-foreground-tertiary text-sm">
                      /{subscriptionData.interval || 'mois'}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-border-secondary bg-white/5 p-4 text-center">
                  <div className="text-xs text-foreground-tertiary">Prochain paiement</div>
                  <div className="mt-1 text-lg font-semibold">
                    {subscriptionData.nextBilling || '—'}
                  </div>
                </div>
                <div className="rounded-2xl border border-border-secondary bg-white/5 p-4 text-center">
                  <div className="text-xs text-foreground-tertiary">Avantages</div>
                  <div className="mt-1 text-lg font-semibold">Débloqués</div>
                </div>
              </div>
            )}

            <div className="mt-6 border-t border-border-secondary pt-6">
              <h3 className="text-sm font-semibold mb-3">Prochaines étapes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-foreground-secondary">
                <div className="rounded-2xl border border-border-secondary bg-white/5 p-4">
                  Va dans <span className="font-semibold">Studio</span> pour générer avec tes crédits.
                </div>
                <div className="rounded-2xl border border-border-secondary bg-white/5 p-4">
                  Tu peux gérer ton compte dans <span className="font-semibold">Réglages</span>.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={() => router.push('/')}
              className="h-11 px-5 rounded-2xl bg-overlay-on-primary text-foreground-primary border border-border-secondary font-semibold inline-flex items-center justify-center gap-2"
            >
              <Music size={18} />
              Retour à la musique
            </button>

            <button
              onClick={() => router.push('/subscriptions')}
              className="h-11 px-5 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition inline-flex items-center justify-center gap-2"
            >
              <Star size={18} />
              Gérer l’abonnement
            </button>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 text-center"
          >
            <div className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6">
              <h3 className="text-sm font-semibold">Merci pour ton soutien.</h3>
              <p className="mt-2 text-sm text-foreground-tertiary">
                Si tu as un souci de facturation, écris à{' '}
                <a className="underline" href="mailto:billing@synaura.fr">
                  billing@synaura.fr
                </a>
                .
              </p>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default function SubscriptionSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-primary text-foreground-primary flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-border-secondary bg-background-fog-thin p-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground-tertiary" />
            <h2 className="mt-4 text-lg font-semibold">Chargement…</h2>
            <p className="mt-1 text-sm text-foreground-tertiary">
              Préparation de ta page.
            </p>
          </div>
        </div>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
