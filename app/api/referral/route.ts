import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_REFERRALS = 20;
const CREDITS_PER_REFERRAL = 50;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_code, username')
      .eq('email', session.user.email)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }

    const { data: referrals, count } = await supabaseAdmin
      .from('referrals')
      .select('id, referred_id, referrer_credits_granted, created_at, referred:profiles!referrals_referred_id_fkey(username, name, avatar)', { count: 'exact' })
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const totalCreditsEarned = (referrals || []).reduce(
      (sum: number, r: any) => sum + (r.referrer_credits_granted || 0), 0
    );

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    return NextResponse.json({
      referralCode: profile.referral_code,
      referralLink: `${baseUrl}/join/${profile.referral_code}`,
      totalReferrals: count || 0,
      maxReferrals: MAX_REFERRALS,
      remainingSlots: Math.max(0, MAX_REFERRALS - (count || 0)),
      totalCreditsEarned,
      referrals: (referrals || []).map((r: any) => ({
        id: r.id,
        username: r.referred?.username || 'Utilisateur',
        name: r.referred?.name || '',
        avatar: r.referred?.avatar || null,
        creditsGranted: r.referrer_credits_granted,
        date: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Erreur API referral GET:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { referralCode, newUserId } = await request.json();
    if (!referralCode || !newUserId) {
      return NextResponse.json({ error: 'Code et userId requis' }, { status: 400 });
    }

    const { data: referrer } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('referral_code', referralCode)
      .single();

    if (!referrer) {
      return NextResponse.json({ error: 'Code de parrainage invalide' }, { status: 404 });
    }

    if (referrer.id === newUserId) {
      return NextResponse.json({ error: 'Auto-parrainage interdit' }, { status: 400 });
    }

    const { count } = await supabaseAdmin
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referrer.id);

    if ((count || 0) >= MAX_REFERRALS) {
      return NextResponse.json({ error: 'Limite de parrainages atteinte' }, { status: 400 });
    }

    const { data: existingRef } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('referred_id', newUserId)
      .single();

    if (existingRef) {
      return NextResponse.json({ error: 'Utilisateur déjà parrainé' }, { status: 400 });
    }

    const { error: insertErr } = await supabaseAdmin.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: newUserId,
      referrer_credits_granted: CREDITS_PER_REFERRAL,
      referred_credits_granted: CREDITS_PER_REFERRAL,
    });

    if (insertErr) throw insertErr;

    await supabaseAdmin.from('profiles').update({ referred_by: referrer.id }).eq('id', newUserId);

    await supabaseAdmin.rpc('ai_add_credits', {
      p_user_id: referrer.id,
      p_amount: CREDITS_PER_REFERRAL,
      p_source: 'referral_bonus',
      p_description: `Parrainage de ${newUserId}`,
    });

    await supabaseAdmin.rpc('ai_add_credits', {
      p_user_id: newUserId,
      p_amount: CREDITS_PER_REFERRAL,
      p_source: 'referral_bonus',
      p_description: `Parrainé par ${referrer.username}`,
    });

    return NextResponse.json({
      success: true,
      referrerUsername: referrer.username,
      creditsGranted: CREDITS_PER_REFERRAL,
    });
  } catch (error) {
    console.error('Erreur API referral POST:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
