/**
 * Compatibilite historique : ces noms sont conserves pour ne pas casser les
 * nombreux appelants, mais la destination est desormais le stockage Synaura.
 */
import { toPublicMediaUrl } from '@/lib/mediaUrls';

export function getCdnUrl(url: string | null | undefined): string | null {
  return toPublicMediaUrl(url);
}

export function applyCdnToTrack<T extends Record<string, any>>(track: T): T {
  const mediaTrack: any = { ...track };
  for (const key of [
    'audioUrl', 'audio_url', 'coverUrl', 'cover_url', 'coverVideoUrl', 'cover_video_url',
    'coverVideoPosterUrl', 'cover_video_poster_url', 'musicVideoUrl', 'music_video_url',
    'musicVideoPosterUrl', 'music_video_poster_url', 'visualUrl', 'visual_url',
  ]) {
    if (mediaTrack[key]) mediaTrack[key] = toPublicMediaUrl(mediaTrack[key]) || mediaTrack[key];
  }
  if (mediaTrack.artist?.avatar) {
    mediaTrack.artist = { ...mediaTrack.artist, avatar: toPublicMediaUrl(mediaTrack.artist.avatar) || mediaTrack.artist.avatar };
  }
  return mediaTrack as T;
}

export function applyCdnToTracks<T extends Record<string, any>>(tracks: T[]): T[] {
  return tracks.map((track) => applyCdnToTrack(track));
}

export function applyCdnToProfile<T extends Record<string, any>>(profile: T): T {
  const mediaProfile: any = { ...profile };
  if (mediaProfile.avatar) mediaProfile.avatar = toPublicMediaUrl(mediaProfile.avatar) || mediaProfile.avatar;
  if (mediaProfile.banner) mediaProfile.banner = toPublicMediaUrl(mediaProfile.banner) || mediaProfile.banner;
  return mediaProfile as T;
}

// Anciens interrupteurs conserves comme no-op pendant la transition.
export function setCdnEnabled(_enabled: boolean) {}
export function isCdnEnabled() { return true; }
