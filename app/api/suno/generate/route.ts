import { NextRequest, NextResponse } from "next/server";
import { generateCustomMusic, createProductionPrompt } from "@/lib/suno";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import { getEntitlements } from '@/lib/entitlements';

const BASE = "https://api.sunoapi.org";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  title: string;
  style: string;
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
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) {
    console.error("❌ SUNO_API_KEY manquant dans les variables d'environnement");
    return NextResponse.json({ error: "SUNO_API_KEY manquant" }, { status: 500 });
  }

  // Vérification de l'authentification
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Body;
    console.log("🎵 Requête génération Suno:", { title: body.title, style: body.style, instrumental: body.instrumental });

    // Vérification des quotas IA
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', session.user.id).maybeSingle();
    const plan = (profile?.plan || 'free') as any;
    const entitlements = getEntitlements(plan);

    if (!entitlements.features.aiGeneration) {
      return NextResponse.json({ error: "Génération IA non disponible sur votre plan" }, { status: 403 });
    }

    // Calculer les générations utilisées ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usedThisMonth } = await supabaseAdmin
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());

    const remaining = entitlements.ai.maxGenerationsPerMonth - (usedThisMonth || 0);
    
    if (remaining <= 0) {
      return NextResponse.json({ 
        error: `Quota IA atteint: ${entitlements.ai.maxGenerationsPerMonth} générations/mois`,
        quota: {
          limit: entitlements.ai.maxGenerationsPerMonth,
          used: usedThisMonth || 0,
          remaining: 0
        }
      }, { status: 403 });
    }

    console.log(`📊 Quota IA: ${remaining}/${entitlements.ai.maxGenerationsPerMonth} restantes`);

    // Vérifier que le modèle demandé est autorisé par le plan, sinon fallback contrôlé
    const allowedModels = entitlements.ai.availableModels || ["V4_5"];
    const requestedModel = body.model || "V4_5";
    const effectiveModel = allowedModels.includes(requestedModel) ? requestedModel : (allowedModels.includes("V4_5") ? "V4_5" : allowedModels[0]);
    const modelAdjusted = requestedModel !== effectiveModel;

    // Validation minimale selon les règles customMode
    if (!body.title) {
      return NextResponse.json({ error: "title requis" }, { status: 400 });
    }
    if (!body.style) {
      return NextResponse.json({ error: "style requis" }, { status: 400 });
    }
    if (body.instrumental === false && !body.prompt) {
      return NextResponse.json({ error: "prompt requis quand instrumental=false" }, { status: 400 });
    }

    // Créer le prompt avec les hints de production si fournis
    let finalPrompt = body.prompt;
    if (!body.instrumental && (body.bpm || body.key || body.durationHint)) {
      finalPrompt = createProductionPrompt(body.prompt || "", {
        bpm: body.bpm,
        key: body.key,
        durationHint: body.durationHint,
      });
    }

    const payload = {
      customMode: true,
      instrumental: body.instrumental,
      title: body.title,
      style: body.style,
      prompt: body.instrumental ? undefined : finalPrompt,
      model: effectiveModel,
      negativeTags: body.negativeTags,
      vocalGender: body.vocalGender,
      styleWeight: body.styleWeight ?? 0.65,
      weirdnessConstraint: body.weirdnessConstraint ?? 0.5,
      audioWeight: body.audioWeight ?? 0.65,
      callBackUrl: body.callBackUrl || `${process.env.NEXTAUTH_URL}/api/suno/callback`,
    };

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
    
    if (!response.ok) {
      console.error("❌ Erreur API Suno:", json);
      return NextResponse.json(
        { error: json?.msg || "Erreur Suno", raw: json }, 
        { status: response.status }
      );
    }

    // Enregistrer la génération en base (status: pending)
    const taskId = json?.data?.taskId || json?.taskId;
    if (taskId) {
      await supabaseAdmin.from('ai_generations').insert({
        id: `ai_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: session.user.id,
        task_id: taskId,
        status: 'pending',
        title: body.title,
        style: body.style,
        prompt: finalPrompt,
        instrumental: body.instrumental,
        model: effectiveModel,
        created_at: new Date().toISOString()
      });
    }

    console.log("✅ Génération Suno réussie:", json);
    // Retourner un schéma compatible frontend: taskId à la racine
    const rootTaskId = json?.data?.taskId || json?.taskId || taskId;
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
        limit: entitlements.ai.maxGenerationsPerMonth,
        used: (usedThisMonth || 0) + 1,
        remaining: remaining - 1
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
