'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, MessageCircle, Share2,
  Camera, Loader2, Send, Trash2, Repeat2, UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCommentsSurface } from '@/components/comments/useCommentsSurface';
import CommentCount from '@/components/comments/CommentCount';
import { useAudioPlayer } from '@/app/providers';
import { notify } from '@/components/NotificationCenter';
import { getCdnUrl } from '@/lib/cdn';
import type { Post } from '@/components/PostCard';
import PostAudioCard from '@/components/posts/PostAudioCard';
import { SynauraAppShell, SynauraPanel, SynauraInkPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

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
    <div className="space-y-4 pb-24">
      <div className="h-12 w-40 rounded-full bg-black/[0.05] animate-pulse" />
      <div className="rounded-[2rem] bg-black/[0.05] p-6 animate-pulse">
        <div className="h-5 w-24 rounded bg-white/20" />
        <div className="mt-4 h-10 w-3/4 rounded bg-white/20" />
        <div className="mt-3 h-5 w-1/2 rounded bg-white/15" />
      </div>
      <div className="rounded-[2rem] border border-black/[0.08] bg-[#fffaf2]/88 p-6 shadow-[0_18px_60px_rgba(30,25,20,0.10)]">
        <div className="h-5 w-40 rounded bg-black/[0.06] animate-pulse" />
        <div className="mt-4 h-28 rounded-[1.5rem] bg-black/[0.05] animate-pulse" />
        <div className="mt-4 h-40 rounded-[1.5rem] bg-black/[0.05] animate-pulse" />
      </div>
      <div className="rounded-[2rem] border border-black/[0.08] bg-[#fffaf2]/88 p-6 shadow-[0_18px_60px_rgba(30,25,20,0.10)]">
        <div className="h-5 w-32 rounded bg-black/[0.06] animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mt-3 h-16 rounded-[1.1rem] bg-black/[0.05] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function typeLabel(post: Post) {
  if (post.type === 'track_share') return 'partage de son';
  if (post.type === 'photo') return 'post image';
  if (post.type === 'repost') return 'post partage';
  return 'discussion';
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { data: session } = useSession();
  const { playTrack, audioState } = useAudioPlayer();
  const openComments = useCommentsSurface('other');

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
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
    ? (imgError ? null : getCdnUrl(post.image_url) || post.image_url)
    : post?.type === 'track_share'
    ? post.track?.cover_url
    : post?.type === 'repost'
    ? post.original_post?.track?.cover_url || post.original_post?.image_url || null
    : null;

  if (loading) return <Skeleton />;
  if (error || !post) {
    return (
      <SynauraAppShell contentClassName="max-w-[980px]">
        <SynauraTopBar
          searchLabel="Rechercher un post, un son ou un createur..."
          secondaryHref="/upload"
          secondaryLabel="Upload"
          primaryHref="/ai-generator"
          primaryLabel="Studio"
        />
        <SynauraPanel className="px-6 py-14 text-center sm:px-8">
          <Camera className="mx-auto h-14 w-14 text-black/16" />
          <h1 className="mt-4 text-2xl font-black tracking-[-0.04em] text-[#171313]">{error || 'Post introuvable'}</h1>
          <p className="mt-2 text-sm font-semibold text-black/45">Le post n'est plus disponible ou a ete supprime.</p>
          <button onClick={() => router.push('/posts')} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]">
            Retour aux posts
          </button>
        </SynauraPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[980px]">
      <SynauraTopBar
        searchLabel="Rechercher un post, un son ou un createur..."
        secondaryHref="/upload"
        secondaryLabel="Upload"
        primaryHref="/ai-generator"
        primaryLabel="Studio"
      />
      <div className="space-y-4 pb-24">
        <button
          onClick={() => router.back()}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.08] bg-[#fffaf2]/88 px-4 text-sm font-black text-black/56 shadow-[0_14px_36px_rgba(30,25,20,0.08)] transition hover:bg-[#171313] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-4">
          <SynauraInkPanel className="overflow-hidden">
            {coverSrc ? (
              <div className="absolute inset-0">
                <img src={coverSrc} alt="" className="h-full w-full object-cover opacity-18 blur-[18px] scale-110" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#171313]/68 via-[#171313]/82 to-[#171313]" />
              </div>
            ) : null}
            <div className="relative px-5 py-6 sm:px-7 sm:py-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/48">Post</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl">
                {post.type === 'repost'
                  ? 'Post partage'
                  : post.type === 'track_share'
                    ? 'Post avec son'
                    : post.type === 'photo'
                      ? 'Post image'
                      : 'Post texte'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">
                {post.creator.name || post.creator.username} · {timeAgo(post.created_at)} · {typeLabel(post)}
              </p>
            </div>
          </SynauraInkPanel>

          <SynauraPanel className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Link href={`/profile/${post.creator.username}`}>
                  <Avatar user={post.creator} size="lg" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${post.creator.username}`} className="block truncate text-[15px] font-black text-[#171313] hover:underline">
                    {post.creator.name || post.creator.username}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-black/38">
                    <span>@{post.creator.username}</span>
                    <span>·</span>
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                  <span className="mt-2 inline-flex rounded-full bg-black/[0.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-black/46">
                    {typeLabel(post)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                      liked ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/60 hover:bg-black/[0.1] hover:text-black'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                    {likesCount > 0 ? likesCount : 'Liker'}
                  </button>
                  <button
                    onClick={handleShare}
                    className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.055] text-black/52 transition hover:bg-black/[0.1] hover:text-black"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  {isOwn ? (
                    <button
                      onClick={async () => {
                        if (!confirm('Supprimer ce post ?')) return;
                        const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          notify.success('', 'Post supprime');
                          router.push('/posts');
                        } else {
                          notify.error('', 'Erreur suppression');
                        }
                      }}
                      className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              {post.content ? (
                <div className="rounded-[1.35rem] bg-black/[0.03] p-4">
                  <p className="text-[15px] leading-7 text-black/72 whitespace-pre-wrap break-words">{post.content}</p>
                </div>
              ) : null}

              {post.type === 'photo' && post.image_url && !imgError ? (
                <div className="overflow-hidden rounded-[1.5rem] bg-black/[0.05]">
                  <img
                    src={getCdnUrl(post.image_url) || post.image_url}
                    alt=""
                    className="max-h-[640px] w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : null}

              {post.type === 'track_share' && post.track ? (
                <PostAudioCard track={post.track} playing={Boolean(isPlayingThis)} onPlay={handlePlayTrack} />
              ) : null}

              {post.type === 'repost' ? (
                post.original_post ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-black/[0.08] bg-black/[0.03]">
                    <div className="border-b border-black/[0.08] px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-black/40">
                        <Repeat2 className="h-3.5 w-3.5" />
                        Post d'origine
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <Link href={`/profile/${post.original_post.creator.username}`} className="font-black text-[#171313] hover:underline">
                          {post.original_post.creator.name || post.original_post.creator.username}
                        </Link>
                        <span className="font-semibold text-black/38">@{post.original_post.creator.username}</span>
                        <span className="font-semibold text-black/28">· {timeAgo(post.original_post.created_at)}</span>
                      </div>
                      {post.original_post.content ? (
                        <p className="mt-3 text-[14px] leading-7 text-black/68 whitespace-pre-wrap break-words">{post.original_post.content}</p>
                      ) : null}
                    </div>

                    {post.original_post.track ? (
                      <div className="bg-[#171313] p-4 text-white">
                        <PostAudioCard
                          track={post.original_post.track}
                          playing={currentTrackId === post.original_post.track.id && audioState.isPlaying}
                          onPlay={() => {
                            playTrack({
                              _id: post.original_post!.track!.id,
                              title: post.original_post!.track!.title,
                              artist: { _id: '', name: post.original_post!.track!.artist_name || 'Artiste', username: '' },
                              audioUrl: post.original_post!.track!.audio_url,
                              coverUrl: post.original_post!.track!.cover_url,
                              coverVideoUrl: (post.original_post!.track as any).cover_video_url || (post.original_post!.track as any).coverVideoUrl,
                              coverVideoPosterUrl: (post.original_post!.track as any).cover_video_poster_url || (post.original_post!.track as any).coverVideoPosterUrl,
                              duration: post.original_post!.track!.duration || 0,
                              likes: 0,
                              plays: 0,
                            } as any);
                          }}
                          compact
                        />
                      </div>
                    ) : post.original_post.track_hidden ? (
                      <div className="border-t border-black/[0.08] px-4 py-3 text-sm font-semibold text-black/46">
                        La musique du post d'origine n'a pas ete incluse.
                      </div>
                    ) : null}

                    {!post.original_post.track && post.original_post.image_url ? (
                      <img src={getCdnUrl(post.original_post.image_url) || post.original_post.image_url} alt="" className="max-h-[640px] w-full object-cover border-t border-black/[0.08]" />
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-black/[0.08] bg-black/[0.03] p-4 text-sm font-semibold text-black/46">
                    Le post d'origine n'est plus disponible.
                  </div>
                )
              ) : null}
            </div>
          </SynauraPanel>

          <SynauraPanel className="p-4 sm:p-6">
            <button type="button" data-context-surface-trigger-key={`post-comments-${post.id}`} onClick={event => openComments({ type: 'post', id: post.id, title: 'Publication', artist: post.creator?.name || post.creator?.username, creatorId: post.creator?.id, count: post.comments_count }, event.currentTarget)} className="syn-interactive inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171313] px-5 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Commentaires <CommentCount type="post" id={post.id} fallback={post.comments_count} /></button>
          </SynauraPanel>
        </motion.div>
      </div>
    </SynauraAppShell>
  );
}
