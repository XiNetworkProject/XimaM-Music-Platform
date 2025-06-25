'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    // Détails des erreurs courantes
    const errorMessages: { [key: string]: string } = {
      'AccessDenied': 'Accès refusé. Vérifiez que vous avez autorisé l\'application à accéder à votre compte Google.',
      'Configuration': 'Erreur de configuration. Vérifiez les paramètres OAuth dans Google Cloud Console.',
      'Verification': 'Erreur de vérification. Le token de vérification est invalide ou expiré.',
      'Default': 'Une erreur inattendue s\'est produite lors de l\'authentification.',
    };

    setErrorDetails(errorMessages[error || ''] || errorMessages['Default']);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Bouton retour */}
        <Link
          href="/auth/signin"
          className="absolute top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-effect rounded-2xl p-8 text-center"
        >
          {/* Icône d'erreur */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold mb-4">Erreur d'authentification</h1>

          {/* Détails de l'erreur */}
          <div className="mb-6">
            <p className="text-white/60 mb-2">Code d'erreur :</p>
            <code className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm">
              {error || 'Unknown'}
            </code>
          </div>

          {/* Message d'erreur */}
          <p className="text-white/80 mb-8 leading-relaxed">
            {errorDetails}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw size={20} />
              <span>Réessayer</span>
            </button>

            <Link
              href="/auth/signin"
              className="block w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>

          {/* Informations de débogage */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <p className="text-xs text-white/40 mb-2">Informations de débogage :</p>
              <p className="text-xs text-white/60">
                NEXTAUTH_URL: {process.env.NEXTAUTH_URL || 'Non défini'}
              </p>
              <p className="text-xs text-white/60">
                NODE_ENV: {process.env.NODE_ENV || 'Non défini'}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 