'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Heart, Play, Download, Share2, Search, Filter, Star, Clock, User, Sparkles, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { AIGeneration, AITrack } from '@/lib/aiGenerationService';

interface PlayerTrack {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  audioUrl: string;
  coverUrl?: string;
  duration: number;
  likes: string[];
  comments: string[];
  plays: number;
  isLiked?: boolean;
  genre?: string[];
}

export default function AILibrary() {
  const { data: session } = useSession();
  const { playTrack } = useAudioPlayer();
  
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [allTracks, setAllTracks] = useState<AITrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const [modelFilter, setModelFilter] = useState<'all' | 'V4_5' | 'V3_5'>('all');
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    totalDuration: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Charger la bibliothèque
  const loadLibrary = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/ai/library', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
      if (response.ok) {
        const data = await response.json();
        setGenerations(data.generations || []);

        // Charger toutes les pistes de l'utilisateur
        const trRes = await fetch('/api/ai/library/tracks', { cache: 'no-store', headers: { 'Cache-Control': 'no-store' } });
        if (trRes.ok) {
          const trJson = await trRes.json();
          setAllTracks(trJson.tracks || []);
        }
        
        // Calculer les statistiques
        const total = data.generations?.length || 0;
        const favorites = data.generations?.filter((g: AIGeneration) => g.is_favorite).length || 0;
        const totalDuration = (allTracks?.reduce((acc: number, t: AITrack) => acc + (t.duration || 0), 0)) || 0;
        
        setStats({ total, favorites, totalDuration });
      } else {
        const txt = await response.text();
        setError(`Erreur chargement: ${txt}`);
      }
    } catch (error) {
      console.error('Erreur chargement bibliothèque:', error);
      setError('Impossible de charger la bibliothèque');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les générations
  const filteredGenerations = generations.filter(generation => {
    const matchesSearch = searchQuery === '' || 
      generation.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      generation.tracks?.some(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesFilter = filter === 'all' || 
      (filter === 'favorites' && generation.is_favorite) ||
      (filter === 'recent' && new Date(generation.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const matchesModel = modelFilter === 'all' || (generation.model === modelFilter);
    
    return matchesSearch && matchesFilter && matchesModel;
  });

  // Jouer une track IA
  const playAITrack = (track: AITrack, generation: AIGeneration) => {
    const aiTrack: PlayerTrack = {
      _id: `ai-${track.id}`,
      title: track.title,
      artist: {
        _id: 'ai-generator',
        name: 'Synaura IA',
        username: 'synaura-ai'
      },
      duration: track.duration,
      audioUrl: track.audio_url,
      coverUrl: track.image_url || '/synaura_symbol.svg',
      genre: ['IA', 'Généré'],
      plays: track.play_count,
      likes: [],
      comments: [],
      // Propager les paroles (stockées dans prompt)
      // @ts-ignore - player Track accepte lyrics via providers
      lyrics: (track.prompt || generation.prompt || '').trim()
    };

    playTrack(aiTrack as any);
  };

  // Toggle favori
  const toggleFavorite = async (generationId: string) => {
    try {
      const response = await fetch(`/api/ai/generations/${generationId}/favorite`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Mettre à jour l'état local
        setGenerations(prev => prev.map(g => 
          g.id === generationId 
            ? { ...g, is_favorite: !g.is_favorite }
            : g
        ));
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  // Télécharger une track
  const downloadTrack = async (track: AITrack) => {
    try {
      const response = await fetch(track.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synaura-${track.title || track.id}.wav`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  // Re-synchroniser une génération (re-poll Suno puis sauvegarder)
  const resyncGeneration = async (generation: AIGeneration) => {
    try {
      if (!generation.task_id) return;
      const statusRes = await fetch(`/api/suno/status?taskId=${encodeURIComponent(generation.task_id)}`, { cache: 'no-store' });
      const statusJson = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusJson?.error || 'Erreur polling');
      const tracks = statusJson.tracks || [];
      if (tracks.length > 0) {
        const save = await fetch('/api/suno/save-tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: generation.task_id, tracks, status: 'completed' })
        });
        if (save.ok) {
          window.dispatchEvent(new CustomEvent('aiLibraryUpdated'));
        }
      }
    } catch (e) {
      console.error('Erreur resync:', e);
    }
  };

  // Partager une génération
  const shareGeneration = async (generation: AIGeneration) => {
    try {
      const shareData = {
        title: 'Musique générée par Synaura',
        text: `Écoutez "${generation.tracks?.[0]?.title || 'Ma musique IA'}" généré par IA`,
        url: `${window.location.origin}/ai-library`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Lien copié dans le presse-papiers');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  useEffect(() => {
    loadLibrary();
    const onUpdated = () => loadLibrary();
    window.addEventListener('aiLibraryUpdated', onUpdated as EventListener);
    return () => window.removeEventListener('aiLibraryUpdated', onUpdated as EventListener);
  }, [session?.user?.id]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
          <p className="text-gray-400">Connectez-vous pour accéder à votre bibliothèque IA</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Music className="w-8 h-8 text-green-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Ma Bibliothèque IA
            </h1>
          </motion.div>
          <p className="text-gray-400 text-lg mb-6">
            Retrouvez toutes vos musiques générées par IA
          </p>
          
          {/* Boutons de navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-4"
          >
            <a
              href="/library"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg"
            >
              <Music className="w-5 h-5" />
              <span>Bibliothèque Standard</span>
            </a>
            
            <a
              href="/ai-generator"
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              <span>Générer de la musique</span>
            </a>
          </motion.div>
        </div>

        {/* Statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Music className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <h3 className="text-2xl font-bold">{stats.total}</h3>
            <p className="text-gray-400">Générations</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <h3 className="text-2xl font-bold">{stats.favorites}</h3>
            <p className="text-gray-400">Favoris</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <h3 className="text-2xl font-bold">{Math.round(stats.totalDuration / 60)}</h3>
            <p className="text-gray-400">Minutes</p>
          </div>
        </motion.div>

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher dans vos musiques..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-white"
              aria-label="Filtrer par modèle"
            >
              <option value="all">Tous modèles</option>
              <option value="V4_5">V4.5</option>
              <option value="V3_5">V3.5</option>
            </select>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setFilter('favorites')}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                filter === 'favorites' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Heart className="w-4 h-4 inline mr-2" />
              Favoris
            </button>
            <button
              onClick={() => setFilter('recent')}
              className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                filter === 'recent' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              Récent
            </button>
            <button
              onClick={loadLibrary}
              className="px-4 py-3 rounded-lg font-medium transition-colors bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-sm">{error}</div>
        )}

        {/* Liste des générations */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            <p className="text-gray-400 mt-4">Chargement de votre bibliothèque...</p>
          </div>
        ) : filteredGenerations.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">Aucune musique trouvée</h3>
            <p className="text-gray-400">
              {searchQuery ? 'Aucun résultat pour votre recherche' : 'Commencez par générer votre première musique IA'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGenerations.map((generation, index) => (
              <motion.div
                key={generation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Header de la génération */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {generation.tracks?.[0]?.title || 'Musique générée'}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {generation.prompt}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(generation.id)}
                    className={`p-2 rounded-full transition-colors ${
                      generation.is_favorite 
                        ? 'text-red-400 bg-red-400/10' 
                        : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${generation.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Tracks */}
                <div className="space-y-3 mb-4">
                  {generation.tracks?.map((track) => (
                    <div key={track.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-600 bg-[var(--surface-2)] flex items-center justify-center">
                        {track.image_url ? (
                          <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{track.title}</h4>
                        <p className="text-gray-400 text-sm">
                          {Math.round(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => playAITrack(track, generation)}
                          className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadTrack(track)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!generation.tracks || generation.tracks.length === 0) && (
                    <div className="p-3 bg-gray-700/60 rounded-lg flex items-center justify-between">
                      <span className="text-gray-300 text-sm">Aucune piste encore enregistrée pour cette génération.</span>
                      {generation.task_id && (
                        <button onClick={() => resyncGeneration(generation)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" /> Re-synchroniser
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>{new Date(generation.created_at).toLocaleDateString()}</span>
                    <span>{generation.model}</span>
                  </div>
                  <button
                    onClick={() => shareGeneration(generation)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <a href="/ai-generator" className="text-green-400 hover:text-green-300 text-sm inline-flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" /> Ouvrir dans AI Generator
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Liste globale des pistes IA (vue alternatives) */}
        {allTracks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Toutes mes pistes IA</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTracks.map((track) => (
                <div key={track.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-600 bg-[var(--surface-2)] flex items-center justify-center">
                    {track.image_url ? (
                      <img src={track.image_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{track.title}</h4>
                    <p className="text-gray-400 text-sm">
                      {Math.round(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => playAITrack(track as any, { id: 'gen', user_id: '', task_id: '', prompt: '', model: track.model_name || '', status: 'completed', created_at: new Date().toISOString(), is_favorite: false, is_public: false, play_count: 0, like_count: 0, share_count: 0, metadata: { title: track.title, style: track.style }, tracks: [] } as any)} className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => downloadTrack(track)} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
