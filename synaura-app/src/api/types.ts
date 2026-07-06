export type Artist = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  artistName?: string;
  avatar?: string | null;
};

export type Track = {
  _id: string;
  title: string;
  artist?: Artist | null;
  audioUrl: string;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  musicVideoUrl?: string | null;
  musicVideoPosterUrl?: string | null;
  lyrics?: string | null;
  duration?: number;
  likes?: string[];
  comments?: string[];
  likesCount?: number;
  commentsCount?: number;
  shares?: number;
  sharesCount?: number;
  isLiked?: boolean;
  isAI?: boolean;
  isBoosted?: boolean;
  plays?: number;
  genre?: string[];
  tags?: string[];
  album?: string | null;
  createdAt?: string;
  tint?: string;
  style?: string;
  allowClips?: boolean;
  allowAudioRemix?: boolean;
  allowAiVariation?: boolean;
  remixApprovalRequired?: boolean;
  remixVisibility?: 'everyone' | 'followers' | 'disabled';
  canRemixAiVariation?: boolean;
  remixAttribution?: {
    sourceTrackId: string;
    sourceTrackType: 'track' | 'ai_track';
    title: string;
    artist: string;
    artistUsername?: string;
    coverUrl?: string | null;
    trackUrl?: string;
    label?: string;
    credit?: string;
  } | null;
  variationsCount?: number;
  musicClipsCount?: number;
};

export type MusicClipSource = Track & {
  sourceTrackId: string;
  sourceTrackType: 'track' | 'ai_track';
  trackUrl?: string;
  canCreateClip?: boolean;
};

export type MusicClip = {
  id: string;
  creatorId: string;
  creator: { id: string; username: string; name: string; avatar?: string | null };
  videoUrl: string | null;
  videoPublicId?: string | null;
  posterUrl: string | null;
  caption: string | null;
  tags: string[];
  sourceTrackId: string;
  sourceTrackType: 'track' | 'ai_track';
  sourceTrackOffsetSeconds: number;
  sourceTrackDurationSeconds: number;
  visibility: 'draft' | 'published' | 'hidden';
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  sourceTrack: MusicClipSource;
};

export type RemixPermissions = {
  allowClips: boolean;
  allowAudioRemix: boolean;
  allowAiVariation: boolean;
  remixApprovalRequired: boolean;
  remixVisibility: 'everyone' | 'followers' | 'disabled';
};

export const DEFAULT_REMIX_PERMISSIONS: RemixPermissions = {
  allowClips: false,
  allowAudioRemix: false,
  allowAiVariation: false,
  remixApprovalRequired: false,
  remixVisibility: 'disabled',
};

/** Un remix (clip, variation IA ou remix audio) est possible dès qu'un canal est ouvert. */
export function isRemixAvailable(track: Pick<Track, 'allowClips' | 'allowAudioRemix' | 'allowAiVariation' | 'remixVisibility'>): boolean {
  const visibility = track.remixVisibility || 'disabled';
  return visibility !== 'disabled' && Boolean(track.allowClips || track.allowAudioRemix || track.allowAiVariation);
}

export function canOpenAiVariation(track: Pick<Track, 'allowAiVariation' | 'remixVisibility' | 'canRemixAiVariation'>): boolean {
  if (typeof track.canRemixAiVariation === 'boolean') return track.canRemixAiVariation;
  return (track.remixVisibility || 'disabled') !== 'disabled' && Boolean(track.allowAiVariation);
}

/**
 * Pré-vérification côté client pour l'affichage des boutons "Utiliser ce son" /
 * "Créer un clip officiel" (Scroll, détail morceau, détail clip). Optimiste sur
 * remixVisibility='followers' (le suivi réel n'est pas connu côté client) : le
 * serveur (canCreateClip) reste la source de vérité à la création/publication.
 */
export function canUseSoundClientSide(input: { isOwner: boolean; allowClips: boolean; remixVisibility: 'everyone' | 'followers' | 'disabled' }): boolean {
  if (input.isOwner) return true;
  if (!input.allowClips) return false;
  return input.remixVisibility !== 'disabled';
}

export type FeedStrategy = 'reco' | 'trending' | 'boost';

export type RankingFeedChunk = {
  tracks: Track[];
  nextCursor: number;
  hasMore: boolean;
};

export type Playlist = {
  id: string;
  title: string;
  curator: string;
  covers: string[];
  tracks: string;
  vibe: string;
  slug?: string;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  isEditorial?: boolean;
  badge?: string;
  themeColors?: string[];
  downloadEnabled?: boolean;
  commentsEnabled?: boolean;
  collection?: {
    id: string;
    playlistId: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    kind: string;
    bannerUrl: string | null;
    coverUrl: string | null;
    themeColors: string[];
    badge: string;
    isFeatured: boolean;
    isPublished: boolean;
    downloadEnabled: boolean;
    commentsEnabled: boolean;
  } | null;
};

export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  tag: string;
  followers: string;
  tint: string;
};

export type HomePost = {
  id: string;
  type: 'text' | 'photo' | 'track_share' | 'repost';
  creatorId?: string;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  mood: string;
  text: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isPinned?: boolean;
  pinnedAt?: string;
  track?: Track;
};

export type HomeComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatar?: string | null;
  };
  replies: HomeComment[];
};

export type LibraryStats = {
  playlists: number;
  favorites: number;
  recent: number;
  ai: number;
};

export type HomeData = {
  forYou: Track[];
  trending: Track[];
  recent: Track[];
  boosted: Track[];
  playlists: Playlist[];
  creators: Creator[];
  posts: HomePost[];
  libraryStats?: LibraryStats | null;
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type DiscoverPage = {
  tracks: Track[];
  artists: Creator[];
  page: number;
  nextPage: number;
  hasMore: boolean;
  total: number;
  profilePage: number;
  nextProfilePage: number;
  hasMoreProfiles: boolean;
  totalArtists: number;
};

export type FeedResponse = {
  tracks?: Track[];
  items?: Array<{ type?: string; kind?: string; track?: Track; post?: unknown; data?: unknown }>;
  dailyMix?: Track[];
  weeklyTop?: Track[];
  playlists?: unknown[];
  artists?: unknown[];
  posts?: unknown[];
  nextCursor?: string | number | null;
  hasMore?: boolean;
};

export type SearchResults = {
  tracks: Track[];
  posts: HomePost[];
  artists: Creator[];
  playlists: Playlist[];
};

export type SynauraNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
};

export type NotificationCenterData = {
  notifications: SynauraNotification[];
  unread: number;
  total: number;
};

export type CommunityStats = {
  resolvedQuestions: number;
  forumPosts: number;
  activeMembers: number;
  implementedSuggestions: number;
};

export type CommunityFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpfulCount: number;
};

export type CommunityAuthor = {
  id?: string;
  name: string;
  username: string;
  avatar?: string | null;
};

export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  repliesCount: number;
  author: CommunityAuthor;
  track?: Track | null;
};

export type CommunityReply = {
  id: string;
  content: string;
  createdAt: string;
  author: CommunityAuthor;
};

export type CommunityClubAggregate = {
  slug: string;
  postsCount: number;
  latestPost: CommunityPost | null;
};

export type CityPulseTrack = Track & {
  pulse: number;
  pulseState: 'Calme' | 'Ca demarre' | 'Ca chauffe' | 'En feu' | 'Viral potentiel';
  pulseReasons: string[];
  recentPlays: number;
  recentLikes: number;
  recentComments: number;
  retention: number;
};

export type CityArtist = {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
  bio?: string;
  genre: string[];
  createdAt?: string;
  trackCount: number;
  totalPlays: number;
  totalLikes: number;
  followerCount: number;
  level: number;
  levelName: string;
  xp: number;
  nextLevelXp: number;
  featuredTrack?: Track | null;
};

export type CityShowcaseItem = {
  id: string;
  label: string;
  caption: string;
  accent: string;
  icon: string;
  track: Track;
};

export type CityAward = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  track?: Track | null;
  artist?: CityArtist | null;
};

export type CityBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type CityEvent = {
  id: string;
  kind: 'friday_drop' | 'challenge' | 'battle' | 'seasonal';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  status?: 'scheduled' | 'live' | 'ended' | 'resolved' | 'archived';
  isLive?: boolean;
  isEnded?: boolean;
  startsAt?: string;
  endsAt?: string;
  challengeTag?: string;
  theme?: string;
  tracks?: CityPulseTrack[];
  selectedTrackId?: string | null;
  voteCounts?: Record<string, number>;
  totalVotes?: number;
  participationCount?: number;
  participants?: CityEventParticipant[];
  userParticipation?: CityEventParticipation | null;
  canParticipate?: boolean;
  winnerTrackId?: string | null;
  winners?: CityEventWinner[];
  userIsWinner?: boolean;
  celebration?: {
    title: string;
    message: string;
    trackId?: string | null;
    rewardTitle?: string | null;
  } | null;
  reward?: CityEventReward | null;
  claimStatus?: 'none' | 'available' | 'claimed' | 'expired';
  detailCta?: {
    label: string;
    action: 'vote' | 'participate' | 'claim' | 'open' | 'create';
    href?: string;
  };
  config?: Record<string, unknown>;
};

export type CityEventParticipant = {
  id: string;
  eventId: string;
  userId: string;
  username?: string | null;
  name: string;
  avatar?: string | null;
  trackId: string;
  createdAt?: string | null;
  status: 'submitted' | 'accepted' | 'rejected' | 'winner' | 'contender';
  track?: CityPulseTrack | null;
};

export type CityEventParticipation = {
  id: string;
  eventId: string;
  userId: string;
  trackId: string;
  status: 'submitted' | 'accepted' | 'rejected' | 'winner';
  createdAt: string;
  track?: CityPulseTrack | null;
};

export type CityEventWinner = {
  id: string;
  eventId: string;
  trackId: string;
  userId?: string | null;
  rank: number;
  reason?: string | null;
  showcaseUntil?: string | null;
  track?: CityPulseTrack | null;
};

export type CityEventReward = {
  key: string;
  title: string;
  description: string;
  kind: 'badge' | 'booster' | 'showcase' | 'xp';
  amount?: number;
  metadata?: Record<string, unknown>;
};

export type CityVoteSession = CityEvent & {
  kind: 'battle';
  config: {
    format: 'vote_session';
    sessionKey: 'morning' | 'afternoon' | 'evening';
    sessionLabel: string;
    maxVotesPerUser: number;
  };
};

export type CityEventDetail = {
  event: Record<string, unknown>;
  tracks: Array<Record<string, unknown>>;
  voteCounts: Record<string, number>;
  totalVotes: number;
  selectedTrackId?: string | null;
  participations: Array<Record<string, unknown>>;
  participationCount: number;
  userParticipation?: Record<string, unknown> | null;
  winners: Array<Record<string, unknown>>;
  claimStatus: 'none' | 'available' | 'claimed' | 'expired';
  reward?: Record<string, unknown> | null;
};

export type SynauraCityData = {
  dayKey: string;
  weekKey: string;
  generatedAt: string;
  cityMood: {
    title: string;
    subtitle: string;
    activeListeners: number;
    reactionsToday: number;
    newDrops: number;
  };
  spotlightArtists: CityArtist[];
  showcase: CityShowcaseItem[];
  pulse: CityPulseTrack[];
  radar: CityPulseTrack[];
  premieres: CityPulseTrack[];
  events: CityEvent[];
  voteSessions: CityVoteSession[];
  currentVoteSession: CityVoteSession | null;
  nextVoteSession: CityVoteSession | null;
  hallOfFame: CityAward[];
  listenerBadges: CityBadge[];
  creatorCard: CityArtist | null;
};
