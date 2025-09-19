"use client";

import { useEffect, useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';

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

  useEffect(() => {
    // Usage: pistes / stockage / playlists
    fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } })
      .then(r => r.ok ? r.json() : null)
      .then(setUsage)
      .catch(() => {});

    // Abonnement courant
    fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } })
      .then(r => r.ok ? r.json() : null)
      .then(setCurrent)
      .catch(() => {});
  }, []);

  const planName = useMemo(() => current?.subscription?.name || 'Free Plan', [current]);
  const billingPeriod = useMemo(() => {
    const i = current?.subscription?.interval;
    if (i === 'month') return 'Mois';
    if (i === 'year') return 'Année';
    return '—';
  }, [current?.subscription?.interval]);

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
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-10 pb-16 text-[var(--text)]">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="flex w-full flex-col gap-3">
          <div className="w-full rounded-2xl p-4 backdrop-blur-lg border border-[var(--border)] bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]">
            <div className="flex w-full flex-col items-center gap-4 max-[1125px]:justify-center min-[1125px]:justify-between md:flex-row md:flex-wrap">
              <div className="space-between flex flex-row divide-x divide-white/10">
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

              <div className="flex flex-row justify-center gap-2">
                <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-purple-400/30 transition">
                  <span className="relative flex flex-row items-center justify-center gap-2">Annuler l'abonnement</span>
                </button>
                <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-cyan-400/30 transition">
                  <span className="relative flex flex-row items-center justify-center gap-2">Mettre à jour le paiement</span>
                </button>
                <div className="flex">
                  <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_24px_rgba(124,58,237,0.25)]">
                    <span className="relative flex flex-row items-center justify-center gap-2">Acheter plus</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full text-center font-sans text-xs text-white/30">
            Besoin d'aide ? Support/abonnements à <a className="underline" href="mailto:billing@suno.com">synaura.fr</a>.
          </div>
        </div>
      </div>

      {/* Sélecteur période + cartes de plans (coquilles vides) */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto mt-8 p-4 sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-light text-[28px] lg:text-[40px] leading-[48px] text-white/90 text-center">
            Gérer votre plan Synaura
          </h2>
          <span className="text-sm text-[var(--text-muted)]">Choisissez la période et le plan (à définir)</span>

          {/* Toggle période (Mensuel / Annuel) - style Synaura */}
          <PeriodToggle />
        </div>

        {/* Grille plans vides (contenu à venir) */}
        <div className="mt-8 grid w-full grid-cols-1 min-[600px]:grid-cols-2 xl:grid-cols-3 gap-6">
          {['Plan 1', 'Plan 2', 'Plan 3'].map((label, idx) => (
            <div key={idx} className="flex h-full w-full flex-col rounded-3xl border border-[var(--border)]/70 overflow-hidden">
              <div className="flex h-full flex-col bg-white/[0.04] backdrop-blur-md p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.07),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.06),transparent)]">
                <div className="flex flex-col gap-6 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[20px] lg:text-[24px] font-light text-white/90 truncate">{label}</h3>
                    <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] uppercase bg-white/10 text-white/80 ring-1 ring-white/10">Bientôt</span>
                  </div>

                  <div className="flex flex-col gap-1 text-white/80">
                    <div className="text-xl">— <span className="text-sm text-white/50">/ période</span></div>
                    <div className="text-xs text-white/50">Taxes calculées au paiement</div>
                  </div>

                  <div className="mt-2">
                    <button disabled className="w-full px-6 py-3 rounded-full text-white/70 bg-white/10 ring-1 ring-white/15 cursor-not-allowed">
                      À venir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Composant local: sélecteur période
function PeriodToggle() {
  const [value, setValue] = useState<'month' | 'year'>('year');
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
            onClick={() => setValue(v as 'month' | 'year')}
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