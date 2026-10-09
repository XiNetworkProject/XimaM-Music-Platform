import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db } from '@/lib/database';
import { communityText } from '@/lib/communityValidation';

export const dynamic = 'force-dynamic';
async function vote(request: NextRequest, remove: boolean) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Connecte-toi pour voter.' }, { status: 401 });
    const id = communityText(remove ? new URL(request.url).searchParams.get('reply_id') : (await request.json().catch(() => null))?.reply_id, 100);
    if (!id) return NextResponse.json({ error: 'Réponse requise.' }, { status: 400 });
    const { data: reply, error: readError } = await db.from('forum_replies').select('id').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!reply) return NextResponse.json({ error: 'Cette réponse n’existe plus.' }, { status: 404 });
    const result = remove
      ? await db.from('forum_reply_likes').delete().eq('reply_id', id).eq('user_id', session.user.id)
      : await db.from('forum_reply_likes').insert({ reply_id: id, user_id: session.user.id });
    // The unique(reply_id,user_id) constraint makes repeated/concurrent requests idempotent.
    if (result.error && result.error.code !== '23505') throw result.error;
    return NextResponse.json({ success: true, is_liked: !remove });
  } catch (error) {
    console.error('[community helpful vote]', error);
    return NextResponse.json({ error: 'Ton vote n’a pas pu être enregistré.' }, { status: 500 });
  }
}
export const POST = (request: NextRequest) => vote(request, false);
export const DELETE = (request: NextRequest) => vote(request, true);
