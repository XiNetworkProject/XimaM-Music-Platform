export interface User {
  _id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  followers: string[];
  following: string[];
  createdAt: Date;
  updatedAt: Date;
  isVerified: boolean;
  role: 'user' | 'artist' | 'admin';
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
  };
}

export interface Track {
  id: string;
  title: string;
  artist: User;
  album?: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  genre: string[];
  tags: string[];
  description?: string;
  lyrics?: string;
  plays: number;
  likesCount: number; // Nombre total de likes (Supabase)
  isLiked?: boolean; // Si l'utilisateur actuel a liké cette piste
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  isExplicit: boolean;
  isPublic: boolean;
  copyright: {
    owner: string;
    year: number;
    rights: string;
  };
  waveform?: number[];
}

export interface Comment {
  id: string;
  user: User;
  track: string;
  content: string;
  likesCount: number; // Nombre total de likes (Supabase)
  replies: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  creator: User;
  tracks: Track[];
  isPublic: boolean;
  followers: number; // Nombre total de followers (Supabase)
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
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
  id: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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