/**
 * Le media element appartient exclusivement a l'intro Discover. Il est lance
 * depuis le gestionnaire d'un clic explicite et ne rejoint jamais Audio Core.
 */
export async function startSynauraSonicLogo(media: HTMLAudioElement | null) {
  if (!media || typeof window === 'undefined') return false;
  try {
    media.pause();
    media.currentTime = 0;
    media.volume = 0.72;
    await media.play();
    return true;
  } catch {
    return false;
  }
}

export function stopSynauraSonicLogo(media: HTMLAudioElement | null) {
  if (!media) return;
  try {
    media.pause();
    media.currentTime = 0;
  } catch {}
}
