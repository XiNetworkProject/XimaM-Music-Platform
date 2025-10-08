// app/api/suno/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { normalizeSunoItem } from "@/lib/suno-normalize";

const BASE = "https://api.sunoapi.org";

export async function GET(req: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
    }

    console.log(`🔍 Polling Suno pour taskId: ${taskId}`);

    // Timeout de 8 secondes pour éviter les fonctions longues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY!}` },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: json?.msg || "Suno error", raw: json }, { status: res.status });
    }

    const status: string = json?.data?.status;
    const rawItems = json?.data?.response?.sunoData ?? [];
    const tracks = rawItems.map((x: any) => normalizeSunoItem(x));

    console.log('🔍 Données brutes Suno:', json.data);
    console.log('🔍 Response Suno:', json.data?.response);
    console.log('🔍 SunoData:', json.data?.response?.sunoData);
    console.log('🎵 Tracks normalisées:', tracks);

    // Mapper les statuts Suno vers nos statuts internes
    // Suno renvoie: "pending", "text", "first", "complete", "error"
    let normalizedStatus = status;
    if (status === 'text') {
      normalizedStatus = 'pending'; // Génération texte en cours
    } else if (status === 'first') {
      normalizedStatus = 'FIRST_SUCCESS'; // Première piste prête
    } else if (status === 'complete') {
      normalizedStatus = 'SUCCESS'; // Toutes les pistes prêtes
    } else if (status === 'error') {
      normalizedStatus = 'ERROR';
    }

    console.log(`🔄 Statut Suno: "${status}" → Normalisé: "${normalizedStatus}"`);

    return NextResponse.json({ taskId, status: normalizedStatus, tracks });

  } catch (e: any) {
    console.error('❌ Erreur polling Suno:', e.message);
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
