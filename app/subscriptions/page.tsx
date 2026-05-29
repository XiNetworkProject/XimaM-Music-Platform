'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  Calendar,
  Check,
  Coins,
  CreditCard,
  HelpCircle,
  Music2,
  Shield,
  Sparkles,
  Upload,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import PaymentElementCard from './PaymentElementCard';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { fetchCreditsBalance } from '@/lib/credits';
import { CREDITS_PER_GENERATION, PLANS, WELCOME_CREDITS } from '@/lib/billing/pricing';
import { SynauraAppShell, SynauraInkPanel, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

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

      <main className="space-y-5 pb-28">
        <SynauraInkPanel className="p-5 sm:p-7 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,111,97,0.28),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(124,92,255,0.24),transparent_34%),radial-gradient(circle_at_62%_100%,rgba(0,194,203,0.18),transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/58">
                <Shield className="h-3.5 w-3.5" />
                Paiement sécurisé · annulable
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-6xl">
                Choisis le plan qui suit ton rythme.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/62">
                Plus de crédits, plus de place pour publier, une meilleure qualité audio et les outils créateur quand tu en as besoin.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]">
                  Voir les plans
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button onClick={() => setShowBuyCredits(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/16">
                  <Coins className="h-4 w-4" />
                  Acheter des crédits
                </button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }} className="rounded-[2rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Ton plan actuel</p>
                  <h2 className="mt-1 text-3xl font-black text-white">{planName}</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#171313]">{subscriptionStatus === 'none' ? 'Free' : subscriptionStatus}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Kpi label="Période" value={billingPeriod} />
                <Kpi label="Prochain paiement" value={nextBilling} icon={<Calendar className="h-4 w-4" />} />
                <Kpi label="Crédits" value={`${creditsBalance}`} icon={<Coins className="h-4 w-4" />} />
                <Kpi label="Uploads" value={usage ? `${usage.tracks.used}/${usage.tracks.limit}` : '—'} />
                <Kpi label="Playlists" value={usage ? `${usage.playlists.used}/${usage.playlists.limit}` : '—'} />
                <Kpi label="Générations" value={`≈ ${Math.floor(creditsBalance / CREDITS_PER_GENERATION)}`} icon={<Wand2 className="h-4 w-4" />} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
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
                <button onClick={() => setShowBuyCredits(true)} className="h-10 rounded-full bg-white px-4 text-xs font-black text-[#171313] transition hover:scale-[1.02]">
                  Acheter des crédits
                </button>
              </div>
            </motion.div>
          </div>
        </SynauraInkPanel>

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

        <section ref={plansRef} className="scroll-mt-28">
          <SynauraPanel className="p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Plans</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-[#171313]">Free, Starter ou Pro</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/54">
                  L’annuel revient moins cher. Les crédits non utilisés sont conservés.
                </p>
              </div>
              <PeriodToggle value={period} onChange={setPeriod} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <PlanCard
                title="Free"
                description="Pour découvrir Synaura et publier doucement."
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
                description="Le meilleur choix pour créer régulièrement."
                priceText={period === 'year' ? `${formatEuro(PLANS.starter.priceYearly)} / an` : `${formatEuro(PLANS.starter.priceMonthly)} / mois`}
                subPrice={period === 'year' ? `soit ${formatEuro(PLANS.starter.priceYearly / 12)}/mois` : 'Taxes calculées au paiement'}
                badge={isStarterActive ? 'Actif' : PLANS.starter.badge}
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
                description="Pour les créateurs qui veulent tout débloquer."
                priceText={period === 'year' ? `${formatEuro(PLANS.pro.priceYearly)} / an` : `${formatEuro(PLANS.pro.priceMonthly)} / mois`}
                subPrice={period === 'year' ? `soit ${formatEuro(PLANS.pro.priceYearly / 12)}/mois` : 'Taxes calculées au paiement'}
                badge={isProActive ? 'Actif' : undefined}
                active={isProActive}
                features={PLANS.pro.features}
                limits={[
                  ['Pistes', `${PLANS.pro.limits.maxTracks}/mois`],
                  ['Playlists', formatLimit(PLANS.pro.limits.maxPlaylists)],
                  ['Qualité', `${PLANS.pro.limits.audioQualityKbps} kbps`],
                  ['Crédits', `${PLANS.pro.monthlyCredits.toLocaleString()}/mois`],
                ]}
                onChoose={isProActive ? undefined : () => choosePlan(priceMap.Pro[period])}
              />
            </div>
          </SynauraPanel>
        </section>

        <SynauraPanel className="p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/38">Comparaison</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">Ce que tu débloques</h2>
            </div>
            <Sparkles className="h-5 w-5 text-black/24" />
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-4 gap-2 text-sm">
              <CompareCell muted>Caractéristiques</CompareCell>
              <CompareCell strong>Free</CompareCell>
              <CompareCell strong>Starter</CompareCell>
              <CompareCell strong>Pro</CompareCell>
              <CompareRow label="Pistes / mois" free={String(PLANS.free.limits.maxTracks)} starter={String(PLANS.starter.limits.maxTracks)} pro={String(PLANS.pro.limits.maxTracks)} />
              <CompareRow label="Playlists" free={String(PLANS.free.limits.maxPlaylists)} starter={String(PLANS.starter.limits.maxPlaylists)} pro="Illimité" />
              <CompareRow label="Crédits" free={`${WELCOME_CREDITS} bienvenue`} starter={`${PLANS.starter.monthlyCredits}/mois`} pro={`${PLANS.pro.monthlyCredits.toLocaleString()}/mois`} />
              <CompareRow label="Qualité audio" free={`${PLANS.free.limits.audioQualityKbps} kbps`} starter={`${PLANS.starter.limits.audioQualityKbps} kbps`} pro={`${PLANS.pro.limits.audioQualityKbps} kbps`} />
              <CompareRow label="Messagerie" free="—" starter={PLANS.starter.featureFlags.messaging ? 'Oui' : '—'} pro={PLANS.pro.featureFlags.messaging ? 'Oui' : '—'} />
              <CompareRow label="Statistiques avancées" free="—" starter="—" pro={PLANS.pro.featureFlags.analyticsAdvanced ? 'Oui' : '—'} />
              <CompareRow label="Téléchargement" free="—" starter="—" pro={PLANS.pro.featureFlags.download ? 'Oui' : '—'} />
            </div>
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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Activé</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#171313]">Ton abonnement est actif</h2>
            <p className="mt-2 text-sm font-semibold text-black/56">Tes avantages Premium sont disponibles.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => { window.location.href = '/'; }} className="h-11 rounded-full bg-[#171313] px-5 text-sm font-black text-white">Retour musique</button>
              <button onClick={() => { window.location.href = '/settings'; }} className="h-11 rounded-full bg-white px-5 text-sm font-black text-black/60 transition hover:bg-black hover:text-white">Gérer mon compte</button>
            </div>
          </SynauraPanel>
        ) : null}

        <SynauraPanel className="p-5 sm:p-7">
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
        <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden">
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
        <div className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-bold shadow-xl ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <div className="flex items-center gap-3">
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="rounded-full bg-white/16 p-1">
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
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/38">{label}</p>
      <p className="mt-1 inline-flex min-w-0 items-center gap-2 text-sm font-black text-white">
        {icon ? <span className="text-white/45">{icon}</span> : null}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

function PeriodToggle({ value, onChange }: { value: 'month' | 'year'; onChange: (v: 'month' | 'year') => void }) {
  return (
    <div className="inline-flex rounded-full border border-[#dccfbb] bg-[#efe4d4] p-1">
      {[
        { v: 'month', label: 'Mensuel' },
        { v: 'year', label: 'Annuel', hint: '-20%' },
      ].map((item) => {
        const active = value === item.v;
        return (
          <button
            key={item.v}
            type="button"
            onClick={() => onChange(item.v as 'month' | 'year')}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-black transition ${active ? 'bg-[#171313] text-white shadow-lg' : 'text-black/50 hover:text-[#171313]'}`}
          >
            {item.label}
            {item.hint ? <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/16 text-white' : 'bg-white text-black/46'}`}>{item.hint}</span> : null}
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
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-5 transition hover:-translate-y-1 ${
        highlight ? 'border-[#ff6f61]/28 bg-[#171313] text-white shadow-[0_24px_70px_rgba(23,19,19,0.20)]' : 'border-[#dccfbb] bg-white/72 text-[#171313]'
      }`}
    >
      {highlight ? <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,111,97,0.26),transparent_32%),radial-gradient(circle_at_90%_12%,rgba(124,92,255,0.22),transparent_32%)]" /> : null}
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-black tracking-tight">{title}</h3>
            <p className={`mt-2 text-sm font-semibold leading-6 ${highlight ? 'text-white/58' : 'text-black/52'}`}>{description}</p>
          </div>
          {badge ? <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${highlight ? 'bg-white text-[#171313]' : 'bg-[#171313] text-white'}`}>{badge}</span> : null}
        </div>

        <div className="mt-6">
          <p className="text-3xl font-black">{priceText}</p>
          {subPrice ? <p className={`mt-1 text-xs font-bold ${highlight ? 'text-white/48' : 'text-black/42'}`}>{subPrice}</p> : null}
        </div>

        <div className="mt-5 grid gap-2">
          {limits.map(([label, value]) => (
            <div key={label} className={`flex items-center justify-between gap-4 rounded-2xl px-3 py-2 text-sm ${highlight ? 'bg-white/10 text-white/72' : 'bg-[#f4eadc] text-black/54'}`}>
              <span className="font-semibold">{label}</span>
              <span className={`font-black ${highlight ? 'text-white' : 'text-[#171313]'}`}>{value}</span>
            </div>
          ))}
        </div>

        <ul className="mt-5 space-y-2">
          {features.filter(Boolean).slice(0, 6).map((feature) => (
            <li key={feature} className={`flex items-start gap-2 text-sm font-semibold ${highlight ? 'text-white/72' : 'text-black/56'}`}>
              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? 'text-[#00c2cb]' : 'text-[#ff6f61]'}`} />
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={!onChoose}
          onClick={onChoose}
          className={`mt-auto h-12 rounded-2xl text-sm font-black transition ${
            !onChoose
              ? highlight
                ? 'bg-white/10 text-white/35'
                : 'bg-black/[0.05] text-black/32'
              : highlight
                ? 'bg-white text-[#171313] hover:scale-[1.02]'
                : 'bg-[#171313] text-white hover:scale-[1.02]'
          }`}
        >
          {active ? 'Plan actif' : 'Choisir ce plan'}
        </button>
      </div>
    </motion.article>
  );
}

function CompareCell({ children, strong, muted }: { children: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${strong ? 'bg-[#171313] font-black text-white' : muted ? 'bg-black/[0.03] font-black text-black/38' : 'bg-black/[0.03] font-semibold text-black/56'}`}>
      {children}
    </div>
  );
}

function CompareRow({ label, free, starter, pro }: { label: string; free: string; starter: string; pro: string }) {
  return (
    <>
      <CompareCell muted>{label}</CompareCell>
      <CompareCell>{free}</CompareCell>
      <CompareCell>{starter}</CompareCell>
      <CompareCell>{pro}</CompareCell>
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#dccfbb] bg-white/72 p-4">
      <h3 className="text-sm font-black text-[#171313]">{q}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-black/52">{a}</p>
    </div>
  );
}
