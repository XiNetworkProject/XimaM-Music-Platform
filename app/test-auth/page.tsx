'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', { 
        callbackUrl: '/test-auth',
        redirect: false 
      });
      console.log('Résultat connexion:', result);
    } catch (error) {
      console.error('Erreur connexion Google:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut({ callbackUrl: '/test-auth' });
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test Authentification</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 État</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded ${status === 'loading' ? 'bg-yellow-100 text-yellow-800' : status === 'authenticated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{status}</span></p>
            <p><strong>Session:</strong> {session ? '✅ Présente' : '❌ Absente'}</p>
            {session?.user && (
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <p><strong>Email:</strong> {session.user.email}</p>
                <p><strong>Nom:</strong> {session.user.name}</p>
                <p><strong>ID:</strong> {session.user.id}</p>
                <p><strong>Username:</strong> {session.user.username}</p>
              </div>
            )}
          </div>
        </div>

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
          <h2 className="text-xl font-semibold mb-4">🍪 Cookies</h2>
          <div className="space-y-2">
            <p><strong>next-auth.session-token:</strong> {typeof document !== 'undefined' && document.cookie.includes('next-auth.session-token') ? '✅ Présent' : '❌ Absent'}</p>
            <p><strong>next-auth.csrf-token:</strong> {typeof document !== 'undefined' && document.cookie.includes('next-auth.csrf-token') ? '✅ Présent' : '❌ Absent'}</p>
            <p><strong>next-auth.callback-url:</strong> {typeof document !== 'undefined' && document.cookie.includes('next-auth.callback-url') ? '✅ Présent' : '❌ Absent'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 