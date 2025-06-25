'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('Erreur connexion Google:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Page de Debug - Authentification</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 État de la Session</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded ${status === 'loading' ? 'bg-yellow-100 text-yellow-800' : status === 'authenticated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{status}</span></p>
            <p><strong>Session:</strong> {session ? '✅ Présente' : '❌ Absente'}</p>
          </div>
        </div>

        {session && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">👤 Détails de la Session</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Actions</h2>
          <div className="space-y-4">
            {!session ? (
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Se connecter avec Google'}
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Déconnexion...' : 'Se déconnecter'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🌐 Variables d'Environnement</h2>
          <div className="space-y-2">
            <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
            <p><strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL || 'Non défini'}</p>
            <p><strong>NEXTAUTH_SECRET:</strong> {process.env.NEXTAUTH_SECRET ? '✅ Défini' : '❌ Non défini'}</p>
            <p><strong>GOOGLE_CLIENT_ID:</strong> {process.env.GOOGLE_CLIENT_ID ? '✅ Défini' : '❌ Non défini'}</p>
            <p><strong>GOOGLE_CLIENT_SECRET:</strong> {process.env.GOOGLE_CLIENT_SECRET ? '✅ Défini' : '❌ Non défini'}</p>
            <p><strong>MONGODB_URI:</strong> {process.env.MONGODB_URI ? '✅ Défini' : '❌ Non défini'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 