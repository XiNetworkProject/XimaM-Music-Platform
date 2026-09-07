import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { buildSunoCallbackUrl } from '@/lib/sunoWebhook';
import { enforceRequestRateLimit, isSafeOpaqueIdentifier, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE = process.env.SUNO_API_BASE || 'https://api.sunoapi.org';

type LyricsVariant = {
  text: string;
  title?: string;
  status?: string;
  errorMessage?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseLyricsVariants(payload: any): LyricsVariant[] {
  const buckets: any[] = [
    payload?.data?.response?.data,
    payload?.response?.data,
    payload?.data?.data,
    payload?.data?.lyrics,
    payload?.data?.items,
    payload?.data,
    payload?.lyrics,
    payload?.items,
  ].filter(Boolean);

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    const variants = bucket
      .map((item) => ({
        text: typeof item?.text === 'string' ? item.text.trim() : '',
        title: typeof item?.title === 'string' ? item.title : undefined,
        status: typeof item?.status === 'string' ? item.status : undefined,
        errorMessage: typeof item?.errorMessage === 'string' ? item.errorMessage : undefined,
      }))
      .filter((x) => x.text.length > 0);
    if (variants.length > 0) return variants;
  }

  return [];
}

async function fetchLyricsDetails(taskId: string, apiKey: string): Promise<LyricsVariant[]> {
  const candidates = [
    `${BASE}/api/v1/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`,
    `${BASE}/api/v1/lyrics/record-info/${encodeURIComponent(taskId)}`,
    `${BASE}/api/v1/lyrics/${encodeURIComponent(taskId)}`,
  ];

  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) continue;
      const parsed = parseLyricsVariants(json);
      if (parsed.length > 0) return parsed;
    } catch {
      // Try next endpoint candidate.
    }
  }

  return [];
}

async function getLyricsTask(taskId: string, apiKey: string): Promise<{ variants: LyricsVariant[]; rawStatus: string }> {
  const endpoint = `${BASE}/api/v1/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.msg || `Lyrics details error (${res.status})`);
  }
  const variants = parseLyricsVariants(json);
  const rawStatus = String(json?.data?.status || json?.status || '').toUpperCase();
  return { variants, rawStatus };
}

export async function POST(req: NextRequest) {
  const originError = rejectUntrustedMutationOrigin(req);
  if (originError) return originError;
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }
  const limited = enforceRequestRateLimit(req, 'suno-lyrics-create-user', 5, 15 * 60_000, session.user.id);
  if (limited) return limited;
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service IA indisponible' }, { status: 503 });

  try {
    const parsed = await readLimitedJson<{
      prompt?: string;
      callBackUrl?: string;
    }>(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;

    const promptRaw = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!promptRaw) {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });
    }

    // Docs Suno: max 200 chars on lyrics prompt.
    const prompt = promptRaw.slice(0, 200);
    const callBackUrl = buildSunoCallbackUrl(req, '/api/suno/callback');

    const createRes = await fetch(`${BASE}/api/v1/lyrics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, callBackUrl }),
    });

    const createJson = await createRes.json().catch(() => ({}));
    if (!createRes.ok || Number(createJson?.code) !== 200) {
      const providerCode = Number(createJson?.code);
      const status = Number.isFinite(providerCode) && providerCode >= 400 && providerCode <= 599 ? providerCode : createRes.status;
      return NextResponse.json(
        { error: 'Service de paroles temporairement indisponible' },
        { status: Number.isFinite(status) ? status : 502 },
      );
    }

    const taskId = createJson?.data?.taskId || createJson?.taskId;
    if (!taskId) {
      return NextResponse.json({ error: 'Reponse du service de paroles invalide' }, { status: 502 });
    }

    // Polling court pour retourner des lyrics directement au frontend.
    const startedAt = Date.now();
    const timeoutMs = 20000;
    let variants: LyricsVariant[] = [];
    let finalStatus = 'PENDING';
    while (Date.now() - startedAt < timeoutMs && variants.length === 0) {
      await sleep(1400);
      try {
        const detail = await getLyricsTask(taskId, apiKey);
        variants = detail.variants;
        finalStatus = detail.rawStatus || finalStatus;
      } catch {
        variants = await fetchLyricsDetails(taskId, apiKey);
      }
    }

    return NextResponse.json({
      taskId,
      status: variants.length > 0 ? 'complete' : 'pending',
      providerStatus: finalStatus,
      variants,
      best: variants[0]?.text || null,
    });
  } catch {
    return NextResponse.json({ error: 'Service de paroles temporairement indisponible' }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }
  const limited = enforceRequestRateLimit(req, 'suno-lyrics-status-user', 30, 10 * 60_000, session.user.id);
  if (limited) return limited;
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service IA indisponible' }, { status: 503 });

  const taskId = req.nextUrl.searchParams.get('taskId')?.trim();
  if (!isSafeOpaqueIdentifier(taskId)) {
    return NextResponse.json({ error: 'taskId invalide' }, { status: 400 });
  }

  try {
    const { variants, rawStatus } = await getLyricsTask(taskId, apiKey);
    return NextResponse.json({
      taskId,
      status: variants.length > 0 ? 'complete' : 'pending',
      providerStatus: rawStatus,
      variants,
      best: variants[0]?.text || null,
    });
  } catch {
    return NextResponse.json({ error: 'Service de paroles temporairement indisponible' }, { status: 502 });
  }
}
