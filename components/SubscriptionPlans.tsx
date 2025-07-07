'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Crown, Star, Zap, Music, Headphones, MessageCircle, 
  Upload, Play, Check, X, ChevronRight, Sparkles,
  Shield, Users, Globe, Radio, Award, Target, BadgeCheck,
  BarChart3, Code, Mail, Volume2, Eye, EyeOff, Users2
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

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
    analytics: boolean;
    collaborations: boolean;
    apiAccess: boolean;
    support: string;
  };
  features: string[];
}

interface UserSubscription {
  hasSubscription: boolean;
  subscription: Subscription | null;
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
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
    if (session?.user?.id) {
      fetchUserSubscription();
      fetchUsageInfo();
    }
  }, [session]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscriptions');
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const validSubscriptions = data.filter(sub => sub && sub.name && sub.limits);
          console.log('Abonnements valides:', validSubscriptions.length, 'sur', data.length);
          setSubscriptions(validSubscriptions);
        } else {
          console.error('Données invalides reçues:', data);
          setError('Format de données invalide');
        }
      } else {
        setError('Erreur lors du chargement des abonnements');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/my-subscription');
      if (response.ok) {
        const data = await response.json();
        setUserSubscription(data);
        console.log('📊 Abonnement utilisateur récupéré:', data);
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

  const getPlanIcon = (planName: string) => {
    if (!planName) return <Music size={24} />;
    
    switch (planName) {
      case 'free': return <Music size={24} />;
      case 'starter': return <Zap size={24} />;
      case 'creator': return <Star size={24} />;
      case 'pro': return <Crown size={24} />;
      case 'enterprise': return <Award size={24} />;
      default: return <Music size={24} />;
    }
  };

  const getPlanColor = (planName: string) => {
    if (!planName) return 'from-gray-500 to-gray-600';
    
    switch (planName) {
      case 'free': return 'from-gray-500 to-gray-600';
      case 'starter': return 'from-blue-500 to-cyan-500';
      case 'creator': return 'from-purple-500 to-pink-500';
      case 'pro': return 'from-yellow-500 to-orange-500';
      case 'enterprise': return 'from-emerald-500 to-teal-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const isCurrentPlan = (planName: string) => {
    return userSubscription?.hasSubscription && userSubscription.subscription?.name === planName;
  };

  const getCurrentPlanStatus = () => {
    if (!userSubscription?.hasSubscription) return null;
    
    const status = userSubscription.userSubscription?.status;
    const trialEnd = userSubscription.userSubscription?.trialEnd;
    
    if (status === 'trial' && trialEnd) {
      return {
        type: 'trial',
        text: 'Essai gratuit',
        color: 'text-blue-400',
        endDate: new Date(trialEnd).toLocaleDateString('fr-FR')
      };
    } else if (status === 'active') {
      return {
        type: 'active',
        text: 'Plan actuel',
        color: 'text-green-400',
        endDate: new Date(userSubscription.userSubscription?.currentPeriodEnd || '').toLocaleDateString('fr-FR')
      };
    }
    
    return null;
  };

  const handleSubscribe = async (planName: string) => {
    try {
      setSelectedPlan(planName);
      setError(null);

      const subscription = subscriptions.find(sub => sub.name === planName);
      if (!subscription) {
        setError('Abonnement non trouvé');
        return;
      }

      const response = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription._id,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        
        if (url) {
          window.location.href = url;
        } else {
          setError('Erreur lors de la création de la session de paiement');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la création de la session de paiement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'abonnement:', error);
      setError('Erreur de connexion');
    } finally {
      setSelectedPlan(null);
    }
  };

  const renderFeatureComparison = (feature: string, plan: Subscription) => {
    const hasFeature = plan.features.includes(feature);
    const isCurrentPlanActive = isCurrentPlan(plan.name);
    
    return (
      <div key={feature} className="flex items-center justify-between text-sm py-1">
        <span className="text-gray-300">{feature}</span>
        <div className="flex items-center space-x-2">
          {hasFeature ? (
            <Check size={16} className="text-green-400" />
          ) : (
            <X size={16} className="text-red-400" />
          )}
          {isCurrentPlanActive && (
            <BadgeCheck size={16} className="text-blue-400" />
          )}
        </div>
      </div>
    );
  };

  const allFeatures = [
    'Uploads illimités',
    'Commentaires illimités',
    'Écoutes illimitées',
    'Playlists illimitées',
    'Qualité audio Master',
    'Sans publicités',
    'Analytics avancées',
    'Collaborations',
    'Accès API',
    'Support prioritaire',
    'Téléchargements',
    'Partage privé',
    'Statistiques détaillées',
    'Intégrations tierces',
    'Backup automatique'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500">
                <Crown size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Plans d'abonnement XimaM
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choisissez le plan qui correspond à vos besoins de création musicale
            </p>
          </motion.div>

          {/* Current Plan Status */}
          {userSubscription?.hasSubscription && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-effect rounded-2xl p-6 mb-8 border border-blue-500/30"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                    <BadgeCheck size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white capitalize">
                      {userSubscription.subscription?.name}
                    </h2>
                    <p className="text-gray-300">
                      Votre plan actuel
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getCurrentPlanStatus()?.color}`}>
                    {getCurrentPlanStatus()?.text}
                  </div>
                  {getCurrentPlanStatus()?.endDate && (
                    <div className="text-xs text-gray-400">
                      Jusqu'au {getCurrentPlanStatus()?.endDate}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-semibold">
                    {userSubscription.userSubscription?.usage.uploads || 0}
                  </div>
                  <div className="text-gray-400">Uploads utilisés</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">
                    {userSubscription.userSubscription?.usage.comments || 0}
                  </div>
                  <div className="text-gray-400">Commentaires</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">
                    {userSubscription.userSubscription?.usage.plays || 0}
                  </div>
                  <div className="text-gray-400">Écoutes</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">
                    {userSubscription.userSubscription?.usage.playlists || 0}
                  </div>
                  <div className="text-gray-400">Playlists</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-effect rounded-2xl p-6 mb-8 border border-red-500/50"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-xl bg-red-500">
                  <X size={20} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-red-400">Erreur</h2>
              </div>
              <p className="text-red-300">{error}</p>
            </motion.div>
          )}

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-effect rounded-2xl p-6 mb-8 overflow-x-auto"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-blue-500">
                <BarChart3 size={20} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Comparaison complète des fonctionnalités</h2>
            </div>
            
            <div className="min-w-full">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Fonctionnalité</th>
                    {subscriptions.map((plan) => (
                      <th key={plan._id} className="text-center py-3 px-4 text-gray-300 font-medium">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${getPlanColor(plan.name)} flex items-center justify-center mb-2`}>
                            {getPlanIcon(plan.name)}
                          </div>
                          <span className="text-sm capitalize">
                            {plan.name === 'free' ? 'Gratuit' : plan.name}
                          </span>
                          {isCurrentPlan(plan.name) && (
                            <div className="text-xs text-blue-400 mt-1">Actuel</div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Limites de base */}
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300 font-medium">Uploads par mois</td>
                    {subscriptions.map((plan) => (
                      <td key={plan._id} className="text-center py-3 px-4">
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.uploads)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300 font-medium">Commentaires par mois</td>
                    {subscriptions.map((plan) => (
                      <td key={plan._id} className="text-center py-3 px-4">
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.comments)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300 font-medium">Écoutes par mois</td>
                    {subscriptions.map((plan) => (
                      <td key={plan._id} className="text-center py-3 px-4">
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.plays)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300 font-medium">Playlists</td>
                    {subscriptions.map((plan) => (
                      <td key={plan._id} className="text-center py-3 px-4">
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.playlists)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300 font-medium">Qualité audio</td>
                    {subscriptions.map((plan) => (
                      <td key={plan._id} className="text-center py-3 px-4">
                        <span className="text-white font-semibold">
                          {getQualityLabel(plan.limits.quality)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  
                  {/* Fonctionnalités avancées */}
                  {allFeatures.map((feature) => (
                    <tr key={feature} className="border-b border-gray-800">
                      <td className="py-3 px-4 text-gray-300">{feature}</td>
                      {subscriptions.map((plan) => (
                        <td key={plan._id} className="text-center py-3 px-4">
                          <div className="flex items-center justify-center space-x-1">
                            {plan.features.includes(feature) ? (
                              <Check size={16} className="text-green-400" />
                            ) : (
                              <X size={16} className="text-red-400" />
                            )}
                            {isCurrentPlan(plan.name) && plan.features.includes(feature) && (
                              <BadgeCheck size={14} className="text-blue-400" />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Support */}
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4 text-gray-300 font-medium">Support</td>
                    {subscriptions.map((plan) => (
                      <td key={plan._id} className="text-center py-3 px-4">
                        <span className="text-white font-semibold">
                          {plan.limits.support}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Subscription Plans Cards */}
          {subscriptions.length === 0 && !loading && !error ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass-effect rounded-2xl p-8 text-center"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 rounded-2xl bg-gray-500">
                  <Music size={32} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Aucun abonnement disponible</h2>
              <p className="text-gray-300 mb-6">
                Les plans d'abonnement ne sont pas encore configurés.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {subscriptions.map((plan, index) => {
                if (!plan || !plan.name) {
                  console.warn('Plan invalide détecté:', plan);
                  return null;
                }
                
                const isCurrent = isCurrentPlan(plan.name);
                const currentStatus = getCurrentPlanStatus();
                
                return (
                  <motion.div
                    key={plan._id || index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`relative glass-effect rounded-2xl p-6 border-2 transition-all duration-300 ${
                      isCurrent 
                        ? 'border-blue-500 shadow-2xl shadow-blue-500/25' 
                        : plan.name === 'pro' 
                        ? 'border-yellow-500 shadow-2xl shadow-yellow-500/25' 
                        : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                          <BadgeCheck size={16} />
                          {currentStatus?.text || 'Actuel'}
                        </div>
                      </div>
                    )}

                    {/* Popular Badge */}
                    {plan.name === 'pro' && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                          <Star size={16} />
                          Populaire
                        </div>
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${getPlanColor(plan.name)} flex items-center justify-center`}>
                        {getPlanIcon(plan.name)}
                      </div>
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

                    {/* Key Features */}
                    <div className="space-y-2 mb-6">
                      {plan.features.slice(0, 3).map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center text-sm">
                          <Check size={16} className="text-green-400 mr-2 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <div className="text-xs text-gray-400 text-center pt-2">
                          +{plan.features.length - 3} autres fonctionnalités
                        </div>
                      )}
                    </div>

                    {/* Subscribe Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubscribe(plan.name)}
                      disabled={selectedPlan === plan.name || isCurrent}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                        isCurrent
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white cursor-default'
                          : plan.name === 'pro'
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                          : plan.name === 'free'
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : `bg-gradient-to-r ${getPlanColor(plan.name)} text-white hover:opacity-90`
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {selectedPlan === plan.name ? 'Chargement...' : 
                       isCurrent ? 'Plan actuel' : 
                       plan.name === 'free' ? 'Plan actuel' : 'S\'abonner'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 text-center"
          >
            <div className="glass-effect rounded-2xl p-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield size={20} className="text-green-400" />
                <span className="text-green-400 font-semibold">Garantie satisfait ou remboursé</span>
              </div>
              <p className="text-gray-300 text-sm">
                Tous les abonnements incluent un essai gratuit de 7 jours. 
                Annulez à tout moment sans engagement.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
} 