'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Calendar, Clock, Coins } from 'lucide-react';
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
        month:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH ||
          '',
        year:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH ||
          '',
      },
      Pro: {
        month:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH ||
          '',
        year:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR ||
          '',
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
    <div className="relative min-h-screen w-full text-white overflow-hidden">
      <SubscriptionsBackground />

      <main className="relative z-10 w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24">

        {/* Alertes (paiement / quotas) */}
        <div className="flex w-full flex-col gap-3">
          {hasPaymentIssue && (
            <div className="w-full rounded-xl p-3 sm:p-4 border border-yellow-400/40 bg-yellow-500/10 text-yellow-100 backdrop-blur-md">
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
                    className="text-xs px-3 py-1.5 rounded-md bg-yellow-400/15 ring-1 ring-yellow-400/40 hover:bg-yellow-400/25 transition"
                  >
                    Retenter le paiement
                  </button>
                </div>
              </div>
            </div>
          )}

          {quotaWarnings.length > 0 && (
            <div className="w-full rounded-xl p-3 sm:p-4 border border-cyan-400/40 bg-cyan-500/10 text-cyan-100 backdrop-blur-md">
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
                    className="text-xs px-3 py-1.5 rounded-md bg-cyan-400/20 ring-1 ring-cyan-400/40 hover:bg-cyan-400/25 transition"
                  >
                    Voir les plans
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Carte résumé plan actuel */}
          <div className="w-full rounded-2xl p-3 sm:p-4 backdrop-blur-xl border border-white/10 bg-black/40 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.15),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.12),transparent)]">
            <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="space-between flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                <InfoChip label="Plan actuel" value={planName} />
                <InfoChip label="Période" value={billingPeriod} />
                <InfoChip
                  label="Prochain prélèvement"
                  value={nextBilling}
                  icon={<Calendar size={16} className="hidden md:block" />}
                />
                <InfoChip label="Pistes uploadées" value={uploadsText} />
                <InfoChip label="Playlists" value={playlistsText} />
                <InfoChip
                  label="Crédits restants"
                  value={`${creditsBalance} (≈ ${Math.floor(creditsBalance / 12)} gen)`}
                  icon={<Coins className="w-3.5 h-3.5" />}
                />
              </div>

              <div className="flex flex-row flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (isFreeActive) return;
                    if (!window.confirm("Confirmer l'annulation à la fin de la période ?")) return;
                    const res = await fetch('/api/billing/cancel-subscription', {
                      method: 'POST',
                    });
                    if (res.ok) {
                      await fetchAll();
                    }
                  }}
                  className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white/90 bg-white/5 ring-1 ring-white/15 hover:bg-white/10 hover:ring-purple-400/30 transition"
                >
                  Annuler l&apos;abonnement
                </button>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setShowBuyCredits(true)}
                    className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_24px_rgba(124,58,237,0.35)]"
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">
                      <Coins className="w-4 h-4" />
                      Acheter des crédits
                    </span>
                  </button>
                </div>
                {!isFreeActive && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Revenir immédiatement au plan gratuit ?')) return;
                      const res = await fetch('/api/billing/downgrade-to-free', {
                        method: 'POST',
                      });
                      if (res.ok) {
                        await fetchAll();
                        setToast({
                          type: 'success',
                          msg: 'Rétrogradation appliquée au plan gratuit.',
                        });
                      } else {
                        setToast({ type: 'error', msg: 'Échec de la rétrogradation.' });
                      }
                    }}
                    className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white/90 bg-white/5 ring-1 ring-white/15 hover:bg-white/10 hover:ring-red-400/30 transition"
                  >
                    Revenir au plan gratuit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full text-center font-sans text-xs text-white/40">
            Besoin d&apos;aide ? Support abonnements :{' '}
            <a className="underline" href="mailto:billing@synaura.fr">
              billing@synaura.fr
            </a>
            .
          </div>
        </div>


        {/* Plans */}
        <div
          ref={plansRef}
          className="relative z-10 w-full max-w-[1280px] mx-auto mt-8 p-4 sm:p-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-light text-[26px] lg:text-[36px] leading-[1.2] text-white/90">
              Choisis ton plan Synaura
            </h2>
            <span className="text-sm text-white/60">
              Adapte le Studio IA et les crédits à ton rythme de création.
            </span>

            <PeriodToggle value={period} onChange={setPeriod} />
          </div>

          {/* Grille des plans */}
          <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
        </div>

        {/* Comparateur compact */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto mt-6 p-4 sm:p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-x-auto">
          <div className="min-w-[720px] grid grid-cols-4 gap-2 text-sm text-white/85">
            <div className="text-white/60">Caractéristiques</div>
            <div className="text-white/80">Free</div>
            <div className="text-white/80">Starter</div>
            <div className="text-white/80">Pro</div>

            <div className="text-white/60 mt-2">Pistes/mois</div>
            <div className="mt-2">10</div>
            <div className="mt-2">{PLAN_ENTITLEMENTS.starter.uploads.maxTracks}</div>
            <div className="mt-2">{PLAN_ENTITLEMENTS.pro.uploads.maxTracks}</div>

            <div className="text-white/60 mt-1">Playlists</div>
            <div className="mt-1">3</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.starter.uploads.maxPlaylists}</div>
            <div className="mt-1">Illimité</div>

            <div className="text-white/60 mt-1">Crédits/mois (≈ gen)</div>
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

            <div className="text-white/60 mt-1">Qualité audio</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.free.audio.maxQualityKbps} kbps</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.starter.audio.maxQualityKbps} kbps</div>
            <div className="mt-1">{PLAN_ENTITLEMENTS.pro.audio.maxQualityKbps} kbps</div>

            <div className="text-white/60 mt-1">Téléchargement</div>
            <div className="mt-1">—</div>
            <div className="mt-1">—</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.features.download ? 'Oui' : '—'}
            </div>

            <div className="text-white/60 mt-1">Messagerie</div>
            <div className="mt-1">—</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.starter.features.messaging ? 'Oui' : '—'}
            </div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.features.messaging ? 'Oui' : '—'}
            </div>

            <div className="text-white/60 mt-1">Statistiques avancées</div>
            <div className="mt-1">—</div>
            <div className="mt-1">—</div>
            <div className="mt-1">
              {PLAN_ENTITLEMENTS.pro.features.analyticsAdvanced ? 'Oui' : '—'}
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-white/60">
            1 génération = 12 crédits. Les crédits non utilisés sont conservés.
          </div>
        </div>

        {/* Aperçu proration */}
        {preview && (
          <div
            ref={previewRef}
            className="mt-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 text-sm text-white/85"
          >
            <div className="text-white/90 text-sm font-medium">
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
          <div className="mt-6" ref={payRef}>
            <PaymentElementCard
              priceId={selectedPriceId}
              onSuccess={() => {
                setPaid(true);
                fetchAll();
              }}
            />
          </div>
        )}


        {paid && (
          <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 backdrop-blur-xl p-4 text-emerald-100 text-sm">
            Paiement réussi. Abonnement activé.
          </div>
        )}
      </main>

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
  const { price, originalPrice, discountedPrice } = useMemo(() => {
    const discount = launchDiscount || 0;

    if (period === 'year') {
      const yearlyBase = priceMonthly * 12 * 0.8;
      const discounted = discount > 0 ? yearlyBase * (1 - discount / 100) : yearlyBase;
      return {
        price: `${discounted.toFixed(2)}€ / an`,
        originalPrice: discount > 0 ? `${yearlyBase.toFixed(2)}€` : null,
        discountedPrice: discount > 0 ? discounted : null,
      };
    }

    const discounted = discount > 0 ? priceMonthly * (1 - discount / 100) : priceMonthly;
    return {
      price: `${discounted.toFixed(2)}€ / mois`,
      originalPrice: discount > 0 ? `${priceMonthly.toFixed(2)}€` : null,
      discountedPrice: discount > 0 ? discounted : null,
    };
  }, [priceMonthly, period, launchDiscount]);

  return (
    <div
      className={`flex h-full w-full flex-col rounded-3xl border overflow-hidden ${
        highlight
          ? 'border-purple-400/40 shadow-[0_0_40px_rgba(168,85,247,0.25)]'
          : 'border-white/12'
      }`}
    >
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
                {originalPrice && (
                  <div className="text-lg text-white/50 line-through">{originalPrice}</div>
                )}
                <div
                  className={`${
                    originalPrice
                      ? 'text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'
                      : 'text-2xl'
                  }`}
                >
                  {price}
                </div>
                {typeof monthlyCredits === 'number' && monthlyCredits > 0 && (
                  <div className="text-xs text-white/70">
                    {monthlyCredits} crédits / mois (≈ {Math.floor(monthlyCredits / 12)} gén.)
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-white/50">
              {originalPrice && discountedPrice
                ? `Économisez ${(originalPrice && discountedPrice
                    ? (parseFloat(originalPrice) - discountedPrice).toFixed(2)
                    : '0'
                  ).toString()}€ / période`
                : 'Taxes calculées au paiement'}
            </div>
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
