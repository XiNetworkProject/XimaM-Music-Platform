'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

export default function HlsVideoPlayer({ src, poster, className }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHls = useMemo(() => src.toLowerCase().includes('.m3u8'), [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);

    // Native HLS (Safari / iOS)
    if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    // HLS.js (Chrome/Edge/Firefox)
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        // Tweaks safe by default (low-latency can be tuned later)
        lowLatencyMode: true,
        backBufferLength: 30,
      });

      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data?.fatal) {
          setError('Lecture du live indisponible pour le moment.');
          try {
            hls.destroy();
          } catch {}
        }
      });

      return () => {
        try {
          hls.destroy();
        } catch {}
      };
    }

    // Fallback (non-hls url)
    video.src = src;
  }, [src, isHls]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        className="w-full h-full rounded-3xl bg-black"
        controls
        playsInline
        poster={poster}
      />
      {error && (
        <div className="mt-2 rounded-2xl border border-border-secondary bg-background-tertiary px-3 py-2 text-sm text-foreground-secondary">
          {error}
        </div>
      )}
    </div>
  );
}

