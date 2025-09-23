'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

interface EarlyAccessStats {
  earlyAccessCount: number;
  waitingCount: number;
  limit: number;
  remaining: number;
}

export default function AdminEarlyAccessPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<EarlyAccessStats | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/early-access');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur récupération stats:', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      const response = await fetch('/api/admin/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await response.json();
      setMessage(data.message || data.error);
      
      if (response.ok) {
        setInviteEmail('');
        fetchStats(); // Rafraîchir les stats
      }
    } catch (error) {
      setMessage('Erreur lors de l\'invitation');
    } finally {
      setIsInviting(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Accès Refusé</h1>
          <p>Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">🎵 Admin Early Access</h1>
            <p className="text-gray-300">Gestion de l'accès anticipé Synaura</p>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-300">{stats.earlyAccessCount}</div>
                <div className="text-sm text-green-200">Accès Anticipé</div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-300">{stats.waitingCount}</div>
                <div className="text-sm text-yellow-200">En Attente</div>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-300">{stats.remaining}</div>
                <div className="text-sm text-blue-200">Places Restantes</div>
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-300">{stats.limit}</div>
                <div className="text-sm text-purple-200">Limite Totale</div>
              </div>
            </div>
          )}

          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Inviter un utilisateur</h2>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email de l'utilisateur à inviter
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="utilisateur@example.com"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isInviting || !inviteEmail}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isInviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Invitation...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Accorder l'accès anticipé
                  </>
                )}
              </button>
            </form>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg"
              >
                <p className="text-blue-200 text-sm">{message}</p>
              </motion.div>
            )}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={fetchStats}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              🔄 Actualiser les statistiques
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
