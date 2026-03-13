import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyPostComment } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: postId } = params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor');

    let query = supabaseAdmin
      .from('post_comments')
      .select(`
        id, content, created_at, user_id,
        profiles ( id, username, name, avatar, is_verified )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (cursor) {
      query = query.gt('created_at', cursor);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error('[posts/comments] GET error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const formatted = (comments || []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      user_id: c.user_id,
      user: c.profiles ?? { id: c.user_id, username: 'utilisateur', name: null, avatar: null },
    }));

    const nextCursor = formatted.length === limit
      ? formatted[formatted.length - 1]?.created_at
      : null;

    return NextResponse.json({ comments: formatted, nextCursor });
  } catch (e) {
    console.error('[posts/comments] GET error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: postId } = params;
    const userId = session.user.id;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Contenu requis' }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: content.trim() })
      .select(`
        id, content, created_at, user_id,
        profiles ( id, username, name, avatar, is_verified )
      `)
      .single();

    if (error) {
      console.error('[posts/comments] POST insert error:', error);
      return NextResponse.json({ error: 'Erreur commentaire' }, { status: 500 });
    }

    // Incrémenter le compteur de commentaires
    const { data: post } = await supabaseAdmin
      .from('creator_posts')
      .select('comments_count, creator_id')
      .eq('id', postId)
      .single();

    if (post) {
      await supabaseAdmin
        .from('creator_posts')
        .update({ comments_count: ((post as any).comments_count || 0) + 1 })
        .eq('id', postId);

      // Notifier le créateur (pas soi-même)
      if ((post as any).creator_id !== userId) {
        const commenterName = (session.user as any).username || (session.user as any).name || 'Quelqu\'un';
        notifyPostComment(userId, (post as any).creator_id, commenterName, postId).catch(() => {});
      }
    }

    return NextResponse.json({
      id: (comment as any).id,
      content: (comment as any).content,
      created_at: (comment as any).created_at,
      user_id: (comment as any).user_id,
      user: (comment as any).profiles ?? { id: userId, username: (session.user as any)?.username || 'utilisateur', name: session.user?.name || null, avatar: session.user?.image || null },
    }, { status: 201 });
  } catch (e) {
    console.error('[posts/comments] POST error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('comment_id') || searchParams.get('commentId');
    if (!commentId) return NextResponse.json({ error: 'comment_id requis' }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from('post_comments')
      .select('user_id, post_id')
      .eq('id', commentId)
      .single();

    if (!existing || (existing as any).user_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    await supabaseAdmin.from('post_comments').delete().eq('id', commentId);

    // Décrémenter le compteur
    const { data: post } = await supabaseAdmin
      .from('creator_posts')
      .select('comments_count')
      .eq('id', (existing as any).post_id)
      .single();

    if (post) {
      await supabaseAdmin
        .from('creator_posts')
        .update({ comments_count: Math.max(0, ((post as any).comments_count || 1) - 1) })
        .eq('id', (existing as any).post_id);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[posts/comments] DELETE error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
