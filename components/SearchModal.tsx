'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Music, Users, Play, Heart, Clock, Headphones, Filter, TrendingUp, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatNumber, formatDuration } from '@/lib/utils';

interface SearchResult {
  _id: string;
  title: string;
  artist: {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  coverUrl?: string;
  duration: number;
  plays: number;
  likes: string[];
  type: 'track' | 'artist' | 'playlist';
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tracks' | 'artists' | 'playlists'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const filters = [
    { id: 'all', label: 'Tout', icon: Search },
    { id: 'tracks', label: 'Pistes', icon: Music },
    { id: 'artists', label: 'Artistes', icon: Users },
    { id: 'playlists', label: 'Playlists', icon: TrendingUp }
  ];

  // Focus sur l'input quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Charger les recherches récentes et tendances
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }

    // Simuler des tendances
    setTrendingSearches([
      'Électro', 'Hip-hop', 'Jazz', 'Rock', 'Pop', 'Classique'
    ]);
  }, []);

  // Recherche avec debounce
  const searchTracks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&filter=${activeFilter}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  // Debounce pour la recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchTracks(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchTracks]);

  const handleSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    
    // Sauvegarder dans les recherches récentes
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'track') {
      router.push(`/track/${result._id}`);
    } else if (result.type === 'artist') {
      router.push(`/profile/${result.artist.username}`);
    } else {
      router.push(`/playlist/${result._id}`);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl bg-black/80 backdrop-blur-2xl border border-white/20 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Rechercher des pistes, artistes, playlists..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-12 pr-4 py-4 bg-white/10 rounded-2xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  />
                  {query && (
                    <motion.button
                      onClick={() => setQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    >
                      <X size={20} />
                    </motion.button>
                  )}
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={20} className="text-white" />
                </motion.button>
              </div>

              {/* Filtres */}
              <div className="flex items-center space-x-2 mt-4">
                {filters.map((filter) => {
                  const IconComponent = filter.icon;
                  const isActive = activeFilter === filter.id;
                  
                  return (
                    <motion.button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id as any)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-2xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <IconComponent size={16} />
                      <span className="text-sm font-medium">{filter.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Contenu */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <motion.div
                    className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto animate-spin"
                  />
                  <p className="text-gray-400 mt-4">Recherche en cours...</p>
                </div>
              ) : query ? (
                <div className="p-6">
                  {results.length > 0 ? (
                    <div className="space-y-3">
                      {results.map((result, index) => (
                        <motion.div
                          key={result._id}
                          className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer group"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleResultClick(result)}
                          whileHover={{ scale: 1.02, x: 5 }}
                        >
                          {/* Cover/Icon */}
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            {result.coverUrl ? (
                              <img 
                                src={result.coverUrl} 
                                alt={result.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music size={24} className="text-white" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">{result.title}</h4>
                            <p className="text-sm text-gray-400 truncate">
                              {result.artist.name || result.artist.username}
                            </p>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {result.type === 'track' && (
                              <>
                                <div className="flex items-center space-x-1">
                                  <Headphones size={12} />
                                  <span>{formatNumber(result.plays)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock size={12} />
                                  <span>{formatDuration(result.duration)}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Action */}
                          <motion.button
                            className="p-2 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Play size={16} className="text-white" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Search size={48} className="text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">Aucun résultat trouvé pour "{query}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  {/* Recherches récentes */}
                  {recentSearches.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-white font-semibold mb-3">Recherches récentes</h3>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((search, index) => (
                          <motion.button
                            key={index}
                            onClick={() => handleSearch(search)}
                            className="px-4 py-2 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {search}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tendances */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
                      <Sparkles size={20} className="text-purple-400" />
                      <span>Tendances</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {trendingSearches.map((trend, index) => (
                        <motion.button
                          key={index}
                          onClick={() => handleSearch(trend)}
                          className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center space-x-2">
                            <TrendingUp size={16} className="text-purple-400" />
                            <span className="font-medium">{trend}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 