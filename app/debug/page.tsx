'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, MessageCircle, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Track {
  _id: string;
  title: string;
  artist: {
    name: string;
    username: string;
  };
  plays: number;
  likes: string[];
  comments: string[];
}

export default function DebugPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  // Charger les pistes de test
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const response = await fetch('/api/tracks?limit=5');
        if (response.ok) {
          const data = await response.json();
          setTracks(data.tracks || []);
        }
      } catch (error) {
        console.error('Erreur chargement pistes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, []);

  // Test des statistiques
  const testTrackStats = async (track: Track) => {
    setSelectedTrack(track);
    const results = [];

    // Test 1: Vérifier les données initiales
    results.push({
      test: 'Données initiales',
      status: 'info',
      message: `Plays: ${track.plays}, Likes: ${track.likes.length}, Comments: ${track.comments.length}`
    });

    // Test 2: Incrémenter les écoutes
    try {
      const response = await fetch(`/api/tracks/${track._id}/plays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          test: 'Incrémentation écoutes',
          status: 'success',
          message: `Nouveau nombre d'écoutes: ${data.plays}`
        });
      } else {
        results.push({
          test: 'Incrémentation écoutes',
          status: 'error',
          message: `Erreur: ${response.status}`
        });
      }
    } catch (error) {
      results.push({
        test: 'Incrémentation écoutes',
        status: 'error',
        message: `Exception: ${error}`
      });
    }

    // Test 3: Vérifier les données après mise à jour
    try {
      const response = await fetch(`/api/tracks/${track._id}`);
      if (response.ok) {
        const data = await response.json();
        results.push({
          test: 'Vérification après mise à jour',
          status: 'info',
          message: `Plays: ${data.plays}, Likes: ${data.likes?.length || 0}, Comments: ${data.comments?.length || 0}`
        });
      }
    } catch (error) {
      results.push({
        test: 'Vérification après mise à jour',
        status: 'error',
        message: `Erreur: ${error}`
      });
    }

    setTestResults(results);
  };

  // Test de validation des données
  const validateData = (data: any) => {
    const issues = [];
    
    if (typeof data.plays !== 'number' || data.plays < 0) {
      issues.push('Plays invalide');
    }
    
    if (!Array.isArray(data.likes)) {
      issues.push('Likes invalide');
    }
    
    if (!Array.isArray(data.comments)) {
      issues.push('Comments invalide');
    }

    return issues;
  };

  const formatNumber = (num: number) => {
    if (typeof num !== 'number' || isNaN(num) || num < 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Chargement des pistes de test...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug - Test des Statistiques</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des pistes */}
          <div className="glass-effect rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Pistes de Test</h2>
            <div className="space-y-3">
              {tracks.map((track) => (
                <motion.div
                  key={track._id}
                  className="p-4 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
                  onClick={() => testTrackStats(track)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <h3 className="font-semibold">{track.title}</h3>
                  <p className="text-sm text-gray-300">{track.artist.name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Play size={14} />
                      {formatNumber(track.plays)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={14} />
                      {formatNumber(track.likes.length)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={14} />
                      {formatNumber(track.comments.length)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Résultats des tests */}
          <div className="glass-effect rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Résultats des Tests</h2>
            {selectedTrack && (
              <div className="mb-4 p-3 bg-blue-500/20 rounded-lg">
                <h3 className="font-semibold">Piste sélectionnée:</h3>
                <p>{selectedTrack.title} - {selectedTrack.artist.name}</p>
              </div>
            )}
            
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <motion.div
                  key={index}
                  className={`p-3 rounded-lg flex items-center gap-3 ${
                    result.status === 'success' ? 'bg-green-500/20' :
                    result.status === 'error' ? 'bg-red-500/20' :
                    'bg-blue-500/20'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {result.status === 'success' && <CheckCircle size={16} className="text-green-400" />}
                  {result.status === 'error' && <AlertCircle size={16} className="text-red-400" />}
                  {result.status === 'info' && <RefreshCw size={16} className="text-blue-400" />}
                  
                  <div className="flex-1">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm text-gray-300">{result.message}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {testResults.length === 0 && (
              <p className="text-gray-400 text-center py-8">
                Sélectionnez une piste pour lancer les tests
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 glass-effect rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions de Test</h2>
          <div className="space-y-2 text-sm">
            <p>• Cliquez sur une piste pour tester ses statistiques</p>
            <p>• Les tests vérifient l'incrémentation des écoutes</p>
            <p>• Les résultats montrent les valeurs avant/après</p>
            <p>• Les erreurs sont affichées en rouge</p>
          </div>
        </div>
      </div>
    </div>
  );
} 