'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Loader2, Reply, Send, Trash2, X, Edit3, Crown } from 'lucide-react';
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
    if (!session?.user?.id) return;
    if (isSubmitting) return;
    const content = newComment.trim();
    if (!content) return;
    if (moderationResult && !moderationResult.isClean) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Impossible de publier');
      const comment = json?.comment as Comment | undefined;
      if (comment?.id) {
        setComments((prev) => [comment, ...prev]);
        setNewComment('');
        setModerationResult(null);
      }
    } catch (e: any) {
      // on laisse ModerationWarning gérer les détails
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
        className={cx('fixed inset-0 z-[220] bg-black/55 backdrop-blur-[2px]', className)}
        onClick={onClose}
      >
        <motion.div
          key="comments-panel"
          initial={{ y: 40, opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:w-[420px] w-full h-[85svh] sm:h-full bg-background-tertiary border border-border-secondary/60 shadow-2xl rounded-t-3xl sm:rounded-none overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Drag handle */}
          <div className="h-6 grid place-items-center">
            <div className="h-1 w-10 rounded-full bg-white/15" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 border-b border-border-secondary/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground-primary">
                  Commentaires <span className="text-foreground-inactive font-normal">({comments.length})</span>
                </div>
                <div className="text-xs text-foreground-inactive line-clamp-1">
                  {trackTitle} • {trackArtist}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-9 w-9 rounded-full border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Creator controls */}
            {isCreator ? (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-2 rounded-full border border-border-secondary bg-background-fog-thin px-3 py-1.5 text-xs text-foreground-secondary">
                  <Crown className="h-4 w-4 text-[var(--accent-brand)]" />
                  Mode créateur
                </span>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="h-9 rounded-full border border-border-secondary bg-background-fog-thin px-3 text-xs outline-none"
                >
                  <option value="public">Vue publique</option>
                  <option value="creator">Vue créateur</option>
                  <option value="all">Tout voir</option>
                </select>
                {viewMode !== 'public' ? (
                  <>
                    <label className="inline-flex items-center gap-2 text-xs text-foreground-secondary">
                      <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
                      Supprimés
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-foreground-secondary">
                      <input type="checkbox" checked={includeFiltered} onChange={(e) => setIncludeFiltered(e.target.checked)} />
                      Filtrés
                    </label>
                  </>
                ) : null}
                <CreatorFilterManager className="ml-auto" />
              </div>
            ) : null}
          </div>

          {/* List */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-foreground-inactive">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-border-secondary bg-background-fog-thin p-3 text-sm text-foreground-secondary">
                {error}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-sm text-foreground-inactive">Sois le premier à commenter.</div>
            ) : null}

            {comments.map((c) => {
              const canEdit = session?.user?.id && session.user.id === c.user?.id && !c.isDeleted;
              return (
                <div
                  key={c.id}
                  className={cx(
                    'rounded-2xl border bg-background-fog-thin p-3',
                    'border-border-secondary/60',
                    c.isCreatorFavorite && 'shadow-[0_0_0_1px_rgba(255,75,209,0.25)]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full overflow-hidden border border-border-secondary bg-background-tertiary shrink-0">
                      {c.user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.user.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs text-foreground-secondary">
                          {(c.user?.name || c.user?.username || 'U')[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground-primary line-clamp-1">
                          {c.user?.name || c.user?.username || 'Utilisateur'}
                        </span>
                        <span className="text-xs text-foreground-inactive">@{c.user?.username || 'user'}</span>
                        <span className="text-xs text-foreground-inactive">• {formatRelative(c.createdAt)}</span>
                        {c.isCreatorFavorite ? (
                          <span className="ml-auto text-[11px] rounded-full border border-border-secondary bg-white/5 px-2 py-0.5 text-foreground-secondary">
                            Adoré
                          </span>
                        ) : null}
                        {c.customFiltered ? (
                          <span className="ml-auto text-[11px] rounded-full border border-border-secondary bg-white/5 px-2 py-0.5 text-foreground-secondary">
                            Filtré
                          </span>
                        ) : null}
                        {c.isDeleted ? (
                          <span className="ml-auto text-[11px] rounded-full border border-border-secondary bg-white/5 px-2 py-0.5 text-foreground-secondary">
                            Supprimé
                          </span>
                        ) : null}
                      </div>

                      {editingId === c.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full rounded-xl border border-border-secondary bg-background-tertiary px-3 py-2 text-sm outline-none focus:border-border-primary resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={!editContent.trim() || isSubmitting}
                              className="rounded-full border border-border-secondary bg-background-tertiary px-3 py-2 text-xs hover:bg-overlay-on-primary transition disabled:opacity-50"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditContent('');
                              }}
                              className="rounded-full border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs hover:bg-overlay-on-primary transition"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-foreground-secondary whitespace-pre-wrap break-words">
                          {c.content}
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleLike(c.id)}
                          className={cx(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                            'border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary',
                            c.isLiked && 'text-rose-200 border-rose-500/30 bg-rose-500/10',
                          )}
                        >
                          <Heart className={cx('h-4 w-4', c.isLiked && 'fill-current')} />
                          <span className="tabular-nums">{c.likesCount || 0}</span>
                        </button>

                        <button
                          onClick={() => setReplyTo((prev) => (prev === c.id ? null : c.id))}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary px-2.5 py-1 text-xs transition"
                        >
                          <Reply className="h-4 w-4" />
                          Répondre
                        </button>

                        {canEdit ? (
                          <>
                            <button
                              onClick={() => startEdit(c)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border-secondary bg-background-tertiary hover:bg-overlay-on-primary px-2.5 py-1 text-xs transition"
                            >
                              <Edit3 className="h-4 w-4" />
                              Modifier
                            </button>
                            <button
                              onClick={() => deleteOwn(c.id)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1 text-xs transition text-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
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

                      {replyTo === c.id ? (
                        <div className="mt-3 rounded-2xl border border-border-secondary bg-background-tertiary p-3">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Répondre…"
                            rows={2}
                            className="w-full resize-none bg-transparent text-sm outline-none"
                          />
                          <div className="mt-2 flex items-center justify-end">
                            <button
                              onClick={() => submitReply(c.id)}
                              disabled={!replyContent.trim() || isSubmitting}
                              className="rounded-full border border-border-secondary bg-background-fog-thin px-3 py-2 text-xs hover:bg-overlay-on-primary transition disabled:opacity-50"
                            >
                              {isSubmitting ? '…' : 'Envoyer'}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {c.replies && c.replies.length ? (
                        <div className="mt-3 space-y-2">
                          {c.replies.map((r) => (
                            <div key={r.id} className="ml-6 rounded-2xl border border-border-secondary bg-background-tertiary p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground-primary">
                                  {r.user?.name || r.user?.username || 'Utilisateur'}
                                </span>
                                <span className="text-[11px] text-foreground-inactive">@{r.user?.username || 'user'}</span>
                                <span className="text-[11px] text-foreground-inactive">• {formatRelative(r.createdAt)}</span>
                              </div>
                              <div className="mt-1 text-sm text-foreground-secondary whitespace-pre-wrap break-words">{r.content}</div>
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
                className="w-full rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2 text-sm text-foreground-secondary hover:bg-overlay-on-primary transition disabled:opacity-50"
              >
                {loadingMore ? 'Chargement…' : 'Charger plus'}
              </button>
            ) : null}
          </div>

          {/* Composer */}
          <div className="border-t border-border-secondary/60 px-4 py-3 bg-background-tertiary">
            <div className="flex items-end gap-2">
              <div className="flex-1 rounded-2xl border border-border-secondary bg-background-fog-thin px-3 py-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={session?.user?.id ? 'Ajouter un commentaire…' : 'Connecte-toi pour commenter'}
                  disabled={!session?.user?.id || isDisabledTrack}
                  rows={2}
                  maxLength={1000}
                  className="w-full resize-none bg-transparent text-sm outline-none text-foreground-primary placeholder:text-foreground-inactive disabled:opacity-60"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-foreground-inactive">
                  <span className="tabular-nums">{newComment.length}/1000</span>
                  <span className="hidden sm:inline">Respecte la communauté</span>
                </div>
              </div>
              <button
                onClick={submitComment}
                disabled={!session?.user?.id || !newComment.trim() || isSubmitting || (moderationResult && !moderationResult.isClean)}
                className="h-11 w-11 rounded-2xl border border-border-secondary bg-background-fog-thin hover:bg-overlay-on-primary transition grid place-items-center disabled:opacity-50"
                aria-label="Envoyer"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>

            <ModerationWarning content={newComment} onModerationChange={setModerationResult} className="mt-2" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}