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
          <div className="w-full rounded-2xl p-4 backdrop-blur-lg bg-white/5 border border-[var(--border)]">
            <div className="flex w-full flex-col items-center gap-4 max-[1125px]:justify-center min-[1125px]:justify-between md:flex-row md:flex-wrap">
              <div className="space-between flex flex-row divide-x divide-white/10">
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]">Plan actuel</span>
                  <span className="text-sm text-[var(--text)] capitalize">{planName}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]">Période</span>
                  <span className="text-sm text-[var(--text)]">{billingPeriod}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]">Prochain prélèvement</span>
                  <span className="text-sm text-[var(--text)]">
                    <span className="flex w-full flex-row items-center gap-2">
                      <Calendar size={16} className="hidden md:block" />
                      {nextBilling}
                    </span>
                  </span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]">Pistes uploadées</span>
                  <span className="text-sm text-[var(--text)]">{uploadsText}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]">Stockage</span>
                  <span className="text-sm text-[var(--text)]">{storageText}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]">Playlists</span>
                  <span className="text-sm text-[var(--text)]">{playlistsText}</span>
                </div>
              </div>

              <div className="flex flex-row justify-center gap-2">
                <button type="button" className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-transparent hover:before:bg-[var(--surface-3)]">
                  <span className="relative flex flex-row items-center justify-center gap-2">Annuler l'abonnement</span>
                </button>
                <button type="button" className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-[var(--border)] before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-transparent hover:before:bg-[var(--surface-3)]">
                  <span className="relative flex flex-row items-center justify-center gap-2">Mettre à jour le paiement</span>
                </button>
                <div className="flex">
                  <button type="button" className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--bg)] bg-[var(--text)] hover:opacity-90">
                    <span className="relative flex flex-row items-center justify-center gap-2">Acheter plus</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full text-center font-sans text-xs text-white/30">
            Besoin d'aide ? Support/abonnements à <a className="underline" href="mailto:billing@suno.com">billing@suno.com</a>.
          </div>
        </div>
      </div>
    </div>
  );
}