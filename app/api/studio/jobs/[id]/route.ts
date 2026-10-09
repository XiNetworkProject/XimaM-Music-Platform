import { NextRequest } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { refreshStudioJob, StudioHttpError } from '@/lib/studio/jobs';
import { enforceRequestRateLimit } from '@/lib/security/requestSecurity';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getApiSession(req);
  if (!session?.user?.id) return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!/^[\da-f-]{36}$/i.test(params.id)) return Response.json({ error: 'Identifiant invalide.' }, { status: 400 });
  const limited = enforceRequestRateLimit(req, 'studio:jobs:poll', 60, 60_000, session.user.id); if (limited) return limited;
  try { return Response.json({ job: await refreshStudioJob(params.id, session.user.id) }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return Response.json({ error: error instanceof StudioHttpError ? error.message : 'Statut momentanément indisponible.' }, { status: error instanceof StudioHttpError ? error.status : 503 }); }
}
