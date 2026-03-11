'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  Clock,
  Heart,
  ThumbsUp,
  Share2,
  Copy,
  MessageSquare,
  Send,
  Loader2,
  ChevronLeft,
  Tag,
  User,
  AlertTriangle,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url?: string;
  category?: string;
  tags?: string[];
  allow_comments?: boolean;
  views_count?: number;
  share_count?: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  reply_count: number;
  profiles: { name: string; avatar: string | null } | null;
  replies?: Comment[];
}

interface Reactions {
  likes: number;
  useful: number;
  shares: number;
  userReactions: string[];
}

interface BulletinNav {
  id: string;
  title?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  prevision: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', text: 'text-emerald-300', label: 'Prévision' },
  vigilance: { bg: 'bg-amber-500/10', border: 'border-amber-500/15', text: 'text-amber-300', label: 'Vigilance' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/15', text: 'text-blue-300', label: 'Information' },
  special: { bg: 'bg-violet-500/10', border: 'border-violet-500/15', text: 'text-violet-300', label: 'Spécial' },
};

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)}j`;
  return formatDate(d);
}

function estimateReadingTime(text?: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── Page Component ─────────────────────────────────────────────────────────────

export default function BulletinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const bulletinId = params?.id as string;

  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [reactions, setReactions] = useState<Reactions>({ likes: 0, useful: 0, shares: 0, userReactions: [] });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [prevBulletin, setPrevBulletin] = useState<BulletinNav | null>(null);
  const [nextBulletin, setNextBulletin] = useState<BulletinNav | null>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reactingType, setReactingType] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [repliesData, setRepliesData] = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());

  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const viewTracked = useRef(false);

  const MAX_COMMENT_LENGTH = 1000;

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchBulletin = useCallback(async () => {
    try {
      const res = await fetch(`/api/meteo/bulletin/${bulletinId}`);
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json();
      setBulletin(data.bulletin || data);
    } catch { setNotFound(true); }
  }, [bulletinId]);

  const fetchReactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/meteo/reactions?bulletinId=${bulletinId}`);
      if (res.ok) {
        const data = await res.json();
        setReactions(data);
      }
    } catch { /* silent */ }
  }, [bulletinId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/meteo/comments?bulletinId=${bulletinId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setCommentCount(data.total || 0);
      }
    } catch { /* silent */ }
  }, [bulletinId]);

  const fetchNavigation = useCallback(async () => {
    try {
      const res = await fetch('/api/meteo/bulletins?status=published&limit=200');
      if (!res.ok) return;
      const data = await res.json();
      const bulletins: Bulletin[] = data.bulletins || data || [];
      const idx = bulletins.findIndex((b) => b.id === bulletinId);
      if (idx === -1) return;
      setPrevBulletin(idx > 0 ? { id: bulletins[idx - 1].id, title: bulletins[idx - 1].title } : null);
      setNextBulletin(idx < bulletins.length - 1 ? { id: bulletins[idx + 1].id, title: bulletins[idx + 1].title } : null);
    } catch { /* silent */ }
  }, [bulletinId]);

  const trackView = useCallback(async () => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    try {
      await fetch(`/api/meteo/bulletin/${bulletinId}?source=view`, { method: 'POST' });
    } catch { /* silent */ }
  }, [bulletinId]);

  useEffect(() => {
    if (!bulletinId) return;
    setLoading(true);
    setNotFound(false);
    viewTracked.current = false;
    Promise.all([fetchBulletin(), fetchReactions(), fetchComments(), fetchNavigation()])
      .finally(() => setLoading(false));
  }, [bulletinId, fetchBulletin, fetchReactions, fetchComments, fetchNavigation]);

  useEffect(() => {
    if (bulletin && !loading) trackView();
  }, [bulletin, loading, trackView]);

  // ─── Reactions ──────────────────────────────────────────────────────────────

  const handleReaction = async (type: 'like' | 'useful') => {
    if (!session?.user) {
      notify.warning('Connectez-vous pour reagir');
      return;
    }
    setReactingType(type);
    try {
      const res = await fetch('/api/meteo/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletinId, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions((prev) => ({
          ...prev,
          ...data.counts,
          userReactions: data.reacted
            ? [...prev.userReactions.filter((r) => r !== type), type]
            : prev.userReactions.filter((r) => r !== type),
        }));
      }
    } catch {
      notify.error('Erreur lors de la reaction');
    } finally {
      setReactingType(null);
    }
  };

  // ─── Sharing ────────────────────────────────────────────────────────────────

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/meteo/bulletin/${bulletinId}`;
    try {
      await navigator.clipboard.writeText(url);
      notify.success('Lien copie !');
      await fetch(`/api/meteo/bulletin/${bulletinId}/share`, { method: 'POST' });
    } catch {
      notify.error('Impossible de copier le lien');
    }
  };

  // ─── Comments ───────────────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    if (commentText.length > MAX_COMMENT_LENGTH) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/meteo/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulletinId,
          content: commentText.trim(),
          parentId: replyTo || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (replyTo) {
          setRepliesData((prev) => ({
            ...prev,
            [replyTo]: [...(prev[replyTo] || []), data.comment],
          }));
          setExpandedReplies((prev) => new Set(prev).add(replyTo));
        } else {
          setComments((prev) => [data.comment, ...prev]);
          setCommentCount((c) => c + 1);
        }
        setCommentText('');
        setReplyTo(null);
        notify.success('Commentaire publie');
      } else {
        const err = await res.json();
        notify.error(err.error || 'Erreur');
      }
    } catch {
      notify.error('Erreur lors de l\'envoi');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyTo(commentId);
    setCommentText('');
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const toggleReplies = async (commentId: string) => {
    const next = new Set(expandedReplies);
    if (next.has(commentId)) {
      next.delete(commentId);
      setExpandedReplies(next);
      return;
    }
    next.add(commentId);
    setExpandedReplies(next);

    if (!repliesData[commentId]) {
      setLoadingReplies((prev) => new Set(prev).add(commentId));
      try {
        const res = await fetch(`/api/meteo/comments?bulletinId=${bulletinId}&parentId=${commentId}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          setRepliesData((prev) => ({ ...prev, [commentId]: data.comments || [] }));
        }
      } catch { /* silent */ }
      setLoadingReplies((prev) => { const s = new Set(prev); s.delete(commentId); return s; });
    }
  };

  // ─── SEO head ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!bulletin) return;
    document.title = `${bulletin.title || 'Bulletin'} — XimaM Météo`;
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc = (bulletin.content || '').slice(0, 160);
    if (metaDesc) metaDesc.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = desc;
      document.head.appendChild(m);
    }
  }, [bulletin]);

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-white/40 text-sm">Chargement du bulletin...</p>
        </div>
      </div>
    );
  }

  // ─── Not found ──────────────────────────────────────────────────────────────

  if (notFound || !bulletin) {
    return (
      <div className="min-h-screen bg-[#0f0a1a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-amber-400/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Bulletin introuvable</h1>
          <p className="text-white/40 mb-6">
            Ce bulletin n&apos;existe pas ou a ete supprime.
          </p>
          <Link
            href="/meteo"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white transition-colors text-[15px] font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la météo
          </Link>
        </div>
      </div>
    );
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const cat = CATEGORY_STYLES[bulletin.category || ''] || CATEGORY_STYLES.info;
  const readingTime = estimateReadingTime(bulletin.content);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0a1a] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0f0a1a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/meteo"
            className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la météo
          </Link>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-white/30">
          <Link href="/meteo" className="hover:text-white/60 transition-colors">Météo</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Bulletins</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/50 truncate max-w-[200px]">{bulletin.title || 'Sans titre'}</span>
        </nav>
      </div>

      {/* Main content */}
      <article className="max-w-3xl mx-auto px-4 py-6">
        {/* Category badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cat.bg} ${cat.border} ${cat.text}`}>
            <Tag className="w-3 h-3" />
            {cat.label}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
          {bulletin.title || 'Sans titre'}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/40 mb-6">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {bulletin.author_name || 'Équipe Météo'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(bulletin.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {bulletin.views_count ?? 0} vues
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {readingTime} min de lecture
          </span>
        </div>

        {/* Image */}
        {bulletin.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img
              src={bulletin.image_url}
              alt={bulletin.title || 'Image du bulletin'}
              className="w-full max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6 sm:p-8 mb-8">
          <div className="text-white/80 whitespace-pre-wrap leading-relaxed text-[15px]">
            {bulletin.content || 'Aucun contenu.'}
          </div>
        </div>

        {/* Tags */}
        {bulletin.tags && bulletin.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {bulletin.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-[12px] bg-white/[0.05] text-white/50"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Reactions bar */}
        <div className="flex items-center gap-3 mb-8 p-4 rounded-2xl bg-white/[0.04]">
          <button
            onClick={() => handleReaction('like')}
            disabled={reactingType !== null}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
              reactions.userReactions.includes('like')
                ? 'bg-pink-500/15 text-pink-300'
                : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
            }`}
          >
            <Heart className={`w-4 h-4 ${reactions.userReactions.includes('like') ? 'fill-current' : ''}`} />
            {reactions.likes}
          </button>
          <button
            onClick={() => handleReaction('useful')}
            disabled={reactingType !== null}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
              reactions.userReactions.includes('useful')
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${reactions.userReactions.includes('useful') ? 'fill-current' : ''}`} />
            Utile · {reactions.useful}
          </button>
          <div className="ml-auto text-xs text-white/30 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            {reactions.shares || bulletin.share_count || 0} partages
          </div>
        </div>

        {/* Share section */}
        <div className="mb-10 p-4 rounded-2xl bg-white/[0.04]">
          <h3 className="text-sm font-semibold text-white/70 mb-3">Partager ce bulletin</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white transition-colors text-sm font-medium"
            >
              <Copy className="w-4 h-4" />
              Copier le lien
            </button>
            <span className="text-xs text-white/30">
              ou partagez l&apos;URL directement sur vos réseaux
            </span>
          </div>
        </div>

        {/* Previous / Next navigation */}
        {(prevBulletin || nextBulletin) && (
          <div className="grid grid-cols-2 gap-4 mb-12">
            {prevBulletin ? (
              <Link
                href={`/meteo/bulletin/${prevBulletin.id}`}
                className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-white/30 mb-0.5">Precedent</div>
                  <div className="text-sm text-white/60 group-hover:text-white/80 truncate transition-colors">
                    {prevBulletin.title || 'Sans titre'}
                  </div>
                </div>
              </Link>
            ) : <div />}
            {nextBulletin ? (
              <Link
                href={`/meteo/bulletin/${nextBulletin.id}`}
                className="group flex items-center justify-end gap-3 p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] transition-colors text-right"
              >
                <div className="min-w-0">
                  <div className="text-xs text-white/30 mb-0.5">Suivant</div>
                  <div className="text-sm text-white/60 group-hover:text-white/80 truncate transition-colors">
                    {nextBulletin.title || 'Sans titre'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
              </Link>
            ) : <div />}
          </div>
        )}

        {/* ─── Comments section ────────────────────────────────────────────────── */}
        <section id="comments">
          <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            Commentaires ({commentCount})
          </h2>

          {/* Comment form */}
          {session?.user ? (
            <div className="mb-8 p-4 rounded-2xl bg-white/[0.04]">
              {replyTo && (
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-violet-300">
                    Réponse à un commentaire
                  </span>
                  <button
                    onClick={() => { setReplyTo(null); setCommentText(''); }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={replyTo ? 'Votre réponse...' : 'Ajouter un commentaire...'}
                rows={3}
                maxLength={MAX_COMMENT_LENGTH}
                className="w-full bg-white/[0.05] rounded-2xl px-4 py-3 text-[15px] text-white placeholder-white/25 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${commentText.length > MAX_COMMENT_LENGTH * 0.9 ? 'text-amber-400' : 'text-white/20'}`}>
                  {commentText.length}/{MAX_COMMENT_LENGTH}
                </span>
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submittingComment || commentText.length > MAX_COMMENT_LENGTH}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Publier
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8 p-5 rounded-2xl bg-white/[0.04] text-center">
              <p className="text-white/40 text-sm mb-3">Connectez-vous pour commenter</p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white transition-colors text-sm font-medium"
              >
                Se connecter
              </Link>
            </div>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="text-center text-white/20 text-sm py-8">
              Aucun commentaire pour le moment. Soyez le premier !
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  isExpanded={expandedReplies.has(comment.id)}
                  onToggleReplies={() => toggleReplies(comment.id)}
                  replies={repliesData[comment.id]}
                  loadingReplies={loadingReplies.has(comment.id)}
                  isAuthenticated={!!session?.user}
                />
              ))}
            </div>
          )}
        </section>
      </article>
    </div>
  );
}

// ─── Comment component ──────────────────────────────────────────────────────────

function CommentItem({
  comment,
  onReply,
  isExpanded,
  onToggleReplies,
  replies,
  loadingReplies,
  isAuthenticated,
  isReply = false,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  isExpanded: boolean;
  onToggleReplies: () => void;
  replies?: Comment[];
  loadingReplies: boolean;
  isAuthenticated: boolean;
  isReply?: boolean;
}) {
  const name = comment.profiles?.name || 'Utilisateur';
  const avatar = comment.profiles?.avatar;

  return (
    <div className={isReply ? 'ml-8 pl-4 border-l border-white/[0.06]' : ''}>
      <div className="p-4 rounded-2xl bg-white/[0.04]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-white/40" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white/80">{name}</span>
              <span className="text-[11px] text-white/25">{formatRelative(comment.created_at)}</span>
            </div>
            <p className="text-sm text-white/60 whitespace-pre-wrap break-words">{comment.content}</p>

            <div className="flex items-center gap-3 mt-2">
              {isAuthenticated && (
                <button
                  onClick={() => onReply(isReply ? comment.parent_id! : comment.id)}
                  className="text-xs text-white/30 hover:text-violet-300 transition-colors"
                >
                  Répondre
                </button>
              )}
              {!isReply && comment.reply_count > 0 && (
                <button
                  onClick={onToggleReplies}
                  className="text-xs text-violet-400/60 hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  {isExpanded ? 'Masquer' : `${comment.reply_count} réponse${comment.reply_count > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      {!isReply && isExpanded && (
        <div className="mt-2 space-y-2">
          {loadingReplies ? (
            <div className="ml-8 pl-4 flex items-center gap-2 py-3 text-white/30 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Chargement...
            </div>
          ) : (
            replies?.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                isExpanded={false}
                onToggleReplies={() => {}}
                loadingReplies={false}
                isAuthenticated={isAuthenticated}
                isReply
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
