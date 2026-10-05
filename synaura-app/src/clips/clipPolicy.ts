// Mirrors the published web/SSD contract in lib/clipLimits.ts.
export const CLIP_MIN_SECONDS = 15;
export const CLIP_MAX_SECONDS = 240;
export const CLIP_MAX_BYTES = 250 * 1024 * 1024;
export function clipDurationValid(seconds: number) {
  return Number.isFinite(seconds) && seconds >= CLIP_MIN_SECONDS && seconds <= CLIP_MAX_SECONDS;
}
// Expo ImagePicker reports video duration in milliseconds on both platforms.
export function pickerDurationSeconds(milliseconds: number | null | undefined) {
  return Number.isFinite(milliseconds) && Number(milliseconds) > 0 ? Number(milliseconds) / 1000 : 0;
}
export function requireClipDuration(seconds: number) {
  if (!clipDurationValid(seconds)) throw new Error('Choisis une vidéo de 15 secondes à 4 minutes.');
  return seconds;
}
