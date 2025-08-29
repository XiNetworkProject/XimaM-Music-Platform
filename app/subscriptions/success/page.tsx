'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Crown, Star, Music } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function SubscriptionSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId) {
      // Simuler la récupération des données de l'abonnement
      setTimeout(() => {
        setSubscriptionData({
          sessionId,
          plan: {
            name: 'Pro',
            price: 9.99,
            currency: 'EUR',
            interval: 'mois'
          },
          status: 'active',
          startDate: new Date().toLocaleDateString('fr-FR'),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
        });
        setLoading(false);
      }, 2000);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Traitement en cours...</h2>
          <p className="text-gray-300">Vérification de votre abonnement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500">
                <CheckCircle size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Abonnement activé !
            </h1>
            <p className="text-xl text-gray-300">
              Félicitations ! Votre abonnement a été activé avec succès.
            </p>
          </motion.div>

          {/* Subscription Details */}
          {subscriptionData && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-effect rounded-2xl p-8 mb-8 border-2 border-green-500/30"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                  <Crown size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Plan {subscriptionData.plan.name}
                  </h2>
                  <p className="text-green-400 font-semibold">
                    Abonnement actif
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-gray-300 text-sm mb-1">Prix</div>
                  <div className="text-2xl font-bold text-white">
                    {subscriptionData.plan.price}€/{subscriptionData.plan.interval}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300 text-sm mb-1">Statut</div>
                  <div className="text-green-400 font-semibold">
                    {subscriptionData.status === 'active' ? 'Actif' : 'En attente'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300 text-sm mb-1">Début</div>
                  <div className="text-white font-semibold">
                    {subscriptionData.startDate}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-300 text-sm mb-1">Prochain paiement</div>
                  <div className="text-white font-semibold">
                    {subscriptionData.endDate}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Fonctionnalités débloquées :
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center text-sm">
                    <CheckCircle size={16} className="text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Upload illimité</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle size={16} className="text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Qualité audio HD</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle size={16} className="text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Sans publicités</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle size={16} className="text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Analytics avancées</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle size={16} className="text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Support prioritaire</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle size={16} className="text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-gray-300">Stockage étendu</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Music size={20} />
              <span>Retour à l'accueil</span>
            </button>
            
            <button
              onClick={() => router.push('/settings')}
              className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <Star size={20} />
              <span>Gérer mon abonnement</span>
            </button>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="glass-effect rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Merci de votre confiance !
              </h3>
              <p className="text-gray-300 text-sm">
                Votre abonnement est maintenant actif. Vous pouvez commencer à profiter de toutes les fonctionnalités premium.
                <br />
                Un email de confirmation vous a été envoyé avec tous les détails.
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
