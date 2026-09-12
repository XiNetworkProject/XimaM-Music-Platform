'use client';

import { skipToken, useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { commentsEndpoint, mergeComments, normalizeComment, normalizeReactions, supportsMoments, type CommentEntity, type CommentEntityType, type SocialComment, type MomentReaction } from './commentsModel';

export const COMMENT_CACHE_MS = 5 * 60_000;
export async function commentRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || 'Commentaires indisponibles'), { status: response.status });
  return body;
}
type Page = { comments: SocialComment[]; next: number | string | null; canModerate: boolean };
export function useCommentsViewer() { const { data } = useSession(); return data?.user?.id || 'public'; }
export const commentsKey = (type: CommentEntityType, id: string, viewer: string) => ['comments', type, id, viewer] as const;
export function useCommentCount(type: CommentEntityType, id: string, fallback = 0) {
  const viewer = useCommentsViewer();
  const { data } = useQuery<number>({ queryKey: ['comment-count', type, id, viewer], queryFn: skipToken, enabled: false, initialData: undefined, gcTime: COMMENT_CACHE_MS });
  return data ?? Math.max(0, fallback);
}
export function useComments(entity: CommentEntity, creatorView = false) {
  const viewer = useCommentsViewer();
  const client = useQueryClient();
  const key = commentsKey(entity.type, entity.id, viewer);
  const queryKey = [...key, creatorView ? 'creator' : 'public'];
  const query = useInfiniteQuery({
    queryKey, initialPageParam: null as number | string | null,
    staleTime: COMMENT_CACHE_MS, gcTime: COMMENT_CACHE_MS,
    enabled: Boolean(entity.id),
    queryFn: async ({ signal, pageParam }): Promise<Page> => {
      const params = new URLSearchParams({ limit: '30' });
      if (pageParam != null) params.set(entity.type === 'post' ? 'cursor' : 'offset', String(pageParam));
      if (creatorView) { params.set('view', 'creator'); params.set('includeFiltered', 'true'); params.set('includeDeleted', 'true'); }
      const body = await commentRequest(`${commentsEndpoint(entity.type, entity.id)}${entity.type === 'track' ? '/moderation' : ''}?${params}`, { signal });
      const exactCount = Number.isFinite(body.commentsCount) ? body.commentsCount : pageParam == null && !creatorView && !body.hasMore && !body.nextCursor ? (body.comments || []).length : null;
      if (exactCount != null) client.setQueryData(['comment-count', entity.type, entity.id, viewer], exactCount);
      return { comments: (body.comments || []).map(normalizeComment), next: entity.type === 'post' ? body.nextCursor || null : body.hasMore ? body.nextOffset : null, canModerate: Boolean(body.permissions?.canModerate) };
    },
    getNextPageParam: page => page.next ?? undefined,
  });
  const comments = mergeComments(...(query.data?.pages.map(p => p.comments) || []));
  const publish = (transform: (comments: SocialComment[]) => SocialComment[]) => {
    client.setQueriesData<InfiniteData<Page>>({ queryKey: key }, old => old ? { ...old, pages: old.pages.map(p => ({ ...p, comments: transform(p.comments) })) } : old);
    client.setQueryData<SocialComment[]>(['comment-moments', entity.id, viewer], old => old ? transform(old).filter(c => c.timestampSeconds != null) : old);
  };
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: key });
    void client.invalidateQueries({ queryKey: ['comment-moments', entity.id, viewer] });
  };
  const updateCount = (delta: number, actual?: number) => client.setQueryData<number>(['comment-count', entity.type, entity.id, viewer], old => actual ?? Math.max(0, (old ?? entity.count ?? comments.length) + delta));
  const mutate = async (action: 'create' | 'reply' | 'like' | 'delete' | 'edit' | 'moderate', data: { id?: string; content?: string; timestampSeconds?: number | null; action?: string }) => {
    const endpoint = commentsEndpoint(entity.type, entity.id);
    const suffix = data.id ? `/${encodeURIComponent(data.id)}` : '';
    const url = action === 'reply' ? `${endpoint}${suffix}/replies` : action === 'like' ? `${endpoint}${suffix}/like` : action === 'moderate' ? `${endpoint}${suffix}/moderation` : action === 'create' ? endpoint : entity.type === 'post' ? `${endpoint}?comment_id=${encodeURIComponent(data.id || '')}` : `${endpoint}${suffix}`;
    const body = await commentRequest(url, { method: action === 'delete' ? 'DELETE' : action === 'edit' ? 'PUT' : 'POST', ...(action !== 'delete' ? { body: JSON.stringify(data) } : {}) });
    if (action === 'like') publish(list => list.map(c => c.id === data.id ? { ...c, likesCount: body.likesCount, isLiked: body.isLiked } : { ...c, replies: c.replies.map(r => r.id === data.id ? { ...r, likesCount: body.likesCount, isLiked: body.isLiked } : r) }));
    else {
      if (action === 'create') {
        const comment = normalizeComment(body.comment || body);
        client.setQueryData<InfiniteData<Page>>(queryKey, old => old ? { ...old, pages: old.pages.map((p, i) => i ? p : { ...p, comments: mergeComments([comment], p.comments) }) } : old);
        if (comment.timestampSeconds != null) client.setQueryData<SocialComment[]>(['comment-moments', entity.id, viewer], old => mergeComments(old || [], [comment]));
        updateCount(1, body.commentsCount);
      } else if (action === 'delete') { const top = comments.some(c => c.id === data.id); publish(list => list.filter(c => c.id !== data.id).map(c => ({ ...c, replies: c.replies.filter(r => r.id !== data.id) }))); if (top) updateCount(-1, body.commentsCount); }
      else if (action === 'reply') publish(list => list.map(c => c.id === data.id ? { ...c, replies: mergeComments(c.replies, [normalizeComment(body.reply)]) } : c));
      else if (action === 'edit') publish(list => list.map(c => c.id === data.id ? { ...c, content: data.content || c.content } : c));
      else if (action === 'moderate' && (data.action === 'delete' || data.action === 'filter')) { if (comments.some(c => c.id === data.id && !c.isDeleted && !c.customFiltered)) updateCount(-1); }
      else if (action === 'moderate' && data.action === 'unfilter' && comments.some(c => c.id === data.id && c.customFiltered && !c.isDeleted)) updateCount(1);
      invalidate();
    }
    return body;
  };
  return { ...query, comments, mutate, canModerate: query.data?.pages[0]?.canModerate || false };
}
export function useSharedMoments(trackId?: string | null) {
  const viewer = useCommentsViewer();
  const client = useQueryClient();
  const key = ['comment-moments', trackId || '', viewer];
  const query = useQuery<SocialComment[]>({ queryKey: key, enabled: Boolean(trackId && supportsMoments('track', trackId)), staleTime: COMMENT_CACHE_MS, gcTime: COMMENT_CACHE_MS,
    queryFn: async ({ signal }) => {
      const comments: SocialComment[] = [];
      // Bound the marker inventory; conversation pagination remains available.
      for (let offset = 0; offset < 200; offset += 100) {
        const body = await commentRequest(`${commentsEndpoint('track', trackId!)}/moderation?timestampedOnly=1&limit=100&offset=${offset}`, { signal });
        comments.push(...(body.comments || []).map(normalizeComment));
        if (!body.hasMore) break;
      }
      return mergeComments(comments);
    } });
  return { ...query, markers: query.data || [], refresh: () => query.refetch(), addOptimistic: (raw: any) => client.setQueryData<SocialComment[]>(key, old => mergeComments(old || [], [normalizeComment(raw)])) };
}
export function useSharedReactions(trackId?: string | null) {
  const viewer = useCommentsViewer();
  const client = useQueryClient();
  const key = ['moment-reactions', trackId || '', viewer];
  const query = useQuery<MomentReaction[]>({ queryKey: key, enabled: Boolean(trackId && supportsMoments('track', trackId)), staleTime: COMMENT_CACHE_MS, gcTime: COMMENT_CACHE_MS,
    queryFn: async ({ signal }) => normalizeReactions((await commentRequest(`/api/tracks/${encodeURIComponent(trackId!)}/reactions`, { signal })).reactions || []) });
  const addOptimistic = (reaction: MomentReaction) => client.setQueryData<MomentReaction[]>(key, old => normalizeReactions([...(old || []), reaction]));
  return { ...query, reactions: query.data || [], addOptimistic, refresh: () => query.refetch(), submit: async (reactionType: MomentReaction['reactionType'], timestampSeconds: number) => {
    const body = await commentRequest(`/api/tracks/${encodeURIComponent(trackId!)}/reactions`, { method: 'POST', body: JSON.stringify({ reactionType, timestampSeconds }) });
    addOptimistic(body.reaction);
  } };
}
