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
  duration?: number;
  likes?: string[];
  comments?: string[];
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isAI?: boolean;
  isBoosted?: boolean;
  plays?: number;
  genre?: string[];
  album?: string | null;
  createdAt?: string;
  tint?: string;
  style?: string;
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

export type RadioItem = {
  id: string;
  title: string;
  subtitle: string;
  station: string;
  listeners: string;
  color: string;
  track: Track;
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
  radios: RadioItem[];
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
