import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { enforceRequestRateLimit, readLimitedJson, rejectUntrustedMutationOrigin } from '@/lib/security/requestSecurity';
import { publishRelease } from '@/lib/publication/service';
import { PublicationError } from '@/lib/publication/model';
import { queryDatabase } from '@/lib/postgres';
import { notifyNewTrackFromFollowed } from '@/lib/notifications';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const key = request.nextUrl.searchParams.get('key') || '';
  if (!/^[0-9a-f-]{36}$/i.test(key)) return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 422 });
  try {
    const receipt = await queryDatabase('SELECT result FROM publication_requests WHERE user_id=$1 AND request_key=$2', [session.user.id, key]);
    return NextResponse.json(receipt.rows[0] || { error: 'Aucune publication confirmée.' }, { status: receipt.rows.length ? 200 : 404, headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Vérification indisponible. Réessaie plus tard.' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  const origin = rejectUntrustedMutationOrigin(request); if (origin) return origin;
  const session = await getApiSession(request);
  if (!session?.user?.id) return NextResponse.json({ error: 'Reconnecte-toi pour publier. Tes fichiers restent dans cet écran.' }, { status: 401 });
  const limited = enforceRequestRateLimit(request, 'publish-release', 20, 60 * 60_000, session.user.id); if (limited) return limited;
  const body = await readLimitedJson(request, 1200 * 1024); if (!body.ok) return body.response;
  try {
    const published = await publishRelease(session.user.id, body.value);
    let notificationWarning = false;
    if (!published.replayed && published.result.visibility === 'public') {
      try {
        const followers = await queryDatabase('SELECT follower_id FROM user_follows WHERE following_id=$1 LIMIT 500', [session.user.id]);
        const outcomes = await Promise.allSettled(followers.rows.map(row => notifyNewTrackFromFollowed(row.follower_id, session.user.name || 'Un artiste', String(body.value.title), published.result.trackIds[0], session.user.id)));
        notificationWarning = outcomes.some(o => o.status === 'rejected');
      } catch { notificationWarning = true; }
    }
    return NextResponse.json({ ...published, notificationWarning }, { status: published.replayed ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof PublicationError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[publication] failed', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'La publication n’a pas pu être confirmée. Réessaie depuis cet écran : la même tentative sera reprise sans doublon.' }, { status: 503 });
  }
}
