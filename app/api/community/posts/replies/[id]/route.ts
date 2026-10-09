import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db } from '@/lib/database';
import { communityText, COMMUNITY_REPLY_LIMIT } from '@/lib/communityValidation';

export const dynamic = 'force-dynamic';
type Context = { params: { id: string } };
async function change(request: NextRequest, id: string, remove: boolean) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { data: reply, error } = await db.from('forum_replies').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!reply) return NextResponse.json({ error: 'Réponse introuvable.' }, { status: 404 });
    if (reply.user_id !== session.user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    if (remove) {
      const { error: deleteError } = await db.from('forum_replies').delete().eq('id', id).eq('user_id', session.user.id);
      if (deleteError) throw deleteError;
      return NextResponse.json({ success: true });
    }
    const content = communityText((await request.json().catch(() => null))?.content, COMMUNITY_REPLY_LIMIT);
    if (!content) return NextResponse.json({ error: 'Une réponse de 1 à 5 000 caractères est requise.' }, { status: 400 });
    const { data: post, error: postError } = await db.from('forum_posts').select('is_locked').eq('id', reply.post_id).maybeSingle();
    if (postError) throw postError;
    if (!post || post.is_locked) return NextResponse.json({ error: 'Cette discussion est fermée.' }, { status: 423 });
    const { data, error: updateError } = await db.from('forum_replies').update({ content, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id).select('*').maybeSingle();
    if (updateError) throw updateError;
    if (!data) return NextResponse.json({ error: 'La réponse n’existe plus.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[community reply change]', error);
    return NextResponse.json({ error: 'Impossible de modifier cette réponse.' }, { status: 500 });
  }
}
export const PUT = (request: NextRequest, { params }: Context) => change(request, params.id, false);
export const DELETE = (request: NextRequest, { params }: Context) => change(request, params.id, true);
