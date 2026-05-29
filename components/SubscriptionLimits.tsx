'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Crown, Loader2 } from 'lucide-react';
import { PLAN_ENTITLEMENTS, type PlanKey } from '@/lib/entitlements';
import { fetchCreditsBalance, generationsApprox } from '@/lib/credits';

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
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [u, c, b] = await Promise.all([
          fetch('/api/subscriptions/usage', { headers: { 'Cache-Control': 'no-store' } }).then(async (r) => {
            if (!r.ok) throw new Error('usage');
            return await r.json();
          }),
          fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } }).then(async (r) => {
            if (!r.ok) throw new Error('subscription');
            return await r.json();
          }),
          fetchCreditsBalance().catch(() => ({ balance: 0 })),
        ]);
        if (!mounted) return;
        setUsageInfo(u);
        setCurrent(c);
        if (b && typeof (b as any).balance === 'number') setCredits((b as any).balance);
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
    if (p === 'enterprise') return 'pro';
    if (p === 'starter' || p === 'pro' || p === 'free') return p;
    const name = String(current?.subscription?.name || '').toLowerCase();
    if (name.includes('starter')) return 'starter';
    if (name.includes('pro') || name.includes('enterprise')) return 'pro';
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
      <div className="rounded-[1.35rem] border border-[#dccfbb] bg-[#f7efe2] p-5 shadow-[0_10px_24px_rgba(44,33,19,0.04)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#6a5d53]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l’abonnement…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.35rem] border border-[#dccfbb] bg-[#f7efe2] p-5 shadow-[0_10px_24px_rgba(44,33,19,0.04)]">
        <div className="text-sm font-semibold leading-6 text-[#6a5d53]">{error}</div>
        <Link href="/subscriptions" className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-4 py-2 text-sm font-black text-[#171313] transition hover:bg-[#e7dac8]">
          Ouvrir la page abonnements <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-[#dccfbb] bg-[#f7efe2] p-5 shadow-[0_10px_24px_rgba(44,33,19,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[1rem] border border-[#d9ccb7] bg-[#fff8ee]">
              <Crown className="h-4 w-4 text-[#7c5cff]" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-black text-[#171313]">Plan {planLabel}</div>
              <div className="text-xs font-semibold text-[#6a5d53]">
                {periodEndText ? periodEndText : `Qualité max: ${ent.audio.maxQualityKbps}kbps`}
              </div>
            </div>
          </div>
        </div>

        <span
          className={[
            'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em]',
            statusLabel.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : '',
            statusLabel.tone === 'info' ? 'border-sky-200 bg-sky-50 text-sky-700' : '',
            statusLabel.tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : '',
            statusLabel.tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : '',
            statusLabel.tone === 'neutral' ? 'border-[#d6c8b3] bg-[#fff8ee] text-[#6a5d53]' : '',
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
              <div key={key} className="rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black uppercase tracking-[0.1em] text-[#6a5d53]">{label}</span>
                  <span className={['tabular-nums font-semibold', getUsageText(pct)].join(' ')}>
                    {d?.used ?? 0} / {d?.limit ?? 0}
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#eadfce]">
                  <div className={['h-2 rounded-full bg-gradient-to-r', getUsageColor(pct)].join(' ')} style={{ width: `${pct}%` }} />
                </div>
                {pct >= 90 ? (
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    Limite bientôt atteinte
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {typeof credits === 'number' ? (
        <div className="mt-4 rounded-[1.1rem] border border-[#dbcdb8] bg-[#fff8ee] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-black uppercase tracking-[0.1em] text-[#6a5d53]">Crédits IA</span>
            <span className="font-black tabular-nums text-[#171313]">
              {credits} <span className="font-semibold text-[#6a5d53]">(~{generationsApprox(credits)} gén.)</span>
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-[#dccfbb] pt-4">
        <Link href="/subscriptions" className="inline-flex items-center gap-2 rounded-full border border-[#d6c8b3] bg-[#efe4d4] px-4 py-2 text-sm font-black text-[#171313] transition hover:bg-[#e7dac8]">
          Voir / gérer mon abonnement <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
} 