'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Crown, Star, Zap, Music, Headphones, MessageCircle, 
  Upload, Play, Check, X, ChevronRight, Sparkles,
  Shield, Users, Globe, Radio, Award, Target
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
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
    if (session?.user?.id) {
      fetchUsageInfo();
    }
  }, [session]);

  const fetchSubscriptions = async () => {
    try {
      console.log('🔍 Appel API /api/subscriptions...');
      const response = await fetch('/api/subscriptions');
      console.log('📡 Réponse API:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Données reçues:', data);
        setSubscriptions(data);
      } else {
        console.error('❌ Erreur API:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('❌ Détails erreur:', errorData);
        setError(`Erreur ${response.status}: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des abonnements:', error);
      setError('Erreur de connexion au serveur');
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

  const getPlanIcon = (planName: string) => {
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
    switch (planName) {
      case 'free': return 'from-gray-500 to-gray-600';
      case 'starter': return 'from-blue-500 to-cyan-500';
      case 'creator': return 'from-purple-500 to-pink-500';
      case 'pro': return 'from-yellow-500 to-orange-500';
      case 'enterprise': return 'from-emerald-500 to-teal-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleSubscribe = async (planName: string) => {
    setSelectedPlan(planName);
    // TODO: Intégrer Stripe pour le paiement
    alert(`Fonctionnalité de paiement à implémenter pour ${planName}`);
  };

  const handleInitializeSubscriptions = async () => {
    try {
      setInitializing(true);
      setError(null);
      
      console.log('🔧 Initialisation des abonnements...');
      const response = await fetch('/api/subscriptions/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Initialisation réussie:', data);
        alert(`✅ ${data.count} abonnements initialisés avec succès !`);
        // Recharger les abonnements
        await fetchSubscriptions();
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur initialisation:', errorData);
        setError(`Erreur d'initialisation: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      setError('Erreur de connexion lors de l\'initialisation');
    } finally {
      setInitializing(false);
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

          {/* Debug Info */}
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
              <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">Debug: {subscriptions.length} abonnements chargés</p>
                <p className="text-sm text-gray-300">Session: {session?.user?.id ? 'Connecté' : 'Non connecté'}</p>
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
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">Debug: {subscriptions.length} abonnements trouvés</p>
                <p className="text-sm text-gray-300">Loading: {loading ? 'Oui' : 'Non'}</p>
                <p className="text-sm text-gray-300">Error: {error || 'Aucune'}</p>
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInitializeSubscriptions}
                    disabled={initializing}
                    className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {initializing ? 'Initialisation...' : '🔧 Initialiser les abonnements'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {subscriptions.map((plan, index) => (
              <motion.div
                key={plan._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative glass-effect rounded-2xl p-6 border-2 transition-all duration-300 ${
                  plan.name === 'pro' 
                    ? 'border-yellow-500 shadow-2xl shadow-yellow-500/25' 
                    : 'border-transparent hover:border-white/20'
                }`}
              >
                {/* Popular Badge */}
                {plan.name === 'pro' && (
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
                      {getQualityLabel(plan.limits.quality)}
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
                  disabled={selectedPlan === plan.name}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    plan.name === 'pro'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                      : plan.name === 'free'
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : `bg-gradient-to-r ${getPlanColor(plan.name)} text-white hover:opacity-90`
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedPlan === plan.name ? 'Chargement...' : 
                   plan.name === 'free' ? 'Plan actuel' : 'S\'abonner'}
                </motion.button>
              </motion.div>
            ))}
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