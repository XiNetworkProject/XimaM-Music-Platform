'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, MessageCircle, Play, Pause, Share2,
  Music2, Camera, Loader2, Send, MoreHorizontal, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import { getCdnUrl } from '@/lib/cdn';
import type { Post } from '@/components/PostCard';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: { id: string; username: string; name?: string; avatar?: string };
}

function timeAgo(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

function Avatar({ user, size = 'md' }: { user: { username: string; name?: string; avatar?: string }; size?: 'sm' | 'md' | 'lg' }) {
  const url = user.avatar ? getCdnUrl(user.avatar) || user.avatar : null;
  const cls = size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  if (url) return <img src={url} alt="" className={`${cls} rounded-full object-cover ring-2 ring-white/10 shrink-0`} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {(user.name || user.username || '?')[0].toUpperCase()}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-32 space-y-6">
        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
        <div className="w-full aspect-[4/3] rounded-2xl bg-white/[0.04] animate-pulse" />
        <div className="space-y-3">
          <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${id}`);
        if (!res.ok) throw new Error('Post introuvable');
        const data = await res.json();
        setPost(data);
        setLiked(data.isLiked ?? false);
        setLikesCount(data.likes_count ?? 0);
      } catch {
        setError('Post introuvable ou supprimé');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setCommentsLoading(true);
    fetch(`/api/posts/${id}/comments`)
      .then(r => r.ok ? r.json() : { comments: [] })
      .then(d => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id]);

  const handleLike = useCallback(async () => {
    if (!session) { notify.error('', 'Connecte-toi pour liker'); return; }
    const wasLiked = liked;
    setLiked(l => !l);
    setLikesCount(c => c + (wasLiked ? -1 : 1));
    try {
      await fetch(`/api/posts/${id}/like`, { method: wasLiked ? 'DELETE' : 'POST' });
    } catch {
      setLiked(wasLiked);
      setLikesCount(c => c + (wasLiked ? 1 : -1));
    }
  }, [liked, id, session]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim() || !session) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setCommentText('');
        setPost(p => p ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p);
      } else {
        notify.error('', data.error || 'Erreur commentaire');
      }
    } catch {
      notify.error('', 'Erreur réseau');
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, id, session]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await fetch(`/api/posts/${id}/comments?commentId=${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== commentId));
      setPost(p => p ? { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p);
    } catch { notify.error('', 'Erreur suppression'); }
  }, [id]);

  const handlePlayTrack = useCallback(() => {
    if (!post?.track?.audio_url) return;
    playTrack({
      _id: post.track.id,
      title: post.track.title,
      artist: { _id: '', name: post.track.artist_name || 'Artiste', username: '' },
      audioUrl: post.track.audio_url,
      coverUrl: post.track.cover_url,
      duration: post.track.duration || 0,
      likes: 0,
      plays: 0,
    } as any);
  }, [post?.track, playTrack]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/posts/${id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Post Synaura', url });
      } else {
        await navigator.clipboard.writeText(url);
        notify.success('', 'Lien copié !');
      }
    } catch {}
  }, [id]);

  const currentTrackId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isPlayingThis = post?.track && currentTrackId === post.track.id && audioState.isPlaying;
  const isOwn = !!(session && post && ((session.user as any)?.id === post.creator.id || (session.user as any)?.username === post.creator.username));

  const coverSrc = post?.type === 'photo'
    ? (imgError ? null : post.image_url)
    : post?.type === 'track_share'
    ? post.track?.cover_url
    : null;

  if (loading) return <Skeleton />;
  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a14] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Camera className="w-16 h-16 text-white/10 mx-auto" />
          <h1 className="text-xl font-bold text-white/60">{error || 'Post introuvable'}</h1>
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-full bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.1] transition">Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pb-32">
      {/* Background glow depuis la cover/image */}
      {coverSrc && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <img src={coverSrc} alt="" className="w-full h-96 object-cover blur-[80px] opacity-15 scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a14]/60 via-[#0a0a14]/85 to-[#0a0a14]" />
        </div>
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 sm:pt-10">
        {/* Retour */}
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

          {/* ─── Hero image / cover ─── */}
          {post.type === 'photo' && post.image_url && !imgError && (
            <div className="rounded-2xl overflow-hidden mb-6 border border-white/[0.06] shadow-2xl shadow-black/40">
              <img
                src={post.image_url}
                alt=""
                className="w-full max-h-[520px] object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          )}

          {post.type === 'track_share' && post.track && (
            <div className="relative rounded-2xl overflow-hidden mb-6 border border-white/[0.06] shadow-2xl shadow-black/40">
              {post.track.cover_url && (
                <div className="absolute inset-0">
                  <img src={post.track.cover_url} alt="" className="w-full h-full object-cover blur-2xl scale-150 opacity-30" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#0a0a14]" />
                </div>
              )}
              <div className="relative flex items-center gap-5 p-6">
                <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  {post.track.cover_url ? (
                    <img src={post.track.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900/60 to-violet-900/40 flex items-center justify-center">
                      <Music2 className="w-10 h-10 text-white/20" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-violet-400 font-semibold mb-1">Son partagé</p>
                  <h2 className="text-xl font-black text-white truncate">{post.track.title}</h2>
                  {post.track.artist_name && (
                    <p className="text-[13px] text-white/50 mt-1 truncate">{post.track.artist_name}</p>
                  )}
                </div>
                <button
                  onClick={handlePlayTrack}
                  className="shrink-0 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/10"
                >
                  {isPlayingThis ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
              </div>
            </div>
          )}

          {/* ─── Infos créateur + actions ─── */}
          <div className="flex items-start gap-3 mb-4">
            <Link href={`/profile/${post.creator.username}`}>
              <Avatar user={post.creator} size="lg" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${post.creator.username}`} className="text-[14px] font-bold text-white/90 hover:text-white transition-colors block truncate">
                {post.creator.name || post.creator.username}
              </Link>
              <p className="text-[12px] text-white/30">{timeAgo(post.created_at)}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${liked ? 'bg-rose-500/15 text-rose-400' : 'bg-white/[0.05] text-white/40 hover:text-white/70 hover:bg-white/[0.08]'}`}>
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                <span className="tabular-nums">{likesCount > 0 ? likesCount : ''}</span>
              </button>
              <button onClick={handleShare}
                className="w-9 h-9 rounded-full bg-white/[0.05] text-white/40 hover:text-white/70 hover:bg-white/[0.08] flex items-center justify-center transition-all">
                <Share2 className="w-4 h-4" />
              </button>
              {isOwn && (
                <button
                  onClick={async () => {
                    if (!confirm('Supprimer ce post ?')) return;
                    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
                    if (res.ok) { notify.success('', 'Post supprimé'); router.back(); }
                    else notify.error('', 'Erreur suppression');
                  }}
                  className="w-9 h-9 rounded-full bg-white/[0.05] text-white/30 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Contenu texte */}
          {post.content && (
            <p className="text-[15px] text-white/75 leading-relaxed whitespace-pre-wrap break-words mb-6 pl-1">
              {post.content}
            </p>
          )}

          {/* ─── Commentaires ─── */}
          <div className="border-t border-white/[0.06] pt-5">
            <h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              {(post.comments_count || comments.length)} commentaire{(post.comments_count || comments.length) !== 1 ? 's' : ''}
            </h3>

            {/* Zone de saisie */}
            {session && (
              <div className="flex gap-3 mb-5">
                <Avatar user={{ username: (session.user as any)?.username || session.user?.name || 'Moi', name: session.user?.name || undefined, avatar: session.user?.image || undefined }} size="sm" />
                <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-2xl px-3 py-2 border border-white/[0.06] focus-within:border-white/[0.12] transition-all">
                  <input
                    type="text"
                    placeholder="Ajouter un commentaire…"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                    className="flex-1 bg-transparent text-[13px] text-white/80 placeholder-white/20 focus:outline-none"
                    maxLength={500}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="shrink-0 text-violet-400 disabled:opacity-30 hover:text-violet-300 transition-all active:scale-95"
                  >
                    {submittingComment
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Liste commentaires */}
            {commentsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center py-8 text-[13px] text-white/20">Sois le premier à commenter</p>
            ) : (
              <div className="space-y-1">
                {comments.filter(c => c?.user).map(comment => {
                  const isMine = (session?.user as any)?.id === comment.user.id
                    || (session?.user as any)?.username === comment.user.username;
                  return (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group/comment"
                    >
                      <Link href={`/profile/${comment.user.username}`} className="shrink-0">
                        <Avatar user={comment.user} size="sm" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/profile/${comment.user.username}`} className="text-[12px] font-semibold text-white/70 hover:text-white transition-colors">
                            {comment.user.name || comment.user.username}
                          </Link>
                          <span className="text-[11px] text-white/20">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-[13px] text-white/65 leading-snug">{comment.content}</p>
                      </div>
                      {isMine && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="shrink-0 opacity-0 group-hover/comment:opacity-100 text-white/20 hover:text-rose-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
