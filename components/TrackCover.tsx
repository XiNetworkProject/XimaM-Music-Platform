'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Music2 } from 'lucide-react';

const FALLBACK_GRADIENTS: [string, string][] = [
  ['#7c3aed', '#3b82f6'],
  ['#ec4899', '#8b5cf6'],
  ['#06b6d4', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#8b5cf6', '#ec4899'],
];

function getGradient(seed?: string): [string, string] {
  if (!seed) return FALLBACK_GRADIENTS[0]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length]!;
}

interface TrackCoverProps {
  src?: string | null;
  videoSrc?: string | null;
  posterSrc?: string | null;
  autoPlayVideo?: boolean;
  playOnHover?: boolean;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  rounded?: string;
  objectFit?: 'cover' | 'contain';
}

export default function TrackCover({
  src,
  videoSrc,
  posterSrc,
  autoPlayVideo = false,
  playOnHover = true,
  alt,
  title,
  className = '',
  style,
  size,
  rounded = 'rounded-lg',
  objectFit = 'cover',
}: TrackCoverProps) {
  const [errored, setErrored] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [from, to] = getGradient(title);
  const imageSrc = src || posterSrc || null;
  const showVideo = Boolean(videoSrc && !videoErrored);
  const showPlaceholder = !showVideo && (!imageSrc || errored);
  const letter = (title || alt || '?')[0]?.toUpperCase() ?? '♪';

  useEffect(() => {
    setVideoErrored(false);
  }, [videoSrc]);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (!showVideo) return;
    if (autoPlayVideo) playVideo();
    else videoRef.current?.pause();
  }, [showVideo, autoPlayVideo, videoSrc, playVideo]);

  if (showPlaceholder) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center ${rounded} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${from}, ${to})`,
          width: size ? size : undefined,
          height: size ? size : undefined,
          ...style,
        }}
      >
        <Music2
          className="opacity-20 absolute"
          style={{ width: size ? size * 0.55 : 40, height: size ? size * 0.55 : 40 }}
        />
        <span
          className="relative z-10 font-black text-white/80 select-none"
          style={{ fontSize: size ? Math.max(size * 0.32, 12) : 20 }}
        >
          {letter}
        </span>
      </div>
    );
  }

  if (showVideo) {
    return (
      <video
        ref={videoRef}
        src={videoSrc!}
        poster={posterSrc || src || undefined}
        className={`${rounded} ${className}`}
        style={{
          objectFit,
          width: size ? size : undefined,
          height: size ? size : undefined,
          ...style,
        }}
        muted
        loop
        playsInline
        autoPlay={autoPlayVideo}
        preload={autoPlayVideo ? 'auto' : 'metadata'}
        onLoadedMetadata={() => {
          if (autoPlayVideo) playVideo();
        }}
        onMouseEnter={() => {
          if (playOnHover) playVideo();
        }}
        onTouchStart={() => {
          if (playOnHover) playVideo();
        }}
        onMouseLeave={() => {
          if (!autoPlayVideo) videoRef.current?.pause();
        }}
        onError={() => setVideoErrored(true)}
        aria-label={alt || title || 'Cover video'}
      />
    );
  }

  return (
    <img
      src={imageSrc!}
      alt={alt || title || ''}
      className={`${rounded} ${className}`}
      style={{
        objectFit,
        width: size ? size : undefined,
        height: size ? size : undefined,
        ...style,
      }}
      onError={() => setErrored(true)}
      loading="lazy"
      decoding="async"
    />
  );
}
