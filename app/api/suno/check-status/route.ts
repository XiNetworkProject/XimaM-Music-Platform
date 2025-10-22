// app/api/suno/check-status/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: "Task ID manquant" }, { status: 400 });
    }

    // Appeler l'API Suno pour vérifier le statut
    const response = await fetch(`https://api.sunoapi.org/api/v1/generate/music/${taskId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.SUNO_API_KEY}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Erreur API Suno: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("❌ Erreur check status:", error);
    return NextResponse.json({ 
      error: error.message || "Erreur serveur" 
    }, { status: 500 });
  }
}

