import { supabase, supabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Types pour Supabase
export interface SupabaseUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  social_links?: Record<string, string>;
  is_verified: boolean;
  is_artist: boolean;
  artist_name?: string;
  genre?: string[];
  total_plays: number;
  total_likes: number;
  last_seen: Date;
  preferences?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseTrack {
  id: string;
  title: string;
  description?: string;
  audio_url: string;
  cover_url?: string;
  duration: number;
  genre?: string[];
  creator_id: string;
  plays: number;
  likes: number;
  is_featured: boolean;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SupabasePlaylist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  creator_id: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SupabaseComment {
  id: string;
  content: string;
  user_id: string;
  track_id: string;
  parent_id?: string;
  likes: number;
  created_at: Date;
  updated_at: Date;
}

// Service des utilisateurs
export class UserService {
  static async getProfile(userId: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erreur récupération profil:', error);
      return null;
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<SupabaseUser>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Erreur mise à jour profil:', error);
      return false;
    }

    return true;
  }

  static async searchUsers(query: string): Promise<SupabaseUser[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Erreur recherche utilisateurs:', error);
      return [];
    }

    return data || [];
  }

  static async followUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId
      });

    if (error) {
      console.error('Erreur follow:', error);
      return false;
    }

    return true;
  }

  static async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('Erreur unfollow:', error);
      return false;
    }

    return true;
  }

  static async getFollowers(userId: string): Promise<SupabaseUser[]> {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        profiles!user_follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId);

    if (error) {
      console.error('Erreur récupération followers:', error);
      return [];
    }

    return (data?.map(item => item.profiles).filter(Boolean) || []) as unknown as SupabaseUser[];
  }

  static async getFollowing(userId: string): Promise<SupabaseUser[]> {
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        following_id,
        profiles!user_follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId);

    if (error) {
      console.error('Erreur récupération following:', error);
      return [];
    }

    return (data?.map(item => item.profiles).filter(Boolean) || []) as unknown as SupabaseUser[];
  }
}

// Service des pistes
export class TrackService {
  static async createTrack(trackData: Omit<SupabaseTrack, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const trackId = uuidv4();
    
    const { error } = await supabase
      .from('tracks')
      .insert({
        id: trackId,
        ...trackData
      });

    if (error) {
      console.error('Erreur création piste:', error);
      return null;
    }

    return trackId;
  }

  static async getTrack(trackId: string): Promise<SupabaseTrack | null> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (error) {
      console.error('Erreur récupération piste:', error);
      return null;
    }

    return data;
  }

  static async getTracksByCreator(creatorId: string): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération pistes créateur:', error);
      return [];
    }

    return data || [];
  }

  static async searchTracks(query: string): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .rpc('search_tracks', { search_query: query });

    if (error) {
      console.error('Erreur recherche pistes:', error);
      return [];
    }

    return data || [];
  }

  static async getTrendingTracks(limit: number = 20): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .from('trending_tracks')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Erreur récupération trending:', error);
      return [];
    }

    return data || [];
  }

  static async likeTrack(trackId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('track_likes')
      .insert({
        track_id: trackId,
        user_id: userId
      });

    if (error) {
      console.error('Erreur like:', error);
      return false;
    }

    return true;
  }

  static async unlikeTrack(trackId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('track_likes')
      .delete()
      .eq('track_id', trackId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur unlike:', error);
      return false;
    }

    return true;
  }

  static async incrementPlays(trackId: string): Promise<boolean> {
    const { error } = await supabase
      .from('tracks')
      .update({ plays: supabase.rpc('increment', { row: 'plays', inc: 1 }) })
      .eq('id', trackId);

    if (error) {
      console.error('Erreur incrément plays:', error);
      return false;
    }

    return true;
  }
}

// Service des playlists
export class PlaylistService {
  static async createPlaylist(playlistData: Omit<SupabasePlaylist, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const playlistId = uuidv4();
    
    const { error } = await supabase
      .from('playlists')
      .insert({
        id: playlistId,
        ...playlistData
      });

    if (error) {
      console.error('Erreur création playlist:', error);
      return null;
    }

    return playlistId;
  }

  static async addTrackToPlaylist(playlistId: string, trackId: string, position?: number): Promise<boolean> {
    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlistId,
        track_id: trackId,
        position: position || 0
      });

    if (error) {
      console.error('Erreur ajout piste playlist:', error);
      return false;
    }

    return true;
  }

  static async getPlaylistTracks(playlistId: string): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select(`
        position,
        tracks(*)
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erreur récupération pistes playlist:', error);
      return [];
    }

    return (data?.map(item => item.tracks).filter(Boolean) || []) as unknown as SupabaseTrack[];
  }
}

// Service des commentaires
export class CommentService {
  static async createComment(commentData: Omit<SupabaseComment, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const commentId = uuidv4();
    
    const { error } = await supabase
      .from('comments')
      .insert({
        id: commentId,
        ...commentData
      });

    if (error) {
      console.error('Erreur création commentaire:', error);
      return null;
    }

    return commentId;
  }

  static async getTrackComments(trackId: string): Promise<SupabaseComment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(name, username, avatar)
      `)
      .eq('track_id', trackId)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération commentaires:', error);
      return [];
    }

    return data || [];
  }

  static async getCommentReplies(commentId: string): Promise<SupabaseComment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(name, username, avatar)
      `)
      .eq('parent_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération réponses:', error);
      return [];
    }

    return data || [];
  }
}

// Service des messages
export class MessageService {
  static async sendMessage(messageData: {
    content: string;
    sender_id: string;
    conversation_id: string;
  }): Promise<string | null> {
    const messageId = uuidv4();
    
    const { error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        ...messageData
      });

    if (error) {
      console.error('Erreur envoi message:', error);
      return null;
    }

    return messageId;
  }

  static async getConversationMessages(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_sender_id_fkey(name, username, avatar)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération messages:', error);
      return [];
    }

    return data || [];
  }

  static async markMessageAsRead(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('Erreur marquage lu:', error);
      return false;
    }

    return true;
  }
}

// Service des statistiques
export class StatsService {
  static async getUserStats(userId: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_user_stats', { user_uuid: userId });

    if (error) {
      console.error('Erreur récupération stats:', error);
      return null;
    }

    return data?.[0] || null;
  }

  static async getRecentActivity(limit: number = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('recent_activity')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Erreur récupération activité:', error);
      return [];
    }

    return data || [];
  }
}

export default {
  UserService,
  TrackService,
  PlaylistService,
  CommentService,
  MessageService,
  StatsService
};
