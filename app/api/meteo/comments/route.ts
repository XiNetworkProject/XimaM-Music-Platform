import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bulletinId = searchParams.get('bulletinId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!bulletinId) {
      return NextResponse.json({ error: 'bulletinId requis' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    const { data: comments, error, count } = await supabaseAdmin
      .from('meteo_comments')
      .select('*', { count: 'exact' })
      .eq('bulletin_id', bulletinId)
      .is('parent_id', null)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ comments: [], total: 0 });
      }
      console.error('Erreur meteo/comments GET:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = Array.from(new Set((comments || []).map((c: any) => c.user_id).filter(Boolean)));
    const profileMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name, avatar')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles) profileMap[p.id] = p;
      }
    }

    const commentIds = (comments || []).map((c: any) => c.id);
    let replyCounts: Record<string, number> = {};

    if (commentIds.length > 0) {
      const { data: replies } = await supabaseAdmin
        .from('meteo_comments')
        .select('parent_id')
        .in('parent_id', commentIds);

      if (replies) {
        for (const r of replies) {
          replyCounts[r.parent_id] = (replyCounts[r.parent_id] || 0) + 1;
        }
      }
    }

    const enriched = (comments || []).map((c: any) => ({
      ...c,
      profiles: profileMap[c.user_id] || null,
      reply_count: replyCounts[c.id] || 0,
    }));

    return NextResponse.json({ comments: enriched, total: count || 0 });
  } catch (error) {
    console.error('Erreur API meteo/comments GET:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { bulletinId, content, parentId } = body as { bulletinId: string; content: string; parentId?: string };

    if (!bulletinId || !content?.trim()) {
      return NextResponse.json({ error: 'bulletinId et content requis' }, { status: 400 });
    }

    const { data: bulletin } = await supabaseAdmin
      .from('meteo_bulletins')
      .select('id, allow_comments')
      .eq('id', bulletinId)
      .single();

    if (!bulletin) {
      return NextResponse.json({ error: 'Bulletin introuvable' }, { status: 404 });
    }

    if (bulletin.allow_comments === false) {
      return NextResponse.json({ error: 'Les commentaires sont désactivés pour ce bulletin' }, { status: 403 });
    }

    if (parentId) {
      const { data: parentComment } = await supabaseAdmin
        .from('meteo_comments')
        .select('id')
        .eq('id', parentId)
        .eq('bulletin_id', bulletinId)
        .single();

      if (!parentComment) {
        return NextResponse.json({ error: 'Commentaire parent introuvable' }, { status: 404 });
      }
    }

    const { data: comment, error: insertError } = await supabaseAdmin
      .from('meteo_comments')
      .insert({
        bulletin_id: bulletinId,
        user_id: session.user.id,
        content: content.trim(),
        parent_id: parentId || null,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Erreur meteo/comments POST:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, avatar')
      .eq('id', session.user.id)
      .maybeSingle();

    return NextResponse.json({ comment: { ...comment, profiles: profile } });
  } catch (error) {
    console.error('Erreur API meteo/comments POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
