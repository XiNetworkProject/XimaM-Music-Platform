import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getEntitlements, type Entitlements, type PlanKey } from '@/lib/entitlements';

export type EntitlementsClientState = {
  loading: boolean;
  plan: PlanKey;
  entitlements: Entitlements;
  adFree: boolean;
};

export function useEntitlementsClient(): EntitlementsClientState {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanKey>('free');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      // Utilisateur non connecté => free
      if (!session?.user?.id) {
        if (!mounted) return;
        setPlan('free');
        return;
      }
      try {
        setLoading(true);
        const res = await fetch('/api/subscriptions/my-subscription', { headers: { 'Cache-Control': 'no-store' } });
        const j = res.ok ? await res.json().catch(() => ({})) : {};
        const raw = String(j?.subscription?.name || 'free').toLowerCase();
        const nextPlan: PlanKey =
          raw.includes('enterprise') ? 'enterprise' :
          raw.includes('pro') ? 'pro' :
          raw.includes('starter') ? 'starter' :
          'free';
        if (mounted) setPlan(nextPlan);
      } catch {
        if (mounted) setPlan('free');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const entitlements = useMemo(() => getEntitlements(plan), [plan]);
  const adFree = !!entitlements.features.adFree;

  return { loading, plan, entitlements, adFree };
}

