// Types communs pour toute l'application
// Ces types correspondent aux modèles MongoDB et sont utilisés dans toutes les pages

export interface User {
  _id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  followers: string[];
  following: string[];
  followersCount: number;
  followingCount: number;
  trackCount: number;
  playlistCount?: number; // Calculé dynamiquement
  totalPlays?: number; // Calculé dynamiquement
  totalLikes?: number; // Calculé dynamiquement
  likedTracks: string[];
  isVerified: boolean;
  role: 'user' | 'artist' | 'admin';
  provider?: 'local' | 'google';
  providerId?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
  isFollowing?: boolean; // Pour l'utilisateur connecté
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  album?: string;
  duration: number;
  audioUrl: string;
  coverUrl?: string;
  audioPublicId?: string;
  coverPublicId?: string;
  genre: string[];
  tags: string[];
  description?: string;
  lyrics?: string;
  plays: number;
  likes: string[];
  comments: string[];
  isExplicit: boolean;
  isPublic: boolean;
  copyright?: {
    owner: string;
    year: number;
    rights: string;
  };
  waveform?: number[];
  isLiked?: boolean; // Pour l'utilisateur connecté
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  _id: string;
  name: string;
  description: string;
  coverUrl?: string;
  tracks: Track[];
  trackCount: number; // Virtual field
  duration: number; // Virtual field
  createdBy: User;
  isPublic: boolean;
  likes: string[];
  followers: string[];
  isLiked?: boolean; // Pour l'utilisateur connecté
  isFollowed?: boolean; // Pour l'utilisateur connecté
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  user: User;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  _id: string;
  type: 'track' | 'playlist' | 'message';
  user: User;
  content: string;
  track?: Track;
  playlist?: Playlist;
  createdAt: string;
  likes: string[];
  comments: Comment[];
  isLiked?: boolean; // Pour l'utilisateur connecté
}

// Types pour les formulaires
export interface EditProfileData {
  name: string;
  bio: string;
  location: string;
  website: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    youtube: string;
    spotify: string;
  };
}

// Types pour les réponses API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Types pour les filtres
export interface TrackFilters {
  genre?: string;
  search?: string;
  artist?: string;
  sortBy?: 'recent' | 'popular' | 'alphabetical';
}

export interface UserFilters {
  search?: string;
  sortBy?: 'followers' | 'recent' | 'alphabetical';
}

export interface PlaylistFilters {
  user?: string;
  search?: string;
  sortBy?: 'recent' | 'popular' | 'alphabetical';
}

export interface Album {
  _id: string;
  title: string;
  artist: User;
  coverUrl: string;
  tracks: Track[];
  genre: string[];
  releaseDate: Date;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  recipient: string;
  sender: User;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'new_track';
  track?: Track;
  comment?: Comment;
  isRead: boolean;
  createdAt: Date;
}

export interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Track[];
  repeat: 'none' | 'one' | 'all';
  shuffle: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface SearchFilters {
  genre?: string[];
  duration?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  explicit?: boolean;
}

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
} 