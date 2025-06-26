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
  const [currentSlide, setCurrentSlide] = useState(0);
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

  // Carrousel automatique
  useEffect(() => {
    if (audioState.tracks.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => 
        prev === Math.min(4, audioState.tracks.length - 1) ? 0 : prev + 1
      );
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [audioState.tracks.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev === Math.min(4, audioState.tracks.length - 1) ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.min(4, audioState.tracks.length - 1) : prev - 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
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

  // Obtenir les 5 premières pistes pour le carrousel
  const trendingTracks = audioState.tracks.slice(0, 5);
  const remainingTracks = audioState.tracks.slice(5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Chargement des musiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
      {/* Bannière Carrousel des Tendances */}
      {trendingTracks.length > 0 && (
        <div className="relative w-full h-96 mb-8">
          <div className="relative w-full h-full overflow-hidden">
            {/* Carrousel */}
            <div 
              ref={carouselRef}
              className="flex w-full h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {trendingTracks.map((track, index) => (
                <div key={track._id} className="w-full h-full flex-shrink-0 relative group">
                  {/* Image de fond avec overlay */}
                  <div className="absolute inset-0">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20"></div>
                  </div>
                  
                  {/* Contenu du slide */}
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center max-w-2xl">
                      {/* Cover avec effet hover */}
                      <div className="relative mx-auto mb-6 group">
                        <div className="relative w-48 h-48 mx-auto">
                          <img
                            src={track.coverUrl || '/default-cover.jpg'}
                            alt={track.title}
                            className="w-full h-full rounded-2xl object-cover shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/40 transition-colors duration-300"></div>
                          
                          {/* Bouton play/pause */}
                          <button
                            onClick={() => playTrack(track._id)}
                            className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                          >
                            {currentTrack?._id === track._id && audioState.isPlaying ? (
                              <Pause size={48} fill="white" className="text-white" />
                            ) : (
                              <Play size={48} fill="white" className="text-white ml-2" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-3">
                        <h2 className="text-4xl font-bold truncate text-shadow-lg">{track.title}</h2>
                        <p className="text-xl text-gray-300 truncate">
                          {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                        </p>
                        <div className="flex items-center justify-center space-x-6 text-sm text-gray-300">
                          <span>{formatDuration(track.duration)}</span>
                          <span>{formatNumber(track.plays)} écoutes</span>
                          <span>{formatNumber(track.likes.length)} likes</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex items-center justify-center space-x-4">
                        <button
                          onClick={() => handleLike(track._id)}
                          className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
                            track.isLiked || track.likes.includes(user?.id || '')
                              ? 'text-red-500 bg-red-500/20 hover:bg-red-500/30'
                              : 'text-white bg-white/20 hover:bg-white/30'
                          }`}
                        >
                          <Heart size={24} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contrôles de navigation */}
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-all duration-300 transform hover:scale-110"
            >
              <ChevronLeft size={28} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-all duration-300 transform hover:scale-110"
            >
              <ChevronRight size={28} />
            </button>

            {/* Indicateurs de points */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3">
              {trendingTracks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 transform hover:scale-125 ${
                    index === currentSlide ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Liste des autres pistes */}
      <div className="px-6 pb-32">
        <h2 className="text-xl font-semibold mb-6">
          {remainingTracks.length > 0 ? 'Autres musiques' : 'Aucune autre musique'}
        </h2>
        
        {audioState.tracks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Aucune musique n'a été uploadée pour le moment</p>
            <a
              href="/upload"
              className="bg-primary-500 text-white px-6 py-3 rounded-full font-medium hover:bg-primary-600 transition-colors"
            >
              Uploader la première musique
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {remainingTracks.map((track) => (
              <div
                key={track._id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/15 transition-all duration-300"
              >
                <div className="flex items-center space-x-4">
                  {/* Cover */}
                  <div className="relative">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <button
                      onClick={() => playTrack(track._id)}
                      className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Play size={20} fill="white" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{track.title}</h3>
                    <p className="text-gray-300 text-sm truncate">
                      {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                      <span>{formatDuration(track.duration)}</span>
                      <span>{formatNumber(track.plays)} écoutes</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLike(track._id)}
                      className={`p-2 rounded-full transition-colors ${
                        track.isLiked || track.likes.includes(user?.id || '')
                          ? 'text-red-500 bg-red-500/20'
                          : 'text-gray-400 hover:text-red-500 hover:bg-red-500/20'
                      }`}
                    >
                      <Heart size={18} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                    </button>
                    <span className="text-xs text-gray-400">
                      {formatNumber(track.likes.length)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 