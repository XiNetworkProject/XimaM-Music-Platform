'use client';

import React, { useMemo } from 'react';
import MuxPlayer from '@mux/mux-player-react';

type Props = {
  playbackId?: string;
  playbackUrl?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  // MuxPlayer embarque ses propres contrôles. On garde la prop pour cohérence d'API,
  // mais on ne l'utilise pas (le thème gère l'UI).
  controls?: boolean;
  title?: string;
};

type ParsedMuxPlaybackUrl = {
  playbackId: string | null;
  token: string | null;
  extraSourceParams: Record<string, string>;
};

export function muxParsePlaybackUrl(playbackUrl: string): ParsedMuxPlaybackUrl {
  try {
    const u = new URL(playbackUrl);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith('mux.com')) return { playbackId: null, token: null, extraSourceParams: {} };
    const m = u.pathname.match(/\/([a-z0-9]+)\.m3u8$/i);
    const playbackId = m?.[1] || null;
    const token = u.searchParams.get('token');
    const extraSourceParams: Record<string, string> = {};
    u.searchParams.forEach((value, key) => {
      if (key === 'token') return;
      extraSourceParams[key] = value;
    });
    return { playbackId, token, extraSourceParams };
  } catch {
    return { playbackId: null, token: null, extraSourceParams: {} };
  }
}

export function muxPlaybackIdFromUrl(playbackUrl: string): string | null {
  return muxParsePlaybackUrl(playbackUrl).playbackId;
}

export default function MuxVideoPlayer({
  playbackId,
  playbackUrl,
  className,
  autoPlay = true,
  muted = true,
  controls = true,
  title,
}: Props) {
  const parsed = useMemo(() => (playbackUrl ? muxParsePlaybackUrl(playbackUrl) : null), [playbackUrl]);
  const finalPlaybackId = parsed?.playbackId || playbackId || '';
  const tokens = parsed?.token ? { playback: parsed.token } : undefined;
  const extraSourceParams = parsed?.extraSourceParams && Object.keys(parsed.extraSourceParams).length ? parsed.extraSourceParams : undefined;

  const metadata = useMemo(
    () => ({
      video_title: title || 'SYNAURA TV',
      video_id: finalPlaybackId,
    }),
    [finalPlaybackId, title],
  );

  return (
    <div className={className}>
      <MuxPlayer
        playbackId={finalPlaybackId}
        streamType="live"
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        // Stabilité/qualité: laisser Mux gérer l'ABR, mais on peut plafonner l'auto-resolution si besoin.
        // maxAutoResolution="1080p"
        metadata={metadata as any}
        tokens={tokens as any}
        extraSourceParams={extraSourceParams as any}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        // "controls" n'est pas exposé dans les types mux-player-react v3; on laisse la UI du player.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        {...(controls ? {} : {})}
      />
    </div>
  );
}

