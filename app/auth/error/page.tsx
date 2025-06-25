'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { AlertTriangle, Home, Music } from 'lucide-react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return 'Erreur de configuration du serveur. Veuillez réessayer plus tard.';
      case 'AccessDenied':
        return 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
      case 'Verification':
        return 'Erreur de vérification. Le lien a peut-être expiré.';
      case 'Default':
      default:
        return 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center">
        <div className="flex items-center justify-center mb-6">
          <Music className="w-8 h-8 text-white mr-2" />
          <h1 className="text-3xl font-bold text-white">XimaM</h1>
        </div>
        
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Erreur d'authentification</h2>
          <p className="text-white/80">
            {getErrorMessage(error)}
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/auth/signin"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 inline-block"
          >
            Réessayer la connexion
          </Link>
          
          <Link
            href="/"
            className="w-full bg-white/10 text-white py-3 px-4 rounded-lg font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200 inline-block"
          >
            <Home className="w-4 h-4 inline mr-2" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/50">
            Si le problème persiste, contactez le support.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-white/80">Chargement...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
} 