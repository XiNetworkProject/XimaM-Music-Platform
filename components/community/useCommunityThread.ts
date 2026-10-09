'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommunityPost, CommunityAuthor } from '@/lib/communityFeed';
export type ThreadPost = CommunityPost & { user_id: string; is_locked?: boolean; track_id?: string | null };
export type ThreadReply = { id: string; user_id: string; content: string; created_at?: string; updated_at?: string; likes_count?: number; is_liked?: boolean; profiles?: CommunityAuthor | null };
export function useCommunityThread(postId: string, viewerId: string) {
  const key = JSON.stringify([postId, viewerId]);
  const [state, setState] = useState<{ key: string; post: ThreadPost | null; replies: ThreadReply[]; loading: boolean; error: string; missing: boolean }>({ key, post: null, replies: [], loading: true, error: '', missing: false });
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setState(previous => ({ ...previous, key, post: previous.key === key ? previous.post : null, replies: previous.key === key ? previous.replies : [], loading: true, error: '', missing: false }));
    try {
      const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, { cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setState({ key, post: null, replies: [], loading: false, missing: response.status === 404, error: data.error || 'La discussion est temporairement indisponible.' });
        return;
      }
      if (!data.post?.id || !Array.isArray(data.replies)) throw new Error('Invalid thread');
      setState({ key, post: data.post, replies: data.replies, loading: false, error: '', missing: false });
    } catch {
      if (!controller.signal.aborted) setState({ key, post: null, replies: [], loading: false, error: 'Connexion interrompue. Réessaie : ton brouillon reste disponible.', missing: false });
    }
  }, [key, postId]);
  useEffect(() => { void load(); return () => pending.current?.abort(); }, [load]);
  const visible = state.key === key ? state : { key, post: null, replies: [], loading: true, error: '', missing: false };
  return { ...visible, reload: load, update: (patch: Partial<Pick<typeof state, 'post' | 'replies'>>) => setState(previous => previous.key === key ? { ...previous, ...patch } : previous) };
}
