import { NextRequest } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { parseStudioInput, StudioInputError } from '@/lib/studio/tools';
import { createStudioJob, listStudioJobs, studioToolsReady, StudioHttpError } from '@/lib/studio/jobs';
import { buildSunoCallbackUrl } from '@/lib/sunoWebhook';
import { parseStudioPriceQuote } from '@/lib/studio/pricing';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  if (!session?.user?.id) return Response.json({ error: 'Connexion requise.' }, { status: 401, headers });
  const limited = enforceRequestRateLimit(req, 'studio:jobs:list', 30, 60_000, session.user.id);
  if (limited) return limited;
  try { return Response.json({ jobs: await studioToolsReady() ? await listStudioJobs(session.user.id) : [] }, { headers }); }
  catch { return Response.json({ error: 'Atelier temporairement indisponible.' }, { status: 503, headers }); }
}
export async function POST(req: NextRequest) {
  const origin = rejectUntrustedMutationOrigin(req); if (origin) return origin;
  const session = await getApiSession(req);
  if (!session?.user?.id) return Response.json({ error: 'Connexion requise.' }, { status: 401, headers });
  const limited = enforceRequestRateLimit(req, 'studio:jobs:create', 10, 600_000, session.user.id); if (limited) return limited;
  const parsed = await readLimitedJson(req, 32 * 1024); if (!parsed.ok) return parsed.response;
  try {
    const input = parseStudioInput(parsed.value);
    let expectedCredits: number;
    try { expectedCredits = parseStudioPriceQuote((parsed.value as { expectedCredits?: unknown }).expectedCredits); }
    catch (error) { throw new StudioHttpError(409, (error as Error).message); }
    const job = await createStudioJob(session.user.id, req.headers.get('Idempotency-Key') || '', input, id => buildSunoCallbackUrl(req, `/api/studio/jobs/${id}/callback`), expectedCredits);
    return Response.json({ job }, { status: 202, headers });
  } catch (error) {
    if (error instanceof StudioInputError || error instanceof StudioHttpError) return Response.json({ error: error.message }, { status: error instanceof StudioHttpError ? error.status : 400, headers });
    console.error('[studio/jobs] request failed');
    return Response.json({ error: 'Demande non confirmée. Consultez vos tâches avant de réessayer.' }, { status: 503, headers });
  }
}
