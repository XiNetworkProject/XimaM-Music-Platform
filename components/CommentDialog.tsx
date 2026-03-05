'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Loader2, Reply, Send, Trash2, X, Edit3, Crown, MessageCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ModerationWarning from './ModerationWarning';
import CreatorModerationActions from './CreatorModerationActions';
import CreatorFilterManager from './CreatorFilterManager';

type CommentUser = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
};

export type Comment = {
  id: string;
  user: CommentUser;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  replies?: Comment[];
  isDeleted?: boolean;
  isCreatorFavorite?: boolean;
  customFiltered?: boolean;
  customFilterReason?: string | null;
  createdAt: string;
  updatedAt?: string;
};

interface CommentDialogProps {
  trackId: string;
  trackTitle: string;
  trackArtist: string;
  initialComments: Comment[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function formatRelative(dateString: string) {
  const d = new Date(dateString);
  const now = Date.now();
  const t = d.getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return d.toLocaleDateString('fr-FR');
}

export default function CommentDialog({
  trackId,
  trackTitle,
  trackArtist,
  initialComments,
  isOpen,
  onClose,
  className = '',
}: CommentDialogProps) {
  const { data: session } = useSession();

  const [isCreator, setIsCreator] = useState(false);
  const [viewMode, setViewMode] = useState<'public' | 'creator' | 'all'>('public');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeFiltered, setIncludeFiltered] = useState(false);

  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const listRef = useRef<HTMLDivElement | null>(null);

  const isDisabledTrack = useMemo(() => {
    return trackId === 'radio-mixx-party' || trackId === 'radio-ximam' || trackId.startsWith('ai-');
  }, [trackId]);

  // Creator check
  useEffect(() => {
    if (!isOpen) return;
    if (!session?.user?.id) {
      setIsCreator(false);
      return;
    }
    if (isDisabledTrack) {
      setIsCreator(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tracks/${trackId}/creator-check`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        setIsCreator(Boolean(json?.isCreator));
      } catch {
        if (!cancelled) setIsCreator(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDisabledTrack, isOpen, session?.user?.id, trackId]);

  const buildParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      params.set('limit', '25');
      params.set('offset', String(Math.max(0, offset)));
      if (isCreator) {
        params.set('includeDeleted', String(includeDeleted));
        params.set('includeFiltered', String(includeFiltered));
        params.set('includeStats', 'true');
        params.set('view', viewMode);
      }
      return params.toString();
    },
    [includeDeleted, includeFiltered, isCreator, viewMode],
  );

  const fetchPage = useCallback(
    async ({ reset, offset }: { reset: boolean; offset: number }) => {
      if (isDisabledTrack) {
        setComments([]);
        setHasMore(false);
        setNextOffset(0);
        setError(null);
        return;
      }
      if (!trackId) return;
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetch(`/api/tracks/${trackId}/comments/moderation?${buildParams(offset)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Erreur chargement');
        const list = Array.isArray(json?.comments) ? (json.comments as Comment[]) : [];
        setComments((prev) => {
          if (reset) return list;
          const seen = new Set(prev.map((c) => c.id));
          const merged = [...prev];
          for (const c of list) if (c?.id && !seen.has(c.id)) merged.push(c);
          return merged;
        });
        setHasMore(Boolean(json?.hasMore));
        setNextOffset(typeof json?.nextOffset === 'number' ? json.nextOffset : offset + 25);
      } catch (e: any) {
        setError(e?.message || 'Impossible de charger les commentaires');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildParams, isDisabledTrack, trackId],
  );

  // Load on open / mode changes
  useEffect(() => {
    if (!isOpen) return;
    // reset UI state
    setReplyTo(null);
    setReplyContent('');
    setEditingId(null);
    setEditContent('');
    setNewComment('');
    setModerationResult(null);
    setError(null);
    setNextOffset(0);
    setHasMore(false);
    // scroll top
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      } catch {}
    });
    fetchPage({ reset: true, offset: 0 });
  }, [fetchPage, includeDeleted, includeFiltered, isOpen, isCreator, viewMode]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    fetchPage({ reset: false, offset: nextOffset });
  }, [fetchPage, hasMore, loading, loadingMore, nextOffset]);

  const handleLike = useCallback(
    async (commentId: string) => {
      if (!session?.user?.id) return;
      // optimistic toggle
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, isLiked: !c.isLiked, likesCount: Math.max(0, (c.likesCount || 0) + (c.isLiked ? -1 : 1)) } : c,
        ),
      );
      try {
        const res = await fetch(`/api/tracks/${trackId}/comments/${commentId}/like`, { method: 'POST' });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, isLiked: Boolean(json?.isLiked), likesCount: Number(json?.likesCount || 0) } : c,
          ),
        );
      } catch {}
    },
    [session?.user?.id, trackId],
  );

  const handleModerationAction = useCallback(
    async (action: string, data?: any) => {
      const commentId = data?.commentId;
      const reason = data?.reason;
      if (!commentId) return;
      // best-effort optimistic: reload afterwards
      await fetch(`/api/tracks/${trackId}/comments/${commentId}/moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      }).catch(() => null);
      fetchPage({ reset: true, offset: 0 });
    },
    [fetchPage, trackId],
  );

  const submitComment = useCallback(async () => {
    if (!session?.user?.id) {
      setSubmitError('Connecte-toi pour commenter.');
      return;
    }
    if (isSubmitting) return;
    const content = newComment.trim();
    if (!content) return;
    if (moderationResult && !moderationResult.isClean) {
      setSubmitError('Ton commentaire a été refusé par la modération.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const supa = json?.supabase;
        const extra = supa?.code || supa?.message ? ` (${[supa?.code, supa?.message].filter(Boolean).join(' - ')})` : '';
        throw new Error((json?.error || 'Impossible de publier') + extra);
      }
      const comment = json?.comment as Comment | undefined;
      if (comment?.id) {
        setComments((prev) => [comment, ...prev]);
        setNewComment('');
        setModerationResult(null);
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Impossible de publier');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, moderationResult, newComment, session?.user?.id, trackId]);

  const submitReply = useCallback(
    async (parentId: string) => {
      if (!session?.user?.id) return;
      if (isSubmitting) return;
      const content = replyContent.trim();
      if (!content) return;
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/tracks/${trackId}/comments/${parentId}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Impossible de publier');
        const reply = json?.reply as Comment | undefined;
        if (reply?.id) {
          setComments((prev) =>
            prev.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c)),
          );
          setReplyTo(null);
          setReplyContent('');
        }
      } catch {
        // silent
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, replyContent, session?.user?.id, trackId],
  );

  const startEdit = useCallback((c: Comment) => {
    setEditingId(c.id);
    setEditContent(c.content || '');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!session?.user?.id) return;
    if (isSubmitting) return;
    const content = editContent.trim();
    if (!content) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tracks/${trackId}/comments/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Impossible de modifier');
      const updated = json?.comment as Comment | undefined;
      if (updated?.id) {
        setComments((prev) => prev.map((c) => (c.id === updated.id ? { ...c, content: updated.content, updatedAt: updated.updatedAt } : c)));
      }
      setEditingId(null);
      setEditContent('');
    } catch {
      // silent
    } finally {
      setIsSubmitting(false);
    }
  }, [editContent, editingId, isSubmitting, session?.user?.id, trackId]);

  const deleteOwn = useCallback(
    async (commentId: string) => {
      if (!session?.user?.id) return;
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await fetch(`/api/tracks/${trackId}/comments/${commentId}`, { method: 'DELETE' });
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, session?.user?.id, trackId],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="comments-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cx('fixed inset-0 z-[220] bg-black/60 backdrop-blur-[3px]', className)}
        onClick={onClose}
      >
        <motion.div
          key="comments-panel"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:w-[420px] w-full h-[85dvh] sm:h-full overflow-hidden flex flex-col"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Glass background */}
          <div className="absolute inset-0 bg-[#0a0a12]/[0.97] backdrop-blur-3xl border-t border-white/[0.08] rounded-t-[20px] sm:rounded-none sm:border-l sm:border-t-0" />

          <div className="relative flex flex-col h-full">
            {/* Drag handle (mobile) */}
            <div className="h-6 grid place-items-center sm:hidden shrink-0">
              <div className="h-[4px] w-10 rounded-full bg-white/25" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 pt-1 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/[0.08] grid place-items-center">
                      <MessageCircle className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-white">
                        Commentaires
                        <span className="ml-2 text-[13px] font-medium text-white/40 tabular-nums">
                          {comments.length}
                        </span>
                      </h3>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/35 line-clamp-1 mt-1.5 pl-[42px]">
                    {trackTitle} — {trackArtist}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition grid place-items-center border border-white/[0.08] active:scale-90"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Creator controls */}
              {isCreator ? (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-400/15 px-2.5 py-1 text-[11px] text-purple-300 font-medium">
                    <Crown className="h-3.5 w-3.5" />
                    Créateur
                  </span>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value as any)}
                    className="h-7 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 text-[11px] text-white/70 outline-none"
                  >
                    <option value="public">Publique</option>
                    <option value="creator">Créateur</option>
                    <option value="all">Tout</option>
                  </select>
                  {viewMode !== 'public' ? (
                    <>
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-white/50 cursor-pointer">
                        <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} className="rounded" />
                        Supprimés
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-white/50 cursor-pointer">
                        <input type="checkbox" checked={includeFiltered} onChange={(e) => setIncludeFiltered(e.target.checked)} className="rounded" />
                        Filtrés
                      </label>
                    </>
                  ) : null}
                  <CreatorFilterManager className="ml-auto" />
                </div>
              ) : null}

              <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 overscroll-contain">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-white/40">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  </div>
                  <span className="text-sm font-medium">Chargement…</span>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4 text-sm text-red-300/80">
                  {error}
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/30">
                  <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] grid place-items-center">
                    <MessageCircle className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-[15px] font-semibold text-white/50">Aucun commentaire</p>
                  <p className="text-xs text-white/25">Sois le premier à réagir !</p>
                </div>
              ) : null}

              {comments.map((c) => {
                const canEdit = session?.user?.id && session.user.id === c.user?.id && !c.isDeleted;
                return (
                  <div
                    key={c.id}
                    className={cx(
                      'rounded-2xl px-3.5 py-3 transition-colors',
                      'hover:bg-white/[0.03]',
                      c.isCreatorFavorite && 'bg-purple-500/[0.04] ring-1 ring-purple-400/15',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/[0.1] bg-white/[0.04] shrink-0 mt-0.5">
                        {c.user?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.user.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full grid place-items-center text-[12px] font-bold text-white/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                            {(c.user?.name || c.user?.username || 'U')[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-bold text-white/90">
                            {c.user?.name || c.user?.username || 'Utilisateur'}
                          </span>
                          <span className="text-[11px] text-white/25">{formatRelative(c.createdAt)}</span>
                          {c.isCreatorFavorite ? (
                            <span className="ml-auto text-[10px] rounded-full bg-purple-500/15 border border-purple-400/20 px-2 py-0.5 text-purple-300 font-medium">
                              ♥ Adoré
                            </span>
                          ) : null}
                          {c.customFiltered ? (
                            <span className="ml-auto text-[10px] rounded-full bg-amber-500/10 border border-amber-400/15 px-2 py-0.5 text-amber-300/70 font-medium">
                              Filtré
                            </span>
                          ) : null}
                          {c.isDeleted ? (
                            <span className="ml-auto text-[10px] rounded-full bg-red-500/10 border border-red-400/15 px-2 py-0.5 text-red-300/70 font-medium">
                              Supprimé
                            </span>
                          ) : null}
                        </div>

                        {editingId === c.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-indigo-500/30 resize-none text-white/90"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={saveEdit}
                                disabled={!editContent.trim() || isSubmitting}
                                className="rounded-full bg-indigo-500/20 border border-indigo-400/20 px-3.5 py-1.5 text-xs text-indigo-200 font-medium hover:bg-indigo-500/30 transition disabled:opacity-50"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditContent(''); }}
                                className="rounded-full bg-white/[0.04] border border-white/[0.08] px-3.5 py-1.5 text-xs text-white/50 hover:bg-white/[0.08] transition"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 text-[13px] text-white/60 whitespace-pre-wrap break-words leading-[1.6]">
                            {c.content}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleLike(c.id)}
                            className={cx(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95',
                              c.isLiked
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-400/20'
                                : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]',
                            )}
                          >
                            <Heart className={cx('h-3.5 w-3.5', c.isLiked && 'fill-current')} />
                            {(c.likesCount || 0) > 0 && <span className="tabular-nums">{c.likesCount}</span>}
                          </button>

                          <button
                            onClick={() => setReplyTo((prev) => (prev === c.id ? null : c.id))}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-white/35 font-semibold hover:text-white/60 hover:bg-white/[0.04] transition active:scale-95"
                          >
                            <Reply className="h-3.5 w-3.5" />
                            Répondre
                          </button>

                          {canEdit ? (
                            <>
                              <button
                                onClick={() => startEdit(c)}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition active:scale-95"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => deleteOwn(c.id)}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-red-300/50 hover:text-red-300 hover:bg-red-500/10 transition active:scale-95"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          ) : null}

                          {isCreator ? (
                            <CreatorModerationActions
                              commentId={c.id}
                              trackId={trackId}
                              isCreator={isCreator}
                              isCreatorFavorite={Boolean(c.isCreatorFavorite)}
                              isDeleted={Boolean(c.isDeleted)}
                              isFiltered={Boolean(c.customFiltered)}
                              onAction={handleModerationAction}
                            />
                          ) : null}
                        </div>

                        {/* Reply box */}
                        {replyTo === c.id ? (
                          <div className="mt-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Ta réponse…"
                              rows={2}
                              className="w-full resize-none bg-transparent text-[13px] outline-none text-white/80 placeholder:text-white/20"
                              autoFocus
                            />
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setReplyTo(null); setReplyContent(''); }}
                                className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/50 transition rounded-full"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => submitReply(c.id)}
                                disabled={!replyContent.trim() || isSubmitting}
                                className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 text-[11px] text-white font-semibold shadow-sm shadow-indigo-500/20 hover:brightness-110 transition disabled:opacity-50"
                              >
                                {isSubmitting ? '…' : 'Envoyer'}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* Replies */}
                        {c.replies && c.replies.length ? (
                          <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-indigo-500/10">
                            {c.replies.map((r) => (
                              <div key={r.id} className="rounded-xl bg-white/[0.02] px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] font-bold text-white/65">
                                    {r.user?.name || r.user?.username || 'Utilisateur'}
                                  </span>
                                  <span className="text-[10px] text-white/20">{formatRelative(r.createdAt)}</span>
                                </div>
                                <p className="mt-0.5 text-[12px] text-white/45 whitespace-pre-wrap break-words leading-[1.5]">{r.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore ? (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.06] px-3 py-3 text-xs text-white/40 font-semibold hover:bg-white/[0.06] transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…</span>
                  ) : 'Voir plus de commentaires'}
                </button>
              ) : null}
            </div>

            {/* Composer */}
            <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#0a0a12]/80 backdrop-blur-xl">
              <div className="flex items-end gap-2.5">
                <div className="flex-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] focus-within:border-indigo-500/30 focus-within:bg-white/[0.06] transition-all px-4 py-2.5">
                  <textarea
                    value={newComment}
                    onChange={(e) => {
                      setNewComment(e.target.value);
                      if (submitError) setSubmitError(null);
                    }}
                    placeholder={session?.user?.id ? 'Ajouter un commentaire…' : 'Connecte-toi pour commenter'}
                    disabled={!session?.user?.id || isDisabledTrack}
                    rows={1}
                    maxLength={1000}
                    className="w-full resize-none bg-transparent text-[13px] outline-none text-white/80 placeholder:text-white/25 disabled:opacity-40"
                    onFocus={(e) => { if (e.currentTarget.rows < 2) e.currentTarget.rows = 2; }}
                    onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.rows = 1; }}
                  />
                  {newComment.length > 0 && (
                    <div className="mt-1 text-right text-[10px] text-white/20 tabular-nums">
                      {newComment.length}/1000
                    </div>
                  )}
                </div>
                <button
                  onClick={submitComment}
                  disabled={!session?.user?.id || !newComment.trim() || isSubmitting || (moderationResult && !moderationResult.isClean)}
                  className="h-11 w-11 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:brightness-110 transition grid place-items-center disabled:opacity-25 shrink-0 shadow-lg shadow-indigo-500/20 active:scale-90"
                  aria-label="Envoyer"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                </button>
              </div>

              {submitError ? <div className="mt-2 text-xs text-red-400/80">{submitError}</div> : null}
              <ModerationWarning content={newComment} onModerationChange={setModerationResult} className="mt-2" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}