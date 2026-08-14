import { db } from './database';

export interface SubscriptionLimits {
  uploads: number;
  comments: number;
  plays: number;
  playlists: number;
  quality: string;
  ads: boolean;
  analytics: string;
  collaborations: boolean;
  apiAccess: boolean;
  support: string;
}

export interface UsageInfo {
  current: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
  limits: SubscriptionLimits;
  remaining: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
  percentage: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
}

class SubscriptionService {
  // Récupérer l'abonnement actuel d'un utilisateur
  async getUserSubscription(userId: string): Promise<any | null> {
    try {
      const { data: userSub, error } = await db
        .from('user_subscriptions')
        .select(`
          *,
          subscriptions (*)
        `)
        .eq('user_id', userId)
        .in('status', ['active', 'trial'])
        .gte('current_period_end', new Date().toISOString())
        .single();
      
      if (error) {
        console.error(`❌ Erreur lors de la récupération de l'abonnement pour ${userId}:`, error);
        return null;
      }
      
      return userSub;
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération de l'abonnement pour ${userId}:`, error);
      return null;
    }
  }

  // Récupérer les limites d'un abonnement
  async getSubscriptionLimits(userId: string): Promise<SubscriptionLimits | null> {
    try {
      console.log(`📋 getSubscriptionLimits appelé pour ${userId}`);
      
      const userSub = await this.getUserSubscription(userId);
      console.log(`👤 UserSubscription trouvé:`, userSub ? 'Oui' : 'Non');
      
      if (!userSub) {
        // Retourner les limites gratuites par défaut
        const defaultLimits = {
          uploads: 3,
          comments: 10,
          plays: 50,
          playlists: 2,
          quality: '128kbps',
          ads: true,
          analytics: 'none',
          collaborations: false,
          apiAccess: false,
          support: 'community'
        };
        console.log(`📊 Limites gratuites retournées pour ${userId}:`, defaultLimits);
        return defaultLimits;
      }

      const subscription = userSub.subscriptions;
      console.log(`📊 Abonnement trouvé pour ${userId}:`, {
        subscriptionId: subscription.id,
        limits: subscription.limits
      });
      
      if (!subscription.limits) {
        console.error(`❌ Limites manquantes pour l'abonnement de ${userId}`);
        return null;
      }
      
      return subscription.limits;
    } catch (error) {
      console.error(`❌ Erreur dans getSubscriptionLimits pour ${userId}:`, error);
      return null;
    }
  }

  // Vérifier si une action est autorisée
  async canPerformAction(
    userId: string, 
    action: 'uploads' | 'comments' | 'plays' | 'playlists'
  ): Promise<{ allowed: boolean; reason?: string; usage?: UsageInfo }> {
    try {
      console.log(`🔍 canPerformAction appelé pour ${userId} - action: ${action}`);
      
      const userSub = await this.getUserSubscription(userId);
      console.log(`👤 UserSubscription trouvé:`, userSub ? 'Oui' : 'Non');
      
      if (!userSub) {
        // Utilisateur sans abonnement actif
        console.log(`📋 Récupération des limites gratuites pour ${userId}`);
        const limits = await this.getSubscriptionLimits(userId);
        console.log(`📊 Limites récupérées:`, limits);
        
        if (!limits) {
          console.error(`❌ Impossible de récupérer les limites pour ${userId}`);
          return {
            allowed: false,
            reason: 'Impossible de récupérer les limites d\'abonnement.'
          };
        }
        
        const usage = await this.getUsageInfo(userId);
        console.log(`📈 Usage actuel:`, usage.current[action], `Limite:`, limits[action]);
        
        if (usage.current[action] >= limits[action]) {
          console.log(`🚫 Limite ${action} atteinte pour ${userId}`);
          return {
            allowed: false,
            reason: `Limite ${action} atteinte. Passez à un abonnement supérieur.`,
            usage
          };
        }
        
        console.log(`✅ Action ${action} autorisée pour ${userId} (gratuit)`);
        return { allowed: true, usage };
      }

      const subscription = userSub.subscriptions;
      const limits = subscription.limits;
      const usage = userSub.usage;
      
      console.log(`📊 Abonnement trouvé pour ${userId}:`, {
        subscriptionId: subscription.id,
        limits,
        currentUsage: usage
      });

      // Vérifier si la limite est atteinte (-1 = illimité)
      if (limits[action] !== -1 && usage[action] >= limits[action]) {
        console.log(`🚫 Limite ${action} atteinte pour ${userId} (abonné)`);
        return {
          allowed: false,
          reason: `Limite ${action} de votre abonnement atteinte.`,
          usage: await this.getUsageInfo(userId)
        };
      }

      console.log(`✅ Action ${action} autorisée pour ${userId} (abonné)`);
      return { allowed: true, usage: await this.getUsageInfo(userId) };
    } catch (error) {
      console.error(`❌ Erreur dans canPerformAction pour ${userId}:`, error);
      return {
        allowed: false,
        reason: 'Erreur lors de la vérification des limites d\'abonnement.'
      };
    }
  }

  // Incrémenter l'utilisation
  async incrementUsage(
    userId: string, 
    action: 'uploads' | 'comments' | 'plays' | 'playlists'
  ): Promise<void> {
    try {
      const { error } = await db
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          usage: { [action]: 1 }
        }, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error(`❌ Erreur lors de l'incrémentation de l'utilisation pour ${userId}:`, error);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'incrémentation de l'utilisation pour ${userId}:`, error);
    }
  }

  // Récupérer les informations d'utilisation
  async getUsageInfo(userId: string): Promise<UsageInfo> {
    try {
      console.log(`📊 getUsageInfo appelé pour ${userId}`);
      
      const userSub = await this.getUserSubscription(userId);
      const limits = await this.getSubscriptionLimits(userId);
      
      console.log(`👤 UserSubscription trouvé:`, userSub ? 'Oui' : 'Non');
      console.log(`📋 Limites récupérées:`, limits ? 'Oui' : 'Non');
      
      if (!limits) {
        console.error(`❌ Impossible de récupérer les limites pour ${userId}`);
        throw new Error('Impossible de récupérer les limites d\'abonnement');
      }
      
      if (!userSub) {
        console.log(`📊 Utilisateur ${userId} sans abonnement actif, retour des valeurs par défaut`);
        return {
          current: { uploads: 0, comments: 0, plays: 0, playlists: 0 },
          limits,
          remaining: {
            uploads: limits.uploads === -1 ? -1 : limits.uploads,
            comments: limits.comments === -1 ? -1 : limits.comments,
            plays: limits.plays === -1 ? -1 : limits.plays,
            playlists: limits.playlists === -1 ? -1 : limits.playlists
          },
          percentage: {
            uploads: 0,
            comments: 0,
            plays: 0,
            playlists: 0
          }
        };
      }

      const usage = userSub.usage || { uploads: 0, comments: 0, plays: 0, playlists: 0 };
      
      console.log(`📈 Usage actuel pour ${userId}:`, usage);
      
      const remaining = {
        uploads: limits.uploads === -1 ? -1 : Math.max(0, limits.uploads - usage.uploads),
        comments: limits.comments === -1 ? -1 : Math.max(0, limits.comments - usage.comments),
        plays: limits.plays === -1 ? -1 : Math.max(0, limits.plays - usage.plays),
        playlists: limits.playlists === -1 ? -1 : Math.max(0, limits.playlists - usage.playlists)
      };

      const percentage = {
        uploads: limits.uploads === -1 ? 0 : Math.round((usage.uploads / limits.uploads) * 100),
        comments: limits.comments === -1 ? 0 : Math.round((usage.comments / limits.comments) * 100),
        plays: limits.plays === -1 ? 0 : Math.round((usage.plays / limits.plays) * 100),
        playlists: limits.playlists === -1 ? 0 : Math.round((usage.playlists / limits.playlists) * 100)
      };

      const result = {
        current: usage,
        limits,
        remaining,
        percentage
      };
      
      console.log(`✅ getUsageInfo terminé pour ${userId}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Erreur dans getUsageInfo pour ${userId}:`, error);
      
      // En cas d'erreur, retourner des valeurs par défaut
      const defaultLimits = {
        uploads: 3,
        comments: 10,
        plays: 50,
        playlists: 2,
        quality: '128kbps',
        ads: true,
        analytics: 'none',
        collaborations: false,
        apiAccess: false,
        support: 'community'
      };
      
      return {
        current: { uploads: 0, comments: 0, plays: 0, playlists: 0 },
        limits: defaultLimits,
        remaining: { uploads: 3, comments: 10, plays: 50, playlists: 2 },
        percentage: { uploads: 0, comments: 0, plays: 0, playlists: 0 }
      };
    }
  }

  // Réinitialiser l'utilisation mensuelle
  async resetMonthlyUsage(): Promise<void> {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      
      const { error } = await db
        .from('user_subscriptions')
        .update({
          usage: { uploads: 0, comments: 0, plays: 0, playlists: 0 },
          current_period_start: now.toISOString(),
          current_period_end: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
        })
        .lt('current_period_end', now.toISOString())
        .in('status', ['active', 'trial']);
      
      if (error) {
        console.error('❌ Erreur lors de la réinitialisation de l\'utilisation mensuelle:', error);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation de l\'utilisation mensuelle:', error);
    }
  }

  // Vérifier la qualité audio autorisée
  async getAudioQuality(userId: string): Promise<string> {
    try {
      const limits = await this.getSubscriptionLimits(userId);
      return limits?.quality || '128kbps';
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération de la qualité audio pour ${userId}:`, error);
      return '128kbps';
    }
  }

  // Vérifier si les publicités sont activées
  async hasAds(userId: string): Promise<boolean> {
    try {
      const limits = await this.getSubscriptionLimits(userId);
      return limits?.ads ?? true;
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification des publicités pour ${userId}:`, error);
      return true;
    }
  }

  // Vérifier le niveau d'analytics
  async getAnalyticsLevel(userId: string): Promise<string> {
    try {
      const limits = await this.getSubscriptionLimits(userId);
      return limits?.analytics || 'none';
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du niveau d'analytics pour ${userId}:`, error);
      return 'none';
    }
  }

  // Vérifier si les collaborations sont autorisées
  async canCollaborate(userId: string): Promise<boolean> {
    try {
      const limits = await this.getSubscriptionLimits(userId);
      return limits?.collaborations ?? false;
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification des collaborations pour ${userId}:`, error);
      return false;
    }
  }

  // Vérifier l'accès API
  async hasApiAccess(userId: string): Promise<boolean> {
    try {
      const limits = await this.getSubscriptionLimits(userId);
      return limits?.apiAccess ?? false;
    } catch (error) {
      console.error(`❌ Erreur lors de la vérification de l'accès API pour ${userId}:`, error);
      return false;
    }
  }

  // Obtenir le niveau de support
  async getSupportLevel(userId: string): Promise<string> {
    try {
      const limits = await this.getSubscriptionLimits(userId);
      return limits?.support || 'community';
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du niveau de support pour ${userId}:`, error);
      return 'community';
    }
  }
}

export const subscriptionService = new SubscriptionService();
export default subscriptionService;