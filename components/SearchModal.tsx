'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Play, Heart, User, Music, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import { UButton } from '@/components/ui/UnifiedUI';

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

  const stableOnClose = useCallback(onClose, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') stableOnClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, stableOnClose]);

  useEffect(() => {
    if (query.trim()) {
      setIsLoading(true);
      const searchData = async () => {
        try {
          const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=10`);
          if (res.ok) {
            const data = await res.json();
            const formattedResults: SearchResult[] = [];
            
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
            
            if (data.tracks) {
              data.tracks.forEach((track: any) => {
                formattedResults.push({
                  _id: track._id || track.id,
                  type: 'track',
                  title: track.title,
                  subtitle: track.artist?.name || track.artist?.username || 'Artiste inconnu',
                  imageUrl: track.coverUrl || '/default-cover.svg',
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
      
      const timeoutId = setTimeout(searchData, 100);
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
      router.push(`/tracks/${result._id}`);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-0 left-0 right-0 bg-[#0c0c14]/98 backdrop-blur-2xl border-b border-white/[0.08]"
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
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.04] rounded-xl border border-white/[0.08] focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] focus:outline-none text-white placeholder-white/60 transition"
                    autoFocus
                  />
                </div>
                <UButton variant="secondary" size="icon" onClick={onClose}>
                  <X size={20} />
                </UButton>
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
                       transition={{ duration: 0.1 }}
                       onClick={() => handleResultClick(result)}
                       className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
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
                          <button className="p-2 rounded-full hover:bg-white/[0.06] transition-colors">
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
