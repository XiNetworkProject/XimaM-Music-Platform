"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';
import PaymentElementCard from './PaymentElementCard';
import PaymentUpdateCard from './PaymentUpdateCard';
import { getEntitlements, PLAN_ENTITLEMENTS } from '@/lib/entitlements';

type UsageInfo = {
  tracks: { used: number; limit: number; percentage: number };
  playlists: { used: number; limit: number; percentage: number };
  storage: { used: number; limit: number; percentage: number };
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

export default function SubscriptionsPage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [current, setCurrent] = useState<CurrentSubscription>(null);
  const [period, setPeriod] = useState<'month' | 'year'>('year');
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [paid, setPaid] = useState(false);
  const payRef = useRef<HTMLDivElement>(null);
  const pmRef = useRef<HTMLDivElement>(null);
  const [pmList, setPmList] = useState<any[]>([]);
  const [pmDefault, setPmDefault] = useState<string | null>(null);
  const [pmLoading, setPmLoading] = useState(false);
  const [preview, setPreview] = useState<{ total: number; currency: string; lines: { amount: number; description?: string | null }[] } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [updateClientSecret, setUpdateClientSecret] = useState<string>('');

  const fetchAll = useMemo(() => {
    return async () => {
      try {
        const [u, c] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);
        if (u) setUsage(u);
        if (c) setCurrent(c);
      } catch {}
    };
  }, []);

  const priceMap = useMemo(() => ({
    Starter: { month: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH || '', year: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR || '' },
    Pro: { month: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH || '', year: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR || '' },
    Enterprise: { month: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_MONTH || '', year: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_YEAR || '' },
  }), []);

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
          const res = await fetch('/api/billing/preview-proration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceId }) });
          if (res.ok) {
            const j = await res.json();
            setPreview(j);
            requestAnimationFrame(() => {
              (previewRef.current || payRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return;
          }
        } catch {}
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
    fetchAll();
    // charger moyens de paiement
    (async () => {
      try {
        setPmLoading(true);
        const res = await fetch('/api/billing/payment-methods', { headers: { 'Cache-Control': 'no-store' } });
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

  // Rafraîchissement au retour d'onglet et intervalle léger
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
    if (usage.storage.percentage >= 90) warns.push('Votre stockage est presque plein.');
    if (usage.playlists.percentage >= 90) warns.push('Vos playlists sont presque au maximum.');
    return warns;
  }, [usage]);

  const nextBilling = useMemo(() => {
    const dateStr = current?.userSubscription?.currentPeriodEnd;
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }, [current?.userSubscription?.currentPeriodEnd]);

  const uploadsText = useMemo(() => {
    if (!usage) return '—';
    return `${usage.tracks.used}/${usage.tracks.limit}`;
  }, [usage]);

  const storageText = useMemo(() => {
    if (!usage) return '—';
    const used = typeof usage.storage.used === 'number' ? usage.storage.used.toFixed(2) : usage.storage.used;
    return `${used}/${usage.storage.limit} GB`;
  }, [usage]);

  const playlistsText = useMemo(() => {
    if (!usage) return '—';
    return `${usage.playlists.used}/${usage.playlists.limit}`;
  }, [usage]);

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="flex w-full flex-col gap-3">
          {hasPaymentIssue && (
            <div className="w-full rounded-xl p-3 sm:p-4 border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">Problème de paiement détecté ({subscriptionStatus}). Mettez à jour votre moyen de paiement pour éviter l’interruption.</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => pmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-xs px-3 py-1.5 rounded-md bg-yellow-400/20 ring-1 ring-yellow-400/30 hover:bg-yellow-400/25">Mettre à jour</button>
                  <button onClick={async () => {
                    const res = await fetch('/api/billing/retry-payment', { method: 'POST' });
                    if (res.ok) {
                      const j = await res.json();
                      if (j.ok) { setToast({ type: 'success', msg: 'Paiement relancé avec succès.' }); await fetchAll(); }
                      else setToast({ type: 'error', msg: `Échec (statut: ${j.status || 'inconnu'})` });
                    } else setToast({ type: 'error', msg: 'Échec de la relance.' });
                  }} className="text-xs px-3 py-1.5 rounded-md bg-yellow-400/20 ring-1 ring-yellow-400/30 hover:bg-yellow-400/25">Retenter le paiement</button>
                </div>
              </div>
            </div>
          )}

          {quotaWarnings.length > 0 && (
            <div className="w-full rounded-xl p-3 sm:p-4 border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
              <div className="flex flex-col gap-2">
                {quotaWarnings.map((w, i) => (
                  <div key={i} className="text-sm">{w}</div>
                ))}
                <div>
                  <button onClick={() => plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-xs px-3 py-1.5 rounded-md bg-cyan-400/20 ring-1 ring-cyan-400/30 hover:bg-cyan-400/25">Voir les plans</button>
                </div>
              </div>
            </div>
          )}
          <div className="w-full rounded-2xl p-3 sm:p-4 backdrop-blur-lg border border-[var(--border)] bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]">
            <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
              <div className="space-between flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Plan actuel</span>
                  <span className="text-sm text-[var(--text)] capitalize"><span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">{planName}</span></span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Période</span>
                  <span className="text-sm text-[var(--text)]"><span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">{billingPeriod}</span></span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Prochain prélèvement</span>
                  <span className="text-sm text-[var(--text)]">
                    <span className="flex w-full flex-row items-center gap-2">
                      <Calendar size={16} className="hidden md:block" />
                      <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">{nextBilling}</span>
                    </span>
                  </span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Pistes uploadées</span>
                  <span className="text-sm text-[var(--text)]"><span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">{uploadsText}</span></span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Stockage</span>
                  <span className="text-sm text-[var(--text)]"><span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">{storageText}</span></span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Playlists</span>
                  <span className="text-sm text-[var(--text)]"><span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">{playlistsText}</span></span>
                </div>
              </div>

              <div className="flex flex-row flex-wrap justify-center gap-2">
                <button type="button" onClick={async () => {
                  if (isFreeActive) return;
                  if (!window.confirm("Confirmer l'annulation à la fin de la période ?")) return;
                  const res = await fetch('/api/billing/cancel-subscription', { method: 'POST' });
                  if (res.ok) {
                    await fetchAll();
                  }
                }} className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-purple-400/30 transition">
                  <span className="relative flex flex-row items-center justify-center gap-2">Annuler l'abonnement</span>
                </button>
                <button type="button" onClick={() => pmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-cyan-400/30 transition">
                  <span className="relative flex flex-row items-center justify-center gap-2">Mettre à jour le paiement</span>
                </button>
                <div className="flex">
                  <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_24px_rgba(124,58,237,0.25)]">
                    <span className="relative flex flex-row items-center justify-center gap-2">Acheter plus</span>
                  </button>
                </div>
                {!isFreeActive && (
                  <button type="button" onClick={async () => {
                    if (!window.confirm('Revenir immédiatement au plan gratuit ?')) return;
                    const res = await fetch('/api/billing/downgrade-to-free', { method: 'POST' });
                    if (res.ok) { await fetchAll(); setToast({ type: 'success', msg: 'Rétrogradation appliquée.' }); }
                    else setToast({ type: 'error', msg: 'Échec de la rétrogradation.' });
                  }} className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-red-400/30 transition">
                    <span className="relative flex flex-row items-center justify-center gap-2">Revenir au plan gratuit</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full text-center font-sans text-xs text-white/30">
            Besoin d'aide ? Support/abonnements à <a className="underline" href="mailto:billing@suno.com">synaura.fr</a>.
          </div>
        </div>
      </div>

      {/* Moyens de paiement */}
      <div ref={pmRef} className="relative z-10 w-full max-w-[1280px] mx-auto mt-6 p-4 sm:p-6 panel-suno border border-[var(--border)] rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-white/90 text-lg">Moyens de paiement</h3>
          {pmLoading && <span className="text-xs text-white/50">Chargement…</span>}
        </div>
        {pmList.length === 0 ? (
          <div className="text-sm text-white/70 mt-2">Aucune carte enregistrée. Vous pourrez en ajouter lors du paiement.</div>
        ) : (
          <ul className="mt-3 divide-y divide-white/10">
            {pmList.map((pm) => {
              const isDefault = pmDefault === pm.id;
              const card = pm.card || {};
              return (
                <li key={pm.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="text-white/85 text-sm">
                    <span className="mr-2 uppercase">{card.brand}</span>
                    <span>•••• {card.last4}</span>
                    <span className="ml-2 text-white/60">{String(card.exp_month).padStart(2, '0')}/{card.exp_year}</span>
                    {isDefault && <span className="ml-2 text-xs rounded-md px-1.5 py-0.5 bg-white/10 ring-1 ring-white/10">Par défaut</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <button onClick={async () => {
                        await fetch('/api/billing/payment-methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: pm.id }) });
                        const r = await fetch('/api/billing/payment-methods');
                        if (r.ok) { const j = await r.json(); setPmList(j.paymentMethods || []); setPmDefault(j.defaultPaymentMethod || null); }
                      }} className="text-xs px-2 py-1 rounded-md bg-white/10 ring-1 ring-white/10 hover:bg-white/15">Définir par défaut</button>
                    )}
                    {!isDefault && (
                      <button onClick={async () => {
                        await fetch('/api/billing/payment-methods', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethodId: pm.id }) });
                        const r = await fetch('/api/billing/payment-methods');
                        if (r.ok) { const j = await r.json(); setPmList(j.paymentMethods || []); setPmDefault(j.defaultPaymentMethod || null); }
                      }} className="text-xs px-2 py-1 rounded-md bg-white/10 ring-1 ring-white/10 hover:bg-white/15 text-red-300">Supprimer</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Bouton ajouter/mettre à jour carte via SetupIntent */}
        <div className="mt-4">
          <button onClick={async () => {
            try {
              const r = await fetch('/api/billing/create-setup-intent', { method: 'POST' });
              if (!r.ok) { setToast({ type: 'error', msg: 'Erreur initialisation carte.' }); return; }
              const j = await r.json();
              setUpdateClientSecret(j.clientSecret);
              setToast({ type: 'success', msg: 'Initialisation OK.' });
              requestAnimationFrame(() => payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            } catch {
              setToast({ type: 'error', msg: 'Erreur réseau.' });
            }
          }} className="text-xs px-3 py-1.5 rounded-md bg-white/10 ring-1 ring-white/15 hover:bg-white/15">Ajouter / mettre à jour une carte</button>
        </div>
      </div>

      {/* Sélecteur période + cartes de plans (coquilles vides) */}
      <div ref={plansRef} className="relative z-10 w-full max-w-[1280px] mx-auto mt-8 p-4 sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-light text-[28px] lg:text-[40px] leading-[48px] text-white/90 text-center">
            Gérer votre plan Synaura
          </h2>
          <span className="text-sm text-[var(--text-muted)]">Choisissez la période et le plan (à définir)</span>

          {/* Toggle période (Mensuel / Annuel) - style Synaura */}
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        {/* Grille plans (droits affichés) */}
        <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* FREE */}
          <PlanCard
            title="Free"
            highlight={false}
            badge={isFreeActive ? 'Actif' : undefined}
            priceMonthly={0}
            period={period}
            disabled={isFreeActive}
            isActive={isFreeActive}
            limits={{ tracks: '5/mois', storage: '0.5 GB', playlists: '3', quality: '128 kbps' }}
            features={[
              'Profil public et bibliothèque',
              'Uploads limités',
              'Lecture et découverte de base'
            ]}
            onChoose={async () => {
              if (isFreeActive) return;
              if (!window.confirm('Confirmer le passage au plan gratuit ?')) return;
              const res = await fetch('/api/billing/downgrade-to-free', { method: 'POST' });
              if (res.ok) { await fetchAll(); setToast({ type: 'success', msg: 'Vous êtes repassé sur le plan gratuit.' }); }
              else setToast({ type: 'error', msg: 'Échec du passage au plan gratuit.' });
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
            limits={{ tracks: `${PLAN_ENTITLEMENTS.starter.uploads.maxTracks}/mois`, storage: `${PLAN_ENTITLEMENTS.starter.uploads.maxStorageGb} GB`, playlists: `${PLAN_ENTITLEMENTS.starter.uploads.maxPlaylists}`, quality: '256 kbps', ai: `${PLAN_ENTITLEMENTS.starter.ai.maxGenerationsPerMonth}/mois` }}
            features={[
              `${PLAN_ENTITLEMENTS.starter.ai.maxGenerationsPerMonth} générations IA/mois`,
              PLAN_ENTITLEMENTS.starter.features.messaging ? 'Messagerie' : '',
              PLAN_ENTITLEMENTS.starter.features.adFree ? 'Sans publicité' : '',
              PLAN_ENTITLEMENTS.starter.features.analyticsBasic ? 'Statistiques de base' : '',
              'Téléversements plus lourds'
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
            limits={{ tracks: `${PLAN_ENTITLEMENTS.pro.uploads.maxTracks}/mois`, storage: `${PLAN_ENTITLEMENTS.pro.uploads.maxStorageGb} GB`, playlists: 'Illimité', quality: '320 kbps', ai: `${PLAN_ENTITLEMENTS.pro.ai.maxGenerationsPerMonth}/mois` }}
            features={[
              `${PLAN_ENTITLEMENTS.pro.ai.maxGenerationsPerMonth} générations IA/mois`,
              PLAN_ENTITLEMENTS.pro.features.messaging ? 'Messagerie' : '',
              PLAN_ENTITLEMENTS.pro.features.collaborativePlaylists ? 'Playlists collaboratives' : '',
              PLAN_ENTITLEMENTS.pro.features.analyticsAdvanced ? 'Analyses avancées' : ''
            ]}
            onChoose={() => choosePlan(priceMap.Pro[period])}
          />

          {/* ENTERPRISE */}
          <PlanCard
            title="Enterprise"
            highlight={false}
            badge="Pour bientôt"
            priceMonthly={59.99}
            period={period}
            disabled
            limits={{ tracks: 'Illimité', storage: 'Illimité', playlists: 'Illimité', quality: '320 kbps' }}
            features={[
              'Accès à la messagerie',
              
            ]}
          />
        </div>
      </div>

      {/* Comparateur de plans compact */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto mt-6 p-4 sm:p-6 panel-suno border border-[var(--border)] rounded-2xl overflow-x-auto">
        <div className="min-w-[720px] grid grid-cols-5 gap-2 text-sm">
          <div className="text-white/60">Caractéristiques</div>
          <div className="text-white/80">Free</div>
          <div className="text-white/80">Starter</div>
          <div className="text-white/80">Pro</div>
          <div className="text-white/80">Enterprise</div>

          <div className="text-white/60">Pistes/mois</div>
          <div>5</div>
          <div>{PLAN_ENTITLEMENTS.starter.uploads.maxTracks}</div>
          <div>{PLAN_ENTITLEMENTS.pro.uploads.maxTracks}</div>
          <div>Illimité</div>

          <div className="text-white/60">Stockage</div>
          <div>0.5 GB</div>
          <div>{PLAN_ENTITLEMENTS.starter.uploads.maxStorageGb} GB</div>
          <div>{PLAN_ENTITLEMENTS.pro.uploads.maxStorageGb} GB</div>
          <div>Illimité</div>

          <div className="text-white/60">Playlists</div>
          <div>3</div>
          <div>{PLAN_ENTITLEMENTS.starter.uploads.maxPlaylists}</div>
          <div>Illimité</div>
          <div>Illimité</div>

          <div className="text-white/60">Générations IA/mois</div>
          <div>{PLAN_ENTITLEMENTS.free.ai.maxGenerationsPerMonth}</div>
          <div>{PLAN_ENTITLEMENTS.starter.ai.maxGenerationsPerMonth}</div>
          <div>{PLAN_ENTITLEMENTS.pro.ai.maxGenerationsPerMonth}</div>
          <div>{PLAN_ENTITLEMENTS.enterprise.ai.maxGenerationsPerMonth}</div>

          <div className="text-white/60">Messagerie</div>
          <div>—</div>
          <div>{PLAN_ENTITLEMENTS.starter.features.messaging ? 'Oui' : '—'}</div>
          <div>{PLAN_ENTITLEMENTS.pro.features.messaging ? 'Oui' : '—'}</div>
          <div>Oui</div>

          <div className="text-white/60">Statistiques avancées</div>
          <div>—</div>
          <div>—</div>
          <div>{PLAN_ENTITLEMENTS.pro.features.analyticsAdvanced ? 'Oui' : '—'}</div>
          <div>Oui</div>
        </div>
      </div>

      {/* Aperçu proration (si upgrade/downgrade) */}
      {preview && (
        <div ref={previewRef} className="mt-6 panel-suno border border-[var(--border)] rounded-2xl p-4">
          <div className="text-white/85 text-sm">Aperçu du changement de plan</div>
          <ul className="mt-2 text-white/75 text-sm space-y-1">
            {preview.lines?.map((l, i) => (
              <li key={i} className="flex justify-between"><span>{l.description || 'Ligne'}</span><span>{(l.amount / 100).toFixed(2)} €</span></li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between text-white/90 font-medium"><span>Total dû maintenant</span><span>{(preview.total / 100).toFixed(2)} €</span></div>
        </div>
      )}

      {selectedPriceId && !paid && (
        <div className="mt-6" ref={payRef}>
          <PaymentElementCard priceId={selectedPriceId} onSuccess={() => { setPaid(true); fetchAll(); }} />
        </div>
      )}

      {updateClientSecret && (
        <div className="mt-6" ref={payRef}>
          <PaymentUpdateCard clientSecret={updateClientSecret} onSuccess={async () => { setToast({ type: 'success', msg: 'Carte mise à jour.' }); setUpdateClientSecret(''); const r = await fetch('/api/billing/payment-methods'); if (r.ok){ const j = await r.json(); setPmList(j.paymentMethods||[]); setPmDefault(j.defaultPaymentMethod||null);} }} />
        </div>
      )}

      {paid && (
        <div className="mt-6 panel-suno border border-[var(--border)] rounded-2xl p-4 text-green-400">Paiement réussi. Abonnement activé.</div>
      )}

      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm ${toast.type === 'success' ? 'bg-green-500/20 text-green-200 ring-1 ring-green-400/30' : 'bg-red-500/20 text-red-200 ring-1 ring-red-400/30'}`}>
          <div className="flex items-center gap-2">
            <span>{toast.msg}</span>
            <button className="opacity-80 hover:opacity-100" onClick={() => setToast(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant local: sélecteur période
function PeriodToggle({ value, onChange }: { value: 'month' | 'year'; onChange: (v: 'month' | 'year') => void }) {
  return (
    <div role="radiogroup" aria-required="false" className="mt-4 flex flex-row gap-3" tabIndex={0} style={{ outline: 'none' }}>
      {([
        { v: 'month', label: 'Mensuel' },
        { v: 'year', label: 'Annuel', badge: 'économisez 20%' as string | undefined }
      ]).map(({ v, label, badge }) => {
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
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className="opacity-0 group-data-[state=checked]:opacity-100 text-white">
                <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z"/>
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
  onChoose
}: {
  title: string;
  badge?: string;
  highlight?: boolean;
  priceMonthly: number;
  period: 'month' | 'year';
  disabled?: boolean;
  isActive?: boolean;
  limits: { tracks: string; storage: string; playlists: string; quality: string; ai?: string };
  features?: string[];
  onChoose?: () => void;
}) {
  const price = useMemo(() => {
    if (period === 'year') {
      // -20% environ sur annuel
      const yearly = Math.max(0, priceMonthly * 12 * 0.8);
      return `${yearly.toFixed(2)}€ / an`;
    }
    return `${priceMonthly.toFixed(2)}€ / mois`;
  }, [priceMonthly, period]);

  return (
    <div className={`flex h-full w-full flex-col rounded-3xl border overflow-hidden ${highlight ? 'border-purple-400/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]' : 'border-[var(--border)]/70'}`}>
      <div className="flex h-full flex-col bg-white/[0.04] backdrop-blur-md p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.07),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.06),transparent)]">
        <div className="flex flex-col gap-6 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[20px] lg:text-[24px] font-light text-white/90 truncate">{title}</h3>
            {badge && (
              <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] uppercase bg-white/10 text-white/80 ring-1 ring-white/10">{badge}</span>
            )}
          </div>

          <div className="flex flex-col gap-1 text-white/85">
            <div className="text-2xl">{title === 'Free' ? 'Gratuit' : price}</div>
            <div className="text-xs text-white/50">Taxes calculées au paiement</div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm text-white/80">
            <div className="flex items-center justify-between"><span>Pistes</span><span className="font-medium">{limits.tracks}</span></div>
            <div className="flex items-center justify-between"><span>Stockage</span><span className="font-medium">{limits.storage}</span></div>
            <div className="flex items-center justify-between"><span>Playlists</span><span className="font-medium">{limits.playlists}</span></div>
            <div className="flex items-center justify-between"><span>Qualité</span><span className="font-medium">{limits.quality}</span></div>
            {limits.ai && <div className="flex items-center justify-between"><span>Générations IA</span><span className="font-medium">{limits.ai}</span></div>}
          </div>

          {features && features.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-white/75">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-400 to-cyan-300"></span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2">
            <button disabled={disabled} onClick={onChoose} className={`w-full px-6 py-3 rounded-full transition ${disabled ? 'text-white/60 bg-white/10 ring-1 ring-white/15 cursor-not-allowed' : 'text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95'}`}>
              {disabled ? (isActive ? 'Actif' : 'À venir') : 'Choisir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 