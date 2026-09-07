import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { enforceRequestRateLimit, isSafeOpaqueIdentifier, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE = process.env.SUNO_API_BASE || 'https://api.sunoapi.org';

export async function POST(req: NextRequest) {
  const originError = rejectUntrustedMutationOrigin(req);
  if (originError) return originError;
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }
  const limited = enforceRequestRateLimit(req, 'suno-timestamped-lyrics-user', 10, 10 * 60_000, session.user.id);
  if (limited) return limited;
  const apiKey = process.env.SUNO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Service IA indisponible' }, { status: 503 });

  try {
    const parsed = await readLimitedJson<{ taskId?: string; audioId?: string }>(req, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const body = parsed.value;
    const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
    const audioId = typeof body.audioId === 'string' ? body.audioId.trim() : '';

    if (!isSafeOpaqueIdentifier(taskId) || !isSafeOpaqueIdentifier(audioId, 1)) {
      return NextResponse.json({ error: 'taskId et audioId requis' }, { status: 400 });
    }

    const { data: generation } = await dbAdmin
      .from('ai_generations')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (!generation) return NextResponse.json({ error: 'Generation introuvable' }, { status: 404 });
    const { data: track } = await dbAdmin
      .from('ai_tracks')
      .select('id')
      .eq('generation_id', generation.id)
      .eq('suno_id', audioId)
      .maybeSingle();
    if (!track) return NextResponse.json({ error: 'Piste introuvable' }, { status: 404 });

    const res = await fetch(`${BASE}/api/v1/generate/get-timestamped-lyrics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, audioId }),
      cache: 'no-store',
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || Number(json?.code) !== 200) {
      const providerCode = Number(json?.code);
      const providerStatus = Number.isFinite(providerCode) && providerCode >= 400 && providerCode <= 599 ? providerCode : res.status;
      const status = providerStatus >= 500 ? 502 : providerStatus;
      return NextResponse.json({ error: 'Service de paroles temporairement indisponible' }, { status: Number.isFinite(status) ? status : 502 });
    }

    return NextResponse.json({
      alignedWords: Array.isArray(json?.data?.alignedWords) ? json.data.alignedWords : [],
      waveformData: Array.isArray(json?.data?.waveformData) ? json.data.waveformData : [],
      hootCer: typeof json?.data?.hootCer === 'number' ? json.data.hootCer : null,
      isStreamed: Boolean(json?.data?.isStreamed),
    });
  } catch {
    return NextResponse.json({ error: 'Service de paroles temporairement indisponible' }, { status: 502 });
  }
}
