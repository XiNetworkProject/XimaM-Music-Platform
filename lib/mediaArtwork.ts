import type { MediaArtwork } from '@/hooks/useMediaSession';

export function toArtworkList(url?: string): MediaArtwork[] | undefined {
  if (!url) return undefined;
  return [96, 192, 256, 512, 1024].map((px) => ({
    src: url,
    sizes: `${px}x${px}`,
    type: 'image/jpeg',
  }));
}


