'use client';

import React, { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Play, Pause, Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  audio_url?: string;
  duration?: number;
}

export interface Post {
  id: string;
  type: 'text' | 'photo' | 'track_share';
  content?: string;
  image_url?: string;
  track_id?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  creator: PostCreator;
  track?: PostTrack | null;
  isLiked: boolean;
}

interface PostCardProps {
  post: Post;
  onDelete?: (postId: string) => void;
  onCommentClick?: (post: Post) => void;
  /** compact = card horizontale pour affichage inline entre sections */
  compact?: boolean;
}

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

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

const PostCard = memo(function PostCard({ post, onDelete, onCommentClick, compact = false }: PostCardProps) {
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showMenu, setShowMenu] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const currentTrackId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isPlayingThis = post.track && currentTrackId === post.track.id && audioState.isPlaying;
  const isOwn = (session?.user as any)?.id === post.creator.id ||
    (session?.user as any)?.username === post.creator.username;

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr }); }
    catch { return ''; }
  })();

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
      audioUrl: post.track.audio_url, coverUrl: post.track.cover_url,
      duration: post.track.duration || 0, likes: 0, plays: 0,
    } as any);
  }, [post.track, playTrack]);

  /* ── COMPACT (inline entre sections) ── */
  if (compact) {
    return (
      <div className="relative flex gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.09] transition-all duration-200 overflow-hidden group">
        {/* Accent line */}
        <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-violet-500 to-indigo-500 opacity-60" />

        <Link href={`/profile/${post.creator.username}`} onClick={e => e.stopPropagation()} className="shrink-0 mt-0.5">
          <Avatar creator={post.creator} size="sm" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Link href={`/profile/${post.creator.username}`} onClick={e => e.stopPropagation()} className="text-[12px] font-semibold text-white/70 hover:text-white transition-colors truncate">
              {post.creator.name || post.creator.username}
            </Link>
            <span className="text-[11px] text-white/20 shrink-0">{timeAgo}</span>
          </div>

          {post.content && (
            <p className="text-[13px] text-white/60 line-clamp-2 leading-snug">{post.content}</p>
          )}

          {post.type === 'photo' && post.image_url && !imgError && (
            <img src={post.image_url} alt="" className="mt-2 h-14 w-auto rounded-lg object-cover" onError={() => setImgError(true)} />
          )}

          {post.type === 'track_share' && post.track && (
            <div className="mt-2 flex items-center gap-2">
              <Music2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-[12px] text-violet-300/70 truncate">{post.track.title}</span>
              <button onClick={handlePlayTrack} className="ml-auto shrink-0 w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center hover:bg-violet-500/50 transition-all">
                {isPlayingThis ? <Pause className="w-2.5 h-2.5 text-white" /> : <Play className="w-2.5 h-2.5 text-white ml-px" />}
              </button>
            </div>
          )}
        </div>

        <button onClick={handleLike} className={`self-start shrink-0 flex items-center gap-1 text-[11px] font-medium transition-all ${liked ? 'text-rose-400' : 'text-white/20 hover:text-white/40'}`}>
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
          {likesCount > 0 && fmtCount(likesCount)}
        </button>
      </div>
    );
  }

  /* ── FULL CARD ── */

  /* TEXT POST */
  if (post.type === 'text') {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200 bg-[#0d0d18]">
        {/* Subtle gradient top accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3">
            <Link href={`/profile/${post.creator.username}`} onClick={e => e.stopPropagation()}>
              <Avatar creator={post.creator} />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${post.creator.username}`} onClick={e => e.stopPropagation()} className="text-[13px] font-semibold text-white/85 hover:text-white transition-colors truncate block">
                {post.creator.name || post.creator.username}
              </Link>
              <span className="text-[11px] text-white/25">{timeAgo}</span>
            </div>
            <PostMenu isOwn={isOwn} showMenu={showMenu} setShowMenu={setShowMenu} onDelete={handleDelete} />
          </div>

          {/* Text */}
          <p className="text-[15px] text-white/80 leading-relaxed whitespace-pre-wrap break-words font-[450]">
            {post.content}
          </p>
        </div>

        <PostActions liked={liked} likesCount={likesCount} commentsCount={post.comments_count}
          onLike={handleLike} onComment={() => onCommentClick?.(post)} />
      </div>
    );
  }

  /* PHOTO POST */
  if (post.type === 'photo') {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200 bg-[#0d0d18]">
        {/* Photo full-width */}
        {post.image_url && !imgError && (
          <div className="relative">
            <img
              src={post.image_url}
              alt=""
              className={`w-full object-cover max-h-[420px] transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
            {!imgLoaded && <div className="w-full h-48 bg-white/[0.04] animate-pulse" />}

            {/* Author overlay on photo */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/[0.08]">
              <Avatar creator={post.creator} size="sm" />
              <span className="text-[12px] font-semibold text-white/90">{post.creator.name || post.creator.username}</span>
            </div>

            <div className="absolute top-3 right-3">
              <PostMenu isOwn={isOwn} showMenu={showMenu} setShowMenu={setShowMenu} onDelete={handleDelete}
                btnClass="bg-black/50 backdrop-blur-md border border-white/[0.08]" />
            </div>
          </div>
        )}

        {/* Caption */}
        {post.content && (
          <p className="px-4 pt-3 pb-1 text-[14px] text-white/70 leading-relaxed">{post.content}</p>
        )}

        <PostActions liked={liked} likesCount={likesCount} commentsCount={post.comments_count}
          onLike={handleLike} onComment={() => onCommentClick?.(post)}
          extra={<span className="text-[11px] text-white/20">{timeAgo}</span>} />
      </div>
    );
  }

  /* TRACK SHARE POST */
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.1] transition-all duration-200 bg-[#0d0d18]">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      {/* Track hero */}
      {post.track && (
        <div className="relative overflow-hidden">
          {/* Blurred cover background */}
          {post.track.cover_url && (
            <div className="absolute inset-0 overflow-hidden">
              <img src={post.track.cover_url} alt="" className="w-full h-full object-cover blur-2xl scale-150 opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#0d0d18]" />
            </div>
          )}
          <div className="relative flex items-center gap-4 p-4">
            <div className="shrink-0 relative">
              <TrackCover src={post.track.cover_url || null} title={post.track.title}
                className="w-16 h-16 shadow-2xl" rounded="rounded-xl" objectFit="cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{post.track.title}</p>
              <p className="text-[12px] text-white/40 truncate">{post.track.artist_name || 'Artiste inconnu'}</p>
            </div>
            <button onClick={handlePlayTrack}
              className="shrink-0 w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-white/10 active:scale-95">
              {isPlayingThis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Author + caption */}
      <div className="px-4 pt-2 pb-0 flex items-center gap-2.5">
        <Link href={`/profile/${post.creator.username}`} onClick={e => e.stopPropagation()}>
          <Avatar creator={post.creator} size="sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.creator.username}`} onClick={e => e.stopPropagation()} className="text-[12px] font-semibold text-white/60 hover:text-white/90 transition-colors">
            {post.creator.name || post.creator.username}
          </Link>
          {post.content && <p className="text-[13px] text-white/55 mt-0.5">{post.content}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-white/20">{timeAgo}</span>
          <PostMenu isOwn={isOwn} showMenu={showMenu} setShowMenu={setShowMenu} onDelete={handleDelete} />
        </div>
      </div>

      <PostActions liked={liked} likesCount={likesCount} commentsCount={post.comments_count}
        onLike={handleLike} onComment={() => onCommentClick?.(post)} />
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
        className={`p-1.5 rounded-full text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all ${btnClass}`}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
              className="absolute right-0 top-8 z-50 min-w-[140px] rounded-xl bg-[#14141f] border border-white/[0.08] shadow-2xl overflow-hidden">
              {isOwn ? (
                <button onClick={onDelete} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              ) : (
                <button onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-white/40 hover:bg-white/[0.04] transition-colors">
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
    <div className="flex items-center gap-1 px-3 py-2.5 border-t border-white/[0.04] mt-1">
      <button onClick={onLike}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 text-[12px] font-medium ${liked ? 'text-rose-400 bg-rose-500/10' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.04]'}`}>
        <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
        {likesCount > 0 && <span className="tabular-nums">{fmtCount(likesCount)}</span>}
      </button>
      <button onClick={e => { e.stopPropagation(); onComment(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all active:scale-95 text-[12px] font-medium">
        <MessageCircle className="w-3.5 h-3.5" />
        {commentsCount > 0 && <span className="tabular-nums">{fmtCount(commentsCount)}</span>}
      </button>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

export default PostCard;
