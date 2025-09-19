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
  const [period, setPeriod] = useState<'month' | 'year'>('year');

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
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="flex w-full flex-col gap-3">
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
                <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-purple-400/30 transition">
                  <span className="relative flex flex-row items-center justify-center gap-2">Annuler l'abonnement</span>
                </button>
                <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-cyan-400/30 transition">
                  <span className="relative flex flex-row items-center justify-center gap-2">Mettre à jour le paiement</span>
                </button>
                <div className="flex">
                  <button type="button" className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_24px_rgba(124,58,237,0.25)]">
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
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        {/* Grille plans vides (contenu à venir) */}
        <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* FREE */}
          <PlanCard
            title="Free"
            highlight={false}
            badge={undefined}
            priceMonthly={0}
            period={period}
            disabled={false}
            limits={{ tracks: '5/mois', storage: '0.5 GB', playlists: '3', quality: '128 kbps' }}
            features={[
              'Profil public et bibliothèque',
              'Uploads limités',
              'Lecture et découverte de base'
            ]}
          />

          {/* STARTER */}
          <PlanCard
            title="Starter"
            highlight
            badge="Populaire"
            priceMonthly={4.99}
            period={period}
            disabled={false}
            limits={{ tracks: '20/mois', storage: '1 GB', playlists: '20', quality: '256 kbps' }}
            features={[
              'Accès à la messagerie',
              'Pas de publicité',
              'Statistiques de base',
              'Téléversements plus lourds'
            ]}
          />

          {/* PRO */}
          <PlanCard
            title="Pro"
            highlight={false}
            badge={undefined}
            priceMonthly={14.99}
            period={period}
            disabled={false}
            limits={{ tracks: '50/mois', storage: '5 GB', playlists: 'Illimité', quality: '320 kbps' }}
            features={[
              'Accès à la messagerie',
              'Playlists collaboratives',
              'Analyses avancées'
            ]}
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
  limits,
  features
}: {
  title: string;
  badge?: string;
  highlight?: boolean;
  priceMonthly: number;
  period: 'month' | 'year';
  disabled?: boolean;
  limits: { tracks: string; storage: string; playlists: string; quality: string };
  features?: string[];
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
            <button disabled={disabled} className={`w-full px-6 py-3 rounded-full transition ${disabled ? 'text-white/60 bg-white/10 ring-1 ring-white/15 cursor-not-allowed' : 'text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95'}`}>
              {disabled ? 'À venir' : 'Choisir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 