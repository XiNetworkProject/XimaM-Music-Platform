'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Heart, Maximize2, MessageCircle, Music2, Pause, Play, Share2 } from 'lucide-react';
import Waveform from '@/components/player/Waveform';
import { useTrackWaveform } from '@/hooks/useTrackWaveform';
import { type ScrollPost, type ScrollTrack, trackFromScrollPost } from '@/lib/scrollFeed';

type Props = {
  post: ScrollPost;
  active: boolean;
  playing: boolean;
  onOpenPost: () => void;
  onOpenProfile: () => void;
  onPlayTrack: (track: ScrollTrack) => void;
  onOpenTrack?: (track: ScrollTrack) => void;
  getAudioElement?: () => HTMLAudioElement | null;
  onSeek?: (seconds: number) => void;
  onShare: () => void;
};

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return String(Math.max(0, value));
}

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  if (!seconds) return '';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} j` : new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ScrollPostSlide({ post, active, playing, onOpenPost, onOpenProfile, onPlayTrack, onOpenTrack, getAudioElement, onSeek, onShare }: Props) {
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likesCount, setLikesCount] = useState(Math.max(0, post.likes_count || 0));
  const [liking, setLiking] = useState(false);
  const track = useMemo(() => trackFromScrollPost(post), [post]);
  const waveform = useTrackWaveform(track?._id, track?.audioUrl, track?.duration);
  const trackDuration = track ? formatDuration(track.duration) : '';
  const visual = post.image_url || post.track?.cover_url || null;
  const author = post.creator.name || post.creator.username || 'Membre Synaura';
  const initial = author.slice(0, 1).toUpperCase();

  useEffect(() => {
    setLiked(Boolean(post.isLiked));
    setLikesCount(Math.max(0, post.likes_count || 0));
  }, [post.id, post.isLiked, post.likes_count]);

  const toggleLike = async () => {
    if (liking) return;
    const next = !liked;
    setLiked(next);
    setLikesCount((current) => Math.max(0, current + (next ? 1 : -1)));
    setLiking(true);
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/like`, { method: 'POST' });
      if (!response.ok) throw new Error('like failed');
      const payload = await response.json().catch(() => null);
      if (typeof payload?.liked === 'boolean') setLiked(payload.liked);
      if (Number.isFinite(Number(payload?.likesCount))) setLikesCount(Number(payload.likesCount));
    } catch {
      setLiked(!next);
      setLikesCount((current) => Math.max(0, current + (next ? -1 : 1)));
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#111111] text-[#F7F6F3]">
      {visual ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={visual} alt="" className="absolute inset-[-8%] h-[116%] w-[116%] scale-110 object-cover opacity-30 blur-3xl saturate-125" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#111111]/78 via-[#171313]/78 to-[#0B0B0B]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(115,87,198,0.26),transparent_42%),linear-gradient(28deg,rgba(74,158,170,0.18),transparent_45%),linear-gradient(180deg,#171313,#0B0B0B)]" />
      )}

      <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-28 sm:px-8">
        <article className={`w-full max-w-3xl transition duration-500 ${active ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-70'}`}>
          <div className="mb-5 flex items-center gap-3">
            <button type="button" onClick={onOpenProfile} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-sm font-black">
              {post.creator.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.creator.avatar} alt="" className="h-full w-full object-cover" />
              ) : initial}
            </button>
            <button type="button" onClick={onOpenProfile} className="min-w-0 text-left">
              <span className="flex items-center gap-1.5 text-sm font-black">
                <span className="truncate">{author}</span>
                {post.creator.is_verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-[#4A9EAA]" /> : null}
              </span>
              <span className="mt-0.5 block truncate text-xs font-bold text-white/46">
                @{post.creator.username || 'synaura'}{post.created_at ? ` · ${relativeTime(post.created_at)}` : ''}
              </span>
            </button>
            <span className="ml-auto inline-flex items-center gap-1.5 border-l-2 border-[#4A9EAA] pl-3 text-[10px] font-black uppercase text-white/58">
              Dans le Flow
            </span>
          </div>

          {post.content ? (
            <button type="button" onClick={onOpenPost} className="block max-w-2xl text-left">
              <p className="line-clamp-6 whitespace-pre-wrap text-xl font-black leading-[1.16] text-white sm:text-2xl md:text-3xl">
                {post.content}
              </p>
            </button>
          ) : null}

          {post.image_url ? (
            <button type="button" onClick={onOpenPost} className="mt-5 block max-h-[34vh] w-full overflow-hidden rounded-lg border border-white/12 bg-black/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.image_url} alt="" className="max-h-[34vh] w-full object-cover" />
            </button>
          ) : null}

          {track ? (
            <div className="mt-6 flex items-center gap-3 border-y border-white/12 py-4">
              <button type="button" onClick={() => onPlayTrack(track)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white/[0.08]">
                {track.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : <Music2 className="absolute inset-0 m-auto h-7 w-7 text-white/40" />}
                <span className="absolute inset-0 grid place-items-center bg-black/22">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#F7F6F3] text-[#111111] shadow-lg">
                    {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
                  </span>
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase text-[#8CC8D0]">
                  Son attaché
                  {trackDuration ? <span className="text-white/36">{trackDuration}</span> : null}
                </span>
                <button type="button" onClick={() => (onOpenTrack ? onOpenTrack(track) : onOpenPost())} className="mt-1 block w-full truncate text-left text-lg font-black">{track.title}</button>
                <span className="mt-1 block truncate text-sm font-bold text-white/48">{track.artist.name}</span>
                {getAudioElement && onSeek ? (
                  <Waveform
                    peaks={waveform.peaks}
                    duration={waveform.duration || track.duration || 0}
                    loading={waveform.loading}
                    getAudioElement={getAudioElement}
                    onSeek={onSeek}
                    compact
                    variant="dark"
                    className="mt-2"
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  onPlayTrack(track);
                  window.setTimeout(() => window.dispatchEvent(new CustomEvent('synaura:open-full-player')), 80);
                }}
                aria-label="Ouvrir le lecteur complet"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.08] text-white/68"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-2">
            <button type="button" disabled={liking} onClick={() => void toggleLike()} className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${liked ? 'border-[#D96D63]/50 bg-[#D96D63]/[0.22] text-[#FFB7B0]' : 'border-white/12 bg-white/[0.08] text-white/72 hover:bg-white/12'}`}>
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              {likesCount ? formatCount(likesCount) : "J'aime"}
            </button>
            <button type="button" onClick={onOpenPost} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-4 text-xs font-black text-white/72 transition hover:bg-white/12">
              <MessageCircle className="h-4 w-4" />
              {post.comments_count ? formatCount(post.comments_count) : 'Commenter'}
            </button>
            <button type="button" onClick={onShare} aria-label="Partager le post" className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.08] text-white/72 transition hover:bg-white/12">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
