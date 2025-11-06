/**
 * Système CDN pour Synaura
 * 
 * Configuration: Bunny CDN (cdn.synaura.fr) pointant vers Cloudinary
 * Ce fichier permet de remplacer automatiquement les URLs Cloudinary par le CDN
 */

const CDN_DOMAIN = process.env.NEXT_PUBLIC_CDN_DOMAIN || 'synaura-cdn.b-cdn.net';
const CLOUDINARY_DOMAINS = [
  'res.cloudinary.com',
  'cloudinary.com'
];

/**
 * Remplace une URL Cloudinary par l'URL du CDN Bunny
 * @param url URL originale (Cloudinary ou autre)
 * @returns URL CDN si applicable, sinon URL originale
 */
export function getCdnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Ignorer les chemins locaux (commençant par /)
  if (typeof url === 'string' && url.startsWith('/')) {
    return url;
  }
  
  // Vérifier si le CDN est activé
  if (process.env.NEXT_PUBLIC_CDN_ENABLED === 'false') {
    return url;
  }
  
  try {
    // Vérifier si c'est une URL Cloudinary
    const urlObj = new URL(url);
    const isCloudinary = CLOUDINARY_DOMAINS.some(domain => 
      urlObj.hostname.includes(domain)
    );
    
    if (!isCloudinary) {
      return url; // Retourner l'URL telle quelle si ce n'est pas Cloudinary
    }
    
    // Bunny CDN en mode Pull Zone pointe directement vers res.cloudinary.com
    // On remplace juste le domaine, pas besoin d'ajouter /cloudinary
    const cdnUrl = `https://${CDN_DOMAIN}${urlObj.pathname}${urlObj.search || ''}`;
    
    return cdnUrl;
  } catch (error) {
    // Si l'URL n'est pas valide, retourner l'originale
    console.warn('Invalid URL passed to getCdnUrl:', url);
    return url;
  }
}

/**
 * Remplace toutes les URLs d'un objet track par leurs équivalents CDN
 * @param track Objet track avec audioUrl, coverUrl, etc.
 * @returns Track avec URLs CDN
 */
export function applyCdnToTrack<T extends Record<string, any>>(track: T): T {
  const cdnTrack: any = { ...track };
  
  if (cdnTrack.audioUrl) {
    cdnTrack.audioUrl = getCdnUrl(cdnTrack.audioUrl) || cdnTrack.audioUrl;
  }
  
  if (cdnTrack.coverUrl) {
    cdnTrack.coverUrl = getCdnUrl(cdnTrack.coverUrl) || cdnTrack.coverUrl;
  }
  
  if (cdnTrack.cover_url) {
    cdnTrack.cover_url = getCdnUrl(cdnTrack.cover_url) || cdnTrack.cover_url;
  }
  
  if (cdnTrack.audio_url) {
    cdnTrack.audio_url = getCdnUrl(cdnTrack.audio_url) || cdnTrack.audio_url;
  }
  
  // Avatar de l'artiste
  if (cdnTrack.artist?.avatar) {
    cdnTrack.artist.avatar = getCdnUrl(cdnTrack.artist.avatar) || cdnTrack.artist.avatar;
  }
  
  return cdnTrack as T;
}

/**
 * Remplace toutes les URLs d'un array de tracks
 * @param tracks Array de tracks
 * @returns Array avec URLs CDN
 */
export function applyCdnToTracks<T extends Record<string, any>>(tracks: T[]): T[] {
  return tracks.map(track => applyCdnToTrack(track));
}

/**
 * Remplace l'URL d'un profil utilisateur
 * @param profile Objet profile avec avatar, banner, etc.
 * @returns Profile avec URLs CDN
 */
export function applyCdnToProfile<T extends Record<string, any>>(profile: T): T {
  const cdnProfile: any = { ...profile };
  
  if (cdnProfile.avatar) {
    cdnProfile.avatar = getCdnUrl(cdnProfile.avatar) || cdnProfile.avatar;
  }
  
  if (cdnProfile.banner) {
    cdnProfile.banner = getCdnUrl(cdnProfile.banner) || cdnProfile.banner;
  }
  
  return cdnProfile as T;
}

/**
 * Active/désactive le CDN globalement (pour debug)
 */
let CDN_ENABLED = process.env.NEXT_PUBLIC_CDN_ENABLED !== 'false';

export function setCdnEnabled(enabled: boolean) {
  CDN_ENABLED = enabled;
}

export function isCdnEnabled(): boolean {
  return CDN_ENABLED;
}

// Re-exporter pour compatibilité
export { CDN_DOMAIN, CLOUDINARY_DOMAINS };

