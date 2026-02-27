// app/api/suno/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from '@/lib/getApiSession';
import { normalizeSunoItem } from "@/lib/suno-normalize";

const BASE = "https://api.sunoapi.org";

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
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

    if (!res.ok || json?.code !== 200) {
      const providerCode = Number(json?.code);
      const mappedStatus = Number.isFinite(providerCode) && providerCode > 0 ? providerCode : res.status;
      return NextResponse.json({ error: json?.msg || "Suno error", raw: json }, { status: mappedStatus });
    }

    const statusRaw: string = json?.data?.status;
    const rawCandidates = [
      ...(Array.isArray(json?.data?.response?.sunoData) ? json.data.response.sunoData : []),
      ...(Array.isArray(json?.data?.sunoData) ? json.data.sunoData : []),
      ...(Array.isArray(json?.data?.data) ? json.data.data : []),
      ...(Array.isArray(json?.data?.tracks) ? json.data.tracks : []),
    ];
    const dedup = new Map<string, any>();
    rawCandidates.forEach((x: any, idx: number) => {
      const explicitKey = String(x?.id || x?.audioId || x?.trackId || '').trim();
      const key = explicitKey || `__idx_${idx}`;
      dedup.set(key, { ...(dedup.get(key) || {}), ...x });
    });
    const tracks = Array.from(dedup.values()).map((x: any) => normalizeSunoItem(x));

    console.log('🔍 Données brutes Suno:', json.data);
    console.log('🔍 Response Suno:', json.data?.response);
    console.log('🔍 SunoData:', json.data?.response?.sunoData);
    console.log('🎵 Tracks normalisées:', tracks);

    // Mapper les statuts Suno (nouveau + legacy) vers nos statuts UI internes
    const statusUpper = String(statusRaw || '').toUpperCase();
    let normalizedStatus = statusRaw;
    if (statusUpper === 'PENDING' || statusUpper === 'TEXT_SUCCESS' || statusUpper === 'TEXT') {
      normalizedStatus = 'pending';
    } else if (statusUpper === 'FIRST_SUCCESS' || statusUpper === 'FIRST') {
      normalizedStatus = 'FIRST_SUCCESS';
    } else if (statusUpper === 'SUCCESS' || statusUpper === 'COMPLETE') {
      normalizedStatus = 'SUCCESS';
    } else if (
      statusUpper === 'ERROR' ||
      statusUpper === 'CREATE_TASK_FAILED' ||
      statusUpper === 'GENERATE_AUDIO_FAILED' ||
      statusUpper === 'CALLBACK_EXCEPTION' ||
      statusUpper === 'SENSITIVE_WORD_ERROR'
    ) {
      normalizedStatus = 'ERROR';
    }

    console.log(`🔄 Statut Suno: "${statusRaw}" → Normalisé: "${normalizedStatus}"`);

    return NextResponse.json({ taskId, status: normalizedStatus, tracks });

  } catch (e: any) {
    console.error('❌ Erreur polling Suno:', e.message);
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
