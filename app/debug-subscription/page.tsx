'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DebugSubscriptionPage() {
  const { data: session } = useSession();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const syncSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscriptions/debug-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Erreur inconnue' });
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscriptions/my-subscription');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Erreur inconnue' });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Abonnement</h1>
        <p>Veuillez vous connecter pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Abonnement</h1>
      <p className="mb-4">Utilisateur: {session.user?.email}</p>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={syncSubscription}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded mr-4"
        >
          {loading ? 'Chargement...' : 'Synchroniser Abonnement'}
        </button>
        
        <button
          onClick={checkSubscription}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded"
        >
          {loading ? 'Chargement...' : 'Vérifier Abonnement'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Résultat:</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}