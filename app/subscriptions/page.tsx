'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Calendar,
  Clock,
  Coins,
  Shield,
  Sparkles,
  Check,
  HelpCircle,
  CreditCard,
  ArrowDown,
} from 'lucide-react';
import PaymentElementCard from './PaymentElementCard';
import PaymentUpdateCard from './PaymentUpdateCard';
import { PLAN_ENTITLEMENTS } from '@/lib/entitlements';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { fetchCreditsBalance } from '@/lib/credits';

type UsageInfo = {
  tracks: { used: number; limit: number; percentage: number };
  playlists: { used: number; limit: number; percentage: number };
};

type CurrentSubscription = {
  hasSubscription: boolean;
  subscription: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year' | string;
  } | null;
  userSubscription: {
    status: 'active' | 'trial' | 'canceled' | 'expired';
    currentPeriodEnd?: string;
  } | null;
} | null;

// Fond global Synaura pour la page abonnements
function SubscriptionsBackground() {
  return null;
}

export default function SubscriptionsPage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [current, setCurrent] = useState<CurrentSubscription>(null);
  const [period, setPeriod] = useState<'month' | 'year'>('year');
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [paid, setPaid] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const payRef = useRef<HTMLDivElement>(null);
  const pmRef = useRef<HTMLDivElement>(null);
  const [pmList, setPmList] = useState<any[]>([]);
  const [pmDefault, setPmDefault] = useState<string | null>(null);
  const [pmLoading, setPmLoading] = useState(false);
  const [preview, setPreview] = useState<{
    total: number;
    currency: string;
    lines: { amount: number; description?: string | null }[];
  } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [updateClientSecret, setUpdateClientSecret] = useState<string>('');

  // Compte à rebours pour l'offre de lancement (30 jours à partir du 8 octobre 2025)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchAll = useMemo(() => {
    return async () => {
      try {
        const [u, c, b] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetchCreditsBalance().catch(() => ({ balance: 0 })),
        ]);
        if (u) setUsage(u);
        if (c) setCurrent(c);
        if (b && typeof (b as any).balance === 'number') setCreditsBalance((b as any).balance);
      } catch {
        // silencieux
      }
    };
  }, []);

  const priceMap = useMemo(
    () => ({
      Starter: {
        month: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH || '',
        year: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR || '',
      },
      Pro: {
        month: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH || '',
        year: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR || '',
      },
      Enterprise: {
        month: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTH || '',
        year: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEAR || '',
      },
    }),
    [],
  );

  const activePlanName = (current?.subscription?.name || 'Free').toLowerCase();
  const isFreeActive = activePlanName === 'free';
  const isStarterActive = activePlanName === 'starter';
  const isProActive = activePlanName === 'pro';
  const isEnterpriseActive = activePlanName === 'enterprise';

  const selectedPlanLabel = useMemo(() => {
    if (!selectedPriceId) return null;
    if (selectedPriceId === priceMap.Starter[period]) return 'Starter';
    if (selectedPriceId === priceMap.Pro[period]) return 'Pro';
    if (selectedPriceId === priceMap.Enterprise[period]) return 'Enterprise';
    return 'Plan';
  }, [period, priceMap.Enterprise, priceMap.Pro, priceMap.Starter, selectedPriceId]);

  const selectedPlanPriceText = useMemo(() => {
    if (!selectedPlanLabel) return null;
    const baseMonthly =
      selectedPlanLabel === 'Starter'
        ? 4.99
        : selectedPlanLabel === 'Pro'
        ? 14.99
        : 39.99;
    if (period === 'year') {
      const yearly = baseMonthly * 12 * 0.8;
      return `${yearly.toFixed(2)}€ / an`;
    }
    return `${baseMonthly.toFixed(2)}€ / mois`;
  }, [period, selectedPlanLabel]);

  const choosePlan = (priceId: string) => {
    if (!priceId) return;
    setSelectedPriceId(priceId);
    setPaid(false);

    // Aperçu proration si déjà abonné
    if (!isFreeActive) {
      (async () => {
        try {
          const res = await fetch('/api/billing/preview-proration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
          });
          if (res.ok) {
            const j = await res.json();
            setPreview(j);
            requestAnimationFrame(() => {
              (previewRef.current || payRef.current)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            });
            return;
          }
        } catch {
          // ignore
        }
        requestAnimationFrame(() => {
          payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      })();
      return;
    }
    requestAnimationFrame(() => {
      payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    // Vérifier si on revient d'une Checkout Session
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      (async () => {
        try {
          const res = await fetch('/api/billing/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          if (res.ok) {
            setToast({ type: 'success', msg: 'Abonnement activé avec succès !' });
            window.history.replaceState({}, '', '/subscriptions');
          } else {
            setToast({ type: 'error', msg: "Erreur lors de l'activation de l'abonnement" });
          }
        } catch (e) {
          setToast({ type: 'error', msg: 'Erreur de vérification du paiement' });
        } finally {
          fetchAll();
        }
      })();
    } else {
      fetchAll();
    }

    // charger moyens de paiement
    (async () => {
      try {
        setPmLoading(true);
        const res = await fetch('/api/billing/payment-methods', {
          headers: { 'Cache-Control': 'no-store' },
        });
        if (res.ok) {
          const j = await res.json();
          setPmList(j.paymentMethods || []);
          setPmDefault(j.defaultPaymentMethod || null);
        }
      } finally {
        setPmLoading(false);
      }
    })();
  }, [fetchAll]);

  // Compte à rebours dynamique
  useEffect(() => {
    const calculateTimeLeft = () => {
      const endDate = new Date('2025-11-07T23:59:59').getTime();
      const now = new Date().getTime();
      const difference = endDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rafraîchissement au retour d'onglet + intervalle
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        fetchAll();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(fetchAll, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, [fetchAll]);

  const planName = useMemo(() => current?.subscription?.name || 'Free Plan', [current]);
  const billingPeriod = useMemo(() => {
    const i = current?.subscription?.interval;
    if (i === 'month') return 'Mois';
    if (i === 'year') return 'Année';
    return '—';
  }, [current?.subscription?.interval]);

  const subscriptionStatus = (current?.userSubscription?.status as any) || 'none';
  const hasPaymentIssue = subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid';

  const quotaWarnings = useMemo(() => {
    if (!usage) return [] as string[];
    const warns: string[] = [];
    if (usage.tracks.percentage >= 90) warns.push('Vos pistes sont presque au maximum.');
    if (usage.playlists.percentage >= 90) warns.push('Vos playlists sont presque au maximum.');
    return warns;
  }, [usage]);

  const nextBilling = useMemo(() => {
    const dateStr = current?.userSubscription?.currentPeriodEnd;
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }, [current?.userSubscription?.currentPeriodEnd]);

  const uploadsText = useMemo(() => {
    if (!usage) return '—';
    return `${usage.tracks.used}/${usage.tracks.limit}`;
  }, [usage]);

  const playlistsText = useMemo(() => {
    if (!usage) return '—';
    return `${usage.playlists.used}/${usage.playlists.limit}`;
  }, [usage]);

  return (
    <div className="relative min-h-screen w-full bg-background-primary text-foreground-primary overflow-hidden">
      <SubscriptionsBackground />

      <main className="relative z-10 mx-auto w-full max-w-none px-3 sm:px-4 lg:px-8 2xl:px-10 pt-6 md:pt-10 pb-28 space-y-6">

        {/* HERO */}
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-10 overflow-hidden relative">
          <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-cyan-400/15 opacity-60 mix-blend-soft-light" />
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-secondary bg-white/5 px-3 py-1 text-xs text-foreground-secondary">
                <Shield className="w-4 h-4" />
                Paiement sécurisé • Annulable à tout moment
              </div>
              <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
                Passe en Premium, garde le flow.
              </h1>
              <p className="mt-3 text-sm md:text-base text-foreground-secondary max-w-2xl">
                Plus de crédits IA, meilleure qualité audio et fonctionnalités créateurs.
                Choisis un plan, paye en 30 secondes, et reprends la musique.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="h-11 px-4 inline-flex items-center justify-center rounded-2xl bg-overlay-on-primary text-foreground-primary border border-border-secondary hover:opacity-90 transition font-semibold"
                >
                  Voir les plans
                </button>
                <button
                  onClick={() => setShowBuyCredits(true)}
                  className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition font-semibold"
                >
                  Acheter des crédits
                </button>
                <div className="text-xs text-foreground-tertiary">
                  1 génération = 12 crédits • Les crédits non utilisés sont conservés
                </div>
              </div>

              {(timeLeft.days + timeLeft.hours + timeLeft.minutes + timeLeft.seconds) > 0 && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-border-secondary bg-white/5 px-3 py-2 text-sm">
                  <Sparkles className="w-4 h-4 text-foreground-tertiary" />
                  <span className="font-semibold">Offre de lancement</span>
                  <span className="text-foreground-tertiary">
                    se termine dans {timeLeft.days}j {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                  </span>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-border-secondary bg-white/5 p-4 md:p-5">
                <div className="text-sm font-semibold">Ton plan actuel</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Kpi label="Plan" value={planName} />
                  <Kpi label="Période" value={billingPeriod} />
                  <Kpi label="Prochain prélèvement" value={nextBilling} icon={<Calendar className="w-4 h-4" />} />
                  <Kpi label="Crédits restants" value={`${creditsBalance}`} icon={<Coins className="w-4 h-4" />} />
                  <Kpi label="Pistes uploadées" value={uploadsText} />
                  <Kpi label="Playlists" value={playlistsText} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!isFreeActive && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm("Confirmer l'annulation à la fin de la période ?")) return;
                        const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' });
                        if (res.ok) await fetchAll();
                      }}
                      className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
                    >
                      Annuler
                    </button>
                  )}
                  {!isFreeActive && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Revenir immédiatement au plan gratuit ?')) return;
                        const res = await fetch('/api/billing/downgrade-to-free', { method: 'POST' });
                        if (res.ok) {
                          await fetchAll();
                          setToast({ type: 'success', msg: 'Rétrogradation appliquée au plan gratuit.' });
                        } else {
                          setToast({ type: 'error', msg: 'Échec de la rétrogradation.' });
                        }
                      }}
                      className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm"
                    >
                      Plan gratuit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowBuyCredits(true)}
                    className="h-10 px-3 rounded-2xl border border-border-secondary bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_20px_rgba(124,58,237,0.28)] transition text-sm font-semibold"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Crédits
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm"
                  >
                    Choisir un plan
                  </button>
                </div>

                <div className="mt-4 text-xs text-foreground-tertiary">
                  Besoin d&apos;aide ?{' '}
                  <a className="underline" href="mailto:billing@synaura.fr">
                    billing@synaura.fr
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alertes (paiement / quotas) */}
        <div className="flex w-full flex-col gap-3">
          {hasPaymentIssue && (
            <div className="w-full rounded-3xl p-4 border border-border-secondary bg-yellow-500/10 text-foreground-primary">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  Problème de paiement détecté ({subscriptionStatus}). Mettez à jour votre moyen
                  de paiement pour éviter l’interruption.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/billing/retry-payment', { method: 'POST' });
                      if (res.ok) {
                        const j = await res.json();
                        if (j.ok) {
                          setToast({ type: 'success', msg: 'Paiement relancé avec succès.' });
                          await fetchAll();
                        } else {
                          setToast({
                            type: 'error',
                            msg: `Échec (statut: ${j.status || 'inconnu'})`,
                          });
                        }
                      } else {
                        setToast({ type: 'error', msg: 'Échec de la relance.' });
                      }
                    }}
                    className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
                  >
                    Retenter le paiement
                  </button>
                </div>
              </div>
            </div>
          )}

          {quotaWarnings.length > 0 && (
            <div className="w-full rounded-3xl p-4 border border-border-secondary bg-cyan-500/10 text-foreground-primary">
              <div className="flex flex-col gap-2">
                {quotaWarnings.map((w, i) => (
                  <div key={i} className="text-sm">
                    {w}
                  </div>
                ))}
                <div>
                  <button
                    onClick={() =>
                      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="h-10 px-3 rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-sm font-semibold"
                  >
                    Voir les plans
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Plans */}
        <div
          ref={plansRef}
          className="relative z-10 w-full max-w-none mx-auto"
        >
          <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="text-xs text-foreground-tertiary">Étape 1</div>
                <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight">
                  Choisis ton plan
                </h2>
                <p className="mt-2 text-sm text-foreground-secondary max-w-2xl">
                  Annuel = ~20% d’économie. Starter est le meilleur pour créer régulièrement.
                </p>
              </div>
              <div className="flex items-center justify-start md:justify-end">
                <PeriodToggle value={period} onChange={setPeriod} />
              </div>
            </div>

            {/* Grille des plans */}
            <div className="mt-6 grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {/* FREE */}
            <PlanCard
              title="Free"
              highlight={false}
              badge={isFreeActive ? 'Actif' : undefined}
              priceMonthly={0}
              period={period}
              disabled={isFreeActive}
              isActive={isFreeActive}
              limits={{
                tracks: '10/mois',
                playlists: '5',
                quality: `${PLAN_ENTITLEMENTS.free.audio.maxQualityKbps} kbps`,
                credits: `${PLAN_ENTITLEMENTS.free.ai.monthlyCredits ?? 0} (≈ ${Math.floor(
                  (PLAN_ENTITLEMENTS.free.ai.monthlyCredits ?? 0) / 12,
                )} gen)`,
                file: '80 MB',
              }}
              monthlyCredits={PLAN_ENTITLEMENTS.free.ai.monthlyCredits ?? 0}
              features={[
                'Profil public et bibliothèque',
                'Uploads limités',
                'Lecture et découverte de base',
                '50 crédits de bienvenue (≈ 4 gén.)',
                'Modèle IA V4.5',
              ]}
              onChoose={async () => {
                if (isFreeActive) return;
                if (!window.confirm('Confirmer le passage au plan gratuit ?')) return;
                const res = await fetch('/api/billing/downgrade-to-free', { method: 'POST' });
                if (res.ok) {
                  await fetchAll();
                  setToast({
                    type: 'success',
                    msg: 'Vous êtes repassé sur le plan gratuit.',
                  });
                } else {
                  setToast({
                    type: 'error',
                    msg: 'Échec du passage au plan gratuit.',
                  });
                }
              }}
            />

            {/* STARTER */}
            <PlanCard
              title="Starter"
              highlight
              badge={isStarterActive ? 'Actif' : 'Populaire'}
              priceMonthly={4.99}
              period={period}
              disabled={isStarterActive}
              isActive={isStarterActive}
              launchDiscount={0}
              limits={{
                tracks: `${PLAN_ENTITLEMENTS.starter.uploads.maxTracks}/mois`,
                playlists: `${PLAN_ENTITLEMENTS.starter.uploads.maxPlaylists}`,
                quality: `${PLAN_ENTITLEMENTS.starter.audio.maxQualityKbps} kbps`,
                credits: `${PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0} (≈ ${Math.floor(
                  (PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0) / 12,
                )} gen)`,
                file: '200 MB',
              }}
              monthlyCredits={PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0}
              features={[
                `${PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0} crédits / mois (≈ ${Math.floor(
                  (PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0) / 12,
                )} gén.)`,
                'Modèles V4.5 et V4.5+',
                PLAN_ENTITLEMENTS.starter.features.messaging ? 'Messagerie' : '',
                PLAN_ENTITLEMENTS.starter.features.adFree ? 'Sans publicité' : '',
                PLAN_ENTITLEMENTS.starter.features.analyticsBasic
                  ? 'Statistiques de base'
                  : '',
                'Téléversements plus lourds',
              ]}
              onChoose={() => choosePlan(priceMap.Starter[period])}
            />

            {/* PRO */}
            <PlanCard
              title="Pro"
              highlight={false}
              badge={isProActive ? 'Actif' : undefined}
              priceMonthly={14.99}
              period={period}
              disabled={isProActive}
              isActive={isProActive}
              launchDiscount={0}
              limits={{
                tracks: `${PLAN_ENTITLEMENTS.pro.uploads.maxTracks}/mois`,
                playlists: 'Illimité',
                quality: `${PLAN_ENTITLEMENTS.pro.audio.maxQualityKbps} kbps`,
                credits: `${PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0} (≈ ${Math.floor(
                  (PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0) / 12,
                )} gen)`,
                file: '500 MB',
              }}
              monthlyCredits={PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0}
              features={[
                `${PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0} crédits / mois (≈ ${Math.floor(
                  (PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0) / 12,
                )} gén.)`,
                'Tous les modèles IA (V4.5, V4.5+, V5)',
                PLAN_ENTITLEMENTS.pro.features.messaging ? 'Messagerie' : '',
                PLAN_ENTITLEMENTS.pro.features.collaborativePlaylists
                  ? 'Playlists collaboratives'
                  : '',
                PLAN_ENTITLEMENTS.pro.features.analyticsAdvanced
                  ? 'Analyses avancées'
                  : '',
                PLAN_ENTITLEMENTS.pro.features.download ? 'Téléchargement de musique' : '',
              ]}
              onChoose={() => choosePlan(priceMap.Pro[period])}
            />

            </div>

            <div className="mt-5 text-xs text-foreground-tertiary flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4" /> Sans engagement long
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4" /> Annulation en 1 clic
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="w-4 h-4" /> Support: billing@synaura.fr
              </span>
            </div>
          </section>
        </div>

        {/* Comparateur compact */}
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 overflow-x-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-foreground-tertiary">Comparaison</div>
              <div className="text-lg font-semibold">Ce que tu débloques</div>
            </div>
            <div className="text-xs text-foreground-tertiary hidden sm:block">
              1 génération = 12 crédits • Les crédits non utilisés sont conservés
            </div>
          </div>

          <div className="mt-4 min-w-[760px] grid grid-cols-4 gap-2 text-sm text-foreground-secondary">
            <div className="text-foreground-tertiary">Caractéristiques</div>
            <div className="text-foreground-secondary font-semibold">Free</div>
            <div className="text-foreground-secondary font-semibold">Starter</div>
            <div className="text-foreground-secondary font-semibold">Pro</div>

            <div className="text-foreground-tertiary mt-2">Pistes/mois</div>
            <div className="mt-2">10</div>
            <div className="mt-2">{PLAN_ENTITLEMENTS.starter.uploads.maxTracks}</div>
            <div className="mt-2">{PLAN_ENTITLEMENTS.pro.uploads.maxTracks}</div>

            <div className="text-foreground-tertiary mt-1">Playlists</div>
            <div className="mt-1">3</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.starter.uploads.maxPlaylists}</div>
            <div className="mt-1">Illimité</div>

            <div className="text-foreground-tertiary mt-1">Crédits/mois (≈ gen)</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.free.ai.monthlyCredits ?? 0} (≈{' '}
              {Math.floor((PLAN_ENTITLEMENTS.free.ai.monthlyCredits ?? 0) / 12)})
            </div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0} (≈{' '}
              {Math.floor((PLAN_ENTITLEMENTS.starter.ai.monthlyCredits ?? 0) / 12)})
            </div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0} (≈{' '}
              {Math.floor((PLAN_ENTITLEMENTS.pro.ai.monthlyCredits ?? 0) / 12)})
            </div>

            <div className="text-foreground-tertiary mt-1">Qualité audio</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.free.audio.maxQualityKbps} kbps</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.starter.audio.maxQualityKbps} kbps</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.pro.audio.maxQualityKbps} kbps</div>

            <div className="text-foreground-tertiary mt-1">Téléchargement</div>
            <div className="mt-1">—</div>
            <div className="mt-1">—</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.features.download ? 'Oui' : '—'}
            </div>

            <div className="text-foreground-tertiary mt-1">Messagerie</div>
            <div className="mt-1">—</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.starter.features.messaging ? 'Oui' : '—'}
            </div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.features.messaging ? 'Oui' : '—'}
            </div>

            <div className="text-foreground-tertiary mt-1">Statistiques avancées</div>
            <div className="mt-1">—</div>
            <div className="mt-1">—</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.features.analyticsAdvanced ? 'Oui' : '—'}
            </div>
          </div>
        </section>

        {/* Aperçu proration */}
        {preview && (
          <div
            ref={previewRef}
            className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 text-sm"
          >
            <div className="text-sm font-semibold">
              Aperçu du changement de plan
            </div>
            <ul className="mt-2 space-y-1">
              {preview.lines?.map((l, i) => (
                <li key={i} className="flex justify-between">
                  <span>{l.description || 'Ligne'}</span>
                  <span>{(l.amount / 100).toFixed(2)} €</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between font-semibold">
              <span>Total dû maintenant</span>
              <span>{(preview.total / 100).toFixed(2)} €</span>
            </div>
          </div>
        )}

        {/* PaymentElement / UpdateCard */}
        {selectedPriceId && !paid && (
          <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6" ref={payRef}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-foreground-tertiary">Étape 2</div>
                <div className="mt-1 text-lg font-semibold">Paiement</div>
                <div className="mt-1 text-sm text-foreground-secondary">
                  {selectedPlanLabel ? (
                    <>
                      Plan <span className="font-semibold">{selectedPlanLabel}</span> •{' '}
                      <span className="text-foreground-tertiary">{selectedPlanPriceText}</span>
                    </>
                  ) : (
                    'Finalise ton abonnement.'
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-foreground-tertiary">
                <CreditCard className="w-4 h-4" /> Paiement Stripe
              </div>
            </div>

            <PaymentElementCard
              priceId={selectedPriceId}
              onSuccess={() => {
                setPaid(true);
                fetchAll();
              }}
            />
          </section>
        )}

        {paid && (
          <section className="rounded-3xl border border-border-secondary bg-emerald-500/10 p-6">
            <div className="text-xs text-foreground-tertiary">Étape 3</div>
            <div className="mt-1 text-lg font-semibold">Abonnement activé</div>
            <div className="mt-2 text-sm text-foreground-secondary">
              C’est bon. Tes avantages Premium sont actifs.
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => window.location.href = '/'}
                className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition font-semibold"
              >
                Retour musique
              </button>
              <button
                onClick={() => window.location.href = '/settings'}
                className="h-11 px-4 inline-flex items-center justify-center rounded-2xl border border-border-secondary bg-white/5 hover:bg-white/10 transition"
              >
                Gérer mon compte
              </button>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="rounded-3xl border border-border-secondary bg-background-fog-thin p-6 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-foreground-tertiary">FAQ</div>
              <div className="mt-1 text-2xl font-bold tracking-tight">Questions fréquentes</div>
              <div className="mt-2 text-sm text-foreground-secondary">
                Réponses rapides sur la facturation et les crédits.
              </div>
            </div>
            <HelpCircle className="w-5 h-5 text-foreground-tertiary" />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <FaqItem
              q="Les crédits expirent ?"
              a="Non. Les crédits non utilisés sont conservés."
            />
            <FaqItem
              q="Je peux annuler quand je veux ?"
              a="Oui. Tu peux annuler à tout moment et garder l’accès jusqu’à la fin de la période."
            />
            <FaqItem
              q="Combien coûte une génération ?"
              a="Une génération consomme 12 crédits."
            />
            <FaqItem
              q="Je change de plan en cours de période ?"
              a="Si tu es déjà abonné, on te montre un aperçu de proration avant de payer."
            />
          </div>
        </section>
      </main>

      {/* Sticky CTA mobile */}
      {selectedPriceId && !paid && (
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40">
          <div className="rounded-3xl border border-border-secondary bg-background-fog-thin backdrop-blur-xl p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-foreground-tertiary truncate">Plan sélectionné</div>
              <div className="text-sm font-semibold truncate">
                {selectedPlanLabel || 'Plan'} {selectedPlanPriceText ? `• ${selectedPlanPriceText}` : ''}
              </div>
            </div>
            <button
              onClick={() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="h-10 px-3 rounded-2xl bg-overlay-on-primary text-foreground-primary border border-border-secondary font-semibold inline-flex items-center gap-2"
            >
              Payer <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Toast global */}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm ${
            toast.type === 'success'
              ? 'bg-green-500/20 text-green-200 ring-1 ring-green-400/30'
              : 'bg-red-500/20 text-red-200 ring-1 ring-red-400/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toast.msg}</span>
            <button className="opacity-80 hover:opacity-100" onClick={() => setToast(null)}>
              OK
            </button>
          </div>
        </div>
      )}

      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
    </div>
  );
}

/** Petit chip réutilisable pour les infos plan actuel */
function InfoChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0 py-2 sm:py-0">
      <span className="text-xs text-white/60">{label}</span>
      <span className="text-sm text-white">
        <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-2 py-0.5">
          {icon}
          <span>{value}</span>
        </span>
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-secondary bg-white/5 p-3">
      <div className="text-xs text-foreground-tertiary">{label}</div>
      <div className="mt-1 text-sm font-semibold inline-flex items-center gap-2">
        {icon ? <span className="text-foreground-tertiary">{icon}</span> : null}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-3xl border border-border-secondary bg-white/5 p-4">
      <div className="text-sm font-semibold">{q}</div>
      <div className="mt-2 text-sm text-foreground-secondary">{a}</div>
    </div>
  );
}

// Sélecteur période
function PeriodToggle({
  value,
  onChange,
}: {
  value: 'month' | 'year';
  onChange: (v: 'month' | 'year') => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-required="false"
      className="mt-4 flex flex-row gap-3"
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {[
        { v: 'month', label: 'Mensuel' },
        { v: 'year', label: 'Annuel', badge: 'économisez 20%' as string | undefined },
      ].map(({ v, label, badge }) => {
        const checked = value === v;
        return (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={checked}
            data-state={checked ? 'checked' : 'unchecked'}
            value={v}
            className="group flex cursor-pointer items-center gap-2 outline-none"
            tabIndex={-1}
            onClick={() => onChange(v as 'month' | 'year')}
          >
            <div className="relative flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-white/5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="opacity-0 group-data-[state=checked]:opacity-100 text-white transition-opacity"
              >
                <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
              </svg>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-white/90">
              {label}
              {badge && (
                <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] font-medium uppercase bg-white/10 text-white/85 ring-1 ring-white/10">
                  <span>{badge}</span>
                </span>
              )}
            </label>
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({
  title,
  badge,
  highlight,
  priceMonthly,
  period,
  disabled,
  isActive,
  limits,
  features,
  onChoose,
  launchDiscount,
  monthlyCredits,
}: {
  title: string;
  badge?: string;
  highlight?: boolean;
  priceMonthly: number;
  period: 'month' | 'year';
  disabled?: boolean;
  isActive?: boolean;
  limits: {
    tracks: string;
    playlists: string;
    quality: string;
    ai?: string;
    credits?: string;
    file?: string;
  };
  features?: string[];
  onChoose?: () => void;
  launchDiscount?: number;
  monthlyCredits?: number;
}) {
  const pricing = useMemo(() => {
    const discountPct = launchDiscount || 0;

    // base prices in euros
    const monthly = priceMonthly;
    const yearly = priceMonthly * 12 * 0.8; // -20% yearly

    const base = period === 'year' ? yearly : monthly;
    const discounted = discountPct > 0 ? base * (1 - discountPct / 100) : base;

    const format = (n: number) =>
      n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

    return {
      base,
      discounted,
      baseLabel: period === 'year' ? `${format(base)} / an` : `${format(base)} / mois`,
      discountedLabel:
        period === 'year' ? `${format(discounted)} / an` : `${format(discounted)} / mois`,
      savings: base > discounted ? base - discounted : 0,
    };
  }, [priceMonthly, period, launchDiscount]);

  return (
    <div
      className={`flex h-full w-full flex-col rounded-3xl border overflow-hidden transition hover:-translate-y-0.5 hover:bg-white/[0.05] ${
        highlight
          ? 'border-purple-400/40 shadow-[0_0_60px_rgba(168,85,247,0.22)]'
          : 'border-white/12'
      }`}
    >
      <div className={`h-1 w-full ${highlight ? 'bg-gradient-to-r from-purple-500 to-cyan-400' : 'bg-white/10'}`} />
      <div className="flex h-full flex-col bg-white/[0.04] backdrop-blur-md p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.09),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.06),transparent)]">
        <div className="flex flex-col gap-6 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[20px] lg:text-[24px] font-light text-white/90 truncate">
              {title}
            </h3>
            {badge && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] uppercase bg-white/10 text-white/80 ring-1 ring-white/10">
                {badge}
              </span>
            )}
          </div>


          <div className="flex flex-col gap-1 text-white/85">
            {title === 'Free' ? (
              <div className="text-2xl">Gratuit</div>
            ) : (
              <div className="flex flex-col gap-1">
                {pricing.savings > 0 && (
                  <div className="text-lg text-white/50 line-through">{pricing.baseLabel}</div>
                )}
                <div
                  className={
                    pricing.savings > 0
                      ? 'text-3xl font-bold bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent'
                      : 'text-2xl'
                  }
                >
                  {pricing.discountedLabel}
                </div>
                {typeof monthlyCredits === 'number' && monthlyCredits > 0 && (
                  <div className="text-xs text-white/70">
                    {monthlyCredits} crédits / mois (≈ {Math.floor(monthlyCredits / 12)} gén.)
                  </div>
                )}
              </div>
            )}
            {title === 'Free' ? null : pricing.savings > 0 ? (
              <div className="text-xs text-white/60">
                Économisez {pricing.savings.toFixed(2)}€ / période
              </div>
            ) : (
              <div className="text-xs text-white/50">Taxes calculées au paiement</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-white/80 mt-2">
            <PlanLimitRow label="Pistes" value={limits.tracks} />
            <PlanLimitRow label="Playlists" value={limits.playlists} />
            <PlanLimitRow label="Qualité" value={limits.quality} />
            {limits.credits && (
              <PlanLimitRow label="Crédits / mois (≈ gen)" value={limits.credits} />
            )}
            {limits.file && <PlanLimitRow label="Taille max fichier" value={limits.file} />}
          </div>

          {features && features.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-white/75">
              {features
                .filter(Boolean)
                .map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-cyan-300" />
                    <span>{f}</span>
                  </li>
                ))}
            </ul>
          )}

          <div className="mt-3">
            <button
              disabled={disabled}
              onClick={onChoose}
              className={`w-full px-6 py-3 rounded-full transition ${
                disabled
                  ? 'text-white/60 bg-white/5 ring-1 ring-white/15 cursor-not-allowed'
                  : 'text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_20px_rgba(124,58,237,0.35)]'
              }`}
            >
              {disabled ? (isActive ? 'Actif' : 'À venir') : 'Choisir ce plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanLimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
