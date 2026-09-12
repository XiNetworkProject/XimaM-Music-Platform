// Small track-only contract. Clips/posts must never be coerced into a track ID.
export type ActionTrack = {
  _id: string; title: string; artist: { _id: string; name: string; username: string };
  audioUrl: string; coverUrl?: string | null; duration: number; genre: string[];
  isAI: boolean; isPublic?: boolean; isLiked?: boolean; likes: string[];
  lyrics?: string | null; createdAt?: string; album?: string | null;
  allowClips?: boolean; allowAiVariation?: boolean; canRemixAiVariation?: boolean;
  remixVisibility?: 'everyone' | 'followers' | 'disabled'; variationsCount?: number;
  remixAttribution?: { title?: string; artist?: string; sourceTrackId?: string; trackUrl?: string } | null;
};
export type TrackSurface = 'track-options' | 'playlist-picker' | 'queue' | 'lyrics' | 'track-details' | 'track-share' | 'track-remix' | 'track-clip';
export function normalizeActionTrack(raw: any): ActionTrack {
  const id = String(raw?._id || raw?.id || '');
  const artist = typeof raw?.artist === 'object' ? raw.artist : {};
  return { ...raw, _id: id, title: String(raw?.title || 'Morceau'),
    artist: { _id: String(artist?._id || artist?.id || raw?.creatorId || raw?.creator_id || ''), name: String(artist?.name || (typeof raw?.artist === 'string' ? raw.artist : '') || raw?.creator?.name || 'Artiste'), username: String(artist?.username || raw?.artistUsername || raw?.creator?.username || '') },
    audioUrl: String(raw?.audioUrl || raw?.audio_url || ''), coverUrl: raw?.coverUrl || raw?.cover_url || null,
    duration: Number(raw?.duration) || 0, genre: Array.isArray(raw?.genre) ? raw.genre : [],
    isAI: id.startsWith('ai-'), likes: Array.isArray(raw?.likes) ? raw.likes : [],
  };
}
export const isOrganizableTrack = (id: string) => Boolean(id) && !id.startsWith('radio-');
export const canPlaylistTrack = (id: string) => isOrganizableTrack(id) && !id.startsWith('ai-');
export const trackHref = (id: string) => `/track/${encodeURIComponent(id)}`;
export const trackShareUrl = (id: string) => `https://synaura.fr${trackHref(id)}`;
export async function copyTrackLink(id: string, clipboard: Pick<Clipboard, 'writeText'> | undefined) {
  try {
    if (!clipboard) throw new Error('Clipboard unavailable');
    await clipboard.writeText(trackShareUrl(id));
  } catch {
    throw new Error('Copie non autorisée par ce navigateur. Sélectionne le lien puis copie-le manuellement.');
  }
}
export function trackHandoffHref(track: ActionTrack, kind: 'remix' | 'clip', snapshotId?: string | null) {
  const params = new URLSearchParams(kind === 'clip'
    ? { trackId: track._id, trackType: track.isAI ? 'ai_track' : 'track' }
    : { mode: 'remix', sourceTrackId: track._id, sourceTrackType: track.isAI ? 'ai_track' : 'track' });
  if (snapshotId) params.set('liveReturn', snapshotId);
  return `${kind === 'clip' ? '/clips/new' : '/ai-generator'}?${params}`;
}
// Preserve the loaded track and its index even when moving an earlier queue item.
export function remainingQueueStart(queue: { _id: string }[], currentId: string | null) {
  return currentId ? Math.max(0, queue.findIndex(track => track._id === currentId) + 1) : 0;
}
export function insertQueueTrack<T extends { _id: string }>(queue: T[], currentId: string | null, track: T, mode: 'next' | 'end') {
  if (currentId === track._id) return queue;
  const next = queue.filter(t => t._id !== track._id);
  if (next.length >= 500) throw new Error('La file contient déjà 500 morceaux. Retire un titre avant d’en ajouter un autre.');
  const index = currentId ? next.findIndex(t => t._id === currentId) : -1;
  next.splice(mode === 'next' ? index + 1 : next.length, 0, track);
  return next;
}
export async function nativeTrackShare(track: Pick<ActionTrack, '_id' | 'title'>, navigatorLike: Pick<Navigator, 'share' | 'canShare'>): Promise<'shared' | 'cancelled' | 'fallback'> {
  const data = { title: track.title, url: trackShareUrl(track._id) };
  if (!navigatorLike.share || (navigatorLike.canShare && !navigatorLike.canShare(data))) return 'fallback';
  try { await navigatorLike.share(data); return 'shared'; }
  catch (error) { return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'fallback'; }
}
