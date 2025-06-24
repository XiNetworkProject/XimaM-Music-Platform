'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Play, Heart, User, Music, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'track' | 'artist';
  title: string;
  subtitle: string;
  imageUrl: string;
  metadata?: string;
}

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'track',
    title: 'Nouvelle Étoile',
    subtitle: 'Luna Nova',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
    metadata: '3:00'
  },
  {
    id: '2',
    type: 'artist',
    title: 'Luna Nova',
    subtitle: 'Artiste • 15.4k abonnés',
    imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '3',
    type: 'track',
    title: 'Rythme Urbain',
    subtitle: 'Beat Master',
    imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100&h=100&fit=crop',
    metadata: '3:30'
  },
  {
    id: '4',
    type: 'artist',
    title: 'Beat Master',
    subtitle: 'Artiste • 8.9k abonnés',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  }
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (query.trim()) {
      setIsLoading(true);
      // Simuler une recherche
      setTimeout(() => {
        const filtered = mockSearchResults.filter(
          result => 
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.subtitle.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
        setIsLoading(false);
      }, 300);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'artist') {
      router.push(`/profile/${result.title.toLowerCase().replace(' ', '_')}`);
    } else {
      // Naviguer vers la piste
      router.push(`/track/${result.id}`);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-0 left-0 right-0 glass-effect border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher des artistes, titres..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 rounded-xl border border-white/20 focus:border-primary-400 focus:outline-none text-white placeholder-white/60"
                    autoFocus
                  />
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Résultats */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mx-auto mb-4"></div>
                  <p className="text-white/60">Recherche en cours...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-4 space-y-2">
                  {results.map((result) => (
                    <motion.button
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
                    >
                      <img
                        src={result.imageUrl}
                        alt={result.title}
                        className={`w-12 h-12 rounded object-cover ${
                          result.type === 'artist' ? 'rounded-full' : 'rounded-lg'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{result.title}</h3>
                          {result.type === 'artist' && (
                            <User size={14} className="text-white/40" />
                          )}
                          {result.type === 'track' && (
                            <Music size={14} className="text-white/40" />
                          )}
                        </div>
                        <p className="text-sm text-white/60">{result.subtitle}</p>
                      </div>
                      {result.metadata && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-white/40">{result.metadata}</span>
                          <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <Play size={16} />
                          </button>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="p-8 text-center">
                  <Search size={48} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Aucun résultat trouvé</p>
                  <p className="text-sm text-white/40 mt-2">Essayez d'autres mots-clés</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Search size={48} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Recherchez des artistes et des titres</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 