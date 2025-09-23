import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    let profile: any = null;
    let error: any = null;
    {
      const res = await supabaseAdmin
        .from('profiles')
        .select('id, plan, subscription_status, subscription_current_period_end')
        .eq('id', session.user.id)
        .maybeSingle();
      profile = res.data;
      error = res.error;
    }

    // Fallback si certaines colonnes n'existent pas encore
    if (error) {
      const res2 = await supabaseAdmin
        .from('profiles')
        .select('id, plan')
        .eq('id', session.user.id)
        .maybeSingle();
      profile = res2.data;
    }

    const plan = (profile?.plan || 'free') as 'free' | 'starter' | 'pro' | 'enterprise';
    const name = plan.charAt(0).toUpperCase() + plan.slice(1);
    const interval: 'month' | 'year' = 'month';
    const status = profile?.subscription_status || (plan === 'free' ? 'none' : 'active');
    const currentPeriodEnd = profile?.subscription_current_period_end || null;

    const hasSubscription = plan !== 'free';
    
    return NextResponse.json({
      hasSubscription,
      subscription: hasSubscription ? { id: '', name, price: 0, currency: 'EUR', interval } : null,
      userSubscription: { status, currentPeriodEnd },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}