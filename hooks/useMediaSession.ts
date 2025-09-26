'use client';

import { useEffect } from 'react';

export type MediaArtwork = { src: string; sizes?: string; type?: string };
export type MediaTrack = {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaArtwork[];
  url?: string;
  duration?: number;
};
export type Controls = {
  play: () => Promise<void> | void;
  pause: () => void;
  next?: () => Promise<void> | void;
  prev?: () => Promise<void> | void;
  seekTo?: (seconds: number) => void;
  seekBy?: (offsetSeconds: number) => void;
  stop?: () => void;
};
export type UseMediaSessionParams = {
  audioEl: HTMLAudioElement | null;
  track: MediaTrack | null;
  controls: Controls;
  isPlaying: boolean;
};

const hasMediaSession = ():
  boolean => typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export function useMediaSession({ audioEl, track, controls, isPlaying }: UseMediaSessionParams) {
  // Metadonnées et état de lecture
  useEffect(() => {
    if (!hasMediaSession()) return;
    if (!track) {
      try {
        // @ts-ignore
        navigator.mediaSession.metadata = null;
      } catch {}
      return;
    }
    try {
      // @ts-ignore
      navigator.mediaSession.metadata = new (window as any).MediaMetadata({
        title: track.title || 'Synaura',
        artist: track.artist || 'Unknown',
        album: track.album || 'Synaura',
        artwork: track.artwork,
      });
      // @ts-ignore
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, track?.title, track?.artist, track?.album, JSON.stringify(track?.artwork), isPlaying]);

  // Action handlers (play/pause/seek/next/prev/stop)
  useEffect(() => {
    if (!hasMediaSession()) return;

    // @ts-ignore
    const session = navigator.mediaSession;
    const set = session.setActionHandler ? session.setActionHandler.bind(session) : undefined;
    const safe = (fn?: Function) => (typeof fn === 'function' ? fn : undefined);

    set?.('play', async () => { await controls.play?.(); });
    set?.('pause', () => { controls.pause?.(); });
    set?.('nexttrack', () => { safe(controls.next)?.(); });
    set?.('previoustrack', () => { safe(controls.prev)?.(); });
    set?.('seekto', (e: any) => {
      if (e && typeof e.seekTime === 'number') controls.seekTo?.(e.seekTime);
    });
    set?.('seekbackward', (e: any) => {
      const step = (e && e.seekOffset) || 10;
      controls.seekBy?.(-step);
    });
    set?.('seekforward', (e: any) => {
      const step = (e && e.seekOffset) || 10;
      controls.seekBy?.(step);
    });
    set?.('stop', () => { controls.stop?.(); });

    return () => {
      set?.('play', null);
      set?.('pause', null);
      set?.('nexttrack', null);
      set?.('previoustrack', null);
      set?.('seekto', null);
      set?.('seekbackward', null);
      set?.('seekforward', null);
      set?.('stop', null);
    };
  }, [controls]);

  // Position state depuis l'élément audio
  useEffect(() => {
    if (!hasMediaSession() || !audioEl) return;

    const update = () => {
      try {
        // @ts-ignore
        if ('setPositionState' in navigator.mediaSession) {
          // @ts-ignore
          navigator.mediaSession.setPositionState?.({
            duration: Number.isFinite(audioEl.duration) ? audioEl.duration : 0,
            position: Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0,
            playbackRate: audioEl.playbackRate || 1,
          });
        }
      } catch {}
    };

    const events: (keyof HTMLMediaElementEventMap)[] = [
      'timeupdate', 'loadedmetadata', 'durationchange', 'seeked', 'ratechange', 'playing', 'pause'
    ];
    events.forEach((ev) => audioEl.addEventListener(ev, update));
    update();
    return () => { events.forEach((ev) => audioEl.removeEventListener(ev, update)); };
  }, [audioEl]);
}


