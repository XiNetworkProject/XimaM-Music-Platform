'use client';

import { useEarlyAccess } from '@/hooks/useEarlyAccess';
import { SynauraSpinner } from '@/components/SynauraSpinner';

export default function EarlyAccessGate({ children }: { children: React.ReactNode }) {
  const { hasAccess, isLoading, reason } = useEarlyAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <SynauraSpinner size="lg" />
          <p className="mt-4 text-white/70">Vérification de l'accès...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Accès Anticipé
            </h1>
            <p className="text-white/70 text-lg mb-6">
              Synaura est actuellement en accès anticipé limité aux 50 premiers utilisateurs.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">
                🎵 Rejoignez la liste d'attente
              </h2>
              <p className="text-white/70 mb-6">
                Soyez parmi les premiers à découvrir Synaura dès l'ouverture publique !
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Position actuelle</span>
                  <span className="text-purple-400 font-semibold">En attente</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Ouverture publique</span>
                  <span className="text-green-400 font-semibold">Bientôt</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => window.location.href = '/api/auth/signout'}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors duration-200"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
