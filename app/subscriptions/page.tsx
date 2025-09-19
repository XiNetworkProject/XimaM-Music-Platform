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
    </div>
  );
}