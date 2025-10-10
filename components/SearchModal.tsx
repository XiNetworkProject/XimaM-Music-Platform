'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Play, Heart, User, Music, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';

interface SearchResult {
  _id: string;
  type: 'track' | 'user';
  title: string;
  subtitle: string;
  imageUrl: string;
  metadata?: string;
  username?: string;
  userName?: string;
  userUsername?: string;
}

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
      // Recherche réelle via l'API
      const searchData = async () => {
        try {
          const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            const formattedResults: SearchResult[] = [];
            
            // Ajouter les utilisateurs
            if (data.artists) {
              data.artists.forEach((user: any) => {
                formattedResults.push({
                  _id: user._id || user.id,
                  type: 'user',
                  title: user.name || user.username,
                  subtitle: `Artiste • ${user.followers?.length || 0} abonnés`,
                  imageUrl: user.avatar || '',
                  userName: user.name,
                  userUsername: user.username,
                  username: user.username
                });
              });
            }
            
            // Ajouter les pistes
            if (data.tracks) {
              data.tracks.forEach((track: any) => {
                formattedResults.push({
                  _id: track._id || track.id,
                  type: 'track',
                  title: track.title,
                  subtitle: track.artist?.name || track.artist?.username || 'Artiste inconnu',
                  imageUrl: track.coverUrl || '/default-cover.jpg',
                  metadata: formatDuration(track.duration)
                });
              });
            }
            
            setResults(formattedResults);
          }
        } catch (error) {
          console.error('Erreur recherche:', error);
        } finally {
        setIsLoading(false);
        }
      };
      
      const timeoutId = setTimeout(searchData, 100); // Réduit de 300ms à 100ms
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [query]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'user' && result.username) {
      router.push(`/profile/${result.username}`);
    } else if (result.type === 'track') {
      // Naviguer vers la piste
      router.push(`/tracks/${result._id}`);
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
          transition={{ duration: 0.1 }} // Animation très rapide
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }} // Animation plus rapide
            className="absolute top-0 left-0 right-0 panel-suno border-b border-[var(--border)]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                    className="w-full pl-10 pr-4 py-3 bg-[var(--surface)]/60 rounded-xl border border-[var(--border)] focus:border-[var(--color-primary)] focus:outline-none text-white placeholder-white/60"
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
                       key={result._id}
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ duration: 0.1 }} // Animation très rapide
                       onClick={() => handleResultClick(result)}
                       className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
                     >
                      {result.type === 'user' ? (
                        <Avatar
                          src={result.imageUrl || null}
                          name={result.userName}
                          username={result.userUsername}
                          size="lg"
                        />
                      ) : (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{result.title}</h3>
                          {result.type === 'user' && (
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