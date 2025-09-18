import { NextRequest, NextResponse } from "next/server";
import { generateCustomMusic, createProductionPrompt } from "@/lib/suno";

const BASE = "https://api.sunoapi.org";

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
    return NextResponse.json({ error: "SUNO_API_KEY manquant" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as Body;

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

    const response = await fetch(`${BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      return NextResponse.json(
        { error: json?.msg || "Erreur Suno", raw: json }, 
        { status: response.status }
      );
    }

    // Retourner le taskId pour le suivi
    return NextResponse.json(json?.data ?? json);
  } catch (error) {
    console.error("Erreur génération personnalisée:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" }, 
      { status: 500 }
    );
  }
}
