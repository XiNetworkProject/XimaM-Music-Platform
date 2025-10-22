import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';
import { CREDITS_PER_GENERATION } from '@/lib/credits';
import { uploadAndCoverAudio, SunoUploadCoverRequest } from '@/lib/suno';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = SunoUploadCoverRequest & {
  // Rien de plus pour l'instant
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SUNO_API_KEY manquant" }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Body;

    // Entitlements: vérif modèle autorisé
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);
    const allowedModels = entitlements.ai.availableModels || ["V4_5"];
    const requestedModel = body.model || "V4_5";
    const effectiveModel = allowedModels.includes(requestedModel) ? requestedModel : (allowedModels.includes("V4_5") ? "V4_5" : allowedModels[0]);

    // Crédits: vérifier et débiter
    const { data: balanceRow } = await supabaseAdmin
      .from('ai_credit_balances')
      .select('balance')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const currentBalance: number = balanceRow?.balance ?? 0;
    if (currentBalance < CREDITS_PER_GENERATION) {
      return NextResponse.json({
        error: 'Crédits insuffisants',
        insufficientCredits: true,
        required: CREDITS_PER_GENERATION,
        balance: currentBalance,
      }, { status: 402 });
    }

    const { data: debitOk, error: debitError } = await (supabaseAdmin as any)
      .rpc('ai_debit_credits', { p_user_id: session.user.id, p_amount: CREDITS_PER_GENERATION });
    if (debitError || debitOk !== true) {
      return NextResponse.json({
        error: 'Impossible de débiter les crédits',
        insufficientCredits: true,
        required: CREDITS_PER_GENERATION,
        balance: currentBalance,
      }, { status: 402 });
    }

    // Appel Suno upload-cover
    const payload: Body = {
      ...body,
      model: effectiveModel,
      callBackUrl: body.callBackUrl || `${process.env.NEXTAUTH_URL}/api/suno/callback`,
    };

    const sunoRes = await uploadAndCoverAudio(payload);
    const taskId = sunoRes?.data?.taskId;

    // Enregistrer la génération (pending)
    if (taskId) {
      const generationData: any = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
        task_id: taskId,
        status: 'pending',
        model: effectiveModel,
        prompt: payload.customMode ? (payload.instrumental ? '' : (payload.prompt || '')) : (payload.prompt || ''),
        metadata: {
          title: payload.customMode ? (payload.title || 'Remix en cours') : 'Remix automatique',
          style: payload.customMode ? (payload.style || '') : '',
          instrumental: payload.instrumental,
          customMode: payload.customMode,
          uploadUrl: payload.uploadUrl
        },
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabaseAdmin.from('ai_generations').insert(generationData);
      if (insertError) {
        console.error('❌ Erreur insertion génération upload-cover:', insertError);
      }
    }

    // Retour frontend
    const { data: newBalanceRow } = await supabaseAdmin
      .from('ai_credit_balances')
      .select('balance')
      .eq('user_id', session.user.id)
      .maybeSingle();

    return NextResponse.json({
      taskId,
      code: sunoRes?.code,
      msg: sunoRes?.msg,
      credits: {
        debited: CREDITS_PER_GENERATION,
        balance: newBalanceRow?.balance ?? (currentBalance - CREDITS_PER_GENERATION)
      }
    });

  } catch (error: any) {
    console.error('❌ Erreur upload-cover:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}


