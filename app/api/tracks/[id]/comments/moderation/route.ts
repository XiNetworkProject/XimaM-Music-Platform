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

  // Top-level comments (pagination) + replies for these parents
  const { data: topRows, error: topErr } = await supabaseAdmin
    .from('comments')
    .select('id, content, created_at, updated_at, user_id, parent_id')
    .eq('track_id', trackId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (topErr) return NextResponse.json({ comments: [], total: 0, limit, offset, message: 'Système de commentaires non disponible' });
  const parents = topRows || [];
  const parentIds = parents.map((r: any) => r.id);

  let replyRows: any[] = [];
  if (parentIds.length) {
    const { data: replies } = await supabaseAdmin
      .from('comments')
      .select('id, content, created_at, updated_at, user_id, parent_id')
      .eq('track_id', trackId)
      .in('parent_id', parentIds)
      .order('created_at', { ascending: true })
      .limit(400);
    replyRows = replies || [];
  }

  const rows = [...parents, ...replyRows];

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

  // Build tree: attach replies + apply view filtering
  const isVisible = (c: any) => {
    if (!isCreator || view === 'public') return !c.isDeleted && !c.customFiltered;
    if (!includeDeleted && c.isDeleted) return false;
    if (!includeFiltered && c.customFiltered) return false;
    return true;
  };

  const byParent = new Map<string, any[]>();
  for (const c of formatted) {
    if (c.parentId) {
      const pid = String(c.parentId);
      byParent.set(pid, [...(byParent.get(pid) || []), c]);
    }
  }

  let topLevel = formatted.filter((c: any) => !c.parentId);
  topLevel = topLevel.filter(isVisible);
  topLevel = topLevel.map((c: any) => {
    const replies = (byParent.get(String(c.id)) || []).filter(isVisible);
    return { ...c, replies };
  });
  formatted = topLevel;

  const response: any = {
    comments: formatted,
    total: formatted.length,
    limit,
    offset,
    hasMore: parents.length === limit,
    nextOffset: offset + limit,
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
