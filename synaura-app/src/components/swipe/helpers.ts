import type { Track } from '@/api/types';

export type FeedMode = 'reco' | 'trending' | 'boost';

export const FEED_MODE_META: Record<FeedMode, { label: string; description: string }> = {
  reco: { label: 'Pour toi', description: 'Suggestions personnalisees' },
  trending: { label: 'Tendances', description: 'Les sons qui montent' },
  boost: { label: 'Boost', description: 'Les titres pousses dans Synaura' },
};

export function fmtCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function fmtTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function trackArtistName(track: Track | null | undefined) {
  return (
    track?.artist?.artistName ||
    track?.artist?.name ||
    track?.artist?.username ||
    'Artiste Synaura'
  );
}

export function topGenre(track: Track | null | undefined) {
  const value = (track?.genre || []).map((entry) => String(entry || '').trim()).find(Boolean);
  return value || null;
}

export function uniqueTracks(tracks: Track[]) {
  const seen = new Set<string>();
  const result: Track[] = [];
  for (const track of tracks) {
    if (!track?._id || seen.has(track._id)) continue;
    seen.add(track._id);
    result.push(track);
  }
  return result;
}

export function clamp(value: number, lo: number, hi: number) {
  return Math.min(Math.max(value, lo), hi);
}
