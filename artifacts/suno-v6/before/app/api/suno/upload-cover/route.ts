import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { getEntitlements } from '@/lib/entitlements';
import { CREDITS_PER_GENERATION } from '@/lib/credits';
import { uploadAndCoverAudio, SunoUploadCoverRequest } from '@/lib/suno';
import { validateSunoGenerationInput, validateSunoTuningInput, validateUploadCoverExtra } from '@/lib/sunoValidation';
import { buildSunoCallbackUrl } from '@/lib/sunoWebhook';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = SunoUploadCoverRequest & {
  sourceDurationSec?: number;
};

export async function POST(req: NextRequest) {
  const originError = rejectUntrustedMutationOrigin(req);
  if (originError) return originError;
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const limited = enforceRequestRateLimit(req, 'suno-upload-cover-user', 5, 10 * 60_000, session.user.id);
  if (limited) return limited;
  if (!process.env.SUNO_API_KEY) return NextResponse.json({ error: 'Service IA indisponible' }, { status: 503 });

  let debited = false;
  const refundCredits = async (userId: string) => {
    if (!debited) return;
    try {
      await (dbAdmin as any).rpc('ai_add_credits', {
        p_user_id: userId, p_amount: CREDITS_PER_GENERATION,
        p_source: 'refund', p_description: 'Remboursement échec upload-cover',
      });
    } catch {}
  };

  try {
    const parsed = await readLimitedJson<Body>(req, 64 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;

    // Entitlements: vérif modèle autorisé
    const { data: profile } = await dbAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
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
      const uploadUrl = new URL(body.uploadUrl);
      if (!['http:', 'https:'].includes(uploadUrl.protocol) || uploadUrl.username || uploadUrl.password || body.uploadUrl.length > 2_048) {
        throw new Error('invalid');
      }
    } catch {
      return NextResponse.json({ error: 'uploadUrl invalide' }, { status: 400 });
    }

    // Crédits: vérifier et débiter (après validation des paramètres)
    const { data: balanceRow } = await dbAdmin
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

    const { data: debitOk, error: debitError } = await (dbAdmin as any)
      .rpc('ai_debit_credits', {
        p_user_id: session.user.id, p_amount: CREDITS_PER_GENERATION,
        p_source: 'action_spend', p_description: `Upload cover / Remix (${effectiveModel})`,
      });
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
    // Utiliser directement l'URL média publique comme uploadUrl, conformément à la doc
    const payload: Body = {
      ...body,
      model: effectiveModel,
      callBackUrl: buildSunoCallbackUrl(req, '/api/suno/callback'),
    };

    const sunoRes = await uploadAndCoverAudio(payload);
    const taskId = sunoRes?.data?.taskId;
    if (!taskId) {
      await refundCredits(session.user.id);
      return NextResponse.json(
        { error: 'Reponse du service IA invalide' },
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

      const { error: insertError } = await dbAdmin.from('ai_generations').insert(generationData);
      if (insertError) {
        console.error('[suno/upload-cover] insertion generation impossible');
      }
    }

    // Retour frontend
    const { data: newBalanceRow } = await dbAdmin
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

  } catch {
    await refundCredits(session.user.id);
    console.error('[suno/upload-cover] generation impossible');
    return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 502 });
  }
}
