import type { RateLimitResult } from './rateLimit.ts';
import { readLimitedJson, rejectUntrustedMutationOrigin, rateLimitResponse } from './requestSecurity.ts';

type CopyrightDependencies = {
  getUserId(request: Request): Promise<string | null>;
  ownsAudio(audioUrl: string, userId: string): boolean;
  consumeRateLimit(request: Request, userId: string): RateLimitResult;
  recognize(audioUrl: string, signal: AbortSignal): Promise<{ ok: boolean; payload?: any }>;
  reportFailure?: (event: 'upstream_failed') => void;
  timeoutMs?: number;
};

function filteredString(value: unknown, max = 300) {
  return typeof value === 'string' && value.length <= max ? value : null;
}

export async function handleAuddCopyrightCheck(request: Request, dependencies: CopyrightDependencies) {
  const originError = rejectUntrustedMutationOrigin(request);
  if (originError) return originError;

  const userId = await dependencies.getUserId(request);
  if (!userId) return Response.json({ error: 'Non authentifie' }, { status: 401 });

  const limited = dependencies.consumeRateLimit(request, userId);
  if (!limited.allowed) return rateLimitResponse(limited);

  const parsed = await readLimitedJson<Record<string, unknown>>(request, 8 * 1024);
  if (!parsed.ok) return parsed.response;
  const audioUrl = typeof parsed.value.audioUrl === 'string' ? parsed.value.audioUrl.trim() : '';
  if (!audioUrl || audioUrl.length > 2_048 || !dependencies.ownsAudio(audioUrl, userId)) {
    return Response.json({ error: 'Reference audio invalide' }, { status: 422 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 8_000);
  try {
    const response = await dependencies.recognize(audioUrl, controller.signal);
    if (!response.ok) return Response.json({ matched: false, reason: 'SERVICE_UNAVAILABLE' });
    const result = response.payload?.result;
    if (!result || typeof result !== 'object') return Response.json({ matched: false });
    const numericScore = Number(result.score ?? result.accuracy);
    return Response.json({
      matched: true,
      details: {
        title: filteredString(result.title),
        artist: filteredString(result.artist),
        album: filteredString(result.album),
        label: filteredString(result.label),
        release_date: filteredString(result.release_date, 40),
        score: Number.isFinite(numericScore) ? numericScore : null,
      },
    });
  } catch {
    dependencies.reportFailure?.('upstream_failed');
    return Response.json({ matched: false, reason: 'SERVICE_UNAVAILABLE' });
  } finally {
    clearTimeout(timeout);
  }
}
