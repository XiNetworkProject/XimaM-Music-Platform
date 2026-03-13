'use client';

/**
 * PostAsTrackCard — affiche un post (photo ou track_share) avec le même
 * gabarit visuel qu'une TrackCard dans les sections horizontales.
 */

import React, { useState, useCallback } from 'react';
import { Camera, Share2, Play, Pause, Heart } from 'lucide-react';
import { useAudioPlayer } from '@/components/AudioPlayerProvider';
import { type Post } from '@/components/PostCard';
import PostCommentsSheet from '@/components/PostCommentsSheet';

interface Props {
  post: Post;
}

export default function PostAsTrackCard({ post }: Props) {
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isPhotoPost = post.type === 'photo';
  const isTrackShare = post.type === 'track_share';

  const coverSrc = isPhotoPost
    ? (imgError ? null : post.image_url)
    : (isTrackShare ? post.track?.cover_url : null);

  const isPlayingThis =
    isTrackShare &&
    !!post.track?.audio_url &&
    !!currentTrack &&
    (currentTrack as any)._id === post.track?.id &&
    isPlaying;

  const handlePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!post.track?.audio_url) return;
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
    },
    [post.track, playTrack],
  );

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const method = liked ? 'DELETE' : 'POST';
      setLiked(l => !l);
      setLikesCount(c => c + (liked ? -1 : 1));
      try {
        await fetch(`/api/posts/${post.id}/like`, { method });
      } catch {
        setLiked(l => !l);
        setLikesCount(c => c + (liked ? 1 : -1));
      }
    },
    [liked, post.id],
  );

  return (
    <>
      <div
        className="min-w-[160px] md:min-w-[200px] max-w-[160px] md:max-w-[200px] rounded-xl p-2 hover:bg-white/[0.06] transition-all duration-200 group/card cursor-pointer"
        style={{ scrollSnapAlign: 'start' }}
        onClick={() => isTrackShare && handlePlay({ stopPropagation: () => {} } as any)}
      >
        {/* Cover */}
        <div className="relative group/cover">
          {/* Image */}
          <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/[0.05]">
            {coverSrc ? (
              <img
                src={coverSrc}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              /* Fallback gradient */
              <div className={`w-full h-full flex items-center justify-center ${
                isPhotoPost
                  ? 'bg-gradient-to-br from-rose-900/60 to-pink-900/40'
                  : 'bg-gradient-to-br from-indigo-900/60 to-violet-900/40'
              }`}>
                {isPhotoPost
                  ? <Camera className="w-10 h-10 text-white/20" />
                  : <Share2 className="w-10 h-10 text-white/20" />
                }
              </div>
            )}

            {/* Blurred overlay pour les photos (effet glassmorphism) */}
            {isPhotoPost && coverSrc && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            )}

            {/* Badge type */}
            <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full backdrop-blur-sm text-[9px] font-bold text-white border ${
              isPhotoPost
                ? 'bg-rose-500/50 border-rose-400/30'
                : 'bg-indigo-500/50 border-indigo-400/30'
            }`}>
              {isPhotoPost ? <Camera className="w-2.5 h-2.5" /> : <Share2 className="w-2.5 h-2.5" />}
              {isPhotoPost ? 'Photo' : 'Share'}
            </div>

            {/* Bouton play (track_share) */}
            {isTrackShare && post.track?.audio_url && (
              <button
                onClick={handlePlay}
                className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-all hover:scale-105 active:scale-95 shadow-xl z-10"
              >
                {isPlayingThis
                  ? <Pause className="w-3.5 h-3.5" />
                  : <Play className="w-3.5 h-3.5 ml-0.5" />
                }
              </button>
            )}
          </div>
        </div>

        {/* Infos sous la cover */}
        <div className="mt-2 px-0.5">
          <p className="text-[13px] font-semibold text-white/85 truncate leading-snug">
            {isTrackShare ? (post.track?.title || 'Son partagé') : (post.content || post.creator.name)}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={post.creator.avatar || '/default-avatar.png'}
                alt=""
                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
              />
              <span className="text-[11px] text-white/35 truncate">
                {post.creator.name || post.creator.username}
              </span>
            </div>
            <button
              onClick={handleLike}
              className={`shrink-0 flex items-center gap-0.5 text-[10px] transition-all ${liked ? 'text-rose-400' : 'text-white/20 hover:text-white/40'}`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
          </div>
          {isTrackShare && post.track?.artist_name && (
            <p className="text-[10px] text-white/25 truncate mt-0.5">
              {post.track.artist_name}
            </p>
          )}
        </div>
      </div>

      <PostCommentsSheet
        post={post}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={() => {}}
      />
    </>
  );
}
