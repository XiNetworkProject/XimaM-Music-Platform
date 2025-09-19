'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Crown, Star, Zap, Music, Headphones, MessageCircle, 
  Upload, Play, Check, X, ChevronRight, Sparkles,
  Shield, Users, Globe, Radio, Award, Target, CheckCircle
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string[];
  limits: {
    maxTracks: number;
    maxPlaylists: number;
    maxStorageGB: number;
    audioQuality: string;
    ads: boolean;
    analytics: boolean;
    collaborations: boolean;
    apiAccess: boolean;
    support: string;
  };
  popular: boolean;
  recommended: boolean;
}

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

interface CurrentSubscription {
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

export default function SubscriptionPlans() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        console.log('📊 Données reçues de l\'API:', data);
        
        // Vérifier si on a un objet avec une propriété 'plans'
        if (data && data.plans && Array.isArray(data.plans)) {
          const validSubscriptions = data.plans.filter((sub: any) => sub && sub.name && sub.limits);
          console.log('✅ Abonnements valides:', validSubscriptions.length, 'sur', data.plans.length);
          setSubscriptions(validSubscriptions);
        } else if (Array.isArray(data)) {
          // Fallback pour l'ancien format
          const validSubscriptions = data.filter((sub: any) => sub && sub.name && sub.limits);
          console.log('✅ Abonnements valides (format legacy):', validSubscriptions.length, 'sur', data.length);
          setSubscriptions(validSubscriptions);
        } else {
          console.error('❌ Format de données invalide:', data);
          setError('Format de données invalide');
        }
      } else {
        setError('Erreur lors du chargement des abonnements');
      }
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
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
    if (currentSubscription?.hasSubscription && currentSubscription.subscription?.name) {
      return currentSubscription.subscription.name === planName;
    }
    
    if (!currentSubscription?.hasSubscription && planName === 'free') {
      return true;
    }
    
    return false;
  };

  const getCurrentPlanStatus = () => {
    if (!currentSubscription?.hasSubscription) {
      return {
        type: 'free',
        text: 'Plan gratuit',
        color: 'text-gray-400'
      };
    }
    
    const status = currentSubscription.userSubscription?.status;
    const trialEnd = currentSubscription.userSubscription?.trialEnd;
    const currentPeriodEnd = currentSubscription.userSubscription?.currentPeriodEnd;
    
    // Vérifier si l'abonnement est expiré en comparant avec la date actuelle
    const now = new Date();
    const isExpired = currentPeriodEnd && new Date(currentPeriodEnd) < now;
    const isTrialExpired = trialEnd && new Date(trialEnd) < now;
    
    // Cas 1: Essai gratuit actif
    if (status === 'trial' && trialEnd && !isTrialExpired) {
      return {
        type: 'trial',
        text: `Essai gratuit jusqu'au ${new Date(trialEnd).toLocaleDateString('fr-FR')}`,
        color: 'text-blue-400'
      };
    }
    
    // Cas 2: Essai gratuit expiré
    if (status === 'trial' && isTrialExpired) {
      return {
        type: 'expired',
        text: 'Essai gratuit expiré',
        color: 'text-red-400'
      };
    }
    
    // Cas 3: Abonnement actif et non expiré
    if (status === 'active' && !isExpired) {
      return {
        type: 'active',
        text: 'Abonnement actif',
        color: 'text-green-400'
      };
    }
    
    // Cas 4: Abonnement expiré
    if (isExpired) {
      return {
        type: 'expired',
        text: 'Abonnement expiré',
        color: 'text-red-400'
      };
    }
    
    // Cas 5: Autres statuts
    return {
      type: status,
      text: status === 'canceled' ? 'Annulé' : 'Inactif',
      color: 'text-red-400'
    };
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
           subscriptionId: subscription.id,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-suno text-[var(--text)]">
      <main className="container mx-auto px-2 sm:px-4 md:px-6 pt-16 pb-32">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-[var(--border)]">
                <Crown size={32} className="text-[var(--text)]" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-[var(--text)]">
              Abonnements
            </h1>
            <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto">
              Choisissez le plan qui correspond à vos besoins
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

          {/* Current Plan Status */}
          {currentSubscription?.hasSubscription && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="panel-suno rounded-2xl p-6 mb-8 border border-[var(--border)]"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Votre abonnement actuel : {currentSubscription.subscription?.name ? currentSubscription.subscription.name.charAt(0).toUpperCase() + currentSubscription.subscription.name.slice(1) : 'Inconnu'}
                  </h2>
                  {getCurrentPlanStatus() && (
                    <p className={`text-sm ${getCurrentPlanStatus()?.color}`}>
                      {getCurrentPlanStatus()?.text}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 text-[var(--text)]">
                <div className="text-center">
                  <div className="text-gray-300">Période</div>
                  <div className="text-white font-semibold">
                    {new Date(currentSubscription.userSubscription?.currentPeriodStart || '').toLocaleDateString('fr-FR')} - {new Date(currentSubscription.userSubscription?.currentPeriodEnd || '').toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300">Prix</div>
                  <div className="text-white font-semibold">
                    {currentSubscription.subscription?.price}€/{currentSubscription.subscription?.interval}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300">Qualité audio</div>
                  <div className="text-white font-semibold">
                    {getQualityLabel(currentSubscription.subscription?.limits.audioQuality || '128kbps')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300">Support</div>
                  <div className="text-white font-semibold">
                    {currentSubscription.subscription?.limits.support || 'Community'}
                  </div>
                </div>
              </div>

              {/* Fonctionnalités de l'abonnement actuel */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Vos fonctionnalités incluses :</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentSubscription.subscription?.features?.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Check size={16} className="text-green-400 mr-2 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
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
              
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-[var(--text)]">
                {usageInfo && Object.entries(usageInfo).map(([key, data], index) => {
                  const label = key === 'tracks' ? 'Pistes' : 
                               key === 'playlists' ? 'Playlists' :
                               key === 'storage' ? 'Stockage (GB)' : key;
                  
                  const icon = key === 'tracks' ? <Music size={16} /> :
                              key === 'playlists' ? <Headphones size={16} /> :
                              key === 'storage' ? <Upload size={16} /> : <Music size={16} />;

                  const formatValue = (value: number) => {
                    if (key === 'storage') {
                      return value.toFixed(2);
                    }
                    return value.toString();
                  };

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
                        {formatValue(data.used)} / {formatValue(data.limit)}
                      </div>
                      <div className="text-sm text-gray-300 mb-3">
                        {label}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            data.percentage >= 90 ? 'bg-red-500' :
                            data.percentage >= 75 ? 'bg-yellow-500' :
                            data.percentage >= 50 ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(data.percentage, 100)}%` }}
                        ></div>
                      </div>
                      {data.percentage >= 90 && (
                        <div className="text-xs text-red-400 mt-2">
                          ⚠️ Limite presque atteinte ({data.percentage.toFixed(0)}%)
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {subscriptions.map((plan, index) => {
                if (!plan || !plan.name) {
                  console.warn('Plan invalide détecté:', plan);
                  return null;
                }
                
                const isCurrent = isCurrentPlan(plan.name);
                
                return (
                                     <motion.div
                     key={plan.id || index}
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
                           <span>Pistes</span>
                         </span>
                         <span className="text-white font-semibold">
                           {plan.limits.maxTracks === -1 ? 'Illimité' : plan.limits.maxTracks.toLocaleString()}/mois
                         </span>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-gray-300 flex items-center space-x-2">
                           <MessageCircle size={14} />
                           <span>Stockage</span>
                         </span>
                         <span className="text-white font-semibold">
                           {plan.limits.maxStorageGB === -1 ? 'Illimité' : plan.limits.maxStorageGB.toLocaleString()}GB
                         </span>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-gray-300 flex items-center space-x-2">
                           <Headphones size={14} />
                           <span>Analytics</span>
                         </span>
                         <span className="text-white font-semibold">
                           {plan.limits.analytics ? 'Inclus' : 'Non inclus'}
                         </span>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-gray-300 flex items-center space-x-2">
                           <Music size={14} />
                           <span>Playlists</span>
                         </span>
                         <span className="text-white font-semibold">
                           {plan.limits.maxPlaylists === -1 ? 'Illimité' : plan.limits.maxPlaylists.toLocaleString()}
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
                       plan.name === 'free' ? 'Gratuit' : 'S\'abonner'}
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