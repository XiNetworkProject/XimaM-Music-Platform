import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/tracks/[id]/comments/moderation
// - Public: commentaires non supprimés et non filtrés
// - Créateur: vues public/creator/all + includeDeleted/includeFiltered + stats
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const trackId = params.id;

  if (!trackId || trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-')) {
    return NextResponse.json({ comments: [], total: 0, limit: 0, offset: 0 });
  }

  const session = await getServerSession(authOptions).catch(() => null);
  const userId = (session?.user as any)?.id || null;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
  const includeDeleted = searchParams.get('includeDeleted') === 'true';
  const includeFiltered = searchParams.get('includeFiltered') === 'true';
  const includeStats = searchParams.get('includeStats') === 'true';
  const view = (searchParams.get('view') || 'public') as 'public' | 'creator' | 'all';

  // Track + creator id
  const { data: track } = await supabaseAdmin.from('tracks').select('id, creator_id').eq('id', trackId).maybeSingle();
  if (!track) return NextResponse.json({ comments: [], total: 0, limit, offset });
  const creatorId = (track as any).creator_id;
  const isCreator = Boolean(userId && creatorId && userId === creatorId);

  // Comments
  const { data: commentsRows, error: commentsErr } = await supabaseAdmin
    .from('comments')
    .select('id, content, created_at, updated_at, user_id, parent_id')
    .eq('track_id', trackId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (commentsErr) return NextResponse.json({ comments: [], total: 0, limit, offset, message: 'Système de commentaires non disponible' });
  const rows = commentsRows || [];

  const ids = rows.map((r: any) => r.id);
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, username, name, avatar').in('id', userIds);
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Likes
  const likesCountMap = new Map<string, number>();
  const likedSet = new Set<string>();
  try {
    const { data: likesRows } = await supabaseAdmin.from('comment_likes').select('comment_id, user_id').in('comment_id', ids);
    for (const lr of likesRows || []) {
      const cid = String((lr as any).comment_id);
      likesCountMap.set(cid, (likesCountMap.get(cid) || 0) + 1);
      if (userId && (lr as any).user_id === userId) likedSet.add(cid);
    }
  } catch {}

  // Modération (creator)
  const moderationMap = new Map<string, any>();
  try {
    const { data: mods } = await supabaseAdmin
      .from('comment_moderation')
      .select('comment_id, is_deleted, is_filtered, filter_reason, is_creator_favorite')
      .eq('track_id', trackId)
      .eq('creator_id', creatorId)
      .in('comment_id', ids);
    for (const m of mods || []) moderationMap.set(String((m as any).comment_id), m);
  } catch {}

  // Filtres (creator words)
  let filterWords: string[] = [];
  try {
    const { data: filterRows } = await supabaseAdmin.from('creator_comment_filters').select('word').eq('creator_id', creatorId);
    filterWords = (filterRows || []).map((r: any) => String(r.word || '').trim()).filter(Boolean);
  } catch {}

  const containsWord = (text: string) => {
    if (!filterWords.length) return null;
    const lower = text.toLowerCase();
    const hit = filterWords.find((w) => lower.includes(w.toLowerCase()));
    return hit || null;
  };

  let formatted = rows.map((r: any) => {
    const p = profileMap.get(r.user_id);
    const m = moderationMap.get(r.id);
    const filteredByWord = containsWord(String(r.content || ''));
    const isDeleted = Boolean(m?.is_deleted);
    const isFiltered = Boolean(m?.is_filtered) || Boolean(filteredByWord);
    const filterReason = m?.filter_reason || (filteredByWord ? 'creator-filter' : null);
    return {
      id: r.id,
      content: isDeleted ? 'Commentaire supprimé' : r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      parentId: r.parent_id,
      likes: [],
      likesCount: likesCountMap.get(r.id) || 0,
      isLiked: likedSet.has(r.id),
      isDeleted,
      isCreatorFavorite: Boolean(m?.is_creator_favorite),
      customFiltered: isFiltered,
      customFilterReason: filterReason,
      user: {
        id: r.user_id,
        username: p?.username || 'Utilisateur',
        name: p?.name || p?.username || 'Utilisateur',
        avatar: p?.avatar || '',
      },
      replies: [],
    };
  });

  // Public vs creator view filtering (top-level only here)
  const topLevel = (c: any) => !c.parentId;
  if (!isCreator || view === 'public') {
    formatted = formatted.filter((c: any) => topLevel(c) && !c.isDeleted && !c.customFiltered);
  } else {
    formatted = formatted.filter((c: any) => topLevel(c));
    if (!includeDeleted) formatted = formatted.filter((c: any) => !c.isDeleted);
    if (!includeFiltered) formatted = formatted.filter((c: any) => !c.customFiltered);
  }

  const response: any = {
    comments: formatted,
    total: formatted.length,
    limit,
    offset,
    permissions: {
      canModerate: isCreator,
      canDelete: isCreator,
      canFlag: isCreator,
    },
  };

  if (includeStats && isCreator) {
    response.stats = {
      deletedComments: formatted.filter((c: any) => c.isDeleted).length,
      filteredComments: formatted.filter((c: any) => c.customFiltered).length,
      favoriteComments: formatted.filter((c: any) => c.isCreatorFavorite).length,
    };
  }

  return NextResponse.json(response);
}

// POST legacy non utilisé (on garde pour compat mais redirige)
export async function POST() {
  return NextResponse.json({ error: 'Utiliser /comments/[commentId]/moderation' }, { status: 400 });
}
