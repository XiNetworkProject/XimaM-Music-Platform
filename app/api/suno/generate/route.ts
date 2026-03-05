import { NextRequest, NextResponse } from "next/server";
import { generateCustomMusic, createProductionPrompt } from "@/lib/suno";
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { CREDITS_PER_GENERATION } from '@/lib/credits';
import { getEntitlements } from '@/lib/entitlements';
import { validateSunoGenerationInput, validateSunoTuningInput } from '@/lib/sunoValidation';

const BASE = "https://api.sunoapi.org";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  customMode?: boolean; // Mode Simple (false) ou Custom (true)
  title?: string;
  style?: string;
  prompt?: string;
  instrumental: boolean;
  model?: string;
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
};

export async function POST(req: NextRequest) {
  console.log("🚀 API /api/suno/generate appelée !");
  console.log("🔍 Headers:", Object.fromEntries(req.headers.entries()));
  console.log("🔍 URL:", req.url);
  
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    console.error("❌ SUNO_API_KEY manquant dans les variables d'environnement");
    return NextResponse.json({ error: "SUNO_API_KEY manquant" }, { status: 500 });
  }

  // Vérification de l'authentification (cookie web ou Bearer JWT mobile)
  const session = await getApiSession(req);
  console.log("🔍 Session:", { hasSession: !!session, userId: session?.user?.id });
  if (!session?.user?.id) {
    console.log("❌ Non authentifié");
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const mapProviderStatus = (providerCode: number | undefined, fallback: number) => {
      if (typeof providerCode === 'number' && providerCode >= 400 && providerCode <= 599) return providerCode;
      return fallback;
    };

    const body = (await req.json()) as Body;
    console.log("🎵 Requête génération Suno:", { 
      title: body.title, 
      style: body.style, 
      instrumental: body.instrumental,
      modelDemande: body.model 
    });

    // Vérification du plan pour les modèles autorisés
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);
    
    console.log("🔍 Plan utilisateur:", { plan, profile, entitlements: entitlements.features });

    // Vérifier que le modèle demandé est autorisé par le plan, sinon fallback contrôlé
    const allowedModels = entitlements.ai.availableModels || ["V4_5"];
    const requestedModel = body.model || "V4_5";
    const effectiveModel = allowedModels.includes(requestedModel) ? requestedModel : (allowedModels.includes("V4_5") ? "V4_5" : allowedModels[0]);
    const modelAdjusted = requestedModel !== effectiveModel;
    
    console.log("🔍 DEBUG MODÈLE:", {
      requestedModel,
      allowedModels,
      effectiveModel,
      userPlan: plan
    });

    // Vérifier le solde de crédits et débiter avant l'appel Suno
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

    // Débit des crédits (sécurisé en SQL, avec ledger)
    const { data: debitOk, error: debitError } = await (supabaseAdmin as any)
      .rpc('ai_debit_credits', {
        p_user_id: session.user.id,
        p_amount: CREDITS_PER_GENERATION,
        p_source: 'action_spend',
        p_description: `Génération musicale (${effectiveModel})`,
      });
    if (debitError || debitOk !== true) {
      return NextResponse.json({
        error: 'Impossible de débiter les crédits',
        insufficientCredits: true,
        required: CREDITS_PER_GENERATION,
        balance: currentBalance,
      }, { status: 402 });
    }

    // Déterminer le mode : si customMode est explicitement false, on est en mode Simple
    const isCustomMode = body.customMode !== false; // Par défaut Custom (true)

    // Validation alignée docs Suno (limites prompt/style/title selon modèle+mode)
    const validated = validateSunoGenerationInput({
      customMode: isCustomMode,
      instrumental: body.instrumental,
      model: effectiveModel,
      prompt: body.prompt,
      style: body.style,
      title: body.title,
    });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const tuningValidated = validateSunoTuningInput({
      styleWeight: body.styleWeight,
      weirdnessConstraint: body.weirdnessConstraint,
      audioWeight: body.audioWeight,
      vocalGender: body.vocalGender,
    });
    if (!tuningValidated.ok) {
      return NextResponse.json({ error: tuningValidated.error }, { status: 400 });
    }

    // Créer le prompt avec les hints de production si fournis (mode Custom uniquement)
    let finalPrompt = body.prompt;
    if (isCustomMode && !body.instrumental && (body.bpm || body.key || body.durationHint)) {
      finalPrompt = createProductionPrompt(body.prompt || "", {
        bpm: body.bpm,
        key: body.key,
        durationHint: body.durationHint,
      });
    }

    // Construction du payload selon le mode
    const payload: any = {
      customMode: isCustomMode,
      instrumental: body.instrumental,
      model: effectiveModel,
      callBackUrl: body.callBackUrl || `${process.env.NEXTAUTH_URL}/api/suno/callback`,
    };

    if (isCustomMode) {
      // Mode Custom : title, style, prompt (lyrics)
      payload.title = body.title || undefined; // undefined = Suno génère
      payload.style = body.style;
      payload.prompt = body.instrumental ? undefined : finalPrompt; // Lyrics si non-instrumental
      payload.negativeTags = body.negativeTags;
      payload.vocalGender = body.vocalGender;
      payload.styleWeight = body.styleWeight ?? 0.65;
      payload.weirdnessConstraint = body.weirdnessConstraint ?? 0.5;
      payload.audioWeight = body.audioWeight ?? 0.65;
    } else {
      // Mode Simple : seulement prompt (description)
      payload.prompt = body.prompt;
      // En mode Simple, title/style doivent rester vides selon la doc
    }

    console.log("🚀 Appel API Suno avec payload:", payload);

    const response = await fetch(`${BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json().catch(() => ({}));
    
    console.log("📡 Réponse Suno:", { status: response.status, json });
    
    if (!response.ok || json?.code !== 200) {
      console.error("❌ Erreur API Suno:", json);
      try {
        await (supabaseAdmin as any).rpc('ai_add_credits', {
          p_user_id: session.user.id, p_amount: CREDITS_PER_GENERATION,
          p_source: 'refund', p_description: 'Remboursement échec API Suno',
        });
      } catch {}
      const providerCode = Number(json?.code);
      const mappedStatus = mapProviderStatus(Number.isFinite(providerCode) ? providerCode : undefined, response.status);
      return NextResponse.json(
        { error: json?.msg || "Erreur Suno", raw: json }, 
        { status: mappedStatus }
      );
    }

    // Enregistrer la génération en base (status: pending)
    const taskId = json?.data?.taskId || json?.taskId;
    if (!taskId) {
      try {
        await (supabaseAdmin as any).rpc('ai_add_credits', {
          p_user_id: session.user.id, p_amount: CREDITS_PER_GENERATION,
          p_source: 'refund', p_description: 'Remboursement taskId manquant',
        });
      } catch {}
      return NextResponse.json(
        { error: "Réponse Suno invalide: taskId manquant", raw: json },
        { status: 502 }
      );
    }
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
          customMode: true
        };
      } else {
        // Mode Simple : description générale dans prompt
        generationData.prompt = body.prompt || ''; // Description complète
        generationData.metadata = {
          title: 'Génération automatique',
          description: body.prompt,
          instrumental: body.instrumental,
          customMode: false
        };
      }

      console.log("💾 INSERTION GÉNÉRATION:", {
        model: generationData.model,
        taskId: generationData.task_id,
        effectiveModel
      });
      
      const { error: insertError } = await supabaseAdmin.from('ai_generations').insert(generationData);
      if (insertError) {
        console.error("❌ Erreur insertion génération:", insertError);
        console.error("❌ Données qui ont échoué:", generationData);
      } else {
        console.log("✅ Génération insérée avec succès:", taskId, "model:", generationData.model);
      }
    }

    console.log("✅ Génération Suno réussie:", json);
    // Retourner un schéma compatible frontend: taskId à la racine
    const rootTaskId = json?.data?.taskId || json?.taskId || taskId;
    const { data: newBalanceRow } = await supabaseAdmin
      .from('ai_credit_balances')
      .select('balance')
      .eq('user_id', session.user.id)
      .maybeSingle();
    return NextResponse.json({
      taskId: rootTaskId,
      code: json?.code,
      msg: json?.msg,
      data: json?.data,
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
    console.error("❌ Erreur génération personnalisée:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" }, 
      { status: 500 }
    );
  }
}
