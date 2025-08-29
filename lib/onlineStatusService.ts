import { supabase } from './supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from './authOptions';

interface StatusUpdate {
  isOnline?: boolean;
  isTyping?: boolean;
  typingInConversation?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

interface UserStatusData {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  isTyping: boolean;
  lastActivity: Date;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

class OnlineStatusService {
  private static instance: OnlineStatusService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  public static getInstance(): OnlineStatusService {
    if (!OnlineStatusService.instance) {
      OnlineStatusService.instance = new OnlineStatusService();
    }
    return OnlineStatusService.instance;
  }

  // Mettre à jour le statut d'un utilisateur
  async updateUserStatus(userId: string, updates: StatusUpdate): Promise<boolean> {
    try {
      const statusUpdate = {
        user_id: userId,
        ...updates,
        last_activity: new Date().toISOString(),
        last_seen: updates.isOnline ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_statuses')
        .upsert(statusUpdate, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Erreur mise à jour statut Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      return false;
    }
  }

  // Obtenir le statut d'un utilisateur
  async getUserStatus(userId: string): Promise<UserStatusData> {
    try {
      const { data: status, error } = await supabase
        .from('user_statuses')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !status) {
        return {
          userId,
          isOnline: false,
          lastSeen: new Date(),
          isTyping: false,
          lastActivity: new Date(),
        };
      }

      // Vérifier si l'utilisateur est encore en ligne (activité récente)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const lastActivity = new Date(status.last_activity);
      const isActuallyOnline = status.is_online && lastActivity > fiveMinutesAgo;

      return {
        userId: status.user_id,
        isOnline: isActuallyOnline,
        lastSeen: status.last_seen ? new Date(status.last_seen) : lastActivity,
        isTyping: status.is_typing || false,
        lastActivity: lastActivity,
        deviceInfo: status.device_info,
      };
    } catch (error) {
      console.error('❌ Erreur récupération statut:', error);
      return {
        userId,
        isOnline: false,
        lastSeen: new Date(),
        isTyping: false,
        lastActivity: new Date(),
      };
    }
  }

  // Obtenir le statut de plusieurs utilisateurs
  async getMultipleUserStatuses(userIds: string[]): Promise<UserStatusData[]> {
    try {
      const { data: statuses, error } = await supabase
        .from('user_statuses')
        .select('*')
        .in('user_id', userIds);

      if (error || !statuses) {
        return userIds.map(userId => ({
          userId,
          isOnline: false,
          lastSeen: new Date(),
          isTyping: false,
          lastActivity: new Date(),
        }));
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      return statuses.map(status => {
        const lastActivity = new Date(status.last_activity);
        const isActuallyOnline = status.is_online && lastActivity > fiveMinutesAgo;
        
        return {
          userId: status.user_id,
          isOnline: isActuallyOnline,
          lastSeen: status.last_seen ? new Date(status.last_seen) : lastActivity,
          isTyping: status.is_typing || false,
          lastActivity: lastActivity,
          deviceInfo: status.device_info,
        };
      });
    } catch (error) {
      console.error('❌ Erreur récupération statuts multiples:', error);
      return userIds.map(userId => ({
        userId,
        isOnline: false,
        lastSeen: new Date(),
        isTyping: false,
        lastActivity: new Date(),
      }));
    }
  }

  // Marquer un utilisateur comme hors ligne
  async setUserOffline(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_statuses')
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erreur mise hors ligne Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur mise hors ligne:', error);
      return false;
    }
  }

  // Marquer un utilisateur comme en train de taper
  async setUserTyping(userId: string, conversationId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_statuses')
        .upsert({
          user_id: userId,
          is_typing: true,
          typing_in_conversation: conversationId,
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Erreur statut typing Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur statut typing:', error);
      return false;
    }
  }

  // Arrêter le statut de frappe
  async stopUserTyping(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_statuses')
        .update({
          is_typing: false,
          typing_in_conversation: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erreur arrêt typing Supabase:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur arrêt typing:', error);
      return false;
    }
  }

  // Nettoyer les statuts anciens
  private async cleanupOldStatuses(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('user_statuses')
        .delete()
        .lt('last_activity', oneDayAgo.toISOString());

      if (error) {
        console.error('❌ Erreur nettoyage statuts Supabase:', error);
      } else {
        console.log('🧹 Nettoyage des statuts anciens terminé');
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage statuts:', error);
    }
  }

  // Démarrer l'intervalle de nettoyage
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldStatuses();
    }, 60 * 60 * 1000); // Toutes les heures
  }

  // Arrêter le service
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const onlineStatusService = OnlineStatusService.getInstance();
export default onlineStatusService; 