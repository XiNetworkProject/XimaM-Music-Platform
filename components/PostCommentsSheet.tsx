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
            className="fixed inset-x-0 bottom-0 z-[201] max-h-[80dvh] flex flex-col rounded-t-2xl bg-[#0e0e18] border-t border-white/[0.06] lg:left-auto lg:right-6 lg:bottom-24 lg:w-[420px] lg:rounded-2xl lg:border lg:max-h-[70dvh]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 lg:hidden">
              <div className="w-10 h-1 rounded-full bg-white/[0.1]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-semibold text-white/90">
                Commentaires
                {comments.length > 0 && (
                  <span className="ml-2 text-[12px] text-white/30 font-normal tabular-nums">{comments.length}</span>
                )}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {loading && comments.length === 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                </div>
              )}
              {!loading && comments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[13px] text-white/25">Aucun commentaire. Sois le premier !</p>
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
                        <span className="text-[13px] font-semibold text-white/80">
                          {comment.user?.name || comment.user?.username}
                        </span>
                        <span className="text-[11px] text-white/25 tabular-nums">{timeAgo}</span>
                      </div>
                      <p className="text-[13px] text-white/60 leading-relaxed mt-0.5 break-words">
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
                  className="w-full text-center text-[12px] text-white/30 hover:text-white/50 py-2 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Charger plus'}
                </button>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {session ? (
              <div className="p-3 border-t border-white/[0.06] flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrire un commentaire…"
                  rows={1}
                  className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-white/[0.2] transition-colors min-h-[38px] max-h-24 overflow-y-auto"
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
                  className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-white hover:bg-violet-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shrink-0"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4 -mr-px" />
                  }
                </button>
              </div>
            ) : (
              <div className="p-3 border-t border-white/[0.06]">
                <p className="text-center text-[12px] text-white/25">
                  <a href="/auth/signin" className="text-violet-400 hover:text-violet-300 underline">Connecte-toi</a> pour commenter
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
