import type { AudioCoreTrack } from './audio/AudioCore';

export type ChamberTrack = AudioCoreTrack & {
  likesCount: number;
  commentsCount: number;
  isAI: boolean;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback; }
function count(value: unknown) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function media(value: unknown) {
  const url = text(value);
  if (!url || /[\s\\]/.test(url)) return '';
  if (/^\/(?!\/)/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname ? url : '';
  } catch { return ''; }
}

/** Presentation adapter only. Preserve source flags/counts; never invent people or a playable source. */
export function normalizeChamberCatalog(payload: unknown): ChamberTrack[] {
  const tracks = object(payload).tracks;
  if (!Array.isArray(tracks)) throw new Error('Réponse du catalogue invalide.');
  const seen = new Set<string>();
  return tracks.flatMap((item) => {
    const raw = object(item);
    const id = text(raw._id);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const artist = object(raw.artist);
    const likes = strings(raw.likes);
    const comments = strings(raw.comments);
    return [{
      ...raw,
      _id: id,
      title: text(raw.title).trim() || 'Sans titre',
      artist: {
        ...artist,
        _id: text(artist._id),
        name: text(artist.name) || text(artist.username) || 'Artiste non renseigné',
        username: text(artist.username),
        avatar: media(artist.avatar) || undefined,
      },
      audioUrl: media(raw.audioUrl),
      coverUrl: media(raw.coverUrl) || undefined,
      duration: count(raw.duration),
      genre: strings(raw.genre),
      likes,
      comments,
      likesCount: raw.likesCount == null ? likes.length : count(raw.likesCount),
      commentsCount: raw.commentsCount == null ? comments.length : count(raw.commentsCount),
      plays: count(raw.plays),
      isLiked: raw.isLiked === true,
      isAI: raw.isAI === true,
    } as ChamberTrack];
  });
}

export function chamberTime(seconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}
