import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { getEntitlements } from '@/lib/entitlements';
import { CREDITS_PER_GENERATION } from '@/lib/credits';
import { uploadAndCoverAudio, SunoUploadCoverRequest, SunoProviderRejectedError } from '@/lib/suno';
import { DEFAULT_SUNO_MODEL, normalizeGenerationModel } from '@/lib/sunoModels';
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
  let refundAttempted = false;
  const refundCredits = async (userId: string) => {
    if (!debited || refundAttempted) return;
    refundAttempted = true;
    try {
      const { error } = await (dbAdmin as any).rpc('ai_add_credits', {
        p_user_id: userId, p_amount: CREDITS_PER_GENERATION,
        p_source: 'refund', p_description: 'Remboursement échec upload-cover',
      });
      if (error) console.error('[suno/upload-cover] remboursement impossible');
    } catch {
      console.error('[suno/upload-cover] remboursement impossible');
    }
  };

  try {
    const parsed = await readLimitedJson<Body>(req, 64 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Paramètres de génération invalides' }, { status: 400 });
    }

    // Entitlements: vérif modèle autorisé
    const { data: profile } = await dbAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);
    const allowedModels = entitlements.ai.availableModels || [DEFAULT_SUNO_MODEL];
    const requestedModel = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_SUNO_MODEL;
    const effectiveModel = normalizeGenerationModel(requestedModel, allowedModels);

    const tuningValidated = validateSunoTuningInput({
      styleWeight: body.styleWeight,
      weirdnessConstraint: body.weirdnessConstraint,
      audioWeight: body.audioWeight,
      vocalGender: body.vocalGender as any,
      negativeTags: body.negativeTags,
    });
    if (!tuningValidated.ok) {
      return NextResponse.json({ error: tuningValidated.error }, { status: 400 });
    }
    if (typeof body.uploadUrl !== 'string' || !body.uploadUrl) {
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

    const validated = validateSunoGenerationInput({
      customMode: body.customMode,
      instrumental: body.instrumental,
      model: effectiveModel,
      prompt: body.prompt,
      style: body.style,
      title: body.title,
      duration: body.duration,
      hasUploadUrl: true,
    });
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
    const uploadValidated = validateUploadCoverExtra(effectiveModel, body.sourceDurationSec);
    if (!uploadValidated.ok) return NextResponse.json({ error: uploadValidated.error }, { status: 400 });

    // Callback configuration must be valid before spending credits.
    const payload: Body = {
      ...body,
      model: effectiveModel,
      callBackUrl: buildSunoCallbackUrl(req, '/api/suno/callback'),
    };

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

    // Appel Suno upload-cover
    // Utiliser directement l'URL média publique comme uploadUrl, conformément à la doc
    const sunoRes = await uploadAndCoverAudio(payload);
    const taskId = sunoRes?.data?.taskId;
    if (!taskId) {
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
          ...(payload.duration != null ? { duration: payload.duration } : {}),
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
      model: effectiveModel,
      requestedModel,
      modelAdjusted: requestedModel !== effectiveModel,
      credits: {
        debited: CREDITS_PER_GENERATION,
        balance: newBalanceRow?.balance ?? (currentBalance - CREDITS_PER_GENERATION)
      }
    });

  } catch (error) {
    if (error instanceof SunoProviderRejectedError) await refundCredits(session.user.id);
    // An ambiguous timeout/acceptance needs reconciliation, not a blind refund.
    console.error('[suno/upload-cover] generation impossible');
    return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 502 });
  }
}
