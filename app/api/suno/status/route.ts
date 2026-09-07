import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { dbAdmin } from '@/lib/database';
import { normalizeSunoItem } from '@/lib/suno-normalize';
import { enforceRequestRateLimit, isSafeOpaqueIdentifier } from '@/lib/security/requestSecurity';

const BASE = 'https://api.sunoapi.org';

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

  const userLimit = enforceRequestRateLimit(req, 'suno-status-user', 30, 60_000, session.user.id);
  if (userLimit) return userLimit;
  const taskId = req.nextUrl.searchParams.get('taskId')?.trim() || '';
  if (!isSafeOpaqueIdentifier(taskId)) {
    return NextResponse.json({ error: 'Task ID invalide' }, { status: 400 });
  }
  const taskLimit = enforceRequestRateLimit(req, 'suno-status-task', 12, 60_000, taskId);
  if (taskLimit) return taskLimit;

  const { data: generation, error: ownershipError } = await dbAdmin
    .from('ai_generations')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (ownershipError) return NextResponse.json({ error: 'Verification impossible' }, { status: 500 });
  if (!generation) return NextResponse.json({ error: 'Generation introuvable' }, { status: 404 });
  if (!process.env.SUNO_API_KEY) return NextResponse.json({ error: 'Service IA indisponible' }, { status: 503 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.code !== 200) {
      return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 502 });
    }

    const statusRaw = String(json?.data?.status || '');
    const candidates = [
      ...(Array.isArray(json?.data?.response?.sunoData) ? json.data.response.sunoData : []),
      ...(Array.isArray(json?.data?.sunoData) ? json.data.sunoData : []),
      ...(Array.isArray(json?.data?.data) ? json.data.data : []),
      ...(Array.isArray(json?.data?.tracks) ? json.data.tracks : []),
    ];
    const deduplicated = new Map<string, any>();
    candidates.forEach((item: any, index: number) => {
      const key = String(item?.id || item?.audioId || item?.trackId || `__idx_${index}`);
      deduplicated.set(key, { ...(deduplicated.get(key) || {}), ...item });
    });
    const tracks = Array.from(deduplicated.values()).map((item: any) => {
      const normalized = normalizeSunoItem(item);
      return {
        ...normalized,
        raw: {
          id: item?.id ?? item?.audioId ?? item?.trackId,
          title: item?.title,
          tags: item?.tags,
          prompt: item?.prompt,
          audio_url: item?.audio_url ?? item?.audioUrl,
          stream_audio_url: item?.stream_audio_url ?? item?.streamAudioUrl,
          image_url: item?.image_url ?? item?.imageUrl,
          duration: item?.duration,
        },
      };
    });
    const statusUpper = statusRaw.toUpperCase();
    const status = ['PENDING', 'TEXT_SUCCESS', 'TEXT'].includes(statusUpper)
      ? 'pending'
      : ['FIRST_SUCCESS', 'FIRST'].includes(statusUpper)
        ? 'FIRST_SUCCESS'
        : ['SUCCESS', 'COMPLETE'].includes(statusUpper)
          ? 'SUCCESS'
          : ['ERROR', 'CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(statusUpper)
            ? 'ERROR'
            : statusRaw;
    return NextResponse.json({ taskId, status, tracks });
  } catch {
    console.error('[suno/status] fournisseur indisponible');
    return NextResponse.json({ error: 'Service IA temporairement indisponible' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export const dynamic = 'force-dynamic';
