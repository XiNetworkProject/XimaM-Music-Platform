import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UsageInfo {
  current: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
  limits: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
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

interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
    audioQuality: string;
    ads: boolean;
    analytics: boolean;
    collaborations: boolean;
    apiAccess: boolean;
    support: string;
  };
}

interface UserSubscription {
  id: string;
  status: 'active' | 'trial' | 'canceled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  usage: {
    uploads: number;
    comments: number;
    plays: number;
    playlists: number;
  };
  stripeSubscriptionId?: string;
}

interface SubscriptionData {
  hasSubscription: boolean;
  subscription: Subscription | null;
  userSubscription: UserSubscription | null;
}

interface CheckResult {
  allowed: boolean;
  reason?: string;
  usage?: UsageInfo;
}

export function useSubscription() {
  const { data: session } = useSession();
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscriptionData = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/my-subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
        console.log('📊 Données d\'abonnement récupérées:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageInfo = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/subscriptions/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisation:', error);
    }
  };

  const checkAction = async (action: 'uploads' | 'comments' | 'plays' | 'playlists'): Promise<CheckResult> => {
    if (!session?.user?.id) {
      return { allowed: false, reason: 'Non connecté' };
    }

    try {
      const response = await fetch('/api/subscriptions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.usage) {
          setUsageInfo(result.usage);
        }
        return result;
      } else {
        const error = await response.json();
        return { allowed: false, reason: error.error || 'Erreur de vérification' };
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      return { allowed: false, reason: 'Erreur de connexion' };
    }
  };

  const incrementUsage = async (action: 'uploads' | 'comments' | 'plays' | 'playlists') => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/subscriptions/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Mettre à jour l'utilisation locale
        await fetchUsageInfo();
      }
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptionData();
      fetchUsageInfo();
    }
  }, [session]);

  return {
    usageInfo,
    subscriptionData,
    loading,
    checkAction,
    incrementUsage,
    fetchUsageInfo,
    fetchSubscriptionData,
  };
} 