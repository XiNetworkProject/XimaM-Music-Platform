import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { getVoiceService, callCredentials } from '@/lib/voice/server';
import { CallError } from '@/lib/voice/callRegistry';
import { voiceAccessPolicy, voiceUserAllowed } from '@/lib/voice/access';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
function failure(error: unknown) {
  if (error instanceof CallError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  // Provider errors may contain URLs, headers or tokens: don't serialize or log them.
  console.error('[voice] service unavailable');
  return NextResponse.json({ error: 'Le service d’appel est momentanément indisponible.' }, { status: 503, headers });
}
export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers });
  const limited = enforceRequestRateLimit(request, 'voice-read', 90, 60_000, session.user.id);
  if (limited) return limited;
  try {
    if (!voiceUserAllowed(voiceAccessPolicy(process.env), session.user.id)) return NextResponse.json({ enabled: false, calls: [] }, { headers });
    const service = await getVoiceService();
    if (!service) return NextResponse.json({ enabled: false, calls: [] }, { headers });
    return NextResponse.json({ enabled: true, calls: service.registry.list(session.user.id) }, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  const origin = rejectUntrustedMutationOrigin(request); if (origin) return origin;
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers });
  if (!voiceUserAllowed(voiceAccessPolicy(process.env), session.user.id)) return NextResponse.json({ error: 'Les appels ne sont pas disponibles pour ce compte.' }, { status: 403, headers });
  const parsed = await readLimitedJson<Record<string, unknown>>(request, 2048);
  if (!parsed.ok) return parsed.response;
  const { action, callId, conversationId, device } = parsed.value;
  if (!['start', 'join', 'leave', 'decline', 'heartbeat'].includes(String(action)) || typeof device !== 'string' || !/^[a-f0-9-]{36}$/i.test(device)) return NextResponse.json({ error: 'Action invalide' }, { status: 400, headers });
  const limited = enforceRequestRateLimit(request, action === 'start' ? 'voice-start' : 'voice-action', action === 'start' ? 6 : 90, 60_000, session.user.id);
  if (limited) return limited;
  try {
    const service = await getVoiceService();
    if (!service) throw new CallError('Les appels ne sont pas encore activés.', 503);
    let call;
    if (action === 'start') {
      if (typeof conversationId !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(conversationId)) throw new CallError('Discussion invalide.', 400);
      call = await service.registry.start(session.user.id, conversationId, device);
    } else {
      if (typeof callId !== 'string' || !/^[a-f0-9-]{36}$/i.test(callId)) throw new CallError('Appel invalide.', 400);
      call = await service.registry.action(session.user.id, callId, device, action as 'join' | 'leave' | 'decline' | 'heartbeat');
    }
    const credentials = action === 'start' || action === 'join' ? await callCredentials(service, call, session.user.id) : {};
    return NextResponse.json({ call: service.registry.view(call, session.user.id), ...credentials }, { headers });
  } catch (error) { return failure(error); }
}
