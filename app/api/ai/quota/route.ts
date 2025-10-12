import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const userId = session.user.id;
    // Lire plan depuis profiles
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);
    const monthly_limit = entitlements.ai.maxGenerationsPerMonth;

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
    // Ajouter info crédits pour l’UI
    const { data: creditRow } = await supabaseAdmin
      .from('ai_credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    const reset = new Date(startOfMonth);
    reset.setMonth(reset.getMonth() + 1);

    return NextResponse.json({
      id: '',
      user_id: userId,
      plan_type: plan,
      monthly_limit,
      used_this_month,
      reset_date: reset.toISOString(),
      remaining,
      aiGenerationEnabled: entitlements.features.aiGeneration,
      monthlyCredits: entitlements.ai.monthlyCredits ?? 0,
      creditBalance: creditRow?.balance ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
