import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';
import { CREDITS_PER_GENERATION } from '@/lib/credits';
import { uploadAndCoverAudio, SunoUploadCoverRequest } from '@/lib/suno';
import { validateSunoGenerationInput, validateSunoTuningInput, validateUploadCoverExtra } from '@/lib/sunoValidation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = SunoUploadCoverRequest & {
  sourceDurationSec?: number;
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

  let debited = false;
  const refundCredits = async (userId: string) => {
    if (!debited) return;
    try {
      await (supabaseAdmin as any).rpc('ai_add_credits', { p_user_id: userId, p_amount: CREDITS_PER_GENERATION });
    } catch {}
  };

  try {
    const body = (await req.json()) as Body;

    // Entitlements: vérif modèle autorisé
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);
    const allowedModels = entitlements.ai.availableModels || ["V4_5"];
    const requestedModel = body.model || "V4_5";
    const effectiveModel = allowedModels.includes(requestedModel) ? requestedModel : (allowedModels.includes("V4_5") ? "V4_5" : allowedModels[0]);

    const tuningValidated = validateSunoTuningInput({
      styleWeight: body.styleWeight,
      weirdnessConstraint: body.weirdnessConstraint,
      audioWeight: body.audioWeight,
      vocalGender: body.vocalGender as any,
    });
    if (!tuningValidated.ok) {
      return NextResponse.json({ error: tuningValidated.error }, { status: 400 });
    }
    if (!body.uploadUrl) {
      return NextResponse.json({ error: 'uploadUrl requis' }, { status: 400 });
    }
    try {
      new URL(body.uploadUrl);
    } catch {
      return NextResponse.json({ error: 'uploadUrl invalide' }, { status: 400 });
    }

    // Crédits: vérifier et débiter (après validation des paramètres)
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
    debited = true;

    // Validation alignée docs Suno
    const validated = validateSunoGenerationInput({
      customMode: !!body.customMode,
      instrumental: !!body.instrumental,
      model: effectiveModel,
      prompt: body.prompt,
      style: body.style,
      title: body.title,
      hasUploadUrl: true,
    });
    if (!validated.ok) {
      await refundCredits(session.user.id);
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const uploadValidated = validateUploadCoverExtra(effectiveModel, body.sourceDurationSec);
    if (!uploadValidated.ok) {
      await refundCredits(session.user.id);
      return NextResponse.json({ error: uploadValidated.error }, { status: 400 });
    }

    // Appel Suno upload-cover
    // Utiliser directement l'URL Cloudinary (publique) comme uploadUrl, conforme à la doc
    const payload: Body = {
      ...body,
      model: effectiveModel,
      callBackUrl: body.callBackUrl || `${process.env.NEXTAUTH_URL}/api/suno/callback`,
    };

    const sunoRes = await uploadAndCoverAudio(payload);
    const taskId = sunoRes?.data?.taskId;
    if (!taskId) {
      await refundCredits(session.user.id);
      return NextResponse.json(
        { error: 'Réponse Suno invalide: taskId manquant', raw: sunoRes },
        { status: 502 }
      );
    }

    // Enregistrer la génération (pending)
    if (taskId) {
      const generationData: any = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
        task_id: taskId,
        status: 'pending',
        is_public: false,
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
      model: effectiveModel,
      requestedModel,
      modelAdjusted: requestedModel !== effectiveModel,
      credits: {
        debited: CREDITS_PER_GENERATION,
        balance: newBalanceRow?.balance ?? (currentBalance - CREDITS_PER_GENERATION)
      }
    });

  } catch (error: any) {
    await refundCredits(session.user.id);
    console.error('❌ Erreur upload-cover:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}


