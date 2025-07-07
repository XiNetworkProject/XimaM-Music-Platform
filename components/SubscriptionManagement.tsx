'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Crown,
  Zap,
  Star,
  Award,
  Music
} from 'lucide-react';

interface UserSubscription {
  _id: string;
  subscription: {
    _id: string;
    name: string;
    price: number;
    currency: string;
    interval: string;
    features: string[];
  };
  status: 'active' | 'canceled' | 'expired' | 'trial' | 'past_due';
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

export default function SubscriptionManagement() {
  const { data: session } = useSession();
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserSubscription();
    }
  }, [session]);

  const fetchUserSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions/usage');
      
      if (response.ok) {
        const data = await response.json();
        setUserSubscription(data.userSubscription);
      } else {
        setError('Erreur lors du chargement de l\'abonnement');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
      return;
    }

    try {
      setCanceling(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        await fetchUserSubscription(); // Recharger les données
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      setError('Erreur de connexion');
    } finally {
      setCanceling(false);
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={20} className="text-green-500" />;
      case 'trial': return <Calendar size={20} className="text-blue-500" />;
      case 'canceled': return <XCircle size={20} className="text-red-500" />;
      case 'past_due': return <AlertTriangle size={20} className="text-yellow-500" />;
      default: return <AlertTriangle size={20} className="text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'trial': return 'Essai gratuit';
      case 'canceled': return 'Annulé';
      case 'past_due': return 'En retard de paiement';
      default: return 'Inconnu';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Illimité';
    return limit.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (!userSubscription) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Music size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun abonnement actif
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vous utilisez actuellement le plan gratuit.
          </p>
          <a
            href="/subscriptions"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Voir les plans d'abonnement
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Messages d'erreur/succès */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle size={20} className="text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-500 mr-2" />
            <span className="text-green-700 dark:text-green-400">{success}</span>
          </div>
        </div>
      )}

      {/* Informations de l'abonnement */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              {getPlanIcon(userSubscription.subscription.name)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                {userSubscription.subscription.name === 'free' ? 'Gratuit' :
                 userSubscription.subscription.name === 'starter' ? 'Starter' :
                 userSubscription.subscription.name === 'creator' ? 'Creator' :
                 userSubscription.subscription.name === 'pro' ? 'Pro' : 'Enterprise'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {userSubscription.subscription.price === 0 ? 'Gratuit' : 
                 `${userSubscription.subscription.price}${userSubscription.subscription.currency.toUpperCase()}/${userSubscription.subscription.interval}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(userSubscription.status)}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getStatusText(userSubscription.status)}
            </span>
          </div>
        </div>

        {/* Période d'abonnement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Période actuelle
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Du {formatDate(userSubscription.currentPeriodStart)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Au {formatDate(userSubscription.currentPeriodEnd)}
            </p>
            {userSubscription.trialEnd && (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Essai gratuit jusqu'au {formatDate(userSubscription.trialEnd)}
              </p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard size={16} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Prochain paiement
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {userSubscription.subscription.price === 0 ? 'Aucun' : 
               `${userSubscription.subscription.price}${userSubscription.subscription.currency.toUpperCase()} le ${formatDate(userSubscription.currentPeriodEnd)}`}
            </p>
          </div>
        </div>

        {/* Utilisation actuelle */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Utilisation ce mois
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {userSubscription.usage.uploads}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Uploads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {userSubscription.usage.comments}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Commentaires</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {userSubscription.usage.plays}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Écoutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {userSubscription.usage.playlists}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Playlists</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {userSubscription.status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {canceling ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Annulation...
                </>
              ) : (
                'Annuler l\'abonnement'
              )}
            </button>
          )}
          
          <a
            href="/subscriptions"
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center"
          >
            Changer de plan
          </a>
        </div>
      </div>
    </motion.div>
  );
} 