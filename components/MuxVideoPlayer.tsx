'use client';

import React, { useMemo } from 'react';
import MuxPlayer from '@mux/mux-player-react';

type Props = {
  playbackId: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  // MuxPlayer embarque ses propres contrôles. On garde la prop pour cohérence d'API,
  // mais on ne l'utilise pas (le thème gère l'UI).
  controls?: boolean;
  title?: string;
};

export function muxPlaybackIdFromUrl(playbackUrl: string): string | null {
  try {
    const u = new URL(playbackUrl);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith('mux.com')) return null;
    const m = u.pathname.match(/\/([a-z0-9]+)\.m3u8$/i);
    return m?.[1] || null;
  } catch {
    return null;
  }
}

export default function MuxVideoPlayer({ playbackId, className, autoPlay = true, muted = true, controls = true, title }: Props) {
  const metadata = useMemo(
    () => ({
      video_title: title || 'SYNAURA TV',
      video_id: playbackId,
    }),
    [playbackId, title],
  );

  return (
    <div className={className}>
      <MuxPlayer
        playbackId={playbackId}
        streamType="live"
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        // Stabilité/qualité: laisser Mux gérer l'ABR, mais on peut plafonner l'auto-resolution si besoin.
        // maxAutoResolution="1080p"
        metadata={metadata as any}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        // "controls" n'est pas exposé dans les types mux-player-react v3; on laisse la UI du player.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        {...(controls ? {} : {})}
      />
    </div>
  );
}

