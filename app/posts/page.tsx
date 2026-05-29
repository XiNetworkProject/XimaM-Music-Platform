'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PostCard, { type Post } from '@/components/PostCard';
import PostComposer from '@/components/PostComposer';
import { useSession } from 'next-auth/react';
import { SynauraAppShell, SynauraRouteNav, SynauraTopBar } from '@/components/synaura/SynauraShell';

export default function PostsFeedPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (cursorParam?: string, replace = false) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const url = `/api/posts?limit=15${cursorParam ? `&cursor=${cursorParam}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      const newPosts = data.posts || [];
      setPosts((prev) => (replace ? newPosts : [...prev, ...newPosts]));
      setCursor(data.nextCursor || null);
      setHasMore(Boolean(data.hasMore));
    } catch {
      // Keep the page quiet; the empty state will handle it.
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(undefined, true);
  }, [fetchPosts]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && cursor) {
          fetchPosts(cursor);
        }
      },
      { rootMargin: '300px' }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, cursor, fetchPosts]);

  const handlePostCreated = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const handleDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <SynauraAppShell contentClassName="max-w-[980px]">
      <SynauraTopBar
        searchLabel="Rechercher un post, un son ou un createur..."
        secondaryHref="/upload"
        secondaryLabel="Upload"
        primaryHref="/ai-generator"
        primaryLabel="Studio"
      />
      <SynauraRouteNav />

      <section className="mb-4 overflow-hidden rounded-[1.75rem] border border-black/[0.08] bg-[#171313] p-4 text-white shadow-[0_28px_80px_rgba(20,15,10,0.22)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-4 inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 text-xs font-black text-white/70 transition hover:bg-white/[0.14]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/46">Posts</p>
            <h1 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.06em] sm:text-5xl">Le fil des createurs.</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/55">
              Tous les posts au meme endroit.
            </p>
          </div>
          <button
            onClick={() => fetchPosts(undefined, true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#171313] transition hover:scale-[1.02]"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-2xl pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        {session && (
          <div className="mb-5">
            <PostComposer onPostCreated={handlePostCreated} />
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border border-black/[0.07] bg-[#fff8ed] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-black/[0.12] bg-[#fff8ed] px-6 py-16 text-center">
            <p className="text-[15px] font-black text-[#171313]">Aucun post pour l'instant</p>
            <p className="mt-2 text-[13px] font-semibold text-black/45">Sois le premier a partager quelque chose.</p>
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
                  onPostCreated={handlePostCreated}
                />
              </motion.div>
            ))}
          </div>
        )}

        <div ref={bottomRef} className="flex justify-center py-5">
          {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-black/20" />}
          {!hasMore && posts.length > 0 && (
            <p className="rounded-full bg-black/[0.06] px-4 py-2 text-[12px] font-black text-black/35">Tu as tout vu</p>
          )}
        </div>
      </div>
    </SynauraAppShell>
  );
}
