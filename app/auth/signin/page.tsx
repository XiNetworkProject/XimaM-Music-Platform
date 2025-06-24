'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Headphones, Mic, Users, ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    getSession().then((session) => {
      if (session) {
        router.push('/');
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signIn('google', { callbackUrl: '/' });
      if (result?.error) {
        console.error('Erreur de connexion:', result.error);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
      {/* Bouton retour */}
      <button
        onClick={() => router.back()}
        className="absolute top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center">
                <Music size={32} className="text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-500 rounded-full flex items-center justify-center">
                <Headphones size={12} className="text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">XimaM Music</h1>
          <p className="text-white/60">Découvrez, partagez et créez de la musique</p>
        </motion.div>

        {/* Carte de connexion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-effect rounded-2xl p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Bienvenue</h2>
            <p className="text-white/60">Connectez-vous pour commencer votre voyage musical</p>
          </div>

          {/* Bouton Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white text-dark-900 font-semibold py-4 px-6 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continuer avec Google</span>
              </>
            )}
          </button>

          {/* Fonctionnalités */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Mic size={16} className="text-primary-400" />
              </div>
              <span className="text-sm">Partagez vos créations musicales</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-8 h-8 bg-secondary-500/20 rounded-lg flex items-center justify-center">
                <Headphones size={16} className="text-secondary-400" />
              </div>
              <span className="text-sm">Découvrez de nouveaux artistes</span>
            </div>
            <div className="flex items-center space-x-3 text-white/80">
              <div className="w-8 h-8 bg-accent-500/20 rounded-lg flex items-center justify-center">
                <Users size={16} className="text-accent-400" />
              </div>
              <span className="text-sm">Rejoignez une communauté passionnée</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-6 text-white/40 text-sm"
        >
          <p>En continuant, vous acceptez nos conditions d'utilisation</p>
        </motion.div>
      </div>
    </div>
  );
} 