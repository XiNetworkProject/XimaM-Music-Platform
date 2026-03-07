// synaura-mobile/src/services/api.ts

import { apiUrl } from '../config/env';

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type MobileUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  role?: string;
  isVerified?: boolean;
};

export type ApiTrack = {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name?: string;
    username?: string;
    avatar?: string | null;
    isArtist?: boolean;
    artistName?: string | null;
  };
  audioUrl: string;
  coverUrl?: string | null;
  duration: number;
  plays?: number;
  album?: string | null;
  genre?: string[];
  lyrics?: string | null;
  isLiked?: boolean;
};

export type PopularUser = {
  _id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  isArtist?: boolean;
  artistName?: string | null;
  genre?: string[] | null;
  totalPlays?: number;
  totalLikes?: number;
  followerCount?: number;
  followingCount?: number;
  isVerified?: boolean;
  createdAt?: string;
  lastSeen?: string | null;
  popularityScore?: number;
};

export type SearchArtist = {
  _id: string;
  username: string;
  name?: string | null;
  avatar?: string | null;
  isArtist?: boolean;
  artistName?: string | null;
  bio?: string | null;
  totalPlays?: number;
  totalLikes?: number;
  listeners?: number;
};

export type SearchPlaylist = {
  _id: string;
  title?: string;
  name?: string;
  description?: string | null;
  coverUrl?: string | null;
  trackCount?: number;
  creator?: {
    _id: string;
    username?: string;
    name?: string;
    avatar?: string | null;
  };
  createdAt?: string;
};

export type SearchResponse = {
  tracks: ApiTrack[];
  artists: SearchArtist[];
  playlists: SearchPlaylist[];
  query?: string;
  filter?: string;
  totalResults?: number;
};

export type RankingFeedResponse = {
  tracks: ApiTrack[];
  nextCursor?: number;
  hasMore?: boolean;
};

export type RadioStatusResponse = {
  success: boolean;
  data: {
    name: string;
    description: string;
    status: string;
    isOnline: boolean;
    currentTrack: {
      title: string;
      artist: string;
      genre?: string;
      album?: string;
    };
    stats: {
      listeners: number;
      bitrate: number;
      uptime?: string;
      quality?: string;
    };
    streamUrl: string;
    lastUpdate?: string;
  };
  source?: string;
  /** false lorsque le serveur radio est injoignable ou en erreur */
  available?: boolean;
};

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = apiUrl(path);
      const headers: Record<string, string> = {
        ...(options.headers as any),
      };

      if (!headers['Content-Type'] && options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        headers['X-Auth-Token'] = this.token; // fallback si un proxy enlève Authorization
      }

      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data?.error || `Erreur ${res.status}` };
      }

      return { success: true, data: data as T };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erreur réseau' };
    }
  }

  // ===== AUTH =====
  async login(email: string, password: string): Promise<ApiResponse<{ user: MobileUser; token: string }>> {
    // Endpoint existant côté Next: /api/auth/mobile/login
    const r = await this.request<{ success: boolean; data: { user: MobileUser; token: string } }>(
      '/api/auth/mobile/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    if (!r.success) return r;
    return { success: true, data: r.data.data };
  }

  async register(payload: { name: string; username: string; email: string; password: string }): Promise<ApiResponse<{ user: MobileUser }>> {
    // Endpoint existant côté Next: /api/auth/signup (crée user + profile)
    const r = await this.request<{ user: MobileUser }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return r;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const r = await this.request<{ success: boolean; data: { message: string } }>(
      '/api/auth/mobile/logout',
      { method: 'POST' }
    );
    if (!r.success) return r;
    return { success: true, data: r.data.data };
  }

  async getCountUsers(): Promise<ApiResponse<{ userCount: number; maxUsers: number; canRegister: boolean; remainingSlots: number }>> {
    return this.request('/api/auth/count-users', { method: 'GET' });
  }

  /** Diagnostic : voir si le serveur reçoit et accepte le token (GET /api/auth/mobile/debug). */
  async getAuthDebug(): Promise<ApiResponse<{ received?: { authorization?: boolean; xAuthToken?: boolean; query?: boolean }; tokenLength?: number; verify?: string; error?: string; userId?: string }>> {
    return this.request<any>('/api/auth/mobile/debug', { method: 'GET' });
  }

  // ===== TRACKS =====
  async getRecentTracks(limit = 30): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/recent?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
  }

  async getTrendingTracks(limit = 30): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/trending?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
  }

  async getFeaturedTracks(limit = 10): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/featured?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
  }

  async getPopularTracks(limit = 30): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/popular?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
  }

  /**
   * Feed “Pour toi” (comme l’accueil web).
   * Important: l’API gère un fallback si les stats 30j ne sont pas prêtes.
   */
  async getForYouFeed(
    limit = 50,
    includeAi = true,
    options?: { cursor?: number; strategy?: 'reco' | 'trending' }
  ): Promise<ApiResponse<RankingFeedResponse>> {
    const cursor = options?.cursor ?? 0;
    const strategy = options?.strategy ?? 'reco';
    const qs = `limit=${encodeURIComponent(String(limit))}&ai=${includeAi ? '1' : '0'}&cursor=${encodeURIComponent(
      String(cursor)
    )}&strategy=${encodeURIComponent(strategy)}`;
    return this.request<RankingFeedResponse>(`/api/ranking/feed?${qs}`, { method: 'GET' });
  }

  /**
   * Liste simple de tracks (utilisée pour "Créateurs suggérés" côté web).
   */
  async getTracks(limit = 100): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  }

  // ===== USERS =====
  async getPopularUsers(limit = 12): Promise<ApiResponse<{ users: PopularUser[] }>> {
    return this.request<{ users: PopularUser[] }>(`/api/users/popular?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
  }

  async getNewUsers(limit = 12): Promise<ApiResponse<{ users: PopularUser[] }>> {
    return this.request<{ users: PopularUser[] }>(`/api/users?limit=${encodeURIComponent(String(limit))}`, {
      method: 'GET',
    });
  }

  // ===== RADIO =====
  async getRadioStatus(station: 'mixx_party' | 'ximam' = 'mixx_party'): Promise<ApiResponse<RadioStatusResponse>> {
    return this.request<RadioStatusResponse>(`/api/radio/status?station=${encodeURIComponent(station)}`, { method: 'GET' });
  }

  // ===== SEARCH =====
  async search(query: string, options?: { filter?: 'all' | 'tracks' | 'artists' | 'playlists'; limit?: number }): Promise<ApiResponse<SearchResponse>> {
    const filter = options?.filter || 'all';
    const limit = options?.limit ?? 20;
    const qs = `query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&limit=${encodeURIComponent(String(limit))}`;
    return this.request<SearchResponse>(`/api/search?${qs}`, { method: 'GET' });
  }

  // ===== STUDIO IA =====
  /** POST avec token dans le body pour éviter 401 quand les headers sont supprimés (proxy/CDN). */
  async getAICredits(accessToken?: string | null): Promise<ApiResponse<{ balance: number }>> {
    const t = accessToken ?? this.token;
    if (t) {
      return this.request<{ balance: number }>('/api/ai/credits', {
        method: 'POST',
        body: JSON.stringify({ accessToken: t }),
      });
    }
    return this.request<{ balance: number }>('/api/ai/credits', { method: 'GET' });
  }

  async getAILibraryTracks(
    limit = 100,
    offset = 0,
    search = '',
    accessToken?: string | null
  ): Promise<
    ApiResponse<{ tracks: AILibraryTrack[]; pagination: { limit: number; offset: number; total: number } }>
  > {
    const t = accessToken ?? this.token;
    if (t) {
      return this.request<{ tracks: AILibraryTrack[]; pagination: { limit: number; offset: number; total: number } }>(
        '/api/ai/library/tracks',
        {
          method: 'POST',
          body: JSON.stringify({ accessToken: t, limit, offset, search }),
        }
      );
    }
    const qs = `limit=${limit}&offset=${offset}&search=${encodeURIComponent(search)}`;
    return this.request<{ tracks: AILibraryTrack[]; pagination: { limit: number; offset: number; total: number } }>(
      `/api/ai/library/tracks?${qs}`,
      { method: 'GET' }
    );
  }

  async startAIGeneration(body: {
    customMode: boolean;
    title?: string;
    style?: string;
    prompt?: string;
    instrumental: boolean;
    model?: string;
  }): Promise<
    ApiResponse<{
      taskId: string;
      credits?: { balance: number; debited?: number };
      error?: string;
      insufficientCredits?: boolean;
      balance?: number;
      required?: number;
    }>
  > {
    return this.request<any>('/api/suno/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getAIGenerationStatus(taskId: string): Promise<
    ApiResponse<{ taskId: string; status: string; tracks?: Array<{ id: string; title?: string; audio?: string; stream?: string; image?: string; duration?: number }> }>
  > {
    return this.request<any>(`/api/suno/status?taskId=${encodeURIComponent(taskId)}`, { method: 'GET' });
  }

  /** Remix (upload-cover) : uploadUrl = URL publique de l’audio source (ex. piste de la bibliothèque). */
  async startAIRemix(body: {
    uploadUrl: string;
    title?: string;
    style?: string;
    prompt?: string;
    instrumental: boolean;
    model?: string;
    customMode?: boolean;
    sourceDurationSec?: number;
  }): Promise<
    ApiResponse<{
      taskId?: string;
      credits?: { balance: number };
      error?: string;
      insufficientCredits?: boolean;
    }>
  > {
    return this.request<any>('/api/suno/upload-cover', {
      method: 'POST',
      body: JSON.stringify({
        uploadUrl: body.uploadUrl,
        customMode: body.customMode !== false,
        instrumental: body.instrumental,
        title: body.title || 'Remix',
        style: body.style || '',
        prompt: body.prompt,
        model: body.model || 'V4_5',
        sourceDurationSec: body.sourceDurationSec,
      }),
    });
  }

  // ===== TRACK DETAILS =====
  async getTrack(id: string): Promise<ApiResponse<{ track: ApiTrack }>> {
    return this.request<{ track: ApiTrack }>(`/api/tracks/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  async likeTrack(id: string): Promise<ApiResponse<{ liked: boolean }>> {
    return this.request<{ liked: boolean }>(`/api/tracks/${encodeURIComponent(id)}/like`, { method: 'POST' });
  }

  async getTrackComments(id: string, limit = 50): Promise<ApiResponse<{ comments: TrackComment[] }>> {
    return this.request<{ comments: TrackComment[] }>(`/api/tracks/${encodeURIComponent(id)}/comments?limit=${limit}`, { method: 'GET' });
  }

  async addTrackComment(id: string, content: string): Promise<ApiResponse<{ comment: TrackComment }>> {
    return this.request<{ comment: TrackComment }>(`/api/tracks/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getRisingTracks(limit = 20): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/rising?limit=${limit}`, { method: 'GET' });
  }

  async getRediscoverTracks(limit = 20): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/rediscover?limit=${limit}`, { method: 'GET' });
  }

  async getSimilarTracks(id: string, limit = 10): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/tracks/similar?trackId=${encodeURIComponent(id)}&limit=${limit}`, { method: 'GET' });
  }

  async recordTrackEvent(id: string, event: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/tracks/${encodeURIComponent(id)}/events`, {
      method: 'POST',
      body: JSON.stringify({ event }),
    });
  }

  // ===== PLAYLISTS =====
  async getPlaylists(): Promise<ApiResponse<{ playlists: ApiPlaylist[] }>> {
    return this.request<{ playlists: ApiPlaylist[] }>('/api/playlists', { method: 'GET' });
  }

  async getPlaylist(id: string): Promise<ApiResponse<{ playlist: ApiPlaylist }>> {
    return this.request<{ playlist: ApiPlaylist }>(`/api/playlists/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  async createPlaylist(data: { name: string; description?: string; isPublic?: boolean }): Promise<ApiResponse<{ playlist: ApiPlaylist }>> {
    return this.request<{ playlist: ApiPlaylist }>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlaylist(id: string, data: { name?: string; description?: string; isPublic?: boolean }): Promise<ApiResponse<{ playlist: ApiPlaylist }>> {
    return this.request<{ playlist: ApiPlaylist }>(`/api/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePlaylist(id: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/playlists/${encodeURIComponent(playlistId)}`, {
      method: 'POST',
      body: JSON.stringify({ trackId, action: 'add' }),
    });
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/playlists/${encodeURIComponent(playlistId)}`, {
      method: 'POST',
      body: JSON.stringify({ trackId, action: 'remove' }),
    });
  }

  async getPopularPlaylists(limit = 20): Promise<ApiResponse<{ playlists: ApiPlaylist[] }>> {
    return this.request<{ playlists: ApiPlaylist[] }>(`/api/playlists/popular?limit=${limit}`, { method: 'GET' });
  }

  // ===== USER PROFILES =====
  async getUserProfile(username: string): Promise<ApiResponse<{ user: UserProfile }>> {
    return this.request<{ user: UserProfile }>(`/api/users/${encodeURIComponent(username)}`, { method: 'GET' });
  }

  async getUserTracks(username: string, limit = 50): Promise<ApiResponse<{ tracks: ApiTrack[] }>> {
    return this.request<{ tracks: ApiTrack[] }>(`/api/users/tracks?username=${encodeURIComponent(username)}&limit=${limit}`, { method: 'GET' });
  }

  async followUser(username: string): Promise<ApiResponse<{ followed: boolean }>> {
    return this.request<{ followed: boolean }>(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'POST' });
  }

  async getFollowRequests(): Promise<ApiResponse<{ requests: FollowRequest[] }>> {
    return this.request<{ requests: FollowRequest[] }>('/api/users/follow-requests', { method: 'GET' });
  }

  async handleFollowRequest(requestId: string, action: 'accept' | 'reject'): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>('/api/users/follow-requests', {
      method: 'POST',
      body: JSON.stringify({ requestId, action }),
    });
  }

  async updateProfile(data: Record<string, any>): Promise<ApiResponse<{ user: any }>> {
    return this.request<{ user: any }>('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ===== MESSAGES =====
  async getConversations(): Promise<ApiResponse<{ conversations: Conversation[] }>> {
    return this.request<{ conversations: Conversation[] }>('/api/messages/conversations', { method: 'GET' });
  }

  async getMessages(conversationId: string, limit = 50, before?: string): Promise<ApiResponse<{ messages: Message[] }>> {
    const qs = `limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`;
    return this.request<{ messages: Message[] }>(`/api/messages/${encodeURIComponent(conversationId)}?${qs}`, { method: 'GET' });
  }

  async sendMessage(conversationId: string, content: string, type = 'text'): Promise<ApiResponse<{ message: Message }>> {
    return this.request<{ message: Message }>(`/api/messages/${encodeURIComponent(conversationId)}`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async getMessageRequests(): Promise<ApiResponse<{ requests: any[] }>> {
    return this.request<{ requests: any[] }>('/api/messages/requests', { method: 'GET' });
  }

  async startConversation(userId: string): Promise<ApiResponse<{ conversation: Conversation }>> {
    return this.request<{ conversation: Conversation }>('/api/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // ===== NOTIFICATIONS =====
  async getNotifications(limit = 50): Promise<ApiResponse<{ notifications: AppNotification[] }>> {
    return this.request<{ notifications: AppNotification[] }>(`/api/notifications?limit=${limit}`, { method: 'GET' });
  }

  async markNotificationRead(id: string): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
  }

  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>('/api/notifications/unread-count', { method: 'GET' });
  }

  // ===== GENRES =====
  async getGenres(): Promise<ApiResponse<{ genres: string[] }>> {
    return this.request<{ genres: string[] }>('/api/genres', { method: 'GET' });
  }

  // ===== SUBSCRIPTIONS =====
  async getMySubscription(): Promise<ApiResponse<{ subscription: any; plan: string; usage: any }>> {
    return this.request<{ subscription: any; plan: string; usage: any }>('/api/subscriptions/my-subscription', { method: 'GET' });
  }

  async getSubscriptionUsage(): Promise<ApiResponse<{ usage: any; limits: any; plan: string }>> {
    return this.request<{ usage: any; limits: any; plan: string }>('/api/subscriptions/usage', { method: 'GET' });
  }

  // ===== BOOSTERS =====
  async getBoosterStatus(): Promise<ApiResponse<{ canClaim: boolean; nextClaimAt?: string; streak?: number }>> {
    return this.request<{ canClaim: boolean; nextClaimAt?: string; streak?: number }>('/api/boosters/active', { method: 'GET' });
  }

  async claimBoosterPack(): Promise<ApiResponse<{ rewards: any[]; streak?: number }>> {
    return this.request<{ rewards: any[]; streak?: number }>('/api/boosters/claim-pack', { method: 'POST' });
  }

  async getBoosterHistory(limit = 20): Promise<ApiResponse<{ history: any[] }>> {
    return this.request<{ history: any[] }>(`/api/boosters/history?limit=${limit}`, { method: 'GET' });
  }

  // ===== STATS =====
  async getCreatorStats(): Promise<ApiResponse<{ stats: any }>> {
    return this.request<{ stats: any }>('/api/stats/audience', { method: 'GET' });
  }

  async getTrackStats(trackId: string): Promise<ApiResponse<{ stats: any }>> {
    return this.request<{ stats: any }>(`/api/stats/audience?trackId=${encodeURIComponent(trackId)}`, { method: 'GET' });
  }

  // ===== COMMUNITY =====
  async getCommunityPosts(limit = 20, offset = 0): Promise<ApiResponse<{ posts: CommunityPost[] }>> {
    return this.request<{ posts: CommunityPost[] }>(`/api/community/posts?limit=${limit}&offset=${offset}`, { method: 'GET' });
  }

  async createCommunityPost(data: { title: string; content: string; category?: string }): Promise<ApiResponse<{ post: CommunityPost }>> {
    return this.request<{ post: CommunityPost }>('/api/community/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFAQ(): Promise<ApiResponse<{ faqs: any[] }>> {
    return this.request<{ faqs: any[] }>('/api/community/faq', { method: 'GET' });
  }

  async getCommunityStats(): Promise<ApiResponse<{ stats: any }>> {
    return this.request<{ stats: any }>('/api/stats/community', { method: 'GET' });
  }

  // ===== UPLOAD =====
  async getUploadSignature(params: { timestamp: number; publicId: string; folder?: string }): Promise<ApiResponse<{ signature: string; timestamp: number; apiKey: string; cloudName: string }>> {
    return this.request<{ signature: string; timestamp: number; apiKey: string; cloudName: string }>('/api/upload/signature', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async publishTrack(data: Record<string, any>): Promise<ApiResponse<{ track: ApiTrack }>> {
    return this.request<{ track: ApiTrack }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkCopyright(audioUrl: string): Promise<ApiResponse<{ hasCopyright: boolean; matches?: any[] }>> {
    return this.request<{ hasCopyright: boolean; matches?: any[] }>('/api/upload/copyright-check', {
      method: 'POST',
      body: JSON.stringify({ audioUrl }),
    });
  }
}

export type AILibraryTrack = {
  id: string;
  title: string;
  audio_url: string;
  stream_audio_url?: string;
  image_url?: string;
  duration?: number;
  prompt?: string;
  lyrics?: string;
  model_name?: string;
  tags?: string[];
  created_at?: string;
  generation?: {
    id: string;
    task_id?: string;
    model?: string;
    created_at?: string;
    prompt?: string;
    status?: string;
  };
};

export type TrackComment = {
  _id: string;
  content: string;
  user: { _id: string; username: string; name?: string; avatar?: string | null };
  createdAt: string;
};

export type ApiPlaylist = {
  _id: string;
  name?: string;
  title?: string;
  description?: string | null;
  coverUrl?: string | null;
  isPublic?: boolean;
  trackCount?: number;
  totalDuration?: number;
  tracks?: ApiTrack[];
  creator?: { _id: string; username?: string; name?: string; avatar?: string | null };
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfile = {
  _id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  banner?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  isArtist?: boolean;
  artistName?: string | null;
  genre?: string[] | null;
  totalPlays?: number;
  totalLikes?: number;
  followerCount?: number;
  followingCount?: number;
  trackCount?: number;
  playlistCount?: number;
  isVerified?: boolean;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  createdAt?: string;
  lastSeen?: string | null;
};

export type Conversation = {
  _id: string;
  participants: Array<{ _id: string; username: string; name?: string; avatar?: string | null }>;
  lastMessage?: { content: string; createdAt: string; sender: string; type?: string };
  unreadCount?: number;
  isRequest?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Message = {
  _id: string;
  content: string;
  type?: string;
  sender: { _id: string; username: string; name?: string; avatar?: string | null };
  conversationId: string;
  readBy?: string[];
  createdAt: string;
};

export type AppNotification = {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  data?: any;
  fromUser?: { _id: string; username: string; name?: string; avatar?: string | null };
  createdAt: string;
};

export type FollowRequest = {
  _id: string;
  from: { _id: string; username: string; name?: string; avatar?: string | null };
  status: string;
  createdAt: string;
};

export type CommunityPost = {
  _id: string;
  title: string;
  content: string;
  category?: string;
  author: { _id: string; username: string; name?: string; avatar?: string | null };
  likes?: number;
  replies?: number;
  createdAt: string;
};

export const api = new ApiService();

