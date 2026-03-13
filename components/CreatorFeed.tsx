'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import PostCard, { type Post } from '@/components/PostCard';
import PostComposer from '@/components/PostComposer';
import PostCommentsSheet from '@/components/PostCommentsSheet';

interface CreatorFeedProps {
  creatorId?: string;
  showComposer?: boolean;
}

export default function CreatorFeed({ creatorId, showComposer = true }: CreatorFeedProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const fetchPosts = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '10' });
      if (creatorId) params.set('creator_id', creatorId);
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();

      const newPosts: Post[] = data.posts || [];
      if (cursor) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...newPosts.filter(p => !existingIds.has(p.id))];
        });
      } else {
        setPosts(newPosts);
      }
      setNextCursor(data.nextCursor || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [creatorId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchPosts();
  }, [fetchPosts]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el || !nextCursor) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore) {
          fetchPosts(nextCursor);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchPosts]);

  const handlePostCreated = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const handleCommentClick = useCallback((post: Post) => {
    setActivePost(post);
    setCommentsOpen(true);
  }, []);

  const handleCommentCountChange = useCallback((postId: string, delta: number) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p
    ));
  }, []);

  return (
    <>
      <div className="space-y-3">
        {/* Composer */}
        {showComposer && session && (
          <PostComposer onPostCreated={handlePostCreated} />
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Users className="w-7 h-7 text-white/15" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-white/40">Aucun post pour l'instant</p>
              <p className="text-[12px] text-white/20 mt-1">
                {creatorId
                  ? 'Ce créateur n\'a pas encore publié de post'
                  : 'Suis des créateurs pour voir leurs posts ici'}
              </p>
            </div>
            {!creatorId && (
              <button
                onClick={() => { hasFetched.current = false; fetchPosts(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white/30 hover:text-white/50 hover:bg-white/[0.05] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </button>
            )}
          </div>
        )}

        {/* Posts */}
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={handlePostDeleted}
            onCommentClick={handleCommentClick}
          />
        ))}

        {/* Infinite scroll trigger */}
        {nextCursor && (
          <div ref={loaderRef} className="py-4 flex justify-center">
            {loadingMore && <Loader2 className="w-5 h-5 text-white/20 animate-spin" />}
          </div>
        )}
      </div>

      {/* Comments sheet */}
      <PostCommentsSheet
        post={activePost}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </>
  );
}
