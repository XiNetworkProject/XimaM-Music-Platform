'use client';

/**
 * PostInlineStrip — 2-3 posts compacts affichés inline entre les sections de la homepage.
 * Charge les posts récents en lazy (Intersection Observer).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import PostCard, { type Post } from '@/components/PostCard';
import PostCommentsSheet from '@/components/PostCommentsSheet';

interface PostInlineStripProps {
  count?: number;
  label?: string;
  postType?: 'text' | 'photo' | 'track_share';
}

export default function PostInlineStrip({ count = 2, label, postType }: PostInlineStripProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?limit=${count * 3}`);
      const data = await res.json();
      const allPosts = data.posts || [];
      const filtered = postType
        ? allPosts.filter((p: Post) => p.type === postType)
        : allPosts;
      setPosts(filtered.slice(0, count));
    } catch { /* ignore */ }
    finally { setLoading(false); setLoaded(true); }
  }, [count, postType, loaded, loading]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { fetchPosts(); obs.disconnect(); }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchPosts]);

  const handleCommentCountChange = useCallback((postId: string, delta: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p));
  }, []);

  if (loaded && posts.length === 0) return null;

  return (
    <div ref={ref}>
      {label && (
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/20">{label}</span>
          <a href="/" className="flex items-center gap-0.5 text-[11px] text-white/20 hover:text-white/40 transition-colors">
            Voir tout <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-2">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              compact
              onCommentClick={p => { setActivePost(p); setCommentsOpen(true); }}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      )}

      <PostCommentsSheet
        post={activePost}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </div>
  );
}
