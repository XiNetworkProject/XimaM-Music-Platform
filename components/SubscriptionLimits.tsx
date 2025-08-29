'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UsageInfo {
  tracks: {
    used: number;
    limit: number;
    percentage: number;
  };
  playlists: {
    used: number;
    limit: number;
    percentage: number;
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

interface SubscriptionData {
  hasSubscription: boolean;
  subscription: any;
  limits: {
    maxTracks: number;
    maxPlaylists: number;
    maxStorageGB: number;
  };
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
      console.log('🔄 Récupération des données d\'abonnement...');
      const response = await fetch('/api/subscriptions/my-subscription');
      console.log('📡 Réponse API:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Données d\'abonnement récupérées:', data);
        setSubscriptionData(data);
      } else {
        const error = await response.json();
        console.error('❌ Erreur API:', error);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'abonnement:', error);
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
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-white capitalize">
                Plan Premium
              </h3>
              <div className="text-sm text-gray-300">
                <span>Abonnement actif</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/20">
              Actif
            </span>
          </div>

          {/* Fonctionnalités incluses */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-300 mb-2">Fonctionnalités incluses :</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="flex items-center text-gray-400">
                <span className="text-green-400 mr-1">✓</span>
                Upload illimité
              </div>
              <div className="flex items-center text-gray-400">
                <span className="text-green-400 mr-1">✓</span>
                Qualité HD
              </div>
              <div className="flex items-center text-gray-400">
                <span className="text-green-400 mr-1">✓</span>
                Sans publicités
              </div>
              <div className="flex items-center text-gray-400">
                <span className="text-green-400 mr-1">✓</span>
                Support prioritaire
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affichage si pas d'abonnement */}
      {!subscriptionData?.hasSubscription && (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg border border-gray-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">Plan Gratuit</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-400">
              Actif
            </span>
          </div>
          <div className="text-sm text-gray-300 mb-2">
            Accès limité aux fonctionnalités de base
          </div>
          <div className="text-xs text-gray-400">
            Passez à un plan payant pour débloquer toutes les fonctionnalités
          </div>
        </div>
      )}

      {/* Affichage des limites */}
      <h3 className="text-lg font-semibold text-white mb-4">
        {subscriptionData?.hasSubscription ? 'Limites d\'abonnement' : 'Limites gratuites'}
      </h3>
      
      {usageInfo && (
        <div className="space-y-4">
          {Object.entries(usageInfo).map(([key, data]) => {
            const label = key === 'tracks' ? 'Pistes' : 
                         key === 'playlists' ? 'Playlists' :
                         key === 'storage' ? 'Stockage (GB)' : key;
            
            const formatValue = (value: number) => {
              if (key === 'storage') {
                return value.toFixed(2);
              }
              return value.toString();
            };

            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">{label}</span>
                  <span className={`font-semibold ${getUsageText(data.percentage)}`}>
                    {formatValue(data.used)} / {formatValue(data.limit)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`${getUsageColor(data.percentage)} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(data.percentage, 100)}%` }}
                  ></div>
                </div>
                
                {data.percentage >= 90 && (
                  <div className="text-xs text-red-400">
                    ⚠️ Limite presque atteinte ({data.percentage.toFixed(0)}%)
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