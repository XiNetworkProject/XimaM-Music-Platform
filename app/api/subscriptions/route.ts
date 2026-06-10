import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { PLANS, PLAN_KEYS, CREDITS_PER_GENERATION } from '@/lib/billing/pricing';

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const userId = session?.user?.id || 'default-user-id';

    const subscriptionPlans = PLAN_KEYS.map((key) => {
      const p = PLANS[key];
      return {
        id: key,
        name: key,
        label: p.label,
        price: p.priceMonthly,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        stripePriceIds: p.stripePriceIds,
        badge: p.badge || null,
        currency: 'EUR',
        interval: 'mois',
        description:
          key === 'free'
            ? 'Essentiel pour démarrer'
            : key === 'starter'
            ? 'Pour créer régulièrement'
            : 'Pour les créateurs avancés',
        features: p.features,
        limits: {
          maxTracks: p.limits.maxTracks,
          maxPlaylists: p.limits.maxPlaylists,
          audioQuality: `${p.limits.audioQualityKbps}kbps`,
          fileMaxMb: p.limits.maxFileMb,
          ads: !p.featureFlags.adFree,
          analytics: p.featureFlags.analyticsBasic || p.featureFlags.analyticsAdvanced,
          collaborations: p.featureFlags.collaborativePlaylists,
          apiAccess: false,
          support: key === 'pro' ? 'Prioritaire' : key === 'starter' ? 'Standard' : 'Communautaire',
        },
        popular: key === 'starter',
        recommended: key === 'starter',
        creditsMonthly: p.monthlyCredits,
        featureFlags: p.featureFlags,
      };
    });

    return NextResponse.json({ plans: subscriptionPlans, currentUser: userId });
  } catch (error) {
    console.error('[Subscriptions API] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
