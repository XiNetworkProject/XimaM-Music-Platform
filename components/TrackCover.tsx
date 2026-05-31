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

function normalizeVideoUrl(url?: string | null): string | null {
  if (!url) return null;
  return url;
}

function toCloudinaryVideoUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('b-cdn.net') && parsed.pathname.includes('/video/upload/')) {
      return `https://res.cloudinary.com${parsed.pathname}${parsed.search || ''}`;
    }
  } catch {
    return url;
  }
  return null;
}

function inferVideoUrlFromPoster(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes('/video/upload/') || !parsed.pathname.includes('f_jpg')) {
      return null;
    }

    const path = parsed.pathname
      .replace('/video/upload/so_0,f_jpg/', '/video/upload/f_mp4,q_auto/')
      .replace('/video/upload/f_jpg,so_0/', '/video/upload/f_mp4,q_auto/')
      .replace(/\.(jpg|jpeg|png|webp)$/i, '.mp4');

    return `${parsed.origin}${path}${parsed.search || ''}`;
  } catch {
    return null;
  }
}

interface TrackCoverProps {
  trackId?: string | null;
  src?: string | null;
  videoSrc?: string | null;
  posterSrc?: string | null;
  autoPlayVideo?: boolean;
  pauseWhenInactive?: boolean;
  playOnHover?: boolean;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: number;
  rounded?: string;
  objectFit?: 'cover' | 'contain';
}

type ActiveTrackMedia = {
  id?: string | null;
  isPlaying?: boolean;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
};

function sameMedia(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  const variants = (value: string) => {
    const normalized = normalizeVideoUrl(value);
    const cloudinary = toCloudinaryVideoUrl(normalized);
    return [value, normalized, cloudinary].filter(Boolean) as string[];
  };
  const aVariants = new Set(variants(a));
  return variants(b).some((value) => aVariants.has(value));
}

export default function TrackCover({
  trackId,
  src,
  videoSrc,
  posterSrc,
  autoPlayVideo = false,
  pauseWhenInactive = true,
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
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const [activeMedia, setActiveMedia] = useState<ActiveTrackMedia | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [from, to] = getGradient(title);
  const imageSrc = src || posterSrc || null;
  const primaryVideoSrc = normalizeVideoUrl(videoSrc) || inferVideoUrlFromPoster(posterSrc || src);
  const fallbackVideoSrc = toCloudinaryVideoUrl(primaryVideoSrc);
  const activeVideoSrc = useVideoFallback && fallbackVideoSrc ? fallbackVideoSrc : primaryVideoSrc;
  const showVideo = Boolean(activeVideoSrc && !videoErrored);
  const isActiveTrackVideo = Boolean(
    activeMedia?.isPlaying &&
    (trackId
      ? activeMedia.id && String(trackId) === String(activeMedia.id)
      : (
        sameMedia(activeVideoSrc, activeMedia.coverVideoUrl) ||
        sameMedia(activeVideoSrc, activeMedia.coverVideoPosterUrl) ||
        sameMedia(imageSrc, activeMedia.coverUrl) ||
        sameMedia(imageSrc, activeMedia.coverVideoPosterUrl)
      ))
  );
  const shouldPlayVideo = autoPlayVideo || isActiveTrackVideo;
  const showPlaceholder = !showVideo && (!imageSrc || errored);
  const letter = (title || alt || '?')[0]?.toUpperCase() ?? '♪';

  useEffect(() => {
    setVideoErrored(false);
    setUseVideoFallback(false);
  }, [primaryVideoSrc]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readCurrent = () => {
      setActiveMedia(((window as any).__synauraActiveTrackMedia || null) as ActiveTrackMedia | null);
    };
    readCurrent();
    const onActiveTrackMedia = (event: Event) => {
      setActiveMedia(((event as CustomEvent<ActiveTrackMedia>).detail || null) as ActiveTrackMedia | null);
    };
    window.addEventListener('synaura:active-track-media', onActiveTrackMedia);
    return () => window.removeEventListener('synaura:active-track-media', onActiveTrackMedia);
  }, []);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    if (video.readyState === 0) video.load();
    video.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (!showVideo) return;
    if (shouldPlayVideo) playVideo();
    else if (pauseWhenInactive) videoRef.current?.pause();
  }, [showVideo, shouldPlayVideo, pauseWhenInactive, activeVideoSrc, playVideo]);

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
        src={activeVideoSrc!}
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
        autoPlay={shouldPlayVideo}
        preload="auto"
        onLoadedMetadata={() => {
          if (shouldPlayVideo) playVideo();
        }}
        onCanPlay={() => {
          if (shouldPlayVideo) playVideo();
        }}
        onPlaying={() => {
          const video = videoRef.current;
          if (video) video.loop = true;
        }}
        onMouseEnter={() => {
          if (playOnHover) playVideo();
        }}
        onTouchStart={() => {
          if (playOnHover) playVideo();
        }}
        onMouseLeave={() => {
          if (!shouldPlayVideo) videoRef.current?.pause();
        }}
        onError={() => {
          if (!useVideoFallback && fallbackVideoSrc) {
            setUseVideoFallback(true);
            return;
          }
          setVideoErrored(true);
        }}
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
