export type RecommendationStrategy = 'reco' | 'trending' | 'fresh' | 'mixed';

export type RecommendationReason =
  | 'global_performance'
  | 'fresh'
  | 'followed_artist'
  | 'recent_repeat'
  | 'current_obsession'
  | 'artist_affinity'
  | 'genre_affinity'
  | 'collaborative'
  | 'social_engagement'
  | 'post_track_match'
  | 'exploration'
  | 'already_seen'
  | 'fatigue'
  | 'skip_penalty';

export type RecommendedTrack = {
  _id: string;
  title?: string;
  artist?: {
    _id?: string;
    username?: string;
    name?: string;
    avatar?: string;
    isArtist?: boolean;
    artistName?: string;
  };
  duration?: number;
  coverUrl?: string | null;
  coverVideoUrl?: string | null;
  coverVideoPosterUrl?: string | null;
  audioUrl?: string | null;
  album?: string | null;
  genre?: string[] | string | null;
  lyrics?: string | null;
  likes?: unknown[];
  plays?: number;
  createdAt?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isAI?: boolean;
  isLiked?: boolean;
  isBoosted?: boolean;
  boostMultiplier?: number;
  rankingScore?: number;
  recommendationScore?: number;
  recommendationReasons?: RecommendationReason[];
  recommendationDebug?: Record<string, number | string | boolean | string[]>;
  isFresh?: boolean;
  isCurrentObsession?: boolean;
};

export type RecommendedPost = {
  id: string;
  post_type?: string;
  type?: string;
  content?: string | null;
  image_url?: string | null;
  track_id?: string | null;
  likes_count?: number;
  comments_count?: number;
  is_public?: boolean;
  created_at?: string;
  creator_id?: string;
  creator?: {
    id?: string;
    username?: string;
    name?: string;
    avatar?: string;
    is_verified?: boolean;
  };
  track?: {
    id?: string;
    title?: string;
    artist_name?: string;
    cover_url?: string;
    cover_video_url?: string | null;
    coverVideoUrl?: string | null;
    cover_video_poster_url?: string | null;
    coverVideoPosterUrl?: string | null;
    audio_url?: string;
    duration?: number;
    genre?: string[] | string | null;
  } | null;
  original_post?: RecommendedPost | null;
  isLiked?: boolean;
  recommendationScore?: number;
  recommendationReasons?: RecommendationReason[];
  recommendationDebug?: Record<string, number | string | boolean | string[]>;
};

export type UserRecommendationSignals = {
  userId: string | null;
  followedArtistIds: Set<string>;
  likedTrackIds: Set<string>;
  completedTrackIds: Set<string>;
  skippedTrackIds: Set<string>;
  collaborativeTrackIds: Set<string>;
  likedPostIds: Set<string>;
  commentedPostIds: Set<string>;
  recentlyRecommendedTrackIds: Set<string>;
  recentlyRecommendedPostIds: Set<string>;
  followedPostCreatorIds: Set<string>;
  preferredGenres: Map<string, number>;
  artistAffinity: Map<string, number>;
  trackRepeatCounts24h: Map<string, number>;
  trackRepeatCounts72h: Map<string, number>;
  trackRecentCompletes72h: Map<string, number>;
  currentObsessionTrackIds: Set<string>;
  recentlyPlayedTrackIds: string[];
};

export type RecommendationContext = {
  now?: number;
  strategy?: RecommendationStrategy;
  debug?: boolean;
  genreFilter?: string | null;
  maxConsecutiveArtists?: number;
};

