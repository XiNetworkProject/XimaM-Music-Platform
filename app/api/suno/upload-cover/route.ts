// app/api/suno/upload-cover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { aiGenerationService } from '@/lib/aiGenerationService';
import { getUserEntitlements } from '@/lib/entitlements';
import { deductCredits } from '@/lib/credits';

// Coût en crédits pour un cover/remix
const CREDITS_PER_COVER = 10;

type Body = {
  uploadUrl: string;
  customMode: boolean;
  instrumental: boolean;
  model?: string;
  prompt?: string;
  style?: string;
  title?: string;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body: Body = await req.json();
    const {
      uploadUrl,
      customMode,
      instrumental,
      model,
      prompt,
      style,
      title,
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    } = body;

    console.log("🎵 Demande de cover/remix:", {
      userId: session.user.id,
      uploadUrl,
      customMode,
      instrumental,
      model: model || 'V4_5'
    });

    // Validation des paramètres requis
    if (!uploadUrl) {
      return NextResponse.json({ error: "L'URL du fichier audio est requise" }, { status: 400 });
    }

    // Validation selon le mode
    const isCustomMode = customMode === true;

    if (isCustomMode) {
      if (instrumental) {
        // Mode custom + instrumental : style, title, uploadUrl requis
        if (!style || !title) {
          return NextResponse.json({ 
            error: "En mode custom instrumental, 'style' et 'title' sont requis" 
          }, { status: 400 });
        }
      } else {
        // Mode custom + avec paroles : style, prompt, title, uploadUrl requis
        if (!style || !prompt || !title) {
          return NextResponse.json({ 
            error: "En mode custom avec paroles, 'style', 'prompt' et 'title' sont requis" 
          }, { status: 400 });
        }
      }
    } else {
      // Mode non-custom : seulement prompt et uploadUrl requis
      if (!prompt) {
        return NextResponse.json({ 
          error: "En mode non-custom, 'prompt' est requis" 
        }, { status: 400 });
      }
    }

    // Récupérer les entitlements de l'utilisateur
    const entitlements = await getUserEntitlements(session.user.id);

    // Vérifier si l'utilisateur a accès à l'IA
    if (!entitlements.ai.enabled) {
      return NextResponse.json({ 
        error: "Votre plan ne permet pas d'utiliser l'IA" 
      }, { status: 403 });
    }

    // Vérifier le modèle et appliquer le fallback
    const allowedModels = entitlements.ai.availableModels || ["V4_5"];
    const requestedModel = model || "V4_5";
    const effectiveModel = allowedModels.includes(requestedModel) 
      ? requestedModel 
      : (allowedModels.includes("V4_5") ? "V4_5" : allowedModels[0]);
    
    const modelAdjusted = requestedModel !== effectiveModel;

    // Vérifier les crédits disponibles
    const { data: balanceData, error: balanceError } = await aiGenerationService.getCreditBalance(session.user.id);
    
    if (balanceError || !balanceData || balanceData.balance < CREDITS_PER_COVER) {
      return NextResponse.json({ 
        error: "Crédits insuffisants pour générer un cover/remix",
        required: CREDITS_PER_COVER,
        available: balanceData?.balance || 0
      }, { status: 429 });
    }

    // Construire le payload pour Suno
    const payload: any = {
      uploadUrl,
      customMode,
      instrumental,
      model: effectiveModel,
      callBackUrl: `${process.env.NEXTAUTH_URL}/api/suno/callback`
    };

    // Ajouter les paramètres optionnels
    if (isCustomMode) {
      if (prompt) payload.prompt = prompt;
      if (style) payload.style = style;
      if (title) payload.title = title;
      if (negativeTags) payload.negativeTags = negativeTags;
      if (vocalGender) payload.vocalGender = vocalGender;
      if (styleWeight !== undefined) payload.styleWeight = styleWeight;
      if (weirdnessConstraint !== undefined) payload.weirdnessConstraint = weirdnessConstraint;
      if (audioWeight !== undefined) payload.audioWeight = audioWeight;
    } else {
      if (prompt) payload.prompt = prompt;
    }

    console.log("📤 Payload Suno API:", payload);

    // Appeler l'API Suno
    const response = await fetch("https://api.sunoapi.org/api/v1/generate/upload-cover", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("📥 Réponse Suno API:", result);

    if (!response.ok || result.code !== 200) {
      console.error("❌ Erreur Suno API:", result);
      return NextResponse.json({ 
        error: result.msg || "Erreur lors de la génération du cover/remix" 
      }, { status: response.status });
    }

    const taskId = result.data?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID manquant" }, { status: 500 });
    }

    // Créer une entrée dans ai_generations
    const generation = await aiGenerationService.createGeneration(
      session.user.id,
      taskId,
      title || 'Cover/Remix généré',
      style || 'Cover',
      prompt || '',
      effectiveModel,
      {
        title: title || '',
        style: style || '',
        uploadUrl,
        customMode,
        instrumental,
        type: 'cover'
      }
    );

    console.log("✅ Génération cover créée:", generation.id);

    // Déduire les crédits
    try {
      await deductCredits(session.user.id, CREDITS_PER_COVER, `Cover/Remix - ${taskId}`);
      console.log(`✅ ${CREDITS_PER_COVER} crédits déduits`);
    } catch (error) {
      console.error("❌ Erreur déduction crédits:", error);
      // Ne pas bloquer la génération si la déduction échoue
    }

    return NextResponse.json({
      taskId,
      generationId: generation.id,
      message: modelAdjusted 
        ? `Cover/Remix en cours avec ${effectiveModel} (${requestedModel} non disponible dans votre plan)`
        : "Cover/Remix en cours de génération",
      creditsUsed: CREDITS_PER_COVER
    });

  } catch (error: any) {
    console.error("❌ Erreur génération cover:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur serveur" 
    }, { status: 500 });
  }
}

