'use client';
import { useEffect, useState, type ComponentProps } from 'react';
import { toPublicMediaUrl, toLegacyMediaFallback } from '@/lib/mediaUrls';

/** Same media routing/fallback policy as TrackCover, without a playback listener. */
export default function PilotImage({ src, alt = '', ...props }: ComponentProps<'img'>) {
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setAttempt(0), [src]);
  const primary = toPublicMediaUrl(String(src || ''));
  const fallback = toLegacyMediaFallback(String(src || ''));
  const resolved = attempt === 0 ? primary : attempt === 1 && fallback !== primary ? fallback : '/default-cover.svg';
  return <img {...props} src={resolved || '/default-cover.svg'} alt={alt} onError={() => setAttempt(value => Math.min(2, value + (fallback && fallback !== primary ? 1 : 2)))} />;
}
