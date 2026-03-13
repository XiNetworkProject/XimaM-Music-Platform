import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/getApiSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const session = await getApiSession(request);
    const userId = session?.user?.id || null;

    const { data: post, error } = await supabaseAdmin
      .from('creator_posts')
      .select(`
        id, post_type, content, image_url, track_id,
        likes_count, comments_count, is_public, created_at, creator_id,
        profiles!creator_posts_creator_id_fkey (
          id, username, name, avatar, is_verified
        )
      `)
      .eq('id', id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post introuvable' }, { status: 404 });
    }

    let track = null;
    if ((post as any).post_type === 'track_share' && (post as any).track_id) {
      const { data: t } = await supabaseAdmin
        .from('tracks')
        .select('id, title, artist_name, cover_url, audio_url, duration')
        .eq('id', (post as any).track_id)
        .single();
      if (t) track = t;
    }

    let isLiked = false;
    if (userId) {
      const { data: like } = await supabaseAdmin
        .from('post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', userId)
        .maybeSingle();
      isLiked = !!like;
    }

    return NextResponse.json({
      ...(post as any),
      type: (post as any).post_type,
      creator: (post as any).profiles,
      track,
      isLiked,
      profiles: undefined,
    });
  } catch (e) {
    console.error('[posts/id] GET error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getApiSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { content } = body;

    const { data: existing } = await supabaseAdmin
      .from('creator_posts')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (!existing || (existing as any).creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('creator_posts')
      .update({ content: content?.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, content, updated_at')
      .single();

    if (error) return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[posts/id] PUT error:', e);
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

    const { id } = params;

    const { data: existing } = await supabaseAdmin
      .from('creator_posts')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (!existing || (existing as any).creator_id !== session.user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('creator_posts')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[posts/id] DELETE error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
