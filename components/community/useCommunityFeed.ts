'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { communityFeedParams, mergeCommunityPosts, type CommunityPost } from '@/lib/communityFeed';

type Feed = { key: string; posts: CommunityPost[]; page: number; hasMore: boolean; loading: boolean; error: boolean; publicPreview: boolean };
export function useCommunityFeed(category: string, search: string, sort: string, viewerId = '') {
  const queryKey = communityFeedParams(category, search, sort).toString();
  // The API includes viewer-specific likes and track visibility. Never reuse
  // the preceding viewer's result after a session change.
  const key = JSON.stringify([queryKey, viewerId]);
  const [feed, setFeed] = useState<Feed>({ key, posts: [], page: 0, hasMore: false, loading: true, error: false, publicPreview: false });
  const pending = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async (page: number, append = false) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const requestId = ++sequence.current;
    setFeed((previous) => ({ ...previous, key, page: append ? previous.page : 0, posts: append && previous.key === key ? previous.posts : [], loading: true, error: false }));
    const params = new URLSearchParams(queryKey);
    params.set('page', String(page));
    try {
      let publicPreview = false;
      let response = await fetch(`/api/community/posts?${params}`, { signal: controller.signal, cache: 'no-store' });
      if (controller.signal.aborted || requestId !== sequence.current) return;
      if (!response.ok && response.status >= 500 && process.env.NODE_ENV !== 'production') {
        // Away from the local DB: public data only, never user impersonation.
        response = await fetch(`/api/dev/community-preview?${params}`, { signal: controller.signal, cache: 'no-store' });
        publicPreview = true;
      }
      if (!response.ok) throw new Error('Community unavailable');
      const data = await response.json();
      if (controller.signal.aborted || requestId !== sequence.current) return;
      if (!Array.isArray(data.posts)) throw new Error('Invalid community response');
      setFeed((previous) => ({ key, posts: mergeCommunityPosts(append && previous.key === key && previous.publicPreview === publicPreview ? previous.posts : [], data.posts), page,
        hasMore: Number(data.pagination?.totalPages || 0) > page, loading: false, error: false, publicPreview }));
    } catch {
      if (controller.signal.aborted || requestId !== sequence.current) return;
      setFeed((previous) => ({ ...previous, key, loading: false, error: true }));
    }
  }, [key, queryKey]);
  useEffect(() => {
    void load(1);
    return () => { pending.current?.abort(); sequence.current += 1; };
  }, [load]);
  // Avoid displaying the preceding filter during the render before its effect.
  const visible = feed.key === key ? feed : { ...feed, posts: [], page: 0, hasMore: false, loading: true, error: false, publicPreview: false };
  return { ...visible, retry: () => load(visible.page > 0 ? visible.page + 1 : 1, visible.page > 0), reload: () => load(1),
    loadMore: () => { if (!visible.loading && visible.hasMore) void load(visible.page + 1, true); } };
}
