'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Crown, Star, Zap, Music, Headphones, MessageCircle, 
  Upload, Play, Check, X, ChevronRight, Sparkles,
  Shield, Users, Globe, Radio, Award, Target, CheckCircle,
  XCircle, Minus, TrendingUp, BarChart3, Code, MessageSquare
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
    audioQuality: string;
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
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'comparison'>('cards');

  useEffect(() => {
    fetchSubscriptions();
    fetchCurrentSubscription();
    if (session?.user?.id) {
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

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/my-subscription');
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data);
        console.log('📊 Abonnement actuel récupéré:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'abonnement actuel:', error);
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
    return currentSubscription?.hasSubscription && 
           currentSubscription.subscription?.name === planName;
  };

  const getCurrentPlanStatus = () => {
    if (!currentSubscription?.hasSubscription) return 'free';
    return currentSubscription.userSubscription?.status || 'active';
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

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('upload')) return <Upload size={16} />;
    if (feature.includes('comment')) return <MessageCircle size={16} />;
    if (feature.includes('play')) return <Play size={16} />;
    if (feature.includes('playlist')) return <Music size={16} />;
    if (feature.includes('analytics')) return <BarChart3 size={16} />;
    if (feature.includes('api')) return <Code size={16} />;
    if (feature.includes('support')) return <MessageSquare size={16} />;
    if (feature.includes('collaboration')) return <Users size={16} />;
    return <Check size={16} />;
  };

  const renderFeatureComparison = () => {
    const features = [
      { name: 'Uploads/mois', key: 'uploads' },
      { name: 'Commentaires/mois', key: 'comments' },
      { name: 'Écoutes/mois', key: 'plays' },
      { name: 'Playlists', key: 'playlists' },
      { name: 'Qualité audio', key: 'audioQuality' },
      { name: 'Sans publicités', key: 'ads' },
      { name: 'Analytics avancés', key: 'analytics' },
      { name: 'Collaborations', key: 'collaborations' },
      { name: 'Accès API', key: 'apiAccess' },
      { name: 'Support', key: 'support' }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-300 font-medium">Fonctionnalité</th>
              {subscriptions.map(plan => (
                <th key={plan._id} className="text-center py-3 px-4 text-white font-semibold">
                  {plan.name === 'free' ? 'Gratuit' : 
                   plan.name === 'starter' ? 'Starter' :
                   plan.name === 'creator' ? 'Creator' :
                   plan.name === 'pro' ? 'Pro' : 'Enterprise'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr key={feature.key} className={`border-b border-gray-800 ${index % 2 === 0 ? 'bg-white/5' : ''}`}>
                <td className="py-3 px-4 text-gray-300 font-medium">
                  {feature.name}
                </td>
                {subscriptions.map(plan => {
                  let value = '';
                  let icon = <Minus size={16} className="text-gray-500" />;
                  
                  switch (feature.key) {
                    case 'uploads':
                      value = formatLimit(plan.limits.uploads);
                      break;
                    case 'comments':
                      value = formatLimit(plan.limits.comments);
                      break;
                    case 'plays':
                      value = formatLimit(plan.limits.plays);
                      break;
                    case 'playlists':
                      value = formatLimit(plan.limits.playlists);
                      break;
                    case 'audioQuality':
                      value = getQualityLabel(plan.limits.audioQuality);
                      break;
                    case 'ads':
                      icon = plan.limits.ads ? 
                        <XCircle size={16} className="text-red-400" /> : 
                        <CheckCircle size={16} className="text-green-400" />;
                      value = plan.limits.ads ? 'Avec pubs' : 'Sans pubs';
                      break;
                    case 'analytics':
                      icon = plan.limits.analytics ? 
                        <CheckCircle size={16} className="text-green-400" /> : 
                        <XCircle size={16} className="text-red-400" />;
                      value = plan.limits.analytics ? 'Avancés' : 'Basiques';
                      break;
                    case 'collaborations':
                      icon = plan.limits.collaborations ? 
                        <CheckCircle size={16} className="text-green-400" /> : 
                        <XCircle size={16} className="text-red-400" />;
                      value = plan.limits.collaborations ? 'Oui' : 'Non';
                      break;
                    case 'apiAccess':
                      icon = plan.limits.apiAccess ? 
                        <CheckCircle size={16} className="text-green-400" /> : 
                        <XCircle size={16} className="text-red-400" />;
                      value = plan.limits.apiAccess ? 'Oui' : 'Non';
                      break;
                    case 'support':
                      value = plan.limits.support;
                      break;
                  }
                  
                  return (
                    <td key={plan._id} className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {icon}
                        <span className="text-white">{value}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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

          {/* Usage Info */}
          {usageInfo && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-effect rounded-2xl p-6 mb-8"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                  <Target size={20} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Votre utilisation actuelle</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(usageInfo.current).map(([key, value], index) => {
                  const limit = usageInfo.limits[key as keyof typeof usageInfo.limits];
                  const percentage = usageInfo.percentage[key as keyof typeof usageInfo.percentage];
                  const remaining = usageInfo.remaining[key as keyof typeof usageInfo.remaining];
                  
                  const label = key === 'uploads' ? 'Uploads' : 
                               key === 'comments' ? 'Commentaires' :
                               key === 'plays' ? 'Écoutes' : 'Playlists';
                  
                  const icon = key === 'uploads' ? <Upload size={16} /> :
                              key === 'comments' ? <MessageCircle size={16} /> :
                              key === 'plays' ? <Headphones size={16} /> : <Music size={16} />;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      className="text-center"
                    >
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="p-2 rounded-lg bg-white/10">
                          {icon}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {value} / {formatLimit(limit)}
                      </div>
                      <div className="text-sm text-gray-300 mb-3">
                        {label}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            percentage >= 90 ? 'bg-red-500' :
                            percentage >= 75 ? 'bg-yellow-500' :
                            percentage >= 50 ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      {remaining !== -1 && remaining < 5 && (
                        <div className="text-xs text-red-400 mt-2">
                          ⚠️ Plus que {remaining} restant{remaining > 1 ? 's' : ''}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Current Plan Status */}
          {currentSubscription && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass-effect rounded-2xl p-6 mb-8"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Votre plan actuel</h2>
              </div>
              
              {currentSubscription.hasSubscription && currentSubscription.subscription ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-white capitalize">
                      {currentSubscription.subscription.name === 'free' ? 'Gratuit' :
                       currentSubscription.subscription.name === 'starter' ? 'Starter' :
                       currentSubscription.subscription.name === 'creator' ? 'Creator' :
                       currentSubscription.subscription.name === 'pro' ? 'Pro' : 'Enterprise'}
                    </div>
                    <div className="text-sm text-gray-300">
                      {currentSubscription.subscription.price > 0 ? 
                        `${currentSubscription.subscription.price}€/${currentSubscription.subscription.interval}` : 
                        'Gratuit'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Statut: {currentSubscription.userSubscription?.status === 'trial' ? 'Essai gratuit' : 'Actif'}
                      {currentSubscription.userSubscription?.trialEnd && (
                        <span className="ml-2 text-blue-400">
                          • Jusqu'au {new Date(currentSubscription.userSubscription.trialEnd).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Période actuelle</div>
                    <div className="text-xs text-gray-400">
                      {new Date(currentSubscription.userSubscription?.currentPeriodStart || '').toLocaleDateString('fr-FR')} - {new Date(currentSubscription.userSubscription?.currentPeriodEnd || '').toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xl font-bold text-white">Plan Gratuit</div>
                  <div className="text-sm text-gray-300">Accès limité aux fonctionnalités de base</div>
                </div>
              )}
            </motion.div>
          )}

          {/* View Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <div className="glass-effect rounded-xl p-1 flex">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  viewMode === 'cards'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Cartes
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  viewMode === 'comparison'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Comparaison
              </button>
            </div>
          </motion.div>

          {/* Subscription Plans */}
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
          ) : viewMode === 'comparison' ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-effect rounded-2xl p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
                  <BarChart3 size={20} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Comparaison détaillée</h2>
              </div>
              {renderFeatureComparison()}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {subscriptions.map((plan, index) => {
                if (!plan || !plan.name) {
                  console.warn('Plan invalide détecté:', plan);
                  return null;
                }
                
                const isCurrent = isCurrentPlan(plan.name);
                
                return (
                  <motion.div
                    key={plan._id || index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`relative glass-effect rounded-2xl p-6 border-2 transition-all duration-300 ${
                      isCurrent
                        ? 'border-green-500 shadow-2xl shadow-green-500/25'
                        : plan.name === 'pro' 
                        ? 'border-yellow-500 shadow-2xl shadow-yellow-500/25' 
                        : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                          <CheckCircle size={16} />
                          Plan actuel
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

                    {/* Limits */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <Upload size={14} />
                          <span>Uploads</span>
                        </span>
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.uploads)}/mois
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <MessageCircle size={14} />
                          <span>Commentaires</span>
                        </span>
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.comments)}/mois
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <Headphones size={14} />
                          <span>Écoutes</span>
                        </span>
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.plays)}/mois
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <Music size={14} />
                          <span>Playlists</span>
                        </span>
                        <span className="text-white font-semibold">
                          {formatLimit(plan.limits.playlists)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <Radio size={14} />
                          <span>Qualité</span>
                        </span>
                        <span className="text-white font-semibold">
                          {getQualityLabel(plan.limits.audioQuality)}
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      {plan.features.slice(0, 4).map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center text-sm">
                          <Check size={16} className="text-green-400 mr-2 flex-shrink-0" />
                          <span className="text-gray-300">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <div className="text-xs text-gray-400 text-center pt-2">
                          +{plan.features.length - 4} autres fonctionnalités
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
                          ? 'bg-green-600 text-white cursor-not-allowed'
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