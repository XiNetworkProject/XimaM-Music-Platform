'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import { Play, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

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
    }, 4000); // Change toutes les 4 secondes

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
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">XimaM</h1>
            <p className="text-gray-300">Découvrez de nouvelles musiques</p>
          </div>
          {session ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-300">Bonjour, {user?.name || session.user?.name}</span>
              {user?.avatar && (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
            </div>
          ) : (
            <a
              href="/auth/signin"
              className="bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors"
            >
              Se connecter
            </a>
          )}
        </div>
      </div>

      {/* Bannière Carrousel des Tendances */}
      {trendingTracks.length > 0 && (
        <div className="relative w-full h-80 mb-8">
          <div className="relative w-full h-full overflow-hidden">
            {/* Carrousel */}
            <div 
              ref={carouselRef}
              className="flex w-full h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {trendingTracks.map((track, index) => (
                <div key={track._id} className="w-full h-full flex-shrink-0 relative">
                  {/* Image de fond avec overlay */}
                  <div className="absolute inset-0">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  </div>
                  
                  {/* Contenu du slide */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-end space-x-4">
                      {/* Cover */}
                      <div className="relative">
                        <img
                          src={track.coverUrl || '/default-cover.jpg'}
                          alt={track.title}
                          className="w-20 h-20 rounded-xl object-cover shadow-lg"
                        />
                        <button
                          onClick={() => playTrack(track._id)}
                          className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Play size={24} fill="white" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold truncate mb-1">{track.title}</h2>
                        <p className="text-gray-300 text-lg truncate mb-2">
                          {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-300">
                          <span>{formatDuration(track.duration)}</span>
                          <span>{formatNumber(track.plays)} écoutes</span>
                          <span>{formatNumber(track.likes.length)} likes</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleLike(track._id)}
                          className={`p-3 rounded-full transition-colors ${
                            track.isLiked || track.likes.includes(user?.id || '')
                              ? 'text-red-500 bg-red-500/20'
                              : 'text-white hover:text-red-500 hover:bg-red-500/20'
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
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={24} />
            </button>

            {/* Indicateurs de points */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {trendingTracks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-white' : 'bg-white/50'
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