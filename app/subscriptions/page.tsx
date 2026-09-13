'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUpRight,
  Calendar,
  Check,
  Coins,
  CreditCard,
  HelpCircle,
  Music2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import PaymentElementCard from './PaymentElementCard';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { fetchCreditsBalance } from '@/lib/credits';
import { CREDITS_PER_GENERATION, PLANS, WELCOME_CREDITS } from '@/lib/billing/pricing';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

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
    status: 'active' | 'trial' | 'canceled' | 'expired' | 'past_due' | 'unpaid';
    currentPeriodEnd?: string;
  } | null;
} | null;

function formatEuro(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatLimit(value: number, suffix = '') {
  if (value < 0) return 'Illimité';
  return `${value}${suffix}`;
}

export default function SubscriptionsPage() {
  const reduceMotion = useReducedMotion();
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [current, setCurrent] = useState<CurrentSubscription>(null);
  const [period, setPeriod] = useState<'month' | 'year'>('year');
  const [selectedPriceId, setSelectedPriceId] = useState('');
  const [paid, setPaid] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [preview, setPreview] = useState<{ total: number; currency: string; lines: { amount: number; description?: string | null }[] } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const payRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const fetchAll = useMemo(() => {
    return async () => {
      try {
        const [u, c, b] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetchCreditsBalance().catch(() => ({ balance: 0 })),
        ]);
        if (u) setUsage(u);
        if (c) setCurrent(c);
        if (b && typeof (b as any).balance === 'number') setCreditsBalance((b as any).balance);
      } catch {
        // silent
      }
    };
  }, []);

  useEffect(() => {
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
          setToast(
            res.ok
              ? { type: 'success', msg: 'Abonnement activé avec succès.' }
              : { type: 'error', msg: "Erreur lors de l'activation de l'abonnement." },
          );
          window.history.replaceState({}, '', '/subscriptions');
        } catch {
          setToast({ type: 'error', msg: 'Erreur de vérification du paiement.' });
        } finally {
          fetchAll();
        }
      })();
    } else {
      fetchAll();
    }
  }, [fetchAll]);

  useEffect(() => {
    let lastFetch = Date.now();
    const onVis = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch > 60000) {
        lastFetch = Date.now();
        fetchAll();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(() => {
      lastFetch = Date.now();
      fetchAll();
    }, 120000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, [fetchAll]);

  const priceMap = useMemo(
    () => ({
      Starter: { month: PLANS.starter.stripePriceIds.month, year: PLANS.starter.stripePriceIds.year },
      Pro: { month: PLANS.pro.stripePriceIds.month, year: PLANS.pro.stripePriceIds.year },
    }),
    [],
  );

  const activePlanName = (current?.subscription?.name || 'Free').toLowerCase();
  const isFreeActive = activePlanName === 'free';
  const isStarterActive = activePlanName === 'starter';
  const isProActive = activePlanName === 'pro';
  const subscriptionStatus = (current?.userSubscription?.status as string) || 'none';
  const hasPaymentIssue = subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid';

  const selectedPlanLabel = useMemo(() => {
    if (!selectedPriceId) return null;
    if (selectedPriceId === priceMap.Starter[period]) return 'Starter';
    if (selectedPriceId === priceMap.Pro[period]) return 'Pro';
    return 'Plan';
  }, [period, priceMap.Pro, priceMap.Starter, selectedPriceId]);

  const selectedPlanPriceText = useMemo(() => {
    if (!selectedPlanLabel) return null;
    const plan = selectedPlanLabel === 'Starter' ? PLANS.starter : PLANS.pro;
    return period === 'year' ? `${formatEuro(plan.priceYearly)} / an` : `${formatEuro(plan.priceMonthly)} / mois`;
  }, [period, selectedPlanLabel]);

  const planName = current?.subscription?.name || 'Free';
  const billingPeriod = current?.subscription?.interval === 'year' ? 'Annuel' : current?.subscription?.interval === 'month' ? 'Mensuel' : '—';
  const nextBilling = useMemo(() => {
    const dateStr = current?.userSubscription?.currentPeriodEnd;
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }, [current?.userSubscription?.currentPeriodEnd]);

  const quotaWarnings = useMemo(() => {
    if (!usage) return [] as string[];
    const warns: string[] = [];
    if (usage.tracks.percentage >= 90) warns.push('Tes pistes sont presque au maximum.');
    if (usage.playlists.percentage >= 90) warns.push('Tes playlists sont presque au maximum.');
    return warns;
  }, [usage]);

  const choosePlan = (priceId: string) => {
    if (!priceId) {
      setToast({ type: 'error', msg: 'Ce prix Stripe n’est pas configuré.' });
      return;
    }
    setSelectedPriceId(priceId);
    setPaid(false);

    if (!isFreeActive) {
      (async () => {
        try {
          const res = await fetch('/api/billing/preview-proration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
          });
          if (res.ok) {
            setPreview(await res.json());
            requestAnimationFrame(() => (previewRef.current || payRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            return;
          }
        } catch {
          // ignore
        }
        requestAnimationFrame(() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      })();
      return;
    }

    requestAnimationFrame(() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cancelSubscription = async () => {
    if (!window.confirm("Confirmer l'annulation à la fin de la période ?")) return;
    const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' });
    if (res.ok) {
      await fetchAll();
      setToast({ type: 'success', msg: 'Annulation enregistrée.' });
    } else {
      setToast({ type: 'error', msg: "Impossible d'annuler l'abonnement." });
    }
  };

  const downgradeToFree = async () => {
    if (!window.confirm('Revenir au plan gratuit ?')) return;
    const res = await fetch('/api/billing/downgrade-to-free', { method: 'POST' });
    if (res.ok) {
      await fetchAll();
      setToast({ type: 'success', msg: 'Plan gratuit appliqué.' });
    } else {
      setToast({ type: 'error', msg: 'Échec du passage au plan gratuit.' });
    }
  };

  return (
    <SynauraAppShell contentClassName="max-w-7xl">
      <SynauraTopBar searchLabel="Rechercher un son, un post ou un profil..." primaryHref="/upload" primaryLabel="Publier" secondaryHref="/settings?tab=compte" secondaryLabel="Compte" />

      <main className="chambre-subscriptions experience-membership pb-28">
        <header className="experience-membership-heading">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <p className="experience-account-eyebrow"><span aria-hidden="true">03 /</span> Les abonnements</p>
            <h1>Fais de la place<br />à <span className="chambre-type-accent">tes idées.</span></h1>
            <p className="experience-membership-lede">Un premier son ou toute une discographie. Trouve l’espace qui suit ton rythme de création.</p>
            <button type="button" onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="experience-membership-explore">Explorer les plans <ArrowDown size={16} aria-hidden="true" /></button>
          </motion.div>
          <div className="experience-membership-sculpture" aria-hidden="true"><i /><i /><i /><span>CHAMBRE<br />SONORE</span></div>
        </header>

        <section className="experience-membership-overview" aria-labelledby="membership-current-heading">
          <div className="experience-membership-pass">
            <div className="experience-membership-pass-title">
              <span className="experience-membership-pass-mark" aria-hidden="true"><Music2 size={22} /></span>
              <div><p className="experience-account-eyebrow">Ton accès actuel</p><h2 id="membership-current-heading">{planName}</h2></div>
              <span className="experience-membership-status">{subscriptionStatus === 'none' ? 'Free' : subscriptionStatus}</span>
            </div>
            <dl className="experience-membership-billing">
              <Kpi label="Période" value={billingPeriod} />
              <Kpi label="Prochain paiement" value={nextBilling} icon={<Calendar className="h-4 w-4" />} />
            </dl>
            <div className="experience-membership-management">
                {!isFreeActive ? (
                  <>
                    <button onClick={cancelSubscription} className="h-10 rounded-full bg-red-500/12 px-4 text-xs font-black text-red-100 transition hover:bg-red-500/20">
                      Annuler
                    </button>
                    <button onClick={downgradeToFree} className="h-10 rounded-full bg-white/10 px-4 text-xs font-black text-white/72 transition hover:bg-white/16">
                      Plan gratuit
                    </button>
                  </>
                ) : null}
            </div>
          </div>
          <div className="experience-membership-balance">
            <div><p className="experience-account-eyebrow">Ta réserve créative</p><p className="experience-membership-credit-number">{creditsBalance}<span>crédits</span></p><p className="experience-membership-generation"><Wand2 size={14} aria-hidden="true" /> ≈ {Math.floor(creditsBalance / CREDITS_PER_GENERATION)} générations disponibles</p></div>
            <button type="button" onClick={() => setShowBuyCredits(true)} className="experience-account-primary"><Coins size={16} aria-hidden="true" /> Acheter des crédits</button>
          </div>
          <dl className="experience-membership-usage">
            <Kpi label="Pistes publiées" value={usage ? `${usage.tracks.used} / ${formatLimit(usage.tracks.limit)}` : '—'} icon={<Upload className="h-4 w-4" />} />
            <Kpi label="Playlists" value={usage ? `${usage.playlists.used} / ${formatLimit(usage.playlists.limit)}` : '—'} icon={<Music2 className="h-4 w-4" />} />
          </dl>
        </section>

        {(hasPaymentIssue || quotaWarnings.length > 0) && (
          <div className="grid gap-3">
            {hasPaymentIssue ? (
              <SynauraPanel className="border-amber-300/40 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-amber-900">Problème de paiement détecté. Mets à jour ou retente le paiement pour éviter l’interruption.</p>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/billing/retry-payment', { method: 'POST' });
                      if (res.ok) {
                        const j = await res.json();
                        setToast(j.ok ? { type: 'success', msg: 'Paiement relancé.' } : { type: 'error', msg: `Échec (${j.status || 'inconnu'}).` });
                        await fetchAll();
                      } else {
                        setToast({ type: 'error', msg: 'Échec de la relance.' });
                      }
                    }}
                    className="h-10 rounded-full bg-[#171313] px-4 text-xs font-black text-white"
                  >
                    Retenter
                  </button>
                </div>
              </SynauraPanel>
            ) : null}

            {quotaWarnings.map((warning) => (
              <SynauraPanel key={warning} className="border-[#00c2cb]/22 bg-[#00c2cb]/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[#17484c]">{warning}</p>
                  <button onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="h-10 rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                    Voir les plans
                  </button>
                </div>
              </SynauraPanel>
            ))}
          </div>
        )}

        <section ref={plansRef} className="experience-membership-plans scroll-mt-28" aria-labelledby="membership-plans-heading">
          <div className="experience-membership-plans-inner">
            <div className="experience-membership-section-heading">
              <div>
                <p className="experience-account-eyebrow">Choisir ton espace</p>
                <h2 id="membership-plans-heading">À chaque rythme, un plan.</h2>
                <p>Les crédits non utilisés sont conservés.</p>
              </div>
              <PeriodToggle value={period} onChange={setPeriod} />
            </div>

            <div className="chambre-plan-grid mt-6 grid gap-4 lg:grid-cols-3">
              <PlanCard
                title="Free"
                description="Le premier espace pour tes sons."
                priceText="Gratuit"
                badge={isFreeActive ? 'Actif' : undefined}
                active={isFreeActive}
                features={PLANS.free.features}
                limits={[
                  ['Pistes', `${PLANS.free.limits.maxTracks}/mois`],
                  ['Playlists', `${PLANS.free.limits.maxPlaylists}`],
                  ['Qualité', `${PLANS.free.limits.audioQualityKbps} kbps`],
                  ['Crédits', `${WELCOME_CREDITS} bienvenue`],
                ]}
                onChoose={isFreeActive ? undefined : downgradeToFree}
              />
              <PlanCard
                title="Starter"
                description="De la place pour créer régulièrement."
                priceText={period === 'year' ? `${formatEuro(PLANS.starter.priceYearly)} / an` : `${formatEuro(PLANS.starter.priceMonthly)} / mois`}
                subPrice={period === 'year' ? `soit ${formatEuro(PLANS.starter.priceYearly / 12)}/mois` : 'Taxes calculées au paiement'}
                badge={isStarterActive ? 'Actif' : undefined}
                active={isStarterActive}
                highlight
                features={PLANS.starter.features}
                limits={[
                  ['Pistes', `${PLANS.starter.limits.maxTracks}/mois`],
                  ['Playlists', `${PLANS.starter.limits.maxPlaylists}`],
                  ['Qualité', `${PLANS.starter.limits.audioQualityKbps} kbps`],
                  ['Crédits', `${PLANS.starter.monthlyCredits}/mois`],
                ]}
                onChoose={isStarterActive ? undefined : () => choosePlan(priceMap.Starter[period])}
              />
              <PlanCard
                title="Pro"
                description="Tout l’espace pour tes projets musicaux."
                priceText={period === 'year' ? `${formatEuro(PLANS.pro.priceYearly)} / an` : `${formatEuro(PLANS.pro.priceMonthly)} / mois`}
                subPrice={period === 'year' ? `soit ${formatEuro(PLANS.pro.priceYearly / 12)}/mois` : 'Taxes calculées au paiement'}
                badge={isProActive ? 'Actif' : undefined}
                active={isProActive}
                features={PLANS.pro.features}
                limits={[
                  ['Pistes', formatLimit(PLANS.pro.limits.maxTracks, '/mois')],
                  ['Playlists', formatLimit(PLANS.pro.limits.maxPlaylists)],
                  ['Qualité', `${PLANS.pro.limits.audioQualityKbps} kbps`],
                  ['Crédits', `${PLANS.pro.monthlyCredits.toLocaleString()}/mois`],
                ]}
                onChoose={isProActive ? undefined : () => choosePlan(priceMap.Pro[period])}
              />
            </div>
          </div>
        </section>

        <SynauraPanel className="experience-membership-comparison p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Comparaison</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">Ce que tu débloques</h2>
            </div>
            <Sparkles className="h-5 w-5 text-black/24" />
          </div>

          <div className="experience-membership-table-wrap" tabIndex={0} role="region" aria-label="Tableau comparatif des abonnements">
            <table className="experience-membership-table">
              <caption className="sr-only">Prix, quotas et fonctionnalités des plans Free, Starter et Pro</caption>
              <thead><tr><th scope="col">Inclus dans ton plan</th><th scope="col">Free</th><th scope="col">Starter</th><th scope="col">Pro</th></tr></thead>
              <tbody>
              <CompareRow label="Pistes / mois" free={String(PLANS.free.limits.maxTracks)} starter={String(PLANS.starter.limits.maxTracks)} pro={formatLimit(PLANS.pro.limits.maxTracks)} />
              <CompareRow label="Playlists" free={String(PLANS.free.limits.maxPlaylists)} starter={String(PLANS.starter.limits.maxPlaylists)} pro="Illimité" />
              <CompareRow label="Crédits" free={`${WELCOME_CREDITS} bienvenue`} starter={`${PLANS.starter.monthlyCredits}/mois`} pro={`${PLANS.pro.monthlyCredits.toLocaleString()}/mois`} />
              <CompareRow label="Qualité audio" free={`${PLANS.free.limits.audioQualityKbps} kbps`} starter={`${PLANS.starter.limits.audioQualityKbps} kbps`} pro={`${PLANS.pro.limits.audioQualityKbps} kbps`} />
              <CompareRow label="Messagerie" free="—" starter={PLANS.starter.featureFlags.messaging ? 'Oui' : '—'} pro={PLANS.pro.featureFlags.messaging ? 'Oui' : '—'} />
              <CompareRow label="Statistiques avancées" free="—" starter="—" pro={PLANS.pro.featureFlags.analyticsAdvanced ? 'Oui' : '—'} />
              <CompareRow label="Téléchargement" free="—" starter="—" pro={PLANS.pro.featureFlags.download ? 'Oui' : '—'} />
              </tbody>
            </table>
          </div>
        </SynauraPanel>

        {preview ? (
          <div ref={previewRef}>
            <SynauraPanel className="p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Changement de plan</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">Aperçu de proration</h2>
              <div className="mt-4 space-y-2">
                {preview.lines?.map((line, index) => (
                  <div key={index} className="flex justify-between gap-4 rounded-2xl bg-black/[0.035] px-4 py-3 text-sm font-semibold text-black/56">
                    <span>{line.description || 'Ligne'}</span>
                    <span className="font-black text-[#171313]">{formatEuro(line.amount / 100)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between rounded-2xl bg-[#171313] px-4 py-3 text-sm font-black text-white">
                <span>Total dû maintenant</span>
                <span>{formatEuro(preview.total / 100)}</span>
              </div>
            </SynauraPanel>
          </div>
        ) : null}

        {selectedPriceId && !paid ? (
          <div ref={payRef}>
            <SynauraPanel className="p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Paiement</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">
                    {selectedPlanLabel ? `Plan ${selectedPlanLabel}` : 'Finaliser'}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-black/50">{selectedPlanPriceText || 'Finalise ton abonnement.'}</p>
                </div>
                <div className="hidden items-center gap-2 rounded-full bg-black/[0.05] px-3 py-2 text-xs font-black text-black/44 sm:inline-flex">
                  <CreditCard className="h-4 w-4" />
                  Stripe
                </div>
              </div>
              <PaymentElementCard
                priceId={selectedPriceId}
                onSuccess={() => {
                  setPaid(true);
                  fetchAll();
                }}
              />
            </SynauraPanel>
          </div>
        ) : null}

        {paid ? (
          <SynauraPanel className="border-emerald-300/40 bg-emerald-50 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--syn-success)]">Activé</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">Ton abonnement est actif</h2>
            <p className="mt-2 text-sm font-semibold text-black/56">Tes avantages Premium sont disponibles.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => { window.location.href = '/'; }} className="h-11 rounded-full bg-[#171313] px-5 text-sm font-black text-white">Retour musique</button>
              <button onClick={() => { window.location.href = '/settings'; }} className="h-11 rounded-full bg-white px-5 text-sm font-black text-black/60 transition hover:bg-black hover:text-white">Gérer mon compte</button>
            </div>
          </SynauraPanel>
        ) : null}

        <SynauraPanel className="experience-membership-faq p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">FAQ</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">Questions fréquentes</h2>
            </div>
            <HelpCircle className="h-5 w-5 text-black/24" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <FaqItem q="Les crédits expirent ?" a="Non. Les crédits non utilisés sont conservés." />
            <FaqItem q="Je peux annuler quand je veux ?" a="Oui. Tu gardes l’accès jusqu’à la fin de la période." />
            <FaqItem q="Combien coûte une génération ?" a={`Une génération consomme ${CREDITS_PER_GENERATION} crédits.`} />
            <FaqItem q="Je change de plan en cours de période ?" a="Si tu es déjà abonné, un aperçu de proration est affiché avant paiement." />
          </div>
        </SynauraPanel>
      </main>

      {selectedPriceId && !paid ? (
        <div className="experience-membership-payment-dock fixed bottom-3 left-3 right-3 z-40 sm:hidden">
          <div className="rounded-3xl border border-[#dccfbb] bg-[#fff7ec] p-3 shadow-[0_18px_60px_rgba(30,25,20,0.18)]">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-black/38">Plan sélectionné</p>
                <p className="truncate text-sm font-black text-[#171313]">{selectedPlanLabel || 'Plan'} {selectedPlanPriceText ? `· ${selectedPlanPriceText}` : ''}</p>
              </div>
              <button onClick={() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="h-10 rounded-full bg-[#171313] px-4 text-xs font-black text-white">
                Payer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div role="status" className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-bold shadow-xl ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <div className="flex items-center gap-3">
            <span>{toast.msg}</span>
            <button type="button" aria-label="Fermer le message" onClick={() => setToast(null)} className="rounded-full bg-white/16 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
    </SynauraAppShell>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="experience-membership-kpi">
      <dt>{label}</dt>
      <dd>{icon ? <span aria-hidden="true">{icon}</span> : null}{value}</dd>
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: 'month' | 'year'; onChange: (v: 'month' | 'year') => void }) {
  return (
    <div className="experience-membership-period" role="group" aria-label="Période de facturation">
      {[
        { v: 'month', label: 'Mensuel' },
        { v: 'year', label: 'Annuel' },
      ].map((item) => {
        const active = value === item.v;
        return (
          <button
            key={item.v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.v as 'month' | 'year')}
            className="experience-membership-period-option"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({
  title,
  description,
  priceText,
  subPrice,
  badge,
  active,
  highlight,
  limits,
  features,
  onChoose,
}: {
  title: string;
  description: string;
  priceText: string;
  subPrice?: string;
  badge?: string;
  active?: boolean;
  highlight?: boolean;
  limits: Array<[string, string]>;
  features: string[];
  onChoose?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Abonnement ${title}`}
      data-plan={title.toLowerCase()}
      data-plan-highlighted={Boolean(highlight)}
      data-plan-active={Boolean(active)}
      className="chambre-plan experience-membership-plan"
    >
      <div className="experience-membership-plan-art" aria-hidden="true"><i /><i /><i /><span>{title === 'Free' ? '01' : title === 'Starter' ? '02' : '03'}</span></div>
      <div className="experience-membership-plan-heading"><h3>{title}</h3>{badge ? <span className="experience-membership-plan-badge"><Check size={12} aria-hidden="true" />{badge}</span> : null}</div>
      <p className="experience-membership-plan-description">{description}</p>
      <div className="experience-membership-plan-price">
        <p>{priceText}</p>
        <span>{subPrice || 'Sans abonnement payant'}</span>
      </div>
      <button type="button" disabled={!onChoose} onClick={onChoose} aria-label={active ? `Plan ${title} actif` : `Choisir le plan ${title}`} className="experience-membership-plan-choose">
        {active ? 'Plan actif' : 'Choisir ce plan'}{active ? <Check size={16} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}
      </button>
      <dl className="experience-membership-plan-limits">
        {limits.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <ul className="experience-membership-plan-features">
        {features.filter(Boolean).slice(0, 6).map((feature) => <li key={feature}><Check size={14} aria-hidden="true" />{feature}</li>)}
      </ul>
    </motion.article>
  );
}

function CompareRow({ label, free, starter, pro }: { label: string; free: string; starter: string; pro: string }) {
  return (
    <tr><th scope="row">{label}</th><td>{free}</td><td>{starter}</td><td>{pro}</td></tr>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="experience-membership-faq-item">
      <h3 className="text-sm font-black text-[#171313]">{q}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-black/52">{a}</p>
    </div>
  );
}
