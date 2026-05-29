'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { notify } from '@/components/NotificationCenter';
import { getCdnUrl } from '@/lib/cdn';
import type { Post } from '@/components/PostCard';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    name?: string;
    avatar?: string;
    is_verified?: boolean;
  };
}

interface PostCommentsSheetProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
}

export default function PostCommentsSheet({ post, isOpen, onClose, onCommentCountChange }: PostCommentsSheetProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = useCallback(async (cursor?: string) => {
    if (!post) return;
    setLoading(true);
    try {
      const url = `/api/posts/${post.id}/comments?limit=20${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (cursor) {
        setComments(prev => [...prev, ...(data.comments || [])]);
      } else {
        setComments(data.comments || []);
      }
      setNextCursor(data.nextCursor || null);
    } catch {
      notify.error('', 'Impossible de charger les commentaires');
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    if (isOpen && post) {
      setComments([]);
      setNextCursor(null);
      setText('');
      loadComments();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, post, loadComments]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || !post || submitting) return;
    if (!session) { notify.error('', 'Connecte-toi pour commenter'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments(prev => [...prev, data]);
        setText('');
        onCommentCountChange?.(post.id, 1);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        notify.error('', data.error || 'Erreur envoi commentaire');
      }
    } catch {
      notify.error('', 'Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  }, [text, post, session, submitting, onCommentCountChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && post && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[80dvh] flex flex-col rounded-t-2xl border-t border-black/[0.08] bg-[#fffaf2] text-[#171313] lg:left-auto lg:right-6 lg:bottom-24 lg:w-[420px] lg:max-h-[70dvh] lg:rounded-2xl lg:border"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 rounded-full bg-black/[0.12]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <h3 className="text-[15px] font-semibold text-[#171313]">
                Commentaires
                {comments.length > 0 && (
                  <span className="ml-2 text-[12px] text-black/34 font-normal tabular-nums">{comments.length}</span>
                )}
              </h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.05] text-black/45 transition-all hover:bg-black/[0.08] hover:text-[#171313]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {loading && comments.length === 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-black/25 animate-spin" />
                </div>
              )}
              {!loading && comments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[13px] text-black/38">Aucun commentaire. Sois le premier !</p>
                </div>
              )}
              {comments.map(comment => {
                const avatarUrl = comment.user?.avatar
                  ? getCdnUrl(comment.user.avatar) || comment.user.avatar
                  : null;
                const timeAgo = (() => {
                  try { return formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr }); }
                  catch { return ''; }
                })();

                return (
                  <div key={comment.id} className="flex gap-2.5">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {(comment.user?.name || comment.user?.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[13px] font-semibold text-[#171313]">
                          {comment.user?.name || comment.user?.username}
                        </span>
                        <span className="text-[11px] text-black/28 tabular-nums">{timeAgo}</span>
                      </div>
                      <p className="text-[13px] text-black/62 leading-relaxed mt-0.5 break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}

              {nextCursor && (
                <button
                  onClick={() => loadComments(nextCursor)}
                  disabled={loading}
                  className="w-full py-2 text-center text-[12px] text-black/38 transition-colors hover:text-[#171313]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Charger plus'}
                </button>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {session ? (
              <div className="flex items-end gap-2 border-t border-black/[0.06] p-3">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un commentaire…"
                  rows={1}
                  className="min-h-[38px] max-h-24 flex-1 resize-none overflow-y-auto rounded-xl border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-[13px] text-[#171313] placeholder:text-black/28 transition-colors focus:border-black/[0.16] focus:outline-none"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || submitting}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171313] text-white transition-all hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4 -mr-px" />
                  }
                </button>
              </div>
            ) : (
              <div className="border-t border-black/[0.06] p-3">
                <p className="text-center text-[12px] text-black/38">
                  <a href="/auth/signin" className="text-[#7c5cff] hover:text-[#5f46df] underline">Connecte-toi</a> pour commenter
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
