// Modèle de contenu commun du Scroll musical (web + mobile).
// Règles : >=75% de morceaux, jamais deux cartes non musicales à la suite,
// aucune promotion Premium, uniquement des données réelles (pas de fake data).

export type ScrollTrack = {
  _id: string;
  title: string;
  artist: { _id: string; name: string; username: string; avatar?: string | null };
  audioUrl: string;
  coverUrl?: string | null;
  duration: number;
  likes: number | string[];
  comments: number | string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
  lyrics?: string;
  allowClips?: boolean;
  allowAudioRemix?: boolean;
  allowAiVariation?: boolean;
  remixApprovalRequired?: boolean;
  remixVisibility?: 'everyone' | 'followers' | 'disabled';
};

export type ScrollSpotlightArtist = {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  followerCount?: number;
};

export type ScrollCollection = {
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

export type ScrollChallenge = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  challengeTag?: string;
  tracksCount: number;
  totalVotes?: number;
  participationCount?: number;
  href: string;
};

export type ScrollAnnouncement = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  tracksCount: number;
  href: string;
};

export type ScrollClip = {
  id: string;
  creatorId: string;
  creator: { id: string; username: string; name: string; avatar?: string | null };
  videoUrl: string | null;
  posterUrl: string | null;
  caption: string | null;
  tags: string[];
  sourceTrackId: string;
  sourceTrackType: 'track' | 'ai_track';
  sourceTrackOffsetSeconds: number;
  sourceTrackDurationSeconds: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  sourceTrack: ScrollTrack & { trackUrl?: string };
};

export type ScrollPost = {
  id: string;
  type: 'text' | 'photo' | 'track_share' | 'repost';
  content?: string | null;
  image_url?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  isLiked?: boolean;
  creator: {
    id: string;
    username: string;
    name?: string | null;
    avatar?: string | null;
    is_verified?: boolean;
  };
  track?: {
    id: string;
    title: string;
    artist_name?: string | null;
    cover_url?: string | null;
    audio_url?: string | null;
    duration?: number;
    genre?: string[];
  } | null;
};

export type ScrollFeedItem =
  | { id: string; type: 'track'; track: ScrollTrack }
  | { id: string; type: 'clip'; clip: ScrollClip; track: ScrollTrack }
  | { id: string; type: 'post'; post: ScrollPost }
  | { id: string; type: 'artist_spotlight'; artist: ScrollSpotlightArtist; track: ScrollTrack }
  | { id: string; type: 'collection'; collection: ScrollCollection }
  | { id: string; type: 'challenge'; challenge: ScrollChallenge }
  | { id: string; type: 'announcement'; announcement: ScrollAnnouncement };

export const MIN_TRACK_RATIO = 0.75;
export const MAX_CLIP_RATIO = 0.2;
export const MAX_POST_RATIO = 0.12;
const MIN_GAP_BETWEEN_NON_TRACK = 5;

export function normalizeScrollPosts(rawPosts: any[] | null | undefined): ScrollPost[] {
  const seen = new Set<string>();
  return (rawPosts || []).flatMap((raw): ScrollPost[] => {
    const id = String(raw?.id || raw?._id || '');
    if (!id || seen.has(id)) return [];
    const creatorRaw = Array.isArray(raw?.creator) ? raw.creator[0] : raw?.creator;
    const creatorId = String(creatorRaw?.id || creatorRaw?._id || raw?.creator_id || '');
    const username = String(creatorRaw?.username || '');
    const name = String(creatorRaw?.name || username || 'Membre');
    const trackRaw = raw?.track;
    const trackId = String(trackRaw?.id || trackRaw?._id || '');
    const content = typeof raw?.content === 'string' ? raw.content.trim() : '';
    const imageUrl = typeof raw?.image_url === 'string' ? raw.image_url : typeof raw?.imageUrl === 'string' ? raw.imageUrl : null;
    if (!creatorId || (!content && !imageUrl && !trackId)) return [];
    seen.add(id);
    return [{
      id,
      type: raw?.type === 'track_share' || raw?.post_type === 'track_share'
        ? 'track_share'
        : raw?.type === 'photo' || raw?.post_type === 'photo'
          ? 'photo'
          : raw?.type === 'repost' || raw?.post_type === 'repost'
            ? 'repost'
            : 'text',
      content: content || null,
      image_url: imageUrl,
      likes_count: Number(raw?.likes_count ?? raw?.likesCount ?? 0),
      comments_count: Number(raw?.comments_count ?? raw?.commentsCount ?? 0),
      created_at: String(raw?.created_at || raw?.createdAt || ''),
      isLiked: Boolean(raw?.isLiked),
      creator: {
        id: creatorId,
        username,
        name,
        avatar: creatorRaw?.avatar || null,
        is_verified: Boolean(creatorRaw?.is_verified || creatorRaw?.isVerified),
      },
      track: trackId ? {
        id: trackId,
        title: String(trackRaw?.title || 'Sans titre'),
        artist_name: trackRaw?.artist_name || trackRaw?.artist?.name || null,
        cover_url: trackRaw?.cover_url || trackRaw?.coverUrl || null,
        audio_url: trackRaw?.audio_url || trackRaw?.audioUrl || null,
        duration: Number(trackRaw?.duration || 0),
        genre: Array.isArray(trackRaw?.genre) ? trackRaw.genre : undefined,
      } : null,
    }];
  });
}

export function trackFromScrollPost(post: ScrollPost): ScrollTrack | null {
  const track = post.track;
  if (!track?.id || !track.audio_url) return null;
  return {
    _id: track.id,
    title: track.title,
    artist: {
      _id: '',
      name: track.artist_name || 'Artiste Synaura',
      username: '',
    },
    audioUrl: track.audio_url,
    coverUrl: track.cover_url || null,
    duration: Number(track.duration || 0),
    likes: 0,
    comments: 0,
    plays: 0,
    genre: track.genre,
  };
}

function eventToScrollTracks(event: any): ScrollTrack[] {
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
      likes: t.likesCount ?? 0,
      comments: t.commentsCount ?? 0,
      plays: Number(t.plays || 0),
      genre: Array.isArray(t.genre) ? t.genre : undefined,
    }));
}

/** Croise les artistes populaires réels avec le pool de morceaux déjà chargé : on ne met en avant
 * un créateur que s'il a un morceau réellement jouable dans ce pool (pas d'appel réseau supplémentaire). */
export function buildArtistSpotlightItems(
  popularUsers: any[] | null | undefined,
  trackPool: ScrollTrack[],
  limit = 6,
): ScrollFeedItem[] {
  const items: ScrollFeedItem[] = [];
  const usedArtistIds = new Set<string>();
  for (const user of popularUsers || []) {
    if (items.length >= limit) break;
    const artistId = String(user?._id || '');
    if (!artistId || usedArtistIds.has(artistId)) continue;
    const track = trackPool.find((t) => String(t.artist?._id || '') === artistId && !!t.audioUrl);
    if (!track) continue;
    usedArtistIds.add(artistId);
    items.push({
      id: `artist-${artistId}`,
      type: 'artist_spotlight',
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
      type: 'collection' as const,
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
export function buildChallengeItem(cityEvents: any[] | null | undefined): { item: ScrollFeedItem; tracks: ScrollTrack[] } | null {
  const event =
    (cityEvents || []).find((e: any) => e?.kind === 'battle' && (e.status === 'live' || e.isLive) && Array.isArray(e.tracks) && e.tracks.length > 0) ||
    (cityEvents || []).find((e: any) => e?.kind === 'challenge' && Array.isArray(e.tracks) && e.tracks.length > 0);
  if (!event) return null;
  const tracks = eventToScrollTracks(event);
  if (!tracks.length) return null;
  return {
    item: {
      id: `challenge-${event.id}`,
      type: 'challenge',
      challenge: {
        id: String(event.id),
        title: event.title || 'Défi Synaura',
        subtitle: event.subtitle,
        description: event.description,
        challengeTag: event.challengeTag,
        tracksCount: tracks.length,
        totalVotes: event.totalVotes,
        participationCount: event.participationCount,
        href: '/city',
      },
    },
    tracks,
  };
}

function activeMusicChallenges(musicChallenges: any[] | null | undefined): any[] {
  return (musicChallenges || [])
    .filter((c: any) => c?.status === 'active')
    .sort((a: any, b: any) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
}

function toMusicChallengeItem(challenge: any): ScrollFeedItem {
  return {
    id: `music-challenge-${challenge.id}`,
    type: 'challenge',
    challenge: {
      id: String(challenge.id),
      title: challenge.title || 'Défi Synaura',
      description: challenge.prompt,
      tracksCount: Number(challenge.entryCount || 0),
      participationCount: Number(challenge.entryCount || 0),
      href: `/challenges/${challenge.id}`,
    },
  };
}

/** Un vrai défi musical (V1, éditorial) prend priorité sur le challenge algorithmique de Synaura
 * Pulse quand il existe : un seul candidat au total (jamais plus d'un défi dans le feed). */
export function buildMusicChallengeItem(musicChallenges: any[] | null | undefined): { item: ScrollFeedItem; tracks: ScrollTrack[] } | null {
  const challenge = activeMusicChallenges(musicChallenges)[0];
  if (!challenge) return null;
  return { item: toMusicChallengeItem(challenge), tracks: [] };
}

/** Une annonce éditoriale = une sortie réelle (Friday Drop / temps fort saisonnier) qui mène vers de vrais morceaux. */
export function buildAnnouncementItem(cityEvents: any[] | null | undefined): { item: ScrollFeedItem; tracks: ScrollTrack[] } | null {
  const event = (cityEvents || []).find(
    (e: any) => (e?.kind === 'friday_drop' || e?.kind === 'seasonal') && Array.isArray(e.tracks) && e.tracks.length > 0,
  );
  if (!event) return null;
  const tracks = eventToScrollTracks(event);
  if (!tracks.length) return null;
  return {
    item: {
      id: `announcement-${event.id}`,
      type: 'announcement',
      announcement: {
        id: String(event.id),
        title: event.title || 'Actu Synaura',
        subtitle: event.subtitle,
        description: event.description,
        tracksCount: tracks.length,
        href: '/city',
      },
    },
    tracks,
  };
}

/** Compose le feed mixte : la trame reste les morceaux, les cartes non musicales sont
 * réparties avec un écart minimum et ne se suivent jamais deux à deux. */
export function composeScrollFeed(params: {
  tracks: ScrollTrack[];
  clips?: ScrollClip[];
  posts?: ScrollPost[];
  artistSpotlights?: ScrollFeedItem[];
  collections?: ScrollFeedItem[];
  challenge?: ScrollFeedItem | null;
  announcement?: ScrollFeedItem | null;
}): ScrollFeedItem[] {
  const trackItems: ScrollFeedItem[] = params.tracks
    .filter((t) => t && t._id && t.audioUrl)
    .map((t) => ({ id: `track-${t._id}`, type: 'track' as const, track: t }));

  if (!trackItems.length) return trackItems;

  const artistPool = (params.artistSpotlights || []).slice(0, 3);
  const collectionPool = (params.collections || []).slice(0, 2);
  const maxPostItems = Math.min(4, Math.max(1, Math.floor(trackItems.length * MAX_POST_RATIO)));
  const postPool: ScrollFeedItem[] = (params.posts || [])
    .filter((post) => post?.id && (post.content || post.image_url || post.track?.id))
    .sort((left, right) => Number(Boolean(right.track?.audio_url)) - Number(Boolean(left.track?.audio_url)))
    .slice(0, maxPostItems)
    .map((post) => ({ id: `post-${post.id}`, type: 'post' as const, post }));
  const maxClipItems = Math.max(0, Math.floor(trackItems.length * MAX_CLIP_RATIO));
  const clipPool: ScrollFeedItem[] = (params.clips || [])
    .filter((clip) => clip?.id && clip?.videoUrl && clip.sourceTrack?.audioUrl)
    .slice(0, maxClipItems)
    .map((clip) => ({
      id: `clip-${clip.id}`,
      type: 'clip' as const,
      clip,
      track: clip.sourceTrack,
    }));
  const nonTrackCandidates: ScrollFeedItem[] = [];
  if (postPool[0]) nonTrackCandidates.push(postPool[0]);
  if (artistPool[0]) nonTrackCandidates.push(artistPool[0]);
  if (clipPool[0]) nonTrackCandidates.push(clipPool[0]);
  if (postPool[1]) nonTrackCandidates.push(postPool[1]);
  if (collectionPool[0]) nonTrackCandidates.push(collectionPool[0]);
  if (params.challenge) nonTrackCandidates.push(params.challenge);
  if (clipPool[1]) nonTrackCandidates.push(clipPool[1]);
  if (artistPool[1]) nonTrackCandidates.push(artistPool[1]);
  if (postPool[2]) nonTrackCandidates.push(postPool[2]);
  if (clipPool[2]) nonTrackCandidates.push(clipPool[2]);
  if (params.announcement) nonTrackCandidates.push(params.announcement);
  if (collectionPool[1]) nonTrackCandidates.push(collectionPool[1]);
  if (artistPool[2]) nonTrackCandidates.push(artistPool[2]);
  if (postPool[3]) nonTrackCandidates.push(postPool[3]);
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

/** Vue filtrée "Créateurs" : tous les artistes réellement disponibles (pas de plafond de ratio ici,
 * l'utilisateur a explicitement choisi ce filtre). */
export function buildCreatorsFilterFeed(popularUsers: any[] | null | undefined, trackPool: ScrollTrack[]): ScrollFeedItem[] {
  return buildArtistSpotlightItems(popularUsers, trackPool, 12);
}

/** Vue filtrée "Défis" : une carte par vrai défi musical actif (music_challenges),
 * triées par échéance la plus proche. Repli sur l'ancien challenge algorithmique
 * Synaura Pulse (avec ses morceaux) uniquement si aucun vrai défi n'est actif ;
 * jamais de défi fictif — liste vide si rien n'est réellement en cours. */
export function buildChallengesFilterFeed(
  musicChallenges: any[] | null | undefined,
  cityEvents?: any[] | null,
): ScrollFeedItem[] {
  const active = activeMusicChallenges(musicChallenges);
  if (active.length > 0) return active.map(toMusicChallengeItem);

  const legacy = buildChallengeItem(cityEvents);
  if (!legacy) return [];
  const trackItems: ScrollFeedItem[] = legacy.tracks.map((t) => ({ id: `track-${t._id}`, type: 'track', track: t }));
  return [legacy.item, ...trackItems];
}
