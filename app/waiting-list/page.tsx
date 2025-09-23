'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function WaitingListPage() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('Vous êtes sur la liste d\'attente ! Nous vous contacterons bientôt.');
        setEmail('');
      } else {
        setMessage('Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    } catch (error) {
      setMessage('Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Synaura</h1>
            <p className="text-gray-300 text-lg">Accès Anticipé</p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              🎵 Bienvenue dans l'avenir de la musique
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Synaura est actuellement en accès anticipé limité à 50 créateurs. 
              Rejoignez la liste d'attente pour être parmi les premiers à découvrir 
              notre plateforme de création musicale révolutionnaire.
            </p>
          </div>

          {status === 'authenticated' ? (
            <div className="text-center">
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 text-sm">
                  👋 Salut {session.user?.name || session.user?.email}! 
                  Votre compte n'a pas encore l'accès anticipé.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <a
                href="/auth/signin"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Se connecter
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email pour la liste d'attente
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Inscription...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Rejoindre la liste d'attente
                </>
              )}
            </button>
          </form>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg"
            >
              <p className="text-green-200 text-sm">{message}</p>
            </motion.div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-xs">
              En vous inscrivant, vous acceptez de recevoir des mises à jour sur Synaura.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            💡 <strong>Astuce:</strong> Suivez-nous sur les réseaux sociaux pour les dernières nouvelles !
          </p>
        </div>
      </motion.div>
    </div>
  );
}
