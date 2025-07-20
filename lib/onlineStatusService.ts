import dbConnect from './db';
import UserStatus, { IUserStatus } from '@/models/UserStatus';
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
      await dbConnect();
      
      const statusUpdate = {
        ...updates,
        lastActivity: new Date(),
        lastSeen: updates.isOnline ? new Date() : undefined,
      };

      await UserStatus.findOneAndUpdate(
        { userId },
        statusUpdate,
        { upsert: true, new: true }
      );

      return true;
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      return false;
    }
  }

  // Obtenir le statut d'un utilisateur
  async getUserStatus(userId: string): Promise<UserStatusData> {
    try {
      await dbConnect();
      
      const status = await UserStatus.findOne({ userId }).lean() as IUserStatus | null;
      
      if (!status) {
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
      const isActuallyOnline = status.isOnline && status.lastActivity > fiveMinutesAgo;

      return {
        userId: status.userId.toString(),
        isOnline: isActuallyOnline,
        lastSeen: status.lastSeen || status.lastActivity,
        isTyping: status.isTyping || false,
        lastActivity: status.lastActivity,
        deviceInfo: status.deviceInfo,
      };
    } catch (error) {
      console.error('Erreur récupération statut:', error);
      return {
        userId,
        isOnline: false,
        lastSeen: new Date(),
        isTyping: false,
        lastActivity: new Date(),
      };
    }
  }

  // Obtenir les statuts de plusieurs utilisateurs
  async getMultipleUserStatuses(userIds: string[]): Promise<UserStatusData[]> {
    try {
      await dbConnect();
      
      const statuses = await UserStatus.find({ 
        userId: { $in: userIds } 
      }).lean() as unknown as IUserStatus[];

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      return userIds.map(userId => {
        const status = statuses.find(s => s.userId.toString() === userId);
        if (!status) {
          return {
            userId,
            isOnline: false,
            lastSeen: new Date(),
            isTyping: false,
            lastActivity: new Date(),
          };
        }

        const isActuallyOnline = status.isOnline && status.lastActivity > fiveMinutesAgo;
        
        return {
          userId: status.userId.toString(),
          isOnline: isActuallyOnline,
          lastSeen: status.lastSeen || status.lastActivity,
          isTyping: status.isTyping || false,
          lastActivity: status.lastActivity,
          deviceInfo: status.deviceInfo,
        };
      });
    } catch (error) {
      console.error('Erreur récupération statuts multiples:', error);
      return userIds.map(userId => ({
        userId,
        isOnline: false,
        lastSeen: new Date(),
        isTyping: false,
        lastActivity: new Date(),
      }));
    }
  }

  // Marquer un utilisateur comme en ligne
  async setUserOnline(userId: string, deviceInfo?: any): Promise<boolean> {
    return this.updateUserStatus(userId, {
      isOnline: true,
      isTyping: false,
      deviceInfo,
    });
  }

  // Marquer un utilisateur comme hors ligne
  async setUserOffline(userId: string): Promise<boolean> {
    return this.updateUserStatus(userId, {
      isOnline: false,
      isTyping: false,
      typingInConversation: undefined,
    });
  }

  // Mettre à jour le statut de frappe
  async setTypingStatus(
    userId: string, 
    isTyping: boolean, 
    conversationId?: string
  ): Promise<boolean> {
    return this.updateUserStatus(userId, {
      isTyping,
      typingInConversation: isTyping ? conversationId : undefined,
    });
  }

  // Nettoyer les statuts expirés
  async cleanupExpiredStatuses(): Promise<void> {
    try {
      await dbConnect();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await UserStatus.updateMany(
        { lastActivity: { $lt: fiveMinutesAgo }, isOnline: true },
        { isOnline: false }
      );
      console.log('🧹 Statuts expirés nettoyés');
    } catch (error) {
      console.error('Erreur nettoyage statuts:', error);
    }
  }

  // Démarrer l'intervalle de nettoyage
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Nettoyer toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStatuses();
    }, 5 * 60 * 1000);
  }

  // Arrêter le service
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Obtenir les utilisateurs en ligne
  async getOnlineUsers(): Promise<string[]> {
    try {
      await dbConnect();
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const onlineStatuses = await UserStatus.find({
        isOnline: true,
        lastActivity: { $gt: fiveMinutesAgo }
      }).select('userId').lean() as unknown as IUserStatus[];

      return onlineStatuses.map(status => status.userId.toString());
    } catch (error) {
      console.error('Erreur récupération utilisateurs en ligne:', error);
      return [];
    }
  }

  // Obtenir les statistiques de présence
  async getPresenceStats() {
    try {
      await dbConnect();
      
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const [onlineCount, totalUsers] = await Promise.all([
        UserStatus.countDocuments({
          isOnline: true,
          lastActivity: { $gt: fiveMinutesAgo }
        }),
        UserStatus.countDocuments()
      ]);

      return {
        onlineCount,
        totalUsers,
        onlinePercentage: totalUsers > 0 ? (onlineCount / totalUsers) * 100 : 0
      };
    } catch (error) {
      console.error('Erreur statistiques présence:', error);
      return {
        onlineCount: 0,
        totalUsers: 0,
        onlinePercentage: 0
      };
    }
  }
}

export default OnlineStatusService.getInstance(); 