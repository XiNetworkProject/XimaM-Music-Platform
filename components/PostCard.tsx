'use client';

import React, { memo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Play, Pause, Music2, Image as ImageIcon } from 'lucide-react';
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
}

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

const PostCard = memo(function PostCard({ post, onDelete, onCommentClick }: PostCardProps) {
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);

  const currentTrackId = audioState.tracks[audioState.currentTrackIndex]?._id;
  const isPlayingThis = post.track && currentTrackId === post.track.id && audioState.isPlaying;

  const isOwn = (session?.user as any)?.id === post.creator.id ||
    (session?.user as any)?.username === post.creator.username;

  const avatarUrl = post.creator.avatar ? getCdnUrl(post.creator.avatar) || post.creator.avatar : null;

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr });
    } catch {
      return '';
    }
  })();

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) { notify.error('', 'Connecte-toi pour liker'); return; }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });
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
      if (res.ok) {
        onDelete?.(post.id);
        notify.success('', 'Post supprimé');
      } else {
        notify.error('', 'Impossible de supprimer ce post');
      }
    } catch {
      notify.error('', 'Erreur réseau');
    }
  }, [post.id, onDelete]);

  const handlePlayTrack = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.track?.audio_url) return;
    const trackData = {
      _id: post.track.id,
      title: post.track.title,
      artist: { _id: '', name: post.track.artist_name || 'Artiste', username: '' },
      audioUrl: post.track.audio_url,
      coverUrl: post.track.cover_url,
      duration: post.track.duration || 0,
      likes: 0,
      plays: 0,
    };
    playTrack(trackData as any);
  }, [post.track, playTrack]);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.1] transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <Link href={`/profile/${post.creator.username}`} className="shrink-0" onClick={e => e.stopPropagation()}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={post.creator.name || post.creator.username}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/[0.06]"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {(post.creator.name || post.creator.username || '?')[0].toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/${post.creator.username}`}
              className="text-[14px] font-semibold text-white/90 hover:text-white truncate transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {post.creator.name || post.creator.username}
            </Link>
            {post.creator.is_verified && (
              <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-[12px] text-white/30 tabular-nums">{timeAgo}</p>
        </div>

        {/* Menu */}
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="p-1.5 rounded-full text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-8 z-50 min-w-[140px] rounded-xl bg-[#16161e] border border-white/[0.08] shadow-2xl overflow-hidden"
                >
                  {isOwn && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  )}
                  {!isOwn && (
                    <button
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-white/50 hover:bg-white/[0.05] transition-colors"
                    >
                      Signaler
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {/* Text */}
        {post.content && (
          <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
        )}

        {/* Photo */}
        {post.type === 'photo' && post.image_url && !imgError && (
          <div className={`${post.content ? 'mt-3' : ''} rounded-xl overflow-hidden`}>
            <img
              src={post.image_url}
              alt="Post photo"
              className="w-full object-cover max-h-[500px]"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        {post.type === 'photo' && imgError && (
          <div className="mt-3 rounded-xl bg-white/[0.03] border border-white/[0.06] h-32 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Track share */}
        {post.type === 'track_share' && post.track && (
          <div className={`${post.content ? 'mt-3' : ''} flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] transition-colors group`}>
            <div className="shrink-0 relative">
              <TrackCover
                src={post.track.cover_url || null}
                title={post.track.title}
                className="w-12 h-12"
                rounded="rounded-lg"
                objectFit="cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/90 truncate">{post.track.title}</p>
              <p className="text-[12px] text-white/40 truncate">{post.track.artist_name || 'Artiste inconnu'}</p>
            </div>
            <button
              onClick={handlePlayTrack}
              className="shrink-0 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-white/10 active:scale-95"
              aria-label={isPlayingThis ? 'Pause' : 'Écouter'}
            >
              {isPlayingThis
                ? <Pause className="w-3.5 h-3.5" />
                : <Play className="w-3.5 h-3.5 ml-0.5" />
              }
            </button>
          </div>
        )}

        {/* Track share sans données */}
        {post.type === 'track_share' && !post.track && (
          <div className={`${post.content ? 'mt-3' : ''} flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]`}>
            <Music2 className="w-5 h-5 text-white/20 shrink-0" />
            <span className="text-[13px] text-white/30">Musique indisponible</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pb-3 border-t border-white/[0.04] pt-3">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 text-[13px] font-medium ${
            liked
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-white/30 hover:text-white/60 hover:bg-white/[0.05]'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          {likesCount > 0 && <span className="tabular-nums">{fmtCount(likesCount)}</span>}
        </button>

        <button
          onClick={e => { e.stopPropagation(); onCommentClick?.(post); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all active:scale-95 text-[13px] font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          {post.comments_count > 0 && <span className="tabular-nums">{fmtCount(post.comments_count)}</span>}
        </button>
      </div>
    </div>
  );
});

export default PostCard;
