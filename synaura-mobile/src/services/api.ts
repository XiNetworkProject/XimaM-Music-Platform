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

export const api = new ApiService();

