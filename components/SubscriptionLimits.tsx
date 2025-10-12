'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Crown, Zap, Star, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

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
  // stockage supprimé
}

interface SubscriptionData {
  hasSubscription: boolean;
  subscription: any;
  limits: {
    maxTracks: number;
    maxPlaylists: number;
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
      const response = await fetch('/api/subscriptions/my-subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
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

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 75) return 'from-yellow-500 to-orange-500';
    if (percentage >= 50) return 'from-blue-500 to-blue-600';
    return 'from-green-500 to-emerald-500';
  };

  const getUsageText = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-yellow-400';
    if (percentage >= 50) return 'text-blue-400';
    return 'text-green-400';
  };

  const getPlanIcon = () => {
    if (subscriptionData?.hasSubscription) {
      return <Crown className="w-5 h-5 text-purple-400" />;
    }
    return <Star className="w-5 h-5 text-gray-400" />;
  };

  const getPlanName = () => {
    if (subscriptionData?.hasSubscription) {
      return subscriptionData.subscription?.name || 'Premium';
    }
    return 'Gratuit';
  };

  const getPlanBadge = () => {
    if (subscriptionData?.hasSubscription) {
      return (
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-xs font-medium text-purple-300">
          Actif
        </div>
      );
    }
    return (
      <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/60">
        Gratuit
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
        <div className="relative p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/20 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-white/20 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl shadow-lg"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 pointer-events-none" />
      
      <div className="relative p-6">
        {/* Plan Header */}
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-[var(--border)]/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                {getPlanIcon()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white/90 capitalize">
                  Plan {getPlanName()}
                </h3>
                <div className="text-sm text-white/60">
                  {subscriptionData?.hasSubscription ? 'Abonnement actif' : 'Accès limité aux fonctionnalités de base'}
                </div>
              </div>
            </div>
            {getPlanBadge()}
          </div>

          {/* Fonctionnalités incluses */}
          {subscriptionData?.hasSubscription && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center text-white/70">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                Upload illimité
              </div>
              <div className="flex items-center text-white/70">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                Qualité HD
              </div>
              <div className="flex items-center text-white/70">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                Sans publicités
              </div>
              <div className="flex items-center text-white/70">
                <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                Support prioritaire
              </div>
            </div>
          )}
        </div>

        {/* Limites */}
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            {subscriptionData?.hasSubscription ? 'Limites d\'abonnement' : 'Limites gratuites'}
          </h3>
          
          {usageInfo && (
            <div className="space-y-4">
              {Object.entries(usageInfo).map(([key, data], index) => {
                const label = key === 'tracks' ? 'Pistes' : 
                             key === 'playlists' ? 'Playlists' : key;
                
                const formatValue = (value: number) => value.toString();

                return (
                  <motion.div 
                    key={key} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 font-medium">{label}</span>
                      <span className={`font-semibold ${getUsageText(data.percentage)}`}>
                        {formatValue(data.used)} / {formatValue(data.limit)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(data.percentage, 100)}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                        className={`h-3 rounded-full bg-gradient-to-r ${getUsageColor(data.percentage)} shadow-sm`}
                      />
                    </div>
                    
                    {data.percentage >= 90 && (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        Limite presque atteinte ({data.percentage.toFixed(0)}%)
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-[var(--border)]/30">
          <motion.a 
            href="/subscriptions"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors group"
            whileHover={{ x: 2 }}
          >
            {subscriptionData?.hasSubscription ? 'Gérer mon abonnement' : 'Voir tous les plans'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
} 