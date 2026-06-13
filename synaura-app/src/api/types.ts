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
};

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
