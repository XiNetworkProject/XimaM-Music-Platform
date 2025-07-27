// Types pour l'application XimaM Mobile

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  followers: number;
  following: number;
  isVerified: boolean;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Track {
  _id: string;
  title: string;
  artist: string;
  artistId: string;
  album?: string;
  genre: string;
  duration: number;
  audioUrl: string;
  coverUrl?: string;
  waveformUrl?: string;
  plays: number;
  likes: number;
  comments: number;
  isLiked: boolean;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  _id: string;
  trackId: string;
  userId: string;
  user: User;
  content: string;
  likes: number;
  replies: Comment[];
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  isPublic: boolean;
  isCollaborative: boolean;
  followers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string;
  type: 'text' | 'audio' | 'image';
  audioUrl?: string;
  imageUrl?: string;
  duration?: number;
  isRead: boolean;
  createdAt: Date;
}

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

export interface Subscription {
  _id: string;
  userId: string;
  plan: 'free' | 'premium' | 'pro';
  status: 'active' | 'canceled' | 'expired';
  startDate: Date;
  endDate: Date;
  features: string[];
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
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AudioPlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  isRepeated: boolean;
  queue: Track[];
  currentIndex: number;
}

export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
}

export interface AppState {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  biometrics: boolean;
  offlineMode: boolean;
}

export interface UploadProgress {
  trackId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface SearchFilters {
  genre?: string;
  duration?: 'short' | 'medium' | 'long';
  sortBy?: 'recent' | 'popular' | 'trending';
  isVerified?: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioUri?: string;
  error?: string;
}

export interface NetworkState {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none';
}

export interface CacheItem<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export interface NavigationState {
  index: number;
  routes: any[];
}

export interface BottomTabState {
  activeTab: string;
  badgeCounts: Record<string, number>;
}

export interface ModalState {
  isVisible: boolean;
  type: string;
  data?: any;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface PermissionState {
  microphone: boolean;
  storage: boolean;
  notifications: boolean;
  biometrics: boolean;
}

export interface DeviceInfo {
  brand: string;
  model: string;
  systemVersion: string;
  appVersion: string;
  buildNumber: string;
  uniqueId: string;
}

export interface AppConfig {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TrackDetail: { trackId: string };
  UserProfile: { userId: string };
  PlaylistDetail: { playlistId: string };
  Conversation: { conversationId: string };
  Upload: undefined;
  Settings: undefined;
  Search: undefined;
  Notifications: undefined;
  Messages: undefined;
  Library: undefined;
  Community: undefined;
  Discover: undefined;
  Subscriptions: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Discover: undefined;
  Upload: undefined;
  Messages: undefined;
  Profile: undefined;
}; 