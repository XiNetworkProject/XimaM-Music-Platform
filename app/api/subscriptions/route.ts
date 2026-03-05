import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { PLANS, PLAN_KEYS, CREDITS_PER_GENERATION } from '@/lib/billing/pricing';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'default-user-id';

    const subscriptionPlans = PLAN_KEYS.map((key) => {
      const p = PLANS[key];
      return {
        id: key,
        name: key,
        price: p.priceMonthly,
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
      };
    });

    return NextResponse.json({ plans: subscriptionPlans, currentUser: userId });
  } catch (error) {
    console.error('[Subscriptions API] Erreur:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
