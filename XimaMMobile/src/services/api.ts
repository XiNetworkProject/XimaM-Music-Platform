import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config/env';
import { ApiResponse, PaginatedResponse, User, Track, Comment, Playlist, Message, Conversation, Notification } from '../types';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = CONFIG.API_URL;
  }

  // Initialisation du service
  async init() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  // Gestion du token
  setToken(token: string) {
    this.token = token;
    AsyncStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    AsyncStorage.removeItem('auth_token');
  }

  // Headers par défaut
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Méthode générique pour les requêtes
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      };
    }
  }

  // ===== AUTHENTIFICATION =====
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    // Route API personnalisée pour l'authentification mobile
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

  async googleSignIn(idToken: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
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

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/users/me');
  }

  // ===== TRACKS =====
  async getTracks(params?: {
    page?: number;
    limit?: number;
    genre?: string;
    sortBy?: string;
  }): Promise<ApiResponse<PaginatedResponse<Track>>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.genre) queryParams.append('genre', params.genre);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);

    return this.request(`/tracks?${queryParams.toString()}`);
  }

  async getTrack(id: string): Promise<ApiResponse<Track>> {
    return this.request(`/tracks/${id}`);
  }

  async getPopularTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/tracks/popular');
  }

  async getTrendingTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/tracks/trending');
  }

  async getRecentTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/tracks/recent');
  }

  async getFeaturedTracks(): Promise<ApiResponse<Track[]>> {
    return this.request('/tracks/featured');
  }

  async likeTrack(trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tracks/${trackId}/like`, {
      method: 'POST',
    });
  }

  async unlikeTrack(trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tracks/${trackId}/like`, {
      method: 'DELETE',
    });
  }

  async playTrack(trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tracks/${trackId}/plays`, {
      method: 'POST',
    });
  }

  // ===== UPLOAD =====
  async uploadTrack(formData: FormData): Promise<ApiResponse<Track>> {
    const headers = { ...this.getHeaders() };
    delete headers['Content-Type']; // Laisser le navigateur définir le Content-Type pour FormData

    return this.request('/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  async getUploadProgress(trackId: string): Promise<ApiResponse<{ progress: number; status: string }>> {
    return this.request(`/upload/${trackId}/progress`);
  }

  // ===== COMMENTS =====
  async getComments(trackId: string): Promise<ApiResponse<Comment[]>> {
    return this.request(`/tracks/${trackId}/comments`);
  }

  async addComment(trackId: string, content: string): Promise<ApiResponse<Comment>> {
    return this.request(`/tracks/${trackId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async likeComment(commentId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/tracks/comments/${commentId}/like`, {
      method: 'POST',
    });
  }

  async replyToComment(commentId: string, content: string): Promise<ApiResponse<Comment>> {
    return this.request(`/tracks/comments/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // ===== USERS =====
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    return this.request(`/users/${userId}`);
  }

  async getUserTracks(userId: string): Promise<ApiResponse<Track[]>> {
    return this.request(`/users/${userId}/tracks`);
  }

  async followUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/users/${userId}/follow`, {
      method: 'DELETE',
    });
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // ===== PLAYLISTS =====
  async getPlaylists(): Promise<ApiResponse<Playlist[]>> {
    return this.request('/playlists');
  }

  async getPlaylist(id: string): Promise<ApiResponse<Playlist>> {
    return this.request(`/playlists/${id}`);
  }

  async createPlaylist(playlistData: {
    name: string;
    description?: string;
    isPublic: boolean;
  }): Promise<ApiResponse<Playlist>> {
    return this.request('/playlists', {
      method: 'POST',
      body: JSON.stringify(playlistData),
    });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId }),
    });
  }

  // ===== MESSAGES =====
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request('/messages/conversations');
  }

  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.request(`/messages/${conversationId}`);
  }

  async sendMessage(conversationId: string, content: string): Promise<ApiResponse<Message>> {
    return this.request(`/messages/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async sendAudioMessage(conversationId: string, audioUri: string): Promise<ApiResponse<Message>> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);

    const headers = { ...this.getHeaders() };
    delete headers['Content-Type'];

    return this.request(`/messages/${conversationId}/audio`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  // ===== NOTIFICATIONS =====
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    return this.request('/messages/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/messages/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // ===== SEARCH =====
  async search(query: string, filters?: {
    type?: 'tracks' | 'users' | 'playlists';
    genre?: string;
    duration?: string;
  }): Promise<ApiResponse<{
    tracks: Track[];
    users: User[];
    playlists: Playlist[];
  }>> {
    const queryParams = new URLSearchParams({ q: query });
    if (filters?.type) queryParams.append('type', filters.type);
    if (filters?.genre) queryParams.append('genre', filters.genre);
    if (filters?.duration) queryParams.append('duration', filters.duration);

    return this.request(`/search?${queryParams.toString()}`);
  }

  // ===== SUBSCRIPTIONS =====
  async getSubscription(): Promise<ApiResponse<{ subscription: any; features: string[] }>> {
    return this.request('/subscriptions/my-subscription');
  }

  async createCheckoutSession(priceId: string): Promise<ApiResponse<{ sessionId: string }>> {
    return this.request('/subscriptions/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  // ===== STATS =====
  async getStats(): Promise<ApiResponse<{
    totalTracks: number;
    totalPlays: number;
    totalLikes: number;
    totalComments: number;
  }>> {
    return this.request('/stats/community');
  }

  // ===== ACTIVITY =====
  async getRecentActivity(): Promise<ApiResponse<any[]>> {
    return this.request('/activity/recent');
  }
}

// Instance singleton
const apiService = new ApiService();

export default apiService; 