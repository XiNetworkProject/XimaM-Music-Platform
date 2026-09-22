/** Shared client, publication and SSD limits. Keep the DB constraint in sync. */
export const MUSIC_CLIP_MIN_SECONDS = 15;
export const MUSIC_CLIP_MAX_SECONDS = 240;
export const MUSIC_CLIP_MAX_BYTES = 250 * 1024 * 1024;
export const MUSIC_CLIP_DURATION_MESSAGE = 'La vidéo doit durer entre 15 secondes et 4 minutes.';
export function isClipDurationValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MUSIC_CLIP_MIN_SECONDS && value <= MUSIC_CLIP_MAX_SECONDS;
}
