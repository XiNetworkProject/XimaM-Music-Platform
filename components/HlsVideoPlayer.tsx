'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';

type Props = {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
};

export default function HlsVideoPlayer({ src, poster, className, autoPlay = true, muted = true, controls = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  const isHls = useMemo(() => src.toLowerCase().includes('.m3u8'), [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    retryCountRef.current = 0;

    const cleanup = () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (stallTimerRef.current) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };

    const safePlay = () => {
      if (!autoPlay) return;
      Promise.resolve()
        .then(() => video.play())
        .catch(() => {});
    };

    const scheduleReinit = (reason: string) => {
      // Backoff: 0.4s, 0.8s, 1.6s, 3.2s ... max 6.4s (et on limite le nombre de cycles)
      retryCountRef.current = Math.min(retryCountRef.current + 1, 6);
      const delayMs = Math.min(6400, 400 * Math.pow(2, retryCountRef.current - 1));
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        // Re-init complet du player
        try {
          cleanup();
        } catch {}
        // Si le composant est toujours monté, relancer via un reload de src (effet déclenché par src stable)
        // Ici on force simplement un reinit en ré-appelant initHls via un petit trick:
        init();
      }, delayMs);
      setError(`Reconnexion… (${reason})`);
    };

    const init = () => {
      // Native HLS (Safari / iOS)
      if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
        cleanup();
        video.src = src;
        safePlay();
        return;
      }

      // HLS.js (Chrome/Edge/Firefox)
      if (isHls && Hls.isSupported()) {
        cleanup();
        const hls = new Hls({
          lowLatencyMode: true,
          enableWorker: true,
          backBufferLength: 0,
          maxBufferLength: 30,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          maxLiveSyncPlaybackRate: 1.5,
        });
        hlsRef.current = hls;

        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          try {
            hls.loadSource(src);
          } catch {
            scheduleReinit('loadSource');
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setError(null);
          safePlay();
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data) return;

          // Non-fatal: on laisse hls.js gérer
          if (!data.fatal) return;

          // Fatal handling recommandé par hls.js
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              // Essayer de relancer le chargement
              try {
                hls.startLoad();
                setError('Reconnexion… (réseau)');
              } catch {
                scheduleReinit('network');
              }
              return;
            }
            case Hls.ErrorTypes.MEDIA_ERROR: {
              // Tenter recovery du décodeur
              try {
                hls.recoverMediaError();
                setError('Reconnexion… (média)');
              } catch {
                scheduleReinit('media');
              }
              return;
            }
            default: {
              scheduleReinit('fatal');
              return;
            }
          }
        });

        return;
      }

      // Fallback (non-hls url)
      cleanup();
      video.src = src;
      safePlay();
    };

    // Anti-stall (si l'image se fige)
    const onTimeUpdate = () => {
      const t = video.currentTime || 0;
      if (t > 0) lastTimeRef.current = t;
    };
    const onWaitingOrStalled = () => {
      if (stallTimerRef.current) window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = window.setTimeout(() => {
        const nowT = video.currentTime || 0;
        const lastT = lastTimeRef.current || 0;
        // Si pas de progression depuis un moment, re-init
        if (nowT <= lastT + 0.01) {
          scheduleReinit('stall');
        }
      }, 4500);
    };
    const onVideoError = () => {
      scheduleReinit('video');
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaitingOrStalled);
    video.addEventListener('stalled', onWaitingOrStalled);
    video.addEventListener('error', onVideoError);

    init();

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaitingOrStalled);
      video.removeEventListener('stalled', onWaitingOrStalled);
      video.removeEventListener('error', onVideoError);
      cleanup();
    };
  }, [src, isHls, autoPlay]);

  return (
    <div className={className}>
      <video
        ref={videoRef}
        className="w-full h-full rounded-3xl bg-black"
        controls={controls}
        playsInline
        poster={poster}
        muted={muted}
        autoPlay={autoPlay}
        preload="auto"
        crossOrigin="anonymous"
      />
      {error && (
        <div className="mt-2 rounded-2xl border border-border-secondary bg-background-tertiary px-3 py-2 text-sm text-foreground-secondary">
          {error}
        </div>
      )}
    </div>
  );
}

