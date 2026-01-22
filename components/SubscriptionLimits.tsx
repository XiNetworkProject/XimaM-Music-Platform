'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Crown, Loader2 } from 'lucide-react';
import { PLAN_ENTITLEMENTS, type PlanKey } from '@/lib/entitlements';

interface UsageInfo {
  plan?: PlanKey;
  tracks: {
    used: number;
    limit: number;
    percentage: number;
  };
  playlists: {
    used: number;
    limit: number;
    percentage: number;
  };
  // stockage supprimé
}

type CurrentSubscription = {
  subscription?: { name?: string; interval?: string; currency?: string; price?: number } | null;
  userSubscription?: { status?: string; currentPeriodEnd?: string | null } | null;
} | null;

export default function SubscriptionLimits() {
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [current, setCurrent] = useState<CurrentSubscription>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [u, c] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then(async (r) => {
            if (!r.ok) throw new Error('usage');
            return await r.json();
          }),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then(async (r) => {
            if (!r.ok) throw new Error('subscription');
            return await r.json();
          }),
        ]);
        if (!mounted) return;
        setUsageInfo(u);
        setCurrent(c);
      } catch (e: any) {
        if (!mounted) return;
        // Si l'utilisateur n'est pas connecté, l'API renvoie 401 -> on affiche un message propre.
        setError('Impossible de récupérer votre abonnement. Connectez-vous puis réessayez.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 75) return 'from-yellow-500 to-orange-500';
    if (percentage >= 50) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-emerald-500';
  };

  const getUsageText = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-yellow-400';
    if (percentage >= 50) return 'text-blue-400';
    return 'text-green-400';
  };

  const planKey: PlanKey = useMemo(() => {
    const p = String((usageInfo as any)?.plan || '').toLowerCase();
    if (p === 'starter' || p === 'pro' || p === 'enterprise' || p === 'free') return p;
    const name = String(current?.subscription?.name || '').toLowerCase();
    if (name.includes('starter')) return 'starter';
    if (name.includes('pro')) return 'pro';
    if (name.includes('enterprise')) return 'enterprise';
    return 'free';
  }, [current?.subscription?.name, usageInfo]);

  const ent = PLAN_ENTITLEMENTS[planKey] || PLAN_ENTITLEMENTS.free;

  const planLabel = useMemo(() => {
    if (planKey === 'free') return 'Free';
    return planKey.charAt(0).toUpperCase() + planKey.slice(1);
  }, [planKey]);

  const statusLabel = useMemo(() => {
    const s = String(current?.userSubscription?.status || '').toLowerCase();
    if (planKey === 'free') return { text: 'Plan gratuit', tone: 'neutral' as const };
    if (s === 'trial') return { text: 'Essai', tone: 'info' as const };
    if (s === 'canceled') return { text: 'Annulé', tone: 'warn' as const };
    if (s === 'expired') return { text: 'Expiré', tone: 'danger' as const };
    return { text: 'Actif', tone: 'success' as const };
  }, [current?.userSubscription?.status, planKey]);

  const periodEndText = useMemo(() => {
    const raw = current?.userSubscription?.currentPeriodEnd;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return `Renouvellement: ${d.toLocaleDateString('fr-FR')}`;
  }, [current?.userSubscription?.currentPeriodEnd]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-4">
        <div className="flex items-center gap-2 text-sm text-foreground-inactive">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l’abonnement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-4">
        <div className="text-sm text-foreground-secondary">{error}</div>
        <Link href="/subscriptions" className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--accent-brand)] hover:opacity-90">
          Ouvrir la page abonnements <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border-secondary bg-background-tertiary">
              <Crown className="h-4 w-4 text-[var(--accent-brand)]" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground-primary">Plan {planLabel}</div>
              <div className="text-xs text-foreground-inactive">
                {periodEndText ? periodEndText : `Qualité max: ${ent.audio.maxQualityKbps}kbps`}
              </div>
            </div>
          </div>
        </div>

        <span
          className={[
            'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            statusLabel.tone === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : '',
            statusLabel.tone === 'info' ? 'bg-sky-500/10 border-sky-500/25 text-sky-200' : '',
            statusLabel.tone === 'warn' ? 'bg-amber-500/10 border-amber-500/25 text-amber-200' : '',
            statusLabel.tone === 'danger' ? 'bg-red-500/10 border-red-500/25 text-red-200' : '',
            statusLabel.tone === 'neutral' ? 'bg-white/5 border-border-secondary text-foreground-secondary' : '',
          ].join(' ')}
        >
          {statusLabel.text}
        </span>
      </div>

      {usageInfo ? (
        <div className="mt-4 space-y-4">
          {(['tracks', 'playlists'] as const).map((key) => {
            const d = (usageInfo as any)[key] as { used: number; limit: number; percentage: number };
            const label = key === 'tracks' ? 'Pistes' : 'Playlists';
            const pct = Math.min(100, Math.max(0, Number(d?.percentage || 0)));
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-secondary">{label}</span>
                  <span className={['tabular-nums font-semibold', getUsageText(pct)].join(' ')}>
                    {d?.used ?? 0} / {d?.limit ?? 0}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className={['h-2 rounded-full bg-gradient-to-r', getUsageColor(pct)].join(' ')} style={{ width: `${pct}%` }} />
                </div>
                {pct >= 90 ? (
                  <div className="flex items-center gap-2 text-[11px] text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    Limite bientôt atteinte
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 pt-3 border-t border-border-secondary/60">
        <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-[var(--accent-brand)] hover:opacity-90">
          Voir / gérer mon abonnement <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
} 