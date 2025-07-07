'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
// Icônes simples pour remplacer Heroicons
const CheckIcon = ({ className }: { className?: string }) => <span className={`text-green-400 mr-2 ${className || ''}`}>✓</span>;
const StarIcon = ({ className }: { className?: string }) => <span className={`text-yellow-400 ${className || ''}`}>★</span>;

interface Subscription {
  _id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  limits: {
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
  };
  features: string[];
}

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

export default function SubscriptionPlans() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
    if (session?.user?.id) {
      fetchUsageInfo();
    }
  }, [session]);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des abonnements:', error);
    } finally {
      setLoading(false);
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
    }
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Illimité';
    return limit.toLocaleString();
  };

  const getQualityLabel = (quality: string) => {
    const labels = {
      '128kbps': '128 kbps',
      '256kbps': '256 kbps',
      '320kbps': '320 kbps',
      'lossless': 'Lossless',
      'master': 'Master'
    };
    return labels[quality as keyof typeof labels] || quality;
  };

  const getSupportLabel = (support: string) => {
    const labels = {
      'community': 'Communauté',
      'email': 'Email',
      'priority': 'Prioritaire',
      'dedicated': 'Dédié 24/7'
    };
    return labels[support as keyof typeof labels] || support;
  };

  const handleSubscribe = async (planName: string) => {
    setSelectedPlan(planName);
    // TODO: Intégrer Stripe pour le paiement
    alert(`Fonctionnalité de paiement à implémenter pour ${planName}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choisissez votre plan XimaM
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Découvrez nos abonnements adaptés à tous les créateurs de musique
          </p>
        </div>

        {/* Usage Info */}
        {usageInfo && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Votre utilisation actuelle</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(usageInfo.current).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {value} / {formatLimit(usageInfo.limits[key as keyof typeof usageInfo.limits])}
                  </div>
                  <div className="text-sm text-gray-300 capitalize">
                    {key === 'uploads' ? 'Uploads' : 
                     key === 'comments' ? 'Commentaires' :
                     key === 'plays' ? 'Écoutes' : 'Playlists'}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(usageInfo.percentage[key as keyof typeof usageInfo.percentage], 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {subscriptions.map((plan) => (
            <div
              key={plan._id}
              className={`relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                plan.name === 'pro' 
                  ? 'border-purple-500 shadow-2xl shadow-purple-500/25' 
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              {/* Popular Badge */}
              {plan.name === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <StarIcon className="w-4 h-4" />
                    Populaire
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white capitalize mb-2">
                  {plan.name === 'free' ? 'Gratuit' :
                   plan.name === 'starter' ? 'Starter' :
                   plan.name === 'creator' ? 'Creator' :
                   plan.name === 'pro' ? 'Pro' : 'Enterprise'}
                </h3>
                <div className="text-4xl font-bold text-white mb-1">
                  {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                </div>
                <div className="text-gray-300 text-sm">
                  par {plan.interval === 'month' ? 'mois' : 'an'}
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Uploads</span>
                  <span className="text-white font-semibold">
                    {formatLimit(plan.limits.uploads)}/mois
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Commentaires</span>
                  <span className="text-white font-semibold">
                    {formatLimit(plan.limits.comments)}/mois
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Écoutes</span>
                  <span className="text-white font-semibold">
                    {formatLimit(plan.limits.plays)}/mois
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Playlists</span>
                  <span className="text-white font-semibold">
                    {formatLimit(plan.limits.playlists)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Qualité</span>
                  <span className="text-white font-semibold">
                    {getQualityLabel(plan.limits.quality)}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <CheckIcon className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
                {plan.features.length > 3 && (
                  <div className="text-xs text-gray-400 text-center">
                    +{plan.features.length - 3} autres fonctionnalités
                  </div>
                )}
              </div>

              {/* Subscribe Button */}
              <button
                onClick={() => handleSubscribe(plan.name)}
                disabled={selectedPlan === plan.name}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  plan.name === 'pro'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                    : plan.name === 'free'
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {selectedPlan === plan.name ? 'Chargement...' : 
                 plan.name === 'free' ? 'Plan actuel' : 'S\'abonner'}
              </button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-300 text-sm">
            Tous les abonnements incluent un essai gratuit de 7 jours. 
            Annulez à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
} 