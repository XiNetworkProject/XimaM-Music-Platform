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
  const [debug, setDebug] = useState<any>(null);

  const isHls = useMemo(() => src.toLowerCase().includes('.m3u8'), [src]);
  const debugEnabled = (() => {
    try {
      if (typeof window === 'undefined') return false;
      const qp = new URLSearchParams(window.location.search);
      if (qp.get('debug') === '1') return true;
      return window.localStorage.getItem('tvDebug') === '1';
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setDebug((d: any) => (debugEnabled ? d : null));
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
      if (debugEnabled) {
        try {
          setDebug({
            at: new Date().toISOString(),
            type: 'reinit',
            reason,
            retryCount: retryCountRef.current,
            delayMs,
            src,
            video: {
              currentTime: video.currentTime || 0,
              readyState: video.readyState,
              networkState: video.networkState,
              paused: video.paused,
            },
          });
        } catch {}
      }
    };

    const jumpToLiveEdge = () => {
      try {
        // Priorité: hls.js liveSyncPosition (si dispo)
        const hls = hlsRef.current as any;
        const livePos = typeof hls?.liveSyncPosition === 'number' ? hls.liveSyncPosition : null;
        if (livePos && Number.isFinite(livePos) && livePos > 0) {
          video.currentTime = Math.max(0, livePos);
          return;
        }
        // Fallback: video.seekable (Safari / natif)
        const seekable = video.seekable;
        if (seekable && seekable.length > 0) {
          const end = seekable.end(seekable.length - 1);
          if (Number.isFinite(end) && end > 0) {
            video.currentTime = Math.max(0, end - 0.75);
          }
        }
      } catch {}
    };

    const init = () => {
      // Native HLS (Safari / iOS)
      if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
        cleanup();
        video.src = src;
        safePlay();
        if (debugEnabled) {
          setDebug({
            at: new Date().toISOString(),
            type: 'init_native_hls',
            src,
          });
        }
        return;
      }

      // HLS.js (Chrome/Edge/Firefox)
      if (isHls && Hls.isSupported()) {
        cleanup();
        const hls = new Hls({
          // En prod, on privilégie la stabilité au “ultra low latency”.
          // Mux gère déjà très bien le live; LL-HLS peut être plus fragile selon navigateurs/réseaux.
          lowLatencyMode: false,
          enableWorker: true,
          backBufferLength: 90,
          maxBufferLength: 60,
          liveSyncDurationCount: 6,
          liveMaxLatencyDurationCount: 20,
          capLevelToPlayerSize: true,
        });
        hlsRef.current = hls;

        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          try {
            hls.loadSource(src);
            if (debugEnabled) {
              setDebug({
                at: new Date().toISOString(),
                type: 'media_attached',
                src,
              });
            }
          } catch {
            scheduleReinit('loadSource');
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setError(null);
          if (debugEnabled) {
            setDebug({
              at: new Date().toISOString(),
              type: 'manifest_parsed',
              src,
            });
          }
          safePlay();
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data) return;
          if (debugEnabled) {
            setDebug({
              at: new Date().toISOString(),
              type: data.type,
              details: data.details,
              fatal: data.fatal,
              url: (data as any)?.url || null,
              response: (data as any)?.response
                ? {
                    code: (data as any).response.code,
                    text: (data as any).response.text,
                    url: (data as any).response.url,
                  }
                : null,
              reason: (data as any)?.reason || null,
            });
          }

          // Non-fatal: on laisse hls.js gérer
          if (!data.fatal) return;

          // Fatal handling recommandé par hls.js
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              // Essayer de relancer le chargement
              try {
                jumpToLiveEdge();
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
                jumpToLiveEdge();
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
          if (debugEnabled) {
            setDebug({
              at: new Date().toISOString(),
              type: 'stall_detected',
              src,
              nowT,
              lastT,
              video: {
                readyState: video.readyState,
                networkState: video.networkState,
                paused: video.paused,
              },
            });
          }
          jumpToLiveEdge();
          scheduleReinit('stall');
        }
      }, 4500);
    };
    const onVideoError = () => {
      if (debugEnabled) {
        try {
          setDebug({
            at: new Date().toISOString(),
            type: 'video_error',
            mediaError: {
              code: (video.error as any)?.code ?? null,
              message: (video.error as any)?.message ?? null,
            },
          });
        } catch {}
      }
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
  }, [src, isHls, autoPlay, debugEnabled]);

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
      />
      {error && (
        <div className="mt-2 rounded-2xl border border-border-secondary bg-background-tertiary px-3 py-2 text-sm text-foreground-secondary">
          {error}
        </div>
      )}
      {debugEnabled && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white/70">
          <div className="font-semibold text-white/85">Debug live</div>
          <div className="break-all">src: {src}</div>
          <div className="mt-1 break-all">
            {debug ? JSON.stringify(debug) : 'En attente… (le debug apparaît au 1er stall/retry/erreur)'}
          </div>
        </div>
      )}
    </div>
  );
}

