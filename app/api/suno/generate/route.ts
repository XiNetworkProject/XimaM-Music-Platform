import { NextRequest, NextResponse } from "next/server";
import { generateCustomMusic, generateMusic, SunoProviderRejectedError } from "@/lib/suno";
import { DEFAULT_SUNO_MODEL, normalizeGenerationModel } from '@/lib/sunoModels';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { CREDITS_PER_GENERATION } from '@/lib/credits';
import { getEntitlements } from '@/lib/entitlements';
import { validateSunoGenerationInput, validateSunoTuningInput } from '@/lib/sunoValidation';
import { assertCanCreateAiVariation } from '@/lib/remixServer';
import { sanitizeRemixPrompt, sanitizeRemixPromptVisibility, sanitizeRemixType } from '@/lib/remixOptions';
import { buildSunoCallbackUrl } from '@/lib/sunoWebhook';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  customMode?: boolean; // Mode Simple (false) ou Custom (true)
  title?: string;
  style?: string;
  prompt?: string;
  instrumental: boolean;
  model?: string;
  duration?: number;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
  // Paramètres UI optionnels
  bpm?: number;
  key?: string;
  durationHint?: string;
  remixSource?: {
    sourceTrackId?: string;
    sourceTrackType?: 'track' | 'ai_track';
  };
  remixType?: string;
  remixPrompt?: string;
  remixPromptVisibility?: 'private' | 'public';
  // Défi musical dans le cadre duquel cette variation est générée (optionnel).
  // Propagé jusqu'à track_remixes.challenge_id (voir upsertDraftRemixesForGeneration)
  // pour pouvoir enregistrer la participation même si la variation part en attente
  // d'approbation, au moment de la décision (app/api/remixes/[id]/decision/route.ts).
  challengeId?: string;
};

export async function POST(req: NextRequest) {
  const originError = rejectUntrustedMutationOrigin(req);
  if (originError) return originError;
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const limited = enforceRequestRateLimit(req, 'suno-generate-user', 5, 10 * 60_000, session.user.id);
  if (limited) return limited;
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service IA indisponible' }, { status: 503 });

  let debited = false;
  let refundAttempted = false;
  const refundRejectedRequest = async () => {
    if (!debited || refundAttempted) return;
    refundAttempted = true;
    try {
      const { error } = await (dbAdmin as any).rpc('ai_add_credits', {
        p_user_id: session.user.id, p_amount: CREDITS_PER_GENERATION,
        p_source: 'refund', p_description: 'Remboursement refus API Suno',
      });
      if (error) console.error('[suno/generate] remboursement impossible');
    } catch {
      console.error('[suno/generate] remboursement impossible');
    }
  };

  try {
    const parsed = await readLimitedJson<Body>(req, 64 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    if (!body || typeof body !== 'object' || Array.isArray(body) || (body.customMode != null && typeof body.customMode !== 'boolean')) {
      return NextResponse.json({ error: 'Paramètres de génération invalides' }, { status: 400 });
    }
    const remixSource = body.remixSource?.sourceTrackId
      ? await assertCanCreateAiVariation({
          sourceTrackId: body.remixSource.sourceTrackId,
          sourceTrackType: body.remixSource.sourceTrackType,
          userId: session.user.id,
        })
      : null;
    if (remixSource && !remixSource.ok) {
      return NextResponse.json({ error: remixSource.error }, { status: remixSource.status });
    }
    const challengeId = typeof body.challengeId === 'string' && body.challengeId.trim() ? body.challengeId.trim() : null;
    // Vérification du plan pour les modèles autorisés
    const { data: profile } = await dbAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);
    
    // Vérifier que le modèle demandé est autorisé par le plan, sinon fallback contrôlé
    const allowedModels = entitlements.ai.availableModels || [DEFAULT_SUNO_MODEL];
    const requestedModel = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_SUNO_MODEL;
    const effectiveModel = normalizeGenerationModel(requestedModel, allowedModels);
    const modelAdjusted = requestedModel !== effectiveModel;
    
    // Déterminer le mode : si customMode est explicitement false, on est en mode Simple
    const isCustomMode = body.customMode !== false; // Par défaut Custom (true)

    // Validation alignée docs Suno (limites prompt/style/title selon modèle+mode)
    const remixMetadata = remixSource?.ok
      ? {
          remixType: sanitizeRemixType(body.remixType),
          remixPrompt: sanitizeRemixPrompt(body.remixPrompt || (isCustomMode ? body.style : body.prompt)),
          remixPromptVisibility: sanitizeRemixPromptVisibility(body.remixPromptVisibility),
        }
      : null;

    const validated = validateSunoGenerationInput({
      customMode: isCustomMode,
      instrumental: body.instrumental,
      model: effectiveModel,
      prompt: body.prompt,
      style: body.style,
      title: body.title,
      duration: body.duration,
    });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const tuningValidated = validateSunoTuningInput({
      styleWeight: body.styleWeight,
      weirdnessConstraint: body.weirdnessConstraint,
      audioWeight: body.audioWeight,
      vocalGender: body.vocalGender,
      negativeTags: body.negativeTags,
    });
    if (!tuningValidated.ok) {
      return NextResponse.json({ error: tuningValidated.error }, { status: 400 });
    }

    // Lyrics are user content. Legacy production hints must never be appended to them.
    // BPM/key instructions belong in the style supplied by the composer.
    const finalPrompt = body.prompt;

    // Construction du payload selon le mode
    const payload: any = {
      customMode: isCustomMode,
      instrumental: body.instrumental,
      model: effectiveModel,
      callBackUrl: buildSunoCallbackUrl(req, '/api/suno/callback'),
    };

    if (isCustomMode) {
      // Mode Custom : title, style, prompt (lyrics)
      payload.title = body.title;
      payload.style = body.style;
      payload.prompt = body.instrumental ? undefined : finalPrompt; // Lyrics si non-instrumental
      payload.negativeTags = body.negativeTags;
      payload.vocalGender = body.vocalGender;
      payload.styleWeight = body.styleWeight ?? 0.65;
      payload.weirdnessConstraint = body.weirdnessConstraint ?? 0.5;
      payload.audioWeight = body.audioWeight ?? 0.65;
      payload.duration = body.duration;
    } else {
      // Mode Simple : seulement prompt (description)
      payload.prompt = body.prompt;
      // En mode Simple, title/style doivent rester vides selon la doc
    }

    // Prepare and validate the complete request, including callback configuration, before billing.
    const { data: balanceRow } = await dbAdmin.from('ai_credit_balances').select('balance').eq('user_id', session.user.id).maybeSingle();
    const currentBalance: number = balanceRow?.balance ?? 0;
    if (currentBalance < CREDITS_PER_GENERATION) {
      return NextResponse.json({ error: 'Crédits insuffisants', insufficientCredits: true, required: CREDITS_PER_GENERATION, balance: currentBalance }, { status: 402 });
    }
    const { data: debitOk, error: debitError } = await (dbAdmin as any).rpc('ai_debit_credits', {
      p_user_id: session.user.id, p_amount: CREDITS_PER_GENERATION,
      p_source: 'action_spend', p_description: `Génération musicale (${effectiveModel})`,
    });
    if (debitError || debitOk !== true) {
      return NextResponse.json({ error: 'Impossible de débiter les crédits', insufficientCredits: true, required: CREDITS_PER_GENERATION, balance: currentBalance }, { status: 402 });
    }
    debited = true;
    const json = isCustomMode ? await generateCustomMusic(payload) : await generateMusic(payload);

    // Enregistrer la génération en base (status: pending)
    const taskId = json.data.taskId;
    if (taskId) {
      const generationData: any = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
        task_id: taskId,
        status: 'pending',
        is_public: false,
        model: effectiveModel,
        created_at: new Date().toISOString()
      };

      if (isCustomMode) {
        // Mode Custom : style et lyrics séparés
        generationData.prompt = body.instrumental ? '' : (finalPrompt || ''); // Lyrics seulement
        generationData.metadata = {
          title: body.title || 'Génération en cours',
          style: body.style || '', // Style musical
          instrumental: body.instrumental,
          customMode: true,
          ...(body.duration != null ? { duration: body.duration } : {}),
          ...(remixSource?.ok ? { remixSource: remixSource.source } : {}),
          ...(remixMetadata ? remixMetadata : {}),
          ...(challengeId ? { challengeId } : {}),
        };
      } else {
        // Mode Simple : description générale dans prompt
        generationData.prompt = body.prompt || ''; // Description complète
        generationData.metadata = {
          title: 'Génération automatique',
          description: body.prompt,
          instrumental: body.instrumental,
          customMode: false,
          ...(remixSource?.ok ? { remixSource: remixSource.source } : {}),
          ...(remixMetadata ? remixMetadata : {}),
          ...(challengeId ? { challengeId } : {}),
        };
      }

      const { error: insertError } = await dbAdmin.from('ai_generations').insert(generationData);
      if (insertError) {
        console.error('[suno/generate] insertion generation impossible');
      }
    }

    // Retourner un schéma compatible frontend: taskId à la racine
    const rootTaskId = taskId;
    const { data: newBalanceRow } = await dbAdmin
      .from('ai_credit_balances')
      .select('balance')
      .eq('user_id', session.user.id)
      .maybeSingle();
    return NextResponse.json({
      taskId: rootTaskId,
      code: 200,
      data: { taskId: rootTaskId },
      prompt: finalPrompt,
      model: payload.model,
      modelAdjusted,
      requestedModel,
      quota: {
        limit: "illimité",
        used: "système crédits",
        remaining: "système crédits"
      },
      credits: {
        debited: CREDITS_PER_GENERATION,
        balance: newBalanceRow?.balance ?? (currentBalance - CREDITS_PER_GENERATION)
      }
    });
  } catch (error) {
    if (error instanceof SunoProviderRejectedError) await refundRejectedRequest();
    // A timeout or malformed acceptance can still have created a paid provider task.
    // It requires reconciliation; do not issue an unconditional credit refund here.
    console.error('[suno/generate] generation impossible');
    return NextResponse.json(
      { error: 'Service IA temporairement indisponible' },
      { status: 502 }
    );
  }
}
