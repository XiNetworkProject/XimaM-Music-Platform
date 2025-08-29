import { supabase } from './supabase';
import { supabaseAdmin } from './supabase';

// Types pour les données Supabase
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
  is_verified: boolean;
  is_artist: boolean;
  artist_name?: string;
  genre: string[];
  total_plays: number;
  total_likes: number;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audio_url: string;
  cover_url?: string;
  genre: string[];
  tags: string[];
  description?: string;
  plays: number;
  likes: number;
  is_explicit: boolean;
  is_public: boolean;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseComment {
  id: string;
  content: string;
  user_id: string;
  track_id: string;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface SupabasePlaylist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseMessage {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseConversation {
  id: string;
  participants: string[];
  accepted: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

export interface SupabaseSubscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  limits: any;
  features: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Service utilisateurs
export class UserService {
  static async getById(id: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
    
    return data;
  }

  static async getByEmail(email: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Erreur récupération utilisateur par email:', error);
      return null;
    }
    
    return data;
  }

  static async getByUsername(username: string): Promise<SupabaseUser | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) {
      console.error('Erreur récupération utilisateur par username:', error);
      return null;
    }
    
    return data;
  }

  static async updateProfile(id: string, updates: Partial<SupabaseUser>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      console.error('Erreur mise à jour profil:', error);
      return false;
    }
    
    return true;
  }

  static async getFollowers(userId: string): Promise<SupabaseUser[]> {
    // Implémentation à adapter selon votre logique de followers
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(100);
    
    if (error) {
      console.error('Erreur récupération followers:', error);
      return [];
    }
    
    return data || [];
  }

  static async getFollowing(userId: string): Promise<SupabaseUser[]> {
    // Implémentation à adapter selon votre logique de following
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(100);
    
    if (error) {
      console.error('Erreur récupération following:', error);
      return [];
    }
    
    return data || [];
  }
}

// Service pistes
export class TrackService {
  static async getById(id: string): Promise<SupabaseTrack | null> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erreur récupération piste:', error);
      return null;
    }
    
    return data;
  }

  static async getByCreator(creatorId: string): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur récupération pistes par créateur:', error);
      return [];
    }
    
    return data || [];
  }

  static async getPopular(limit: number = 20): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('plays', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Erreur récupération pistes populaires:', error);
      return [];
    }
    
    return data || [];
  }

  static async getRecent(limit: number = 20): Promise<SupabaseTrack[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Erreur récupération pistes récentes:', error);
      return [];
    }
    
    return data || [];
  }

  static async incrementPlays(trackId: string): Promise<boolean> {
    const { error } = await supabase.rpc('increment_plays', { track_id: trackId });
    
    if (error) {
      console.error('Erreur incrémentation plays:', error);
      return false;
    }
    
    return true;
  }

  static async toggleLike(trackId: string, userId: string): Promise<boolean> {
    // Implémentation à adapter selon votre logique de likes
    return true;
  }
}

// Service commentaires
export class CommentService {
  static async getByTrack(trackId: string): Promise<SupabaseComment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur récupération commentaires:', error);
      return [];
    }
    
    return data || [];
  }

  static async create(comment: Omit<SupabaseComment, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        ...comment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Erreur création commentaire:', error);
      return null;
    }
    
    return data.id;
  }
}

// Service playlists
export class PlaylistService {
  static async getById(id: string): Promise<SupabasePlaylist | null> {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erreur récupération playlist:', error);
      return null;
    }
    
    return data;
  }

  static async getByUser(userId: string): Promise<SupabasePlaylist[]> {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur récupération playlists par utilisateur:', error);
      return [];
    }
    
    return data || [];
  }

  static async getTracks(playlistId: string): Promise<SupabaseTrack[]> {
    // Implémentation à adapter selon votre logique de tracks dans playlists
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .limit(100);
    
    if (error) {
      console.error('Erreur récupération pistes playlist:', error);
      return [];
    }
    
    return data || [];
  }
}

// Service messages
export class MessageService {
  static async getByConversation(conversationId: string): Promise<SupabaseMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erreur récupération messages:', error);
      return [];
    }
    
    return data || [];
  }

  static async create(message: Omit<SupabaseMessage, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Erreur création message:', error);
      return null;
    }
    
    return data.id;
  }

  static async markAsRead(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', messageId);
    
    if (error) {
      console.error('Erreur marquage message comme lu:', error);
      return false;
    }
    
    return true;
  }
}

// Service conversations
export class ConversationService {
  static async getByUser(userId: string): Promise<SupabaseConversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Erreur récupération conversations:', error);
      return [];
    }
    
    return data || [];
  }

  static async create(conversation: Omit<SupabaseConversation, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        ...conversation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Erreur création conversation:', error);
      return null;
    }
    
    return data.id;
  }
}

// Service abonnements
export class SubscriptionService {
  static async getActivePlans(): Promise<SupabaseSubscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (error) {
      console.error('Erreur récupération plans abonnement:', error);
      return [];
    }
    
    return data || [];
  }

  static async getById(id: string): Promise<SupabaseSubscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erreur récupération abonnement:', error);
      return null;
    }
    
    return data;
  }
}

// Export des services
export const userService = new UserService();
export const trackService = new TrackService();
export const commentService = new CommentService();
export const playlistService = new PlaylistService();
export const messageService = new MessageService();
export const conversationService = new ConversationService();
export const subscriptionService = new SubscriptionService();
