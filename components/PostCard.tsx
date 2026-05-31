'use client';

import React, { memo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Play, Pause, Music2, Share2, Repeat2, X, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import TrackCover from '@/components/TrackCover';
import { getCdnUrl } from '@/lib/cdn';

export interface PostCreator {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  is_verified?: boolean;
}

export interface PostTrack {
  id: string;
  title: string;
  artist_name?: string;
  cover_url?: string;
  cover_video_url?: string | null;
  coverVideoUrl?: string | null;
  cover_video_poster_url?: string | null;
  coverVideoPosterUrl?: string | null;
  audio_url?: string;
  duration?: number;
}

export interface Post {
  id: string;
  type: 'text' | 'photo' | 'track_share' | 'repost';
  content?: string;
  image_url?: string;
  track_id?: string;
  original_post_id?: string | null;
  include_original_track?: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  creator: PostCreator;
  track?: PostTrack | null;
  original_post?: Post | null;
  track_hidden?: boolean;
  isLiked: boolean;
}

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onPostCreated?: (post: Post) => void;
  /** compact = card horizontale pour affichage inline entre sections */
  compact?: boolean;
}

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

function safeString(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function relativeTime(dateLike?: string) {
  if (!dateLike) return 'maintenant';
  const time = new Date(dateLike).getTime();
  if (!Number.isFinite(time)) return 'maintenant';
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(dateLike).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getPostTypeLabel(post: Post) {
  if (post.type === 'track_share') return 'partage de son';
  if (post.type === 'photo') return 'post image';
  if (post.type === 'repost') return 'post partage';
  return 'discussion';
}

function buildShareText(post: Post) {
  const author = safeString(post.creator.name || post.creator.username, 'Membre');

  if (post.type === 'repost' && post.original_post) {
    const originalAuthor = safeString(post.original_post.creator.name || post.original_post.creator.username, 'Membre');
    const parts = [`${author} a partage un post de ${originalAuthor} sur Synaura.`];
    if (post.content) parts.push(post.content);
    if (post.original_post.content) parts.push(`${originalAuthor}: ${post.original_post.content}`);
    if (post.original_post.track) {
      parts.push(`Son inclus: ${post.original_post.track.title} - ${post.original_post.track.artist_name || 'Artiste'}`);
    }
    return parts.join('\n\n');
  }

  if (post.track) {
    return `${author} a partage ${post.track.title} de ${post.track.artist_name || 'Artiste'} sur Synaura.`;
  }

  if (post.content) {
    return `${author} a publie: ${post.content}`;
  }

  return `Regarde ce post de ${author} sur Synaura.`;
}

type InlineComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatar?: string | null;
  };
  replies: InlineComment[];
};

function normalizeInlineComment(raw: any): InlineComment {
  return {
    id: String(raw?.id || ''),
    content: safeString(raw?.content, ''),
    createdAt: safeString(raw?.createdAt || raw?.created_at, new Date().toISOString()),
    user: {
      id: String(raw?.user?.id || raw?.user_id || ''),
      username: safeString(raw?.user?.username, 'utilisateur'),
      name: safeString(raw?.user?.name || raw?.user?.username, 'Membre'),
      avatar: typeof raw?.user?.avatar === 'string' ? raw.user.avatar : null,
    },
    replies: Array.isArray(raw?.replies) ? raw.replies.map(normalizeInlineComment) : [],
  };
}

function removeCommentFromTree(comments: InlineComment[], commentId: string): InlineComment[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({ ...comment, replies: removeCommentFromTree(comment.replies, commentId) }));
}

async function copyTextToClipboard(value: string, successMessage = 'Lien copie') {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      notify.success(successMessage, '');
      return true;
    }
  } catch {}

  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (copied) {
        notify.success(successMessage, '');
        return true;
      }
    }
  } catch {}

  notify.error('', 'Copie impossible');
  return false;
}

function Avatar({ creator, size = 'md' }: { creator: PostCreator; size?: 'sm' | 'md' }) {
  const url = creator.avatar ? getCdnUrl(creator.avatar) || creator.avatar : null;
  const cls = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-sm';
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${cls} rounded-full object-cover ring-2 ring-white/10 shrink-0`}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {(creator.name || creator.username || '?')[0].toUpperCase()}
    </div>
  );
}

function AvatarBubble({
  value,
  size = 'sm',
  tint = '#171313',
}: {
  value: string;
  size?: 'sm' | 'md';
  tint?: string;
}) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm' };
  return (
    <div className={`${sizes[size]} grid shrink-0 place-items-center rounded-full font-black text-white`} style={{ background: tint }}>
      {value.slice(0, 1)}
    </div>
  );
}

function CommentAvatar({ comment }: { comment: InlineComment }) {
  const url = comment.user.avatar ? getCdnUrl(comment.user.avatar) || comment.user.avatar : null;
  const letter = (comment.user.name || comment.user.username || '?').slice(0, 1).toUpperCase();
  if (url) {
    return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  }
  return <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171313] text-xs font-black text-[#fffaf2]">{letter}</div>;
}

function InlineSharePanel({
  post,
  onClose,
  onPostCreated,
}: {
  post: Post;
  onClose: () => void;
  onPostCreated?: (post: Post) => void;
}) {
  const { data: session } = useSession();
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);
  const [includeTrack, setIncludeTrack] = useState(Boolean(post.track));

  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${encodeURIComponent(post.id)}`;
  const text = buildShareText(post);
  const hasTrackOption = Boolean(post.track);
  const sourceAuthor = safeString(post.creator.name || post.creator.username, 'Membre');

  useEffect(() => {
    setCaption('');
    setIncludeTrack(Boolean(post.track));
  }, [post.id, post.track]);

  const handleRepost = useCallback(async () => {
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour partager sur ton profil');
      return;
    }
    if (sharing) return;

    setSharing(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'repost',
          original_post_id: post.id,
          content: caption.trim() || undefined,
          include_original_track: hasTrackOption ? includeTrack : false,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Partage impossible');
      onPostCreated?.(payload);
      notify.success('', 'Post partage sur ton profil');
      onClose();
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de partager ce post');
    } finally {
      setSharing(false);
    }
  }, [caption, hasTrackOption, includeTrack, onClose, onPostCreated, post.id, session?.user, sharing]);

  return (
    <div className="mt-3 rounded-[1.25rem] border border-black/[0.08] bg-black/[0.035] p-3 text-[#171313]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/38">Partager sur ton profil</p>
          <p className="mt-1 text-sm leading-6 text-black/52">Republie le post complet de {sourceAuthor} sur ton profil.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[0.055] text-black/42 transition hover:bg-black/[0.1] hover:text-black"
          title="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={caption}
        onChange={(event) => setCaption(event.target.value.slice(0, 220))}
        className="mt-3 min-h-[88px] w-full rounded-[1rem] border border-black/[0.08] bg-white/68 px-3 py-3 text-sm text-[#171313] outline-none placeholder:text-black/30 focus:border-black/18"
        placeholder="Ajoute un texte avant de partager ce post..."
      />

      {hasTrackOption ? (
        <button
          type="button"
          onClick={() => setIncludeTrack((current) => !current)}
          className={`mt-3 flex w-full items-center justify-between rounded-[1rem] border px-3 py-2.5 text-left transition ${
            includeTrack
              ? 'border-[#171313]/15 bg-[#171313] text-[#fffaf2]'
              : 'border-black/[0.08] bg-white/62 text-[#171313]'
          }`}
        >
          <span className="text-sm font-black">Inclure la musique du post</span>
          <span className={`text-xs font-black uppercase tracking-[0.18em] ${includeTrack ? 'text-white/72' : 'text-black/42'}`}>
            {includeTrack ? 'Oui' : 'Non'}
          </span>
        </button>
      ) : null}

      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        <button
          type="button"
          onClick={() => void handleRepost()}
          disabled={sharing}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#171313] px-4 text-sm font-black text-[#fffaf2] transition hover:opacity-92 disabled:opacity-60 sm:w-auto"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sharing ? 'Publication...' : 'Partager sur mon profil'}
        </button>
        <button
          type="button"
          onClick={async () => {
            const copied = await copyTextToClipboard(url, 'Lien copie');
            if (copied) onClose();
          }}
          className="inline-flex h-10 w-full items-center justify-center rounded-full bg-black/[0.055] px-4 text-sm font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:w-auto"
        >
          Copier le lien
        </button>
        <button
          type="button"
          onClick={async () => {
            const copied = await copyTextToClipboard(text, 'Texte copie');
            if (copied) onClose();
          }}
          className="inline-flex h-10 w-full items-center justify-center rounded-full bg-black/[0.055] px-4 text-sm font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:w-auto"
        >
          Copier le texte
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-black/46">Tu peux aussi copier le lien ou le texte si tu veux juste l’envoyer.</p>
    </div>
  );
}

function InlineCommentsPanel({
  targetId,
  ownerId,
  onCountChange,
}: {
  targetId: string;
  ownerId?: string;
  onCountChange?: (delta: number) => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<InlineComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadComments = useCallback(async (mode: 'initial' | 'more' = 'initial', nextCursorValue: string | null = null) => {
    if (mode === 'initial') setLoading(true);
    try {
      const query = `?limit=8${mode === 'more' && typeof nextCursorValue === 'string' ? `&cursor=${encodeURIComponent(nextCursorValue)}` : ''}`;
      const response = await fetch(`/api/posts/${encodeURIComponent(targetId)}/comments${query}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      const nextComments = (Array.isArray(payload?.comments) ? payload.comments : []).map(normalizeInlineComment);
      if (mode === 'initial') setComments(nextComments);
      else setComments((current) => [...current, ...nextComments]);
      setCursor(typeof payload?.nextCursor === 'string' ? payload.nextCursor : null);
      setHasMore(Boolean(payload?.nextCursor));
    } catch {
      notify.error('', 'Impossible de charger les commentaires');
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, [targetId]);

  useEffect(() => {
    void loadComments('initial');
  }, [loadComments, targetId]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    if (!session) {
      notify.error('', 'Connecte-toi pour commenter');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(targetId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'submit-comment-failed');
      const nextComment = normalizeInlineComment(payload);
      setComments((current) => [...current, nextComment]);
      setText('');
      onCountChange?.(1);
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible d’envoyer le commentaire');
    } finally {
      setSubmitting(false);
    }
  }, [onCountChange, session, targetId, text]);

  const handleDeleteComment = useCallback(async (comment: InlineComment) => {
    if (!session?.user) {
      notify.error('', 'Connecte-toi pour supprimer un commentaire');
      return;
    }
    if (!comment.id || deletingCommentId) return;

    const currentUserId = String((session.user as any)?.id || '');
    const canDelete = currentUserId && (currentUserId === comment.user.id || currentUserId === ownerId);
    if (!canDelete) {
      notify.error('', 'Tu ne peux pas supprimer ce commentaire');
      return;
    }

    setDeletingCommentId(comment.id);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(targetId)}/comments?comment_id=${encodeURIComponent(comment.id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Suppression impossible');
      setComments((current) => removeCommentFromTree(current, comment.id));
      onCountChange?.(-1);
      notify.success('', 'Commentaire supprime');
    } catch (error: any) {
      notify.error('', error?.message || 'Impossible de supprimer le commentaire');
    } finally {
      setDeletingCommentId(null);
    }
  }, [deletingCommentId, onCountChange, ownerId, session?.user, targetId]);

  const renderComment = (comment: InlineComment, nested = false): React.ReactNode => {
    const currentUserId = String((session?.user as any)?.id || '');
    const canDelete = Boolean(currentUserId && (currentUserId === comment.user.id || currentUserId === ownerId));

    return (
      <div key={`${nested ? 'reply' : 'comment'}-${comment.id}`} className={nested ? 'ml-7 mt-2 sm:ml-10' : ''}>
        <div className="flex gap-3">
          <CommentAvatar comment={comment} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-black text-[#171313]">{comment.user.name}</span>
              <span className="text-xs font-semibold text-black/34">@{comment.user.username}</span>
              <span className="text-xs font-semibold text-black/28">{relativeTime(comment.createdAt)}</span>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteComment(comment)}
                  disabled={deletingCommentId === comment.id}
                  className="text-xs font-black text-black/32 transition hover:text-black"
                >
                  {deletingCommentId === comment.id ? 'Suppression...' : 'Supprimer'}
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-black/66">{comment.content}</p>
            {comment.replies.length ? <div className="mt-2 space-y-2">{comment.replies.map((reply) => renderComment(reply, true))}</div> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-3 rounded-[1.25rem] border border-black/[0.08] bg-black/[0.035] p-3 text-[#171313]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-black/38">Commentaires dans le fil</p>
        {hasMore ? (
          <button type="button" onClick={() => void loadComments('more', cursor)} className="text-xs font-black text-black/46 transition hover:text-black">
            Charger plus
          </button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {loading ? (
          <p className="text-sm text-black/44">Chargement...</p>
        ) : comments.length ? (
          comments.map((comment) => renderComment(comment))
        ) : (
          <p className="text-sm text-black/44">Aucun commentaire pour le moment.</p>
        )}
      </div>

      <div className="mt-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-h-[76px] w-full rounded-[1rem] border border-black/[0.08] bg-white/68 px-3 py-3 text-sm text-[#171313] outline-none placeholder:text-black/28 focus:border-black/18"
          placeholder="Ecris une reponse sans quitter le profil..."
        />
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-black/36">Tout reste ancre dans cette carte.</p>
          <button type="button" onClick={handleSubmit} disabled={submitting || !text.trim()} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#171313] px-4 text-sm font-black text-[#fffaf2] transition hover:opacity-92 disabled:opacity-50 sm:w-auto">
            {submitting ? 'Envoi...' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PostCard = memo(function PostCard({ post, onDelete, onPostCreated, compact = false }: PostCardProps) {
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showMenu, setShowMenu] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [embeddedImgError, setEmbeddedImgError] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const currentTrackId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isPlayingThis = post.track && currentTrackId === post.track.id && audioState.isPlaying;
  const isPlayingOriginal = post.original_post?.track && currentTrackId === post.original_post.track.id && audioState.isPlaying;
  const isOwn = (session?.user as any)?.id === post.creator.id ||
    (session?.user as any)?.username === post.creator.username;

  const inlineTime = relativeTime(post.created_at);
  const typeLabel = getPostTypeLabel(post);
  const shareText = buildShareText(post);

  useEffect(() => {
    setLiked(post.isLiked);
    setLikesCount(post.likes_count);
    setCommentsCount(post.comments_count);
    setEmbeddedImgError(false);
    setCommentsOpen(false);
    setShareOpen(false);
  }, [post.comments_count, post.id, post.isLiked, post.likes_count]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) { notify.error('', 'Connecte-toi pour liker'); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: wasLiked ? 'DELETE' : 'POST' });
      if (!res.ok && res.status !== 409) {
        setLiked(wasLiked);
        setLikesCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
    }
  }, [liked, post.id, session]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Supprimer ce post ?')) return;
    setShowMenu(false);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) { onDelete?.(post.id); notify.success('', 'Post supprimé'); }
      else notify.error('', 'Impossible de supprimer');
    } catch { notify.error('', 'Erreur réseau'); }
  }, [post.id, onDelete]);

  const handlePlayTrack = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.track?.audio_url) return;
    playTrack({
      _id: post.track.id, title: post.track.title,
      artist: { _id: '', name: post.track.artist_name || 'Artiste', username: '' },
      audioUrl: post.track.audio_url, coverUrl: post.track.cover_url, coverVideoUrl: post.track.cover_video_url || post.track.coverVideoUrl, coverVideoPosterUrl: post.track.cover_video_poster_url || post.track.coverVideoPosterUrl,
      duration: post.track.duration || 0, likes: 0, plays: 0,
    } as any);
  }, [post.track, playTrack]);

  const handlePlayOriginalTrack = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.original_post?.track?.audio_url) return;
    playTrack({
      _id: post.original_post.track.id,
      title: post.original_post.track.title,
      artist: { _id: '', name: post.original_post.track.artist_name || 'Artiste', username: '' },
      audioUrl: post.original_post.track.audio_url,
      coverUrl: post.original_post.track.cover_url,
      coverVideoUrl: post.original_post.track.cover_video_url || post.original_post.track.coverVideoUrl,
      coverVideoPosterUrl: post.original_post.track.cover_video_poster_url || post.original_post.track.coverVideoPosterUrl,
      duration: post.original_post.track.duration || 0,
      likes: 0,
      plays: 0,
    } as any);
  }, [playTrack, post.original_post]);

  /* ── COMPACT (inline entre sections) ── */
  if (compact) {
    const previewPost = post.type === 'repost' && post.original_post ? post.original_post : post;
    const thumbSrc = previewPost.type === 'photo'
      ? (imgError ? null : previewPost.image_url)
      : previewPost.track?.cover_url || null;

    return (
      <article
        className="relative flex gap-3 overflow-hidden rounded-[1.4rem] border border-black/[0.06] bg-black/[0.025] p-3 transition-all duration-200 group hover:border-black/[0.1] hover:bg-black/[0.045]"
      >
        {/* Accent line */}
        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-violet-500 to-indigo-500 opacity-60" />

        {/* Miniature photo/track (à gauche) ou avatar */}
        {thumbSrc ? (
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/[0.06]">
            <img
              src={thumbSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="shrink-0 mt-0.5">
            <Avatar creator={post.creator} size="sm" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12px] font-semibold text-black/70 truncate">
              {post.creator.name || post.creator.username}
            </span>
            <span className="text-[11px] text-black/28 shrink-0">{inlineTime}</span>
          </div>

          {post.type === 'repost' && post.original_post ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-black/36">
                <Repeat2 className="h-3 w-3" />
                Partage
              </div>
              <p className="text-[13px] text-black/56 line-clamp-2 leading-snug">
                {post.content || `A partage un post de ${post.original_post.creator.name || post.original_post.creator.username}`}
              </p>
            </div>
          ) : post.type === 'track_share' && post.track ? (
            <div className="flex items-center gap-1.5">
              <Music2 className="w-3 h-3 text-violet-400 shrink-0" />
              <span className="text-[13px] font-semibold text-[#171313] truncate">{post.track.title}</span>
            </div>
          ) : (
            post.content && (
              <p className="text-[13px] text-black/56 line-clamp-2 leading-snug">{post.content}</p>
            )
          )}

          {/* Artiste pour track_share */}
          {post.type === 'track_share' && post.track?.artist_name && (
            <p className="text-[11px] text-black/35 truncate mt-0.5">{post.track.artist_name}</p>
          )}
        </div>

        {/* Like + play */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          <button
            onClick={e => { e.preventDefault(); handleLike(e as any); }}
            className={`flex items-center gap-1 text-[11px] font-medium transition-all ${liked ? 'text-rose-500' : 'text-black/32 hover:text-black/55'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            {likesCount > 0 && fmtCount(likesCount)}
          </button>
          {post.type === 'track_share' && post.track?.audio_url && (
            <button
              onClick={e => { e.preventDefault(); handlePlayTrack(e as any); }}
              className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center hover:bg-violet-500/50 transition-all"
            >
              {isPlayingThis ? <Pause className="w-2.5 h-2.5 text-white" /> : <Play className="w-2.5 h-2.5 text-white ml-px" />}
            </button>
          )}
        </div>
      </article>
    );
  }

  /* ── FULL CARD ── */

  const postUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/posts/${encodeURIComponent(post.id)}`;

  /* TEXT POST */
    return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-[#fffaf2] transition-all duration-200 hover:border-black/[0.1]">
      <div className="p-3 sm:p-5">
        <div className="flex gap-2.5 sm:gap-3">
          <div className="shrink-0">
            <Avatar creator={post.creator} size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/profile/${post.creator.username}`} className="font-black hover:underline">
                {post.creator.name || post.creator.username}
              </Link>
                  <span className="text-xs font-semibold text-black/38 sm:text-sm">@{post.creator.username}</span>
                  <span className="text-xs font-semibold text-black/28 sm:text-sm">· {inlineTime}</span>
                </div>
                <span className="mt-2 inline-flex rounded-full bg-black/[0.055] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-black/46 sm:px-2.5 sm:text-[10px]">
                  {typeLabel}
                </span>
                {post.type === 'repost' ? (
                  <p className="mt-3 text-[13px] font-semibold text-black/46">
                    A partage un post sur son profil.
                  </p>
                ) : null}
                {post.content ? (
                  <p className="mt-3 text-[14px] leading-6 text-black/72 whitespace-pre-wrap break-words sm:text-[15px] sm:leading-7">{post.content}</p>
                ) : null}
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMenu((current) => !current)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.055] text-black/42 transition hover:bg-black/[0.1] hover:text-black sm:h-9 sm:w-9"
                  title="Actions du post"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {showMenu ? (
                  <div className="absolute right-0 top-[calc(100%+0.45rem)] z-20 w-52 rounded-[1rem] border border-black/[0.08] bg-[#fffaf2] p-1.5 shadow-[0_16px_48px_rgba(30,25,20,0.18)]">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentsOpen(true);
                        setShowMenu(false);
                      }}
                      className="flex h-9 w-full items-center rounded-[0.75rem] px-3 text-left text-xs font-black text-black/58 transition hover:bg-black/[0.055] hover:text-black"
                    >
                      Voir les commentaires
                    </button>
                    {isOwn ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        className="flex h-9 w-full items-center gap-2 rounded-[0.75rem] px-3 text-left text-xs font-black text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {post.track ? (
              <div className="mt-4 overflow-hidden rounded-[1.35rem] bg-[#171313] text-white">
                <div className="relative">
                  {post.track.cover_url ? (
                    <div className="absolute inset-0 overflow-hidden">
                      <img src={post.track.cover_url} alt="" className="h-full w-full scale-150 object-cover opacity-20 blur-2xl" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#171313]" />
                    </div>
                  ) : null}
                  <div className="relative flex items-center gap-4 p-4">
                    <TrackCover src={post.track.cover_url || null} videoSrc={(post.track as any).cover_video_url || (post.track as any).coverVideoUrl || null} posterSrc={(post.track as any).cover_video_poster_url || (post.track as any).coverVideoPosterUrl || post.track.cover_url || null} title={post.track.title} className="h-16 w-16 shrink-0 shadow-2xl" rounded="rounded-xl" objectFit="cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-white">{post.track.title}</p>
                      <p className="truncate text-[12px] text-white/55">{post.track.artist_name || 'Artiste inconnu'}</p>
                    </div>
                    <button
                      onClick={handlePlayTrack}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95"
                    >
                      {isPlayingThis ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {post.type === 'repost' ? (
              post.original_post ? (
                <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-black/[0.08] bg-black/[0.03]">
                  <div className="border-b border-black/[0.07] px-4 py-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-black/36">
                      <Repeat2 className="h-3.5 w-3.5" />
                      Post d'origine
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <Link href={`/profile/${post.original_post.creator.username}`} className="font-black text-[#171313] hover:underline">
                        {post.original_post.creator.name || post.original_post.creator.username}
                      </Link>
                      <span className="font-semibold text-black/36">@{post.original_post.creator.username}</span>
                      <span className="font-semibold text-black/28">· {relativeTime(post.original_post.created_at)}</span>
                    </div>
                    <span className="mt-2 inline-flex rounded-full bg-black/[0.055] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-black/46">
                      {getPostTypeLabel(post.original_post)}
                    </span>
                    {post.original_post.content ? (
                      <p className="mt-3 text-[14px] leading-6 text-black/68 whitespace-pre-wrap break-words">{post.original_post.content}</p>
                    ) : null}
          </div>

                  {post.original_post.track ? (
                    <div className="bg-[#171313] p-4 text-white">
                      <div className="relative overflow-hidden rounded-[1rem]">
                        {post.original_post.track.cover_url ? (
                          <div className="absolute inset-0 overflow-hidden">
                            <img src={post.original_post.track.cover_url} alt="" className="h-full w-full scale-150 object-cover opacity-20 blur-2xl" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#171313]" />
                          </div>
                        ) : null}
                        <div className="relative flex items-center gap-4 p-4">
                          <TrackCover src={post.original_post.track.cover_url || null} videoSrc={(post.original_post.track as any).cover_video_url || (post.original_post.track as any).coverVideoUrl || null} posterSrc={(post.original_post.track as any).cover_video_poster_url || (post.original_post.track as any).coverVideoPosterUrl || post.original_post.track.cover_url || null} title={post.original_post.track.title} className="h-14 w-14 shrink-0 shadow-2xl" rounded="rounded-xl" objectFit="cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-bold text-white">{post.original_post.track.title}</p>
                            <p className="truncate text-[12px] text-white/55">{post.original_post.track.artist_name || 'Artiste inconnu'}</p>
                          </div>
                          <button
                            onClick={handlePlayOriginalTrack}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95"
                          >
                            {isPlayingOriginal ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!post.original_post.track && post.original_post.track_hidden ? (
                    <div className="border-t border-black/[0.07] px-4 py-3 text-sm font-semibold text-black/46">
                      La musique du post d'origine n'a pas ete incluse.
                    </div>
                  ) : null}

                  {!post.original_post.track && post.original_post.image_url && !embeddedImgError ? (
                    <div className="border-t border-black/[0.07] bg-black/[0.02]">
                      <img
                        src={post.original_post.image_url}
                        alt=""
                        className="max-h-[320px] w-full object-cover"
                        onError={() => setEmbeddedImgError(true)}
                      />
        </div>
                  ) : null}

                  <div className="border-t border-black/[0.07] px-4 py-3">
                    <Link href={`/posts/${post.original_post.id}`} className="text-sm font-black text-black/54 transition hover:text-[#171313]">
                      Voir le post original
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.2rem] border border-black/[0.08] bg-black/[0.035] p-4 text-sm font-semibold text-black/46">
                  Le post d'origine n'est plus disponible.
      </div>
              )
            ) : null}

            {!post.track && post.image_url && !imgError ? (
              <div className="mt-4 overflow-hidden rounded-[1.35rem] bg-black/[0.055]">
            <img
              src={post.image_url}
              alt=""
                  className={`max-h-[220px] w-full object-cover transition-opacity duration-300 sm:max-h-[360px] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
                {!imgLoaded && <div className="h-48 w-full animate-pulse bg-black/[0.05]" />}
            </div>
            ) : null}

            {!post.track && !post.image_url && post.type !== 'repost' ? (
              <div className="mt-4 rounded-[1.2rem] bg-black/[0.045] p-3 sm:rounded-[1.35rem] sm:p-4">
            <p className="text-sm font-semibold leading-6 text-black/52">Post texte.</p>
            </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={(e) => void handleLike(e as any)}
                className={`inline-flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-full px-3 text-xs font-black transition sm:h-10 sm:w-auto sm:px-4 sm:text-sm ${
                  liked ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/62 hover:bg-black/[0.1] hover:text-black'
                }`}
              >
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                {likesCount ? fmtCount(likesCount) : 'Liker'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCommentsOpen((current) => !current);
                  setShareOpen(false);
                }}
                className="inline-flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black/[0.055] px-3 text-xs font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                {commentsCount ? fmtCount(commentsCount) : 'Commenter'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareOpen((current) => !current);
                  setCommentsOpen(false);
                }}
                className="inline-flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black/[0.055] px-3 text-xs font-black text-black/62 transition hover:bg-black/[0.1] hover:text-black sm:h-10 sm:w-auto sm:px-4 sm:text-sm"
              >
                <Share2 className="h-4 w-4" />
                Partager
              </button>
            </div>

            {commentsOpen ? (
              <InlineCommentsPanel
                targetId={post.id}
                ownerId={post.creator.id}
                onCountChange={(delta) => setCommentsCount((current) => Math.max(0, current + delta))}
              />
            ) : null}

            {shareOpen ? (
              <InlineSharePanel
                post={post}
                onClose={() => setShareOpen(false)}
                onPostCreated={onPostCreated}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

/* ── Sub-components ── */

function PostMenu({ isOwn, showMenu, setShowMenu, onDelete, btnClass = '' }: {
  isOwn: boolean; showMenu: boolean; setShowMenu: (v: boolean) => void;
  onDelete: () => void; btnClass?: string;
}) {
  return (
    <div className="relative shrink-0">
      <button onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className={`p-1.5 rounded-full text-black/32 hover:text-[#171313] hover:bg-black/[0.06] transition-all ${btnClass}`}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
              className="absolute right-0 top-8 z-50 min-w-[140px] overflow-hidden rounded-[1rem] border border-black/[0.08] bg-[#fffaf2] shadow-[0_20px_45px_rgba(30,25,20,0.18)]">
              {isOwn ? (
                <button onClick={onDelete} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-[#b84b44] hover:bg-[#ff6f61]/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              ) : (
                <button onClick={() => setShowMenu(false)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-black/58 hover:bg-black/[0.04] transition-colors">
                  Signaler
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PostActions({ liked, likesCount, commentsCount, onLike, onComment, extra }: {
  liked: boolean; likesCount: number; commentsCount: number;
  onLike: (e: React.MouseEvent) => void; onComment: () => void; extra?: React.ReactNode;
}) {
  return (
    <div className="mt-1 flex items-center gap-1 border-t border-black/[0.05] px-3 py-2.5">
      <button onClick={e => { e.stopPropagation(); onLike(e); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 text-[12px] font-medium ${liked ? 'text-rose-500 bg-rose-500/10' : 'text-black/34 hover:text-[#171313] hover:bg-black/[0.04]'}`}>
        <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
        {likesCount > 0 && <span className="tabular-nums">{fmtCount(likesCount)}</span>}
      </button>
      <button onClick={e => { e.stopPropagation(); onComment(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-black/34 hover:text-[#171313] hover:bg-black/[0.04] transition-all active:scale-95 text-[12px] font-medium">
        <MessageCircle className="w-3.5 h-3.5" />
        {commentsCount > 0 && <span className="tabular-nums">{fmtCount(commentsCount)}</span>}
      </button>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

export default PostCard;
