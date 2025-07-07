'use client';

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

interface SubscriptionData {
  hasSubscription: boolean;
  subscription: {
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
  } | null;
  userSubscription: {
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
  } | null;
}

export default function SubscriptionLimits() {
  const { data: session } = useSession();
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchSubscriptionData();
      fetchUsageInfo();
    }
  }, [session]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscriptions/my-subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
        console.log('📊 Données d\'abonnement récupérées:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement:', error);
    }
  };

  const fetchUsageInfo = async () => {
    try {
      const response = await fetch('/api/subscriptions/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisation:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Illimité';
    return limit.toLocaleString();
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getUsageText = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-yellow-500';
    if (percentage >= 50) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'trial': return 'text-blue-400';
      case 'canceled': return 'text-red-400';
      case 'expired': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'trial': return 'Essai gratuit';
      case 'canceled': return 'Annulé';
      case 'expired': return 'Expiré';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
      {/* Affichage de l'abonnement actuel */}
      {subscriptionData?.hasSubscription && subscriptionData.subscription && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white capitalize">
              {subscriptionData.subscription.name}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscriptionData.userSubscription?.status || '')}`}>
              {getStatusText(subscriptionData.userSubscription?.status || '')}
            </span>
          </div>
          
          <div className="text-sm text-gray-300 mb-2">
            {subscriptionData.subscription.price > 0 ? (
              <span>{subscriptionData.subscription.price}€/{subscriptionData.subscription.interval}</span>
            ) : (
              <span>Gratuit</span>
            )}
          </div>

          {subscriptionData.userSubscription?.trialEnd && (
            <div className="text-xs text-blue-400 mb-2">
              ⏰ Essai gratuit jusqu'au {new Date(subscriptionData.userSubscription.trialEnd).toLocaleDateString('fr-FR')}
            </div>
          )}

          <div className="text-xs text-gray-400">
            Période : {new Date(subscriptionData.userSubscription?.currentPeriodStart || '').toLocaleDateString('fr-FR')} - {new Date(subscriptionData.userSubscription?.currentPeriodEnd || '').toLocaleDateString('fr-FR')}
          </div>
        </div>
      )}

      {/* Affichage des limites */}
      <h3 className="text-lg font-semibold text-white mb-4">
        {subscriptionData?.hasSubscription ? 'Limites d\'abonnement' : 'Limites gratuites'}
      </h3>
      
      {usageInfo && (
        <div className="space-y-4">
          {Object.entries(usageInfo.current).map(([key, value]) => {
            const limit = usageInfo.limits[key as keyof typeof usageInfo.limits];
            const remaining = usageInfo.remaining[key as keyof typeof usageInfo.remaining];
            const percentage = usageInfo.percentage[key as keyof typeof usageInfo.percentage];
            
            const label = key === 'uploads' ? 'Uploads' : 
                         key === 'comments' ? 'Commentaires' :
                         key === 'plays' ? 'Écoutes' : 'Playlists';

            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">{label}</span>
                  <span className={`font-semibold ${getUsageText(percentage)}`}>
                    {value} / {formatLimit(limit)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`${getUsageColor(percentage)} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                
                {remaining !== -1 && remaining < 5 && (
                  <div className="text-xs text-red-400">
                    ⚠️ Plus que {remaining} {label.toLowerCase()} restant{remaining > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-600">
        <a 
          href="/subscriptions" 
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
        >
          {subscriptionData?.hasSubscription ? 'Gérer mon abonnement' : 'Voir tous les plans'} →
        </a>
      </div>
    </div>
  );
} 