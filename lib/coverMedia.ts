import { MEDIA_BASE_URL, toPublicMediaUrl } from './mediaUrls';

/** Older uploads only stored the Cloudinary first-frame URL. Migration strips
 * its transformation, but keeps the original MP4 in the cover-videos directory. */
export function inferCoverVideoUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const migratedCover = url.origin === new URL(MEDIA_BASE_URL).origin && url.pathname.startsWith('/cloudinary/video/') && url.pathname.includes('/cover-videos/');
    const cloudinaryPoster = ['res.cloudinary.com', 'synaura-cdn.b-cdn.net'].includes(url.hostname) && url.pathname.includes('/video/upload/') && url.pathname.includes('f_jpg');
    if ((!migratedCover && !cloudinaryPoster) || !/\.(jpg|jpeg|png|webp)$/i.test(url.pathname)) return null;
    url.pathname = url.pathname.replace('/so_0,f_jpg/', '/').replace('/f_jpg,so_0/', '/').replace(/\.(jpg|jpeg|png|webp)$/i, '.mp4');
    return toPublicMediaUrl(url.toString());
  } catch { return null; }
}
