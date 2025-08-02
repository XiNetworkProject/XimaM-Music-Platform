import { ENV } from '../config/env';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
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
  coverUrl?: string;
  audioUrl: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  createdAt: string;
  genre?: string[];
  description?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
}

export interface RealTimeStats {
  tracks: number;
  artists: number;
  totalPlays: number;
  totalLikes: number;
}

export interface PersonalRecommendation {
  title: string;
  description: string;
  type: string;
  confidence: string;
  icon: string;
  tracks: Track[];
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = ENV.API_URL;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Erreur ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Erreur API:', error);
      return {
        success: false,
        error: 'Erreur de connexion',
      };
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  // ===== AUTHENTIFICATION =====
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    name: string;
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>('/api/auth/mobile/logout', {
      method: 'POST',
    });
    if (response.success) {
      this.clearToken();
    }
    return response;
  }

  // ===== DONNÉES DE LA PAGE D'ACCUEIL =====
  async getFeaturedTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/featured');
  }

  async getTrendingTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/trending');
  }

  async getPopularTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/popular');
  }

  async getRecentTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/recent');
  }

  async getMostLikedTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/most-liked');
  }

  async getFollowingTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/following');
  }

  async getRecommendedTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/api/tracks/recommended');
  }

  // ===== STATISTIQUES =====
  async getRealTimeStats(): Promise<ApiResponse<RealTimeStats>> {
    return this.request('/api/stats/community');
  }

  // ===== RECOMMANDATIONS PERSONNALISÉES =====
  async getPersonalRecommendations(): Promise<ApiResponse<PersonalRecommendation[]>> {
    return this.request('/api/recommendations/personal');
  }

  // ===== RADIO =====
  async getRadioInfo(): Promise<ApiResponse<any>> {
    return this.request('/api/events/live');
  }

  // ===== LIKES ET ÉCOUTES =====
  async likeTrack(trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/tracks/${trackId}/like`, {
      method: 'POST',
    });
  }

  async unlikeTrack(trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/tracks/${trackId}/like`, {
      method: 'DELETE',
    });
  }

  async incrementPlays(trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/tracks/${trackId}/plays`, {
      method: 'POST',
    });
  }

  // ===== RECHERCHE =====
  async search(query: string, filter: string = 'all'): Promise<ApiResponse<any>> {
    return this.request(`/api/search?q=${encodeURIComponent(query)}&filter=${filter}`);
  }

  // ===== UTILISATEURS =====
  async getUserProfile(username: string): Promise<ApiResponse<User>> {
    return this.request(`/api/users/${username}`);
  }

  async getUserTracks(username: string): Promise<ApiResponse<Track[]>> {
    return this.request(`/api/users/${username}/tracks`);
  }

  // ===== MESSAGES =====
  async getConversations(): Promise<ApiResponse<any[]>> {
    return this.request('/api/messages/conversations');
  }

  async getMessages(conversationId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/api/messages/${conversationId}`);
  }

  // ===== PLAYLISTS =====
  async getPlaylists(): Promise<ApiResponse<any[]>> {
    return this.request('/api/playlists');
  }

  async getPopularPlaylists(): Promise<ApiResponse<any[]>> {
    return this.request('/api/playlists/popular');
  }

  // ===== UPLOAD =====
  async uploadTrack(formData: FormData): Promise<ApiResponse<Track>> {
    return this.request('/api/upload', {
      method: 'POST',
      headers: {} as any, // Ne pas définir Content-Type pour FormData
      body: formData as any,
    });
  }

  // ===== ACTIVITÉ RÉCENTE =====
  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    return this.request('/api/activity/recent');
  }
}

const apiService = new ApiService();
export default apiService; 