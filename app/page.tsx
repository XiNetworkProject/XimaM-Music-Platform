'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import { Play, Heart, ChevronLeft, ChevronRight, Pause } from 'lucide-react';

interface Track {
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
}

export default function HomePage() {
  const { data: session } = useSession();
  const { user } = useAuth();
  const { isNative, checkForUpdates } = useNativeFeatures();
  const { audioState, setTracks, playTrack, handleLike } = useAudioPlayer();
  
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Obtenir la piste actuelle
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  // Charger les pistes depuis l'API
  useEffect(() => {
    if (hasLoaded) return; // Éviter les rechargements inutiles

    const fetchTracks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tracks?limit=20');
        if (response.ok) {
          const data = await response.json();
          setTracks(data.tracks || []);
        } else {
          console.error('Erreur lors du chargement des pistes');
        }
      } catch (error) {
        console.error('Erreur fetch tracks:', error);
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    };

    fetchTracks();
  }, []); // Dépendances vides pour ne s'exécuter qu'une seule fois

  useEffect(() => {
    // Vérifier les mises à jour au démarrage (mobile uniquement)
    if (isNative) {
      checkForUpdates().then(update => {
        if (update) {
          // Afficher la dialog de mise à jour
          console.log('Mise à jour disponible:', update);
        }
      });
    }
  }, [isNative, checkForUpdates]);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Chargement des musiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Section Tendances */}
      {audioState.tracks.length > 0 && (
        <div className="pt-8 pb-16">
          <div className="px-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Tendances</h2>
            <p className="text-gray-400">Les musiques les plus populaires</p>
          </div>
          
          <div className="relative group">
            {/* Bouton gauche */}
            <button
              onClick={scrollLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/90"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Carrousel */}
            <div 
              ref={carouselRef}
              className="flex gap-4 px-8 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {audioState.tracks.map((track) => (
                <div
                  key={track._id}
                  className="flex-shrink-0 w-64 group/track"
                >
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300">
                    {/* Cover */}
                    <div className="relative aspect-square">
                      <img
                        src={track.coverUrl || '/default-cover.jpg'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay avec bouton play */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/track:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={() => playTrack(track._id)}
                          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                        >
                          {currentTrack?._id === track._id && audioState.isPlaying ? (
                            <Pause size={24} fill="white" />
                          ) : (
                            <Play size={24} fill="white" className="ml-1" />
                          )}
                        </button>
                      </div>

                      {/* Badge durée */}
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(track.duration)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate mb-1">
                        {track.title}
                      </h3>
                      <p className="text-gray-400 text-sm truncate mb-3">
                        {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                      </p>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatNumber(track.plays)} écoutes</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLike(track._id)}
                            className={`transition-colors ${
                              track.isLiked || track.likes.includes(user?.id || '')
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={14} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                          </button>
                          <span>{formatNumber(track.likes.length)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bouton droit */}
            <button
              onClick={scrollRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/90"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Section Découvertes */}
      {audioState.tracks.length > 0 && (
        <div className="pb-16">
          <div className="px-8 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Découvertes</h2>
            <p className="text-gray-400">Nouvelles musiques à explorer</p>
          </div>
          
          <div className="relative group">
            <button
              onClick={scrollLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/90"
            >
              <ChevronLeft size={24} />
            </button>

            <div 
              ref={carouselRef}
              className="flex gap-4 px-8 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {audioState.tracks.slice().reverse().map((track) => (
                <div
                  key={track._id}
                  className="flex-shrink-0 w-64 group/track"
                >
                  <div className="relative bg-gray-900 rounded-lg overflow-hidden hover:scale-105 transition-transform duration-300">
                    <div className="relative aspect-square">
                      <img
                        src={track.coverUrl || '/default-cover.jpg'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/track:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button
                          onClick={() => playTrack(track._id)}
                          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                        >
                          {currentTrack?._id === track._id && audioState.isPlaying ? (
                            <Pause size={24} fill="white" />
                          ) : (
                            <Play size={24} fill="white" className="ml-1" />
                          )}
                        </button>
                      </div>

                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(track.duration)}
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate mb-1">
                        {track.title}
                      </h3>
                      <p className="text-gray-400 text-sm truncate mb-3">
                        {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatNumber(track.plays)} écoutes</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLike(track._id)}
                            className={`transition-colors ${
                              track.isLiked || track.likes.includes(user?.id || '')
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={14} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                          </button>
                          <span>{formatNumber(track.likes.length)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={scrollRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/90"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      {/* Message si aucune musique */}
      {audioState.tracks.length === 0 && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-400 mb-4 text-lg">Aucune musique n'a été uploadée pour le moment</p>
            <a
              href="/upload"
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Uploader la première musique
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 