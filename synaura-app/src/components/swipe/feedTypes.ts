import type { MusicClip, Track } from '@/api/types';

// Modèle de contenu commun du Scroll musical (miroir de lib/scrollFeed.ts côté web).
// Règles : >=75% de morceaux, jamais deux cartes non musicales à la suite,
// aucune promotion Premium, uniquement des données réelles (pas de fake data).

export type SpotlightArtist = {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  followerCount?: number;
};

export type FeedCollection = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  themeColors?: string[];
  badge?: string;
  trackCount: number;
  href: string;
};

export type FeedChallenge = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  challengeTag?: string;
  tracksCount: number;
  totalVotes?: number;
  participationCount?: number;
};

export type FeedAnnouncement = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  tracksCount: number;
};

export type ScrollFeedItem =
  | { id: string; kind: 'track'; track: Track }
  | { id: string; kind: 'clip'; clip: MusicClip; track: Track }
  | { id: string; kind: 'artist_spotlight'; artist: SpotlightArtist; track: Track }
  | { id: string; kind: 'collection'; collection: FeedCollection }
  | { id: string; kind: 'challenge'; challenge: FeedChallenge }
  | { id: string; kind: 'announcement'; announcement: FeedAnnouncement };

export const MIN_TRACK_RATIO = 0.75;
export const MAX_CLIP_RATIO = 0.2;
const MIN_GAP_BETWEEN_NON_TRACK = 5;

function eventToTracks(event: any): Track[] {
  return (Array.isArray(event?.tracks) ? event.tracks : [])
    .filter((t: any) => t?._id && t?.audioUrl)
    .map((t: any) => ({
      _id: String(t._id),
      title: String(t.title || 'Sans titre'),
      artist: {
        _id: String(t.artist?._id || ''),
        name: t.artist?.name || t.artist?.artistName || t.artist?.username || 'Artiste',
        username: t.artist?.username || '',
        avatar: t.artist?.avatar || null,
      },
      audioUrl: String(t.audioUrl),
      coverUrl: t.coverUrl || null,
      duration: Number(t.duration || 0),
      likesCount: Number(t.likesCount || 0),
      commentsCount: Number(t.commentsCount || 0),
      plays: Number(t.plays || 0),
      genre: Array.isArray(t.genre) ? t.genre : undefined,
    })) as Track[];
}

/** Croise les artistes populaires réels avec le pool de morceaux déjà chargé : on ne met en avant
 * un créateur que s'il a un morceau réellement jouable dans ce pool (pas d'appel réseau supplémentaire). */
export function buildArtistSpotlightItems(popularUsers: any[] | null | undefined, trackPool: Track[], limit = 6): ScrollFeedItem[] {
  const items: ScrollFeedItem[] = [];
  const used = new Set<string>();
  for (const user of popularUsers || []) {
    if (items.length >= limit) break;
    const artistId = String(user?._id || '');
    if (!artistId || used.has(artistId)) continue;
    const track = trackPool.find((t) => String(t.artist?._id || '') === artistId && !!t.audioUrl);
    if (!track) continue;
    used.add(artistId);
    items.push({
      id: `artist-${artistId}`,
      kind: 'artist_spotlight',
      artist: {
        id: artistId,
        username: user.username || '',
        name: user.artistName || user.name || user.username || 'Artiste Synaura',
        avatar: user.avatar || null,
        bio: user.bio || null,
        isVerified: Boolean(user.isVerified),
        followerCount: Number(user.followerCount || 0),
      },
      track,
    });
  }
  return items;
}

/** Ne garde que les collections éditoriales réellement publiées avec au moins un morceau. */
export function buildCollectionItems(rawCollections: any[] | null | undefined, limit = 4): ScrollFeedItem[] {
  return (rawCollections || [])
    .filter((c: any) => c && Number(c.trackCount || 0) > 0)
    .slice(0, limit)
    .map((c: any) => ({
      id: `collection-${c.id || c.playlistId}`,
      kind: 'collection' as const,
      collection: {
        id: String(c.id || c.playlistId),
        slug: String(c.slug || c.playlistId),
        title: String(c.title || 'Collection Synaura'),
        subtitle: c.subtitle || undefined,
        coverUrl: c.coverUrl || c.bannerUrl || null,
        bannerUrl: c.bannerUrl || null,
        themeColors: Array.isArray(c.themeColors) ? c.themeColors : undefined,
        badge: c.badge || undefined,
        trackCount: Number(c.trackCount || 0),
        href: c.publicUrl || `/playlists/${c.slug || c.playlistId}`,
      },
    }));
}

/** Un défi réel = un event "battle" ou "challenge" de Synaura Pulse avec de vrais morceaux inscrits. */
export function buildChallengeItem(cityEvents: any[] | null | undefined): { item: ScrollFeedItem; tracks: Track[] } | null {
  const event =
    (cityEvents || []).find((e: any) => e?.kind === 'battle' && (e.status === 'live' || e.isLive) && Array.isArray(e.tracks) && e.tracks.length > 0) ||
    (cityEvents || []).find((e: any) => e?.kind === 'challenge' && Array.isArray(e.tracks) && e.tracks.length > 0);
  if (!event) return null;
  const tracks = eventToTracks(event);
  if (!tracks.length) return null;
  return {
    item: {
      id: `challenge-${event.id}`,
      kind: 'challenge',
      challenge: {
        id: String(event.id),
        title: event.title || 'Défi Synaura',
        subtitle: event.subtitle,
        description: event.description,
        challengeTag: event.challengeTag,
        tracksCount: tracks.length,
        totalVotes: event.totalVotes,
        participationCount: event.participationCount,
      },
    },
    tracks,
  };
}

/** Un vrai défi musical (V1, éditorial) prend priorité sur le challenge algorithmique de Synaura
 * Pulse quand il existe : un seul candidat au total (jamais plus d'un défi dans le feed). */
export function buildMusicChallengeItem(musicChallenges: any[] | null | undefined): { item: ScrollFeedItem; tracks: Track[] } | null {
  const active = (musicChallenges || [])
    .filter((c: any) => c?.status === 'active')
    .sort((a: any, b: any) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  const challenge = active[0];
  if (!challenge) return null;
  return {
    item: {
      id: `music-challenge-${challenge.id}`,
      kind: 'challenge',
      challenge: {
        id: String(challenge.id),
        title: challenge.title || 'Défi Synaura',
        description: challenge.prompt,
        tracksCount: Number(challenge.entryCount || 0),
        participationCount: Number(challenge.entryCount || 0),
      },
    },
    tracks: [],
  };
}

/** Une annonce éditoriale = une sortie réelle (Friday Drop / temps fort saisonnier) qui mène vers de vrais morceaux. */
export function buildAnnouncementItem(cityEvents: any[] | null | undefined): { item: ScrollFeedItem; tracks: Track[] } | null {
  const event = (cityEvents || []).find(
    (e: any) => (e?.kind === 'friday_drop' || e?.kind === 'seasonal') && Array.isArray(e.tracks) && e.tracks.length > 0,
  );
  if (!event) return null;
  const tracks = eventToTracks(event);
  if (!tracks.length) return null;
  return {
    item: {
      id: `announcement-${event.id}`,
      kind: 'announcement',
      announcement: {
        id: String(event.id),
        title: event.title || 'Actu Synaura',
        subtitle: event.subtitle,
        description: event.description,
        tracksCount: tracks.length,
      },
    },
    tracks,
  };
}

/** Compose le feed mixte : la trame reste les morceaux, les cartes non musicales sont
 * réparties avec un écart minimum et ne se suivent jamais deux à deux. */
export function composeScrollFeed(params: {
  tracks: Track[];
  clips?: MusicClip[];
  artistSpotlights?: ScrollFeedItem[];
  collections?: ScrollFeedItem[];
  challenge?: ScrollFeedItem | null;
  announcement?: ScrollFeedItem | null;
}): ScrollFeedItem[] {
  const trackItems: ScrollFeedItem[] = params.tracks
    .filter((t) => t && t._id && t.audioUrl)
    .map((t) => ({ id: `track-${t._id}`, kind: 'track' as const, track: t }));

  if (!trackItems.length) return trackItems;

  const artistPool = (params.artistSpotlights || []).slice(0, 3);
  const collectionPool = (params.collections || []).slice(0, 2);
  const maxClipItems = Math.max(0, Math.floor(trackItems.length * MAX_CLIP_RATIO));
  const clipPool: ScrollFeedItem[] = (params.clips || [])
    .filter((clip) => clip?.id && clip.videoUrl && clip.sourceTrack?.audioUrl)
    .slice(0, maxClipItems)
    .map((clip) => ({
      id: `clip-${clip.id}`,
      kind: 'clip' as const,
      clip,
      track: clip.sourceTrack,
    }));
  const nonTrackCandidates: ScrollFeedItem[] = [];
  if (clipPool[0]) nonTrackCandidates.push(clipPool[0]);
  if (artistPool[0]) nonTrackCandidates.push(artistPool[0]);
  if (collectionPool[0]) nonTrackCandidates.push(collectionPool[0]);
  if (clipPool[1]) nonTrackCandidates.push(clipPool[1]);
  if (params.challenge) nonTrackCandidates.push(params.challenge);
  if (artistPool[1]) nonTrackCandidates.push(artistPool[1]);
  if (clipPool[2]) nonTrackCandidates.push(clipPool[2]);
  if (params.announcement) nonTrackCandidates.push(params.announcement);
  if (collectionPool[1]) nonTrackCandidates.push(collectionPool[1]);
  if (artistPool[2]) nonTrackCandidates.push(artistPool[2]);
  for (let i = 3; i < clipPool.length; i += 1) nonTrackCandidates.push(clipPool[i]);

  const maxNonTrack = Math.max(0, Math.floor((trackItems.length * (1 - MIN_TRACK_RATIO)) / MIN_TRACK_RATIO));
  const nonTrackItems = nonTrackCandidates.slice(0, maxNonTrack);
  if (!nonTrackItems.length) return trackItems;

  const gap = Math.max(MIN_GAP_BETWEEN_NON_TRACK, Math.floor(trackItems.length / (nonTrackItems.length + 1)));

  const result: ScrollFeedItem[] = [trackItems[0]];
  let trackCursor = 1;
  let nonTrackCursor = 0;

  while (trackCursor < trackItems.length) {
    if (nonTrackCursor < nonTrackItems.length && trackCursor % gap === 0) {
      result.push(nonTrackItems[nonTrackCursor++]);
    }
    result.push(trackItems[trackCursor++]);
  }

  return result;
}
