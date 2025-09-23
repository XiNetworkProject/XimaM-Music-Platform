import { NextRequest, NextResponse } from "next/server";
import { generateCustomMusic, createProductionPrompt } from "@/lib/suno";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

const BASE = "https://api.sunoapi.org";

// Mapping des quotas par plan
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  starter: 3,
  pro: 10,
  enterprise: 100,
};

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

  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await req.json()) as Body;
    console.log("🎵 Requête génération Suno:", { title: body.title, style: body.style, instrumental: body.instrumental });

    // Vérifier le quota utilisateur
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan').eq('id', userId).maybeSingle();
    const planType = (profile?.plan || 'free').toLowerCase();
    const monthly_limit = PLAN_LIMITS[planType] ?? PLAN_LIMITS.free;

    // Calculer utilisé ce mois
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

    if (remaining <= 0) {
      console.log("❌ Quota IA épuisé:", { planType, monthly_limit, used_this_month, remaining });
      return NextResponse.json({ 
        error: `Quota IA épuisé. Vous avez utilisé ${used_this_month}/${monthly_limit} générations ce mois.`,
        quota: { planType, monthly_limit, used_this_month, remaining }
      }, { status: 403 });
    }

    console.log("✅ Quota IA disponible:", { planType, monthly_limit, used_this_month, remaining });

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
      model: body.model ?? "V4_5",
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

    // Créer l'enregistrement de génération en base pour décrémenter le quota
    const taskId = json?.data?.taskId || json?.taskId;
    if (taskId) {
      try {
        await supabaseAdmin
          .from('ai_generations')
          .insert({
            user_id: userId,
            task_id: taskId,
            prompt: finalPrompt || '',
            model: body.model ?? "V4_5",
            status: 'pending',
            metadata: {
              title: body.title,
              style: body.style,
              instrumental: body.instrumental,
              total_duration: 120
            }
          });
        
        console.log("✅ Génération créée en base avec taskId:", taskId);
      } catch (error) {
        console.error("❌ Erreur création génération en base:", error);
        // Ne pas faire échouer la requête pour ça
      }
    }

    console.log("✅ Génération Suno réussie:", json);
    // Retourner le taskId pour le suivi
    return NextResponse.json(json?.data ?? json);
  } catch (error) {
    console.error("❌ Erreur génération personnalisée:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" }, 
      { status: 500 }
    );
  }
}
