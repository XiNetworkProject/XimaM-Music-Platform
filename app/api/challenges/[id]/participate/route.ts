import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { recordChallengeEntry, type ChallengeEntryContentType } from '@/lib/musicChallenges';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_CONTENT_TYPES: ChallengeEntryContentType[] = ['clip', 'variation', 'track'];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Connecte-toi pour participer.' }, { status: 401 });

    const challengeId = decodeURIComponent(params.id || '');
    const body = await request.json().catch(() => ({}));
    const contentType = typeof body?.contentType === 'string' ? body.contentType.trim() : '';
    const contentId = typeof body?.contentId === 'string' ? body.contentId.trim() : '';
    if (!challengeId || !VALID_CONTENT_TYPES.includes(contentType as ChallengeEntryContentType) || !contentId || contentId.length > 180) {
      return NextResponse.json({ error: 'Participation invalide.' }, { status: 400 });
    }

    const result = await recordChallengeEntry({
      challengeId,
      userId: session.user.id,
      contentType: contentType as ChallengeEntryContentType,
      contentId,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({ success: true, created: result.created, entry: result.entry });
  } catch (error) {
    console.error('challenge participate failed', error);
    return NextResponse.json({ error: 'Participation impossible.' }, { status: 500 });
  }
}
