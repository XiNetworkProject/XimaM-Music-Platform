/**
 * Helpers pour appliquer automatiquement le CDN aux données
 * Ces fonctions transforment les réponses d'API pour utiliser le CDN
 */

import { getCdnUrl } from './cdn';

/**
 * Applique le CDN à un objet track générique
 */
export function applyCdnToTrack(track: any) {
  if (!track) return track;
  
  return {
    ...track,
    audioUrl: getCdnUrl(track.audioUrl) || track.audioUrl,
    audio_url: getCdnUrl(track.audio_url) || track.audio_url,
    coverUrl: getCdnUrl(track.coverUrl) || track.coverUrl,
    cover_url: getCdnUrl(track.cover_url) || track.cover_url,
    artist: track.artist ? {
      ...track.artist,
      avatar: getCdnUrl(track.artist.avatar) || track.artist.avatar,
    } : track.artist,
  };
}

/**
 * Applique le CDN à un array de tracks
 */
export function applyCdnToTracks(tracks: any[]) {
  if (!Array.isArray(tracks)) return tracks;
  return tracks.map(applyCdnToTrack);
}

/**
 * Applique le CDN à un objet user/profile
 */
export function applyCdnToUser(user: any) {
  if (!user) return user;
  
  return {
    ...user,
    avatar: getCdnUrl(user.avatar) || user.avatar,
    banner: getCdnUrl(user.banner) || user.banner,
  };
}

/**
 * Applique le CDN à un array d'utilisateurs
 */
export function applyCdnToUsers(users: any[]) {
  if (!Array.isArray(users)) return users;
  return users.map(applyCdnToUser);
}

/**
 * Applique le CDN à une réponse d'API complète
 * Détecte automatiquement les champs à traiter
 */
export function applyCdnToApiResponse(data: any): any {
  if (!data) return data;
  
  // Si c'est un array
  if (Array.isArray(data)) {
    return data.map(item => applyCdnToApiResponse(item));
  }
  
  // Si c'est un objet
  if (typeof data === 'object') {
    const result: any = { ...data };
    
    // Traiter les tracks
    if (result.tracks) result.tracks = applyCdnToTracks(result.tracks);
    if (result.track) result.track = applyCdnToTrack(result.track);
    
    // Traiter les users/profiles
    if (result.users) result.users = applyCdnToUsers(result.users);
    if (result.user) result.user = applyCdnToUser(result.user);
    if (result.profile) result.profile = applyCdnToUser(result.profile);
    if (result.creator) result.creator = applyCdnToUser(result.creator);
    if (result.artist) result.artist = applyCdnToUser(result.artist);
    
    // Traiter les URLs directes
    if (result.audioUrl) result.audioUrl = getCdnUrl(result.audioUrl) || result.audioUrl;
    if (result.audio_url) result.audio_url = getCdnUrl(result.audio_url) || result.audio_url;
    if (result.coverUrl) result.coverUrl = getCdnUrl(result.coverUrl) || result.coverUrl;
    if (result.cover_url) result.cover_url = getCdnUrl(result.cover_url) || result.cover_url;
    if (result.avatar) result.avatar = getCdnUrl(result.avatar) || result.avatar;
    if (result.banner) result.banner = getCdnUrl(result.banner) || result.banner;
    
    return result;
  }
  
  return data;
}

/**
 * Wrapper pour fetch qui applique automatiquement le CDN
 */
export async function fetchWithCdn(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    return response;
  }
  
  const data = await response.json();
  const cdnData = applyCdnToApiResponse(data);
  
  // Retourner une nouvelle réponse avec les données transformées
  return {
    ...response,
    json: async () => cdnData,
  };
}

