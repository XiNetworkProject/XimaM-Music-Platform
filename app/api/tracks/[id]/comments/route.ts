import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';
import contentModerator from '@/lib/contentModeration';

// GET /api/tracks/[id]/comments - liste publique (filtrée) des commentaires
// POST /api/tracks/[id]/comments - ajouter un commentaire (avec modération)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const trackId = params.id;
  if (!trackId) return NextResponse.json({ comments: [] });
  if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-')) {
    return NextResponse.json({ comments: [] });
  }

  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id || null;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  // Top-level only (pagination), puis replies pour ces parents
  const { data: topRows, error: topErr } = await supabaseAdmin
    .from('comments')
    .select('id, content, created_at, updated_at, user_id, track_id, parent_id')
    .eq('track_id', trackId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (topErr) return NextResponse.json({ comments: [] });

  const parents = topRows || [];
  const parentIds = parents.map((c: any) => c.id);

  let replyRows: any[] = [];
  if (parentIds.length) {
    const { data: replies } = await supabaseAdmin
      .from('comments')
      .select('id, content, created_at, updated_at, user_id, track_id, parent_id')
      .eq('track_id', trackId)
      .in('parent_id', parentIds)
      .order('created_at', { ascending: true })
      .limit(300);
    replyRows = replies || [];
  }

  const all = [...parents, ...replyRows];
  const userIds = Array.from(new Set(all.map((c: any) => c.user_id).filter(Boolean)));
  const { data: users } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', userIds);
  const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

  // Likes (best-effort)
  const ids = all.map((c: any) => c.id);
  let likesCountMap = new Map<string, number>();
  let likedByUser = new Set<string>();
  try {
    const { data: likesRows } = await supabaseAdmin
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', ids);
    for (const r of likesRows || []) {
      const cid = String((r as any).comment_id);
      likesCountMap.set(cid, (likesCountMap.get(cid) || 0) + 1);
      if (userId && (r as any).user_id === userId) likedByUser.add(cid);
    }
  } catch {
    // table absente: on laisse à 0
  }

  const replyMap = new Map<string, any[]>();
  for (const r of replyRows) {
    const pid = String(r.parent_id || '');
    if (!pid) continue;
    const u = usersMap.get(r.user_id);
    const formattedReply = {
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      likes: [],
      likesCount: likesCountMap.get(r.id) || 0,
      isLiked: likedByUser.has(r.id),
      user: {
        id: r.user_id,
        username: u?.username || 'Utilisateur',
        name: u?.name || u?.username || 'Utilisateur',
        avatar: u?.avatar || '',
      },
      replies: [],
    };
    replyMap.set(pid, [...(replyMap.get(pid) || []), formattedReply]);
  }

  const formatted = parents.map((c: any) => {
    const u = usersMap.get(c.user_id);
    return {
      id: c.id,
      content: c.content,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      likes: [],
      likesCount: likesCountMap.get(c.id) || 0,
      isLiked: likedByUser.has(c.id),
      user: {
        id: c.user_id,
        username: u?.username || 'Utilisateur',
        name: u?.name || u?.username || 'Utilisateur',
        avatar: u?.avatar || '',
      },
      replies: replyMap.get(String(c.id)) || [],
    };
  });

  return NextResponse.json({
    comments: formatted,
    hasMore: parents.length === limit,
    nextOffset: offset + limit,
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const trackId = params.id;
  if (!trackId) return NextResponse.json({ error: 'TrackId manquant' }, { status: 400 });
  if (trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-')) {
    return NextResponse.json({ error: 'Commentaires non disponibles' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content || '').trim();
  if (!content) return NextResponse.json({ error: 'Commentaire vide' }, { status: 400 });

  const mod = contentModerator.analyzeContent(content);
  if (!mod.isClean) {
    return NextResponse.json({ error: 'Contenu refusé', details: mod }, { status: 400 });
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('comments')
    .insert({ track_id: trackId, user_id: userId, content })
    .select('id, content, created_at, updated_at, user_id')
    .single();

  if (error || !inserted) {
    const errAny = error as any;
    const msg = errAny?.message || 'Impossible de publier';
    return NextResponse.json(
      {
        error:
          msg.includes('relation') && msg.includes('comments')
            ? 'Table public.comments manquante (exécute le script SQL de commentaires).'
            : msg,
        supabase: {
          code: errAny?.code || null,
          details: errAny?.details || null,
          hint: errAny?.hint || null,
          message: errAny?.message || null,
        },
      },
      { status: 500 },
    );
  }

  const { data: user } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').eq('id', userId).maybeSingle();

  return NextResponse.json({
    comment: {
      id: inserted.id,
      content: inserted.content,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
      likes: [],
      likesCount: 0,
      isLiked: false,
      user: {
        id: userId,
        username: (user as any)?.username || 'Utilisateur',
        name: (user as any)?.name || (user as any)?.username || 'Utilisateur',
        avatar: (user as any)?.avatar || '',
      },
      replies: [],
    },
  });
}

