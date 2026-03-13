import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyPostLike } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

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

    const { error: likeError } = await supabaseAdmin
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (likeError) {
      if (likeError.code === '23505') {
        return NextResponse.json({ error: 'Déjà liké' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erreur like' }, { status: 500 });
    }

    // Incrémenter le compteur
    await supabaseAdmin.rpc('increment_post_likes', { post_id_arg: postId }).catch(() => {
      supabaseAdmin
        .from('creator_posts')
        .update({ likes_count: supabaseAdmin.rpc('coalesce', {}) as any })
        .eq('id', postId);
    });

    // Mettre à jour manuellement
    const { data: post } = await supabaseAdmin
      .from('creator_posts')
      .select('likes_count, creator_id')
      .eq('id', postId)
      .single();

    if (post) {
      await supabaseAdmin
        .from('creator_posts')
        .update({ likes_count: ((post as any).likes_count || 0) + 1 })
        .eq('id', postId);

      // Notifier le créateur (pas soi-même)
      if ((post as any).creator_id !== userId) {
        const likerName = (session.user as any).username || (session.user as any).name || 'Quelqu\'un';
        notifyPostLike(userId, (post as any).creator_id, likerName, postId).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[posts/like] POST error:', e);
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

    const { id: postId } = params;
    const userId = session.user.id;

    const { error } = await supabaseAdmin
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) return NextResponse.json({ error: 'Erreur unlike' }, { status: 500 });

    // Décrémenter le compteur
    const { data: post } = await supabaseAdmin
      .from('creator_posts')
      .select('likes_count')
      .eq('id', postId)
      .single();

    if (post) {
      await supabaseAdmin
        .from('creator_posts')
        .update({ likes_count: Math.max(0, ((post as any).likes_count || 1) - 1) })
        .eq('id', postId);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[posts/like] DELETE error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
