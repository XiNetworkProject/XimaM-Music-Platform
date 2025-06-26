'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import { Play, Heart, ChevronLeft, ChevronRight, Pause, Clock, Headphones, Users } from 'lucide-react';

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
      carouselRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 400, behavior: 'smooth' });
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Chargement des musiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Section Tendances */}
      {audioState.tracks.length > 0 && (
        <div className="pt-8 pb-16">
          <div className="px-8 mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Tendances
            </h2>
            <p className="text-gray-400 text-lg">Les musiques les plus populaires</p>
          </div>
          
          <div className="relative group">
            {/* Bouton gauche */}
            <button
              onClick={scrollLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80 border border-purple-500/30"
            >
              <ChevronLeft size={28} className="text-purple-400" />
            </button>

            {/* Carrousel */}
            <div 
              ref={carouselRef}
              className="flex gap-6 px-8 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {audioState.tracks.map((track) => (
                <div
                  key={track._id}
                  className="flex-shrink-0 w-96 group/track"
                >
                  <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden hover:scale-105 transition-all duration-500 border border-transparent hover:border-purple-500/50 shadow-2xl">
                    {/* Effet arc-en-ciel néon sur le bord */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 via-blue-500 via-green-500 via-yellow-500 via-orange-500 to-red-500 opacity-0 group-hover/track:opacity-20 transition-opacity duration-500 blur-sm"></div>
                    
                    <div className="relative flex h-48">
                      {/* Pochette d'album */}
                      <div className="relative w-48 h-full">
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay avec bouton play */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/track:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <button
                            onClick={() => playTrack(track._id)}
                            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 border border-white/30"
                          >
                            {currentTrack?._id === track._id && audioState.isPlaying ? (
                              <Pause size={28} fill="white" />
                            ) : (
                              <Play size={28} fill="white" className="ml-1" />
                            )}
                          </button>
                        </div>

                        {/* Badge durée */}
                        <div className="absolute top-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                          {formatDuration(track.duration)}
                        </div>
                      </div>

                      {/* Infos dans encadré moderne */}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        {/* Titre et artiste */}
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-white truncate group-hover/track:text-purple-300 transition-colors">
                            {track.title}
                          </h3>
                          <p className="text-gray-300 text-sm truncate">
                            {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                          </p>
                        </div>
                        
                        {/* Stats avec icônes */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Headphones size={14} />
                              <span>{formatNumber(track.plays)} écoutes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users size={14} />
                              <span>{formatNumber(track.likes.length)} likes</span>
                            </div>
                          </div>
                          
                          {/* Bouton like */}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleLike(track._id)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                                track.isLiked || track.likes.includes(user?.id || '')
                                  ? 'text-red-500 bg-red-500/20 border border-red-500/30'
                                  : 'text-gray-400 bg-gray-700/50 border border-gray-600/30 hover:text-red-500 hover:bg-red-500/20 hover:border-red-500/30'
                              }`}
                            >
                              <Heart size={16} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                              <span className="text-xs font-medium">J'aime</span>
                            </button>
                            
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Clock size={14} />
                              <span className="text-xs">{formatDuration(track.duration)}</span>
                            </div>
                          </div>
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
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80 border border-purple-500/30"
            >
              <ChevronRight size={28} className="text-purple-400" />
            </button>
          </div>
        </div>
      )}

      {/* Section Découvertes */}
      {audioState.tracks.length > 0 && (
        <div className="pb-16">
          <div className="px-8 mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Découvertes
            </h2>
            <p className="text-gray-400 text-lg">Nouvelles musiques à explorer</p>
          </div>
          
          <div className="relative group">
            <button
              onClick={scrollLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80 border border-blue-500/30"
            >
              <ChevronLeft size={28} className="text-blue-400" />
            </button>

            <div 
              ref={carouselRef}
              className="flex gap-6 px-8 overflow-x-auto scrollbar-hide scroll-smooth"
            >
              {audioState.tracks.slice().reverse().map((track) => (
                <div
                  key={track._id}
                  className="flex-shrink-0 w-96 group/track"
                >
                  <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden hover:scale-105 transition-all duration-500 border border-transparent hover:border-blue-500/50 shadow-2xl">
                    {/* Effet arc-en-ciel néon sur le bord */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 via-green-500 via-yellow-500 via-orange-500 via-red-500 to-purple-500 opacity-0 group-hover/track:opacity-20 transition-opacity duration-500 blur-sm"></div>
                    
                    <div className="relative flex h-48">
                      {/* Pochette d'album */}
                      <div className="relative w-48 h-full">
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay avec bouton play */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/track:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <button
                            onClick={() => playTrack(track._id)}
                            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200 border border-white/30"
                          >
                            {currentTrack?._id === track._id && audioState.isPlaying ? (
                              <Pause size={28} fill="white" />
                            ) : (
                              <Play size={28} fill="white" className="ml-1" />
                            )}
                          </button>
                        </div>

                        {/* Badge durée */}
                        <div className="absolute top-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                          {formatDuration(track.duration)}
                        </div>
                      </div>

                      {/* Infos dans encadré moderne */}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        {/* Titre et artiste */}
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-white truncate group-hover/track:text-blue-300 transition-colors">
                            {track.title}
                          </h3>
                          <p className="text-gray-300 text-sm truncate">
                            {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                          </p>
                        </div>
                        
                        {/* Stats avec icônes */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Headphones size={14} />
                              <span>{formatNumber(track.plays)} écoutes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users size={14} />
                              <span>{formatNumber(track.likes.length)} likes</span>
                            </div>
                          </div>
                          
                          {/* Bouton like */}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleLike(track._id)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-300 ${
                                track.isLiked || track.likes.includes(user?.id || '')
                                  ? 'text-red-500 bg-red-500/20 border border-red-500/30'
                                  : 'text-gray-400 bg-gray-700/50 border border-gray-600/30 hover:text-red-500 hover:bg-red-500/20 hover:border-red-500/30'
                              }`}
                            >
                              <Heart size={16} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                              <span className="text-xs font-medium">J'aime</span>
                            </button>
                            
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Clock size={14} />
                              <span className="text-xs">{formatDuration(track.duration)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={scrollRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80 border border-blue-500/30"
            >
              <ChevronRight size={28} className="text-blue-400" />
            </button>
          </div>
        </div>
      )}

      {/* Message si aucune musique */}
      {audioState.tracks.length === 0 && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-400 mb-6 text-lg">Aucune musique n'a été uploadée pour le moment</p>
            <a
              href="/upload"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Uploader la première musique
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 