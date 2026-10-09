import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { db } from '@/lib/database';
import { attachAuthors, attachReplies, attachTracks, getPostTrackId, validateAttachedTrack, withTrackRef } from '@/lib/communityPosts';
import { communityPostInput } from '@/lib/communityValidation';

type Context = { params: { id: string } };
const json = NextResponse.json;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params: { id } }: Context) {
  try {
    const session = await getApiSession(request);
    const { data: post, error } = await db.from('forum_posts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!post) return json({ error: 'Discussion introuvable.' }, { status: 404 });
    const { data: replies, error: repliesError } = await db.from('forum_replies').select('*').eq('post_id', id).order('created_at', { ascending: true }).order('id', { ascending: true });
    if (repliesError) throw repliesError;
    const [hydrated] = await attachTracks(await attachAuthors([post]), session?.user?.id);
    const hydratedReplies = await attachReplies(replies || [], session?.user?.id);
    let isLiked = false;
    if (session?.user?.id) {
      const { data, error: likesError } = await db.from('forum_post_likes').select('id').eq('post_id', id).eq('user_id', session.user.id).maybeSingle();
      if (likesError) throw likesError;
      isLiked = Boolean(data);
    }
    // Prefetch/StrictMode must not inflate views: reading is side-effect free.
    return json({ post: { ...hydrated, profiles: hydrated.author || null, is_liked: isLiked }, replies: hydratedReplies }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[community detail]', error);
    return json({ error: 'Impossible de charger la discussion. Réessaie dans un instant.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params: { id } }: Context) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return json({ error: 'Non authentifié' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const input = communityPostInput(body);
    if (!input.value) return json({ error: input.error }, { status: 400 });
    const { data: existing, error } = await db.from('forum_posts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!existing) return json({ error: 'Discussion introuvable.' }, { status: 404 });
    if (existing.user_id !== session.user.id) return json({ error: 'Non autorisé' }, { status: 403 });
    if (existing.is_locked) return json({ error: 'Cette discussion est verrouillée.' }, { status: 423 });
    const trackId = body.track_id === undefined ? getPostTrackId(existing) : body.track_id || null;
    if (!(await validateAttachedTrack(trackId, session.user.id))) return json({ error: 'Son indisponible ou privé.' }, { status: 400 });
    const payload: any = { ...input.value, content: withTrackRef(input.value.content, trackId), updated_at: new Date().toISOString() };
    if ('track_id' in existing) payload.track_id = trackId;
    const { data, error: updateError } = await db.from('forum_posts').update(payload).eq('id', id).eq('user_id', session.user.id).eq('is_locked', false).select('*').maybeSingle();
    if (updateError?.code === '23514') return json({ error: 'Ce thème est temporairement indisponible. Ton brouillon est conservé.' }, { status: 503 });
    if (updateError) throw updateError;
    if (!data) return json({ error: 'La discussion a changé. Recharge la page.' }, { status: 409 });
    return json(data);
  } catch (error) {
    console.error('[community update]', error);
    return json({ error: 'Impossible de modifier la discussion.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params: { id } }: Context) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) return json({ error: 'Non authentifié' }, { status: 401 });
    const { data: existing, error } = await db.from('forum_posts').select('user_id').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!existing) return json({ error: 'Discussion introuvable.' }, { status: 404 });
    if (existing.user_id !== session.user.id) return json({ error: 'Non autorisé' }, { status: 403 });
    const { error: deleteError } = await db.from('forum_posts').delete().eq('id', id).eq('user_id', session.user.id);
    if (deleteError) throw deleteError;
    return json({ success: true });
  } catch (error) {
    console.error('[community delete]', error);
    return json({ error: 'Impossible de supprimer la discussion.' }, { status: 500 });
  }
}
