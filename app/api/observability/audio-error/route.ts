import { NextRequest, NextResponse } from 'next/server';
import { sanitizeAudioErrorEvent } from '@/lib/audio/audioErrorTelemetrySchema';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export async function POST(request: NextRequest) {
  const originError = rejectUntrustedMutationOrigin(request);
  if (originError) return originError;
  const limited = enforceRequestRateLimit(request, 'audio-error', 30, 5 * 60_000);
  if (limited) return limited;
  const parsed = await readLimitedJson<Record<string, unknown>>(request, 2 * 1024);
  if (!parsed.ok) return parsed.response;
  const event = sanitizeAudioErrorEvent(parsed.value);
  if (!event) return NextResponse.json({ error: 'Événement audio invalide' }, { status: 400 });
  console.warn('[audio-error]', event);
  return NextResponse.json({ accepted: true }, { status: 202 });
}

export const dynamic = 'force-dynamic';
