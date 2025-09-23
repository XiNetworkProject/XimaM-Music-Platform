import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';

// Mapping simple: générations/mois par plan pour aperçu limité
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  starter: 3,
  pro: 10,
  enterprise: 100,
};

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const userId = session.user.id;
    // Lire plan depuis profiles
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
    const planType = (profile?.plan || 'free').toLowerCase();
    const entitlements = getEntitlements(planType as any);
    const monthly_limit = entitlements.aiGenerations;

    // Calculer utilisé ce mois (compte des générations IA complétées ce mois-ci)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const { count } = await supabaseAdmin
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    const used_this_month = count || 0;
    const remaining = Math.max(0, monthly_limit - used_this_month);
    const reset = new Date(startOfMonth);
    reset.setMonth(reset.getMonth() + 1);

    return NextResponse.json({
      id: '',
      user_id: userId,
      plan_type: planType,
      monthly_limit,
      used_this_month,
      reset_date: reset.toISOString(),
      remaining,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
