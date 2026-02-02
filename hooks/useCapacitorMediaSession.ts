'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@jofr/capacitor-media-session';
import { LocalNotifications } from '@capacitor/local-notifications';

export type MediaArtwork = { src: string; sizes?: string; type?: string };
export type MediaTrack = {
  id: string;
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaArtwork[];
  duration?: number;
};
export type Controls = {
  play: () => Promise<void> | void;
  pause: () => void;
  next?: () => void;
  prev?: () => void;
  seekTo?: (seconds: number) => void;
  seekBy?: (offsetSeconds: number) => void;
  stop?: () => void;
};

const BASE_URL =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://xima-m-music-platform.vercel.app';

function toAbsoluteArtwork(artwork: MediaArtwork[] | undefined): MediaArtwork[] {
  if (!artwork?.length) return [{ src: `${BASE_URL}/android-chrome-512x512.png`, sizes: '512x512', type: 'image/png' }];
  if (!Capacitor.isNativePlatform()) return artwork;
  return artwork.map((a) => ({
    ...a,
    src: a.src.startsWith('http') ? a.src : `${BASE_URL}${a.src.startsWith('/') ? '' : '/'}${a.src}`,
  }));
}

export function useCapacitorMediaSession(
  audioEl: HTMLAudioElement | null,
  track: MediaTrack | null,
  controls: Controls,
  isPlaying: boolean
) {
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  // Android 13+ : demander la permission de notification au démarrage (obligatoire pour afficher la notif)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    LocalNotifications.requestPermissions().catch((e) => console.warn('MediaSession: permission notification', e));
  }, []);

  // 1+2) Métadonnées PUIS état de lecture dans le même effet pour garantir l’ordre côté plugin Android
  // (le service démarre sur setPlaybackState('playing') et lit immédiatement title/artist/album)
  useEffect(() => {
    const run = async () => {
      if (!track) {
        if (Capacitor.isNativePlatform()) {
          console.warn('[Synaura MediaSession] Pas de piste → setMetadata vide + setPlaybackState(none)');
        }
        await MediaSession.setMetadata({ title: '', artist: '', album: '', artwork: [] }).catch(() => {});
        await MediaSession.setPlaybackState({ playbackState: 'none' }).catch(() => {});
        return;
      }
      const artwork = toAbsoluteArtwork(track.artwork);
      if (Capacitor.isNativePlatform()) {
        console.warn('[Synaura MediaSession] setMetadata puis setPlaybackState', track.title, isPlaying ? 'playing' : 'paused');
      }
      await MediaSession.setMetadata({
        title: track.title || 'Synaura',
        artist: track.artist || 'Unknown',
        album: track.album || 'Synaura',
        artwork,
      }).catch((e) => console.warn('MediaSession.setMetadata', e));
      await MediaSession.setPlaybackState({
        playbackState: isPlaying ? 'playing' : 'paused',
      }).catch((e) => console.warn('MediaSession.setPlaybackState', e));
    };
    run();
  }, [track?.id, track?.title, track?.artist, track?.album, JSON.stringify(track?.artwork), isPlaying]);

  // 3) Handlers : play / pause / next / prev (et seek/stop si tu les veux)
  useEffect(() => {
    const c = () => controlsRef.current;

    MediaSession.setActionHandler({ action: 'play' }, () => {
      c().play?.();
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'pause' }, () => {
      c().pause?.();
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
      c().next?.();
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
      c().prev?.();
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
      if (details.seekTime != null) c().seekTo?.(details.seekTime);
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'seekbackward' }, () => {
      c().seekBy?.(-10);
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'seekforward' }, () => {
      c().seekBy?.(10);
    }).catch(() => {});

    MediaSession.setActionHandler({ action: 'stop' }, () => {
      c().stop?.();
    }).catch(() => {});

    return () => {
      MediaSession.setActionHandler({ action: 'play' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'pause' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'nexttrack' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'previoustrack' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'seekto' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'seekbackward' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'seekforward' }, null).catch(() => {});
      MediaSession.setActionHandler({ action: 'stop' }, null).catch(() => {});
    };
  }, []);

  // 4) Position / durée (optionnel mais bien pour la barre de progression)
  useEffect(() => {
    if (!audioEl || !track) return;

    const update = () => {
      const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
      const position = Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
      const playbackRate = audioEl.playbackRate || 1;
      MediaSession.setPositionState({ duration, position, playbackRate }).catch(() => {});
    };

    const events: (keyof HTMLMediaElementEventMap)[] = [
      'timeupdate',
      'loadedmetadata',
      'durationchange',
      'seeked',
      'ratechange',
      'playing',
      'pause',
    ];
    events.forEach((ev) => audioEl.addEventListener(ev, update));
    update();
    return () => events.forEach((ev) => audioEl.removeEventListener(ev, update));
  }, [audioEl, track?.id]);
}
