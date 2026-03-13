'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PostCard, { type Post } from '@/components/PostCard';
import PostCommentsSheet from '@/components/PostCommentsSheet';
import PostComposer from '@/components/PostComposer';
import { useSession } from 'next-auth/react';

export default function PostsFeedPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (cursorParam?: string, replace = false) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const url = `/api/posts?limit=15${cursorParam ? `&cursor=${cursorParam}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      const newPosts = data.posts || [];
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);
    } catch { /* ignore */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchPosts(undefined, true); }, [fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && cursor) {
        fetchPosts(cursor);
      }
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, cursor, fetchPosts]);

  const handlePostCreated = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const handleDelete = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const handleCommentCountChange = useCallback((postId: string, delta: number) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p
    ));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a14]/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[15px] font-bold text-white flex-1">Fil des créateurs</h1>
          <button
            onClick={() => fetchPosts(undefined, true)}
            className="w-9 h-9 rounded-full bg-white/[0.05] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Composer (si connecté) */}
        {session && (
          <div className="mb-5">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>
        )}

        {/* Loading initial */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        )}

        {/* Feed */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[15px] text-white/20 mb-2">Aucun post pour l'instant</p>
            <p className="text-[13px] text-white/10">Sois le premier à partager quelque chose</p>
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <PostCard
                  post={post}
                  onDelete={handleDelete}
                  onCommentClick={p => { setActivePost(p); setCommentsOpen(true); }}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Loader infinite scroll */}
        <div ref={bottomRef} className="py-4 flex justify-center">
          {loadingMore && <Loader2 className="w-5 h-5 text-white/20 animate-spin" />}
          {!hasMore && posts.length > 0 && (
            <p className="text-[12px] text-white/15">Tu as tout vu ✓</p>
          )}
        </div>
      </div>

      <PostCommentsSheet
        post={activePost}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </div>
  );
}
