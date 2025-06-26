'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { useAudioPlayer } from './providers';
import { Play, Heart, ChevronLeft, ChevronRight, Pause, Clock, Headphones, Users, TrendingUp, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Obtenir la piste actuelle
  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  // Charger les pistes depuis l'API
  useEffect(() => {
    if (hasLoaded) return;

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
  }, []);

  // Auto-play du carrousel
  useEffect(() => {
    if (!isAutoPlaying || audioState.tracks.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(audioState.tracks.length, 5));
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, audioState.tracks.length]);

  useEffect(() => {
    if (isNative) {
      checkForUpdates().then(update => {
        if (update) {
          console.log('Mise à jour disponible:', update);
        }
      });
    }
  }, [isNative, checkForUpdates]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.min(audioState.tracks.length, 5));
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.min(audioState.tracks.length, 5)) % Math.min(audioState.tracks.length, 5));
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
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

  const featuredTracks = audioState.tracks.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Carrousel Hero - Plein écran */}
      {featuredTracks.length > 0 && (
        <section className="relative h-screen overflow-hidden">
          {/* Fond animé */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-blue-900/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)] animate-pulse"></div>
          </div>

          {/* Carrousel principal */}
          <div className="relative h-full">
            <AnimatePresence mode="wait">
              {featuredTracks[currentSlide] && (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  {/* Image de fond avec effet parallax */}
                  <div className="absolute inset-0">
                    <motion.img
                      src={featuredTracks[currentSlide].coverUrl || '/default-cover.jpg'}
                      alt={featuredTracks[currentSlide].title}
                      className="w-full h-full object-cover"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent"></div>
                  </div>

                  {/* Contenu principal */}
                  <div className="relative h-full flex items-end">
                    <div className="container mx-auto px-8 pb-32">
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="max-w-4xl"
                      >
                        {/* Badge tendance */}
                        <motion.div
                          initial={{ opacity: 0, x: -50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full mb-6 backdrop-blur-sm"
                        >
                          <TrendingUp size={16} />
                          <span className="font-medium">Tendance #1</span>
                        </motion.div>

                        {/* Titre */}
                        <motion.h1
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.8 }}
                          className="text-6xl md:text-7xl font-bold text-white mb-4 leading-tight"
                        >
                          {featuredTracks[currentSlide].title}
                        </motion.h1>

                        {/* Artiste */}
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9, duration: 0.6 }}
                          className="text-2xl md:text-3xl text-gray-300 mb-8"
                        >
                          {featuredTracks[currentSlide].artist?.name || featuredTracks[currentSlide].artist?.username || 'Artiste inconnu'}
                        </motion.p>

                        {/* Stats et actions */}
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.1, duration: 0.8 }}
                          className="flex flex-wrap items-center gap-6 mb-8"
                        >
                          {/* Stats */}
                          <div className="flex items-center space-x-6 text-lg text-gray-300">
                            <div className="flex items-center space-x-2">
                              <Headphones size={20} className="text-purple-400" />
                              <span>{formatNumber(featuredTracks[currentSlide].plays)} écoutes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users size={20} className="text-pink-400" />
                              <span>{formatNumber(featuredTracks[currentSlide].likes.length)} likes</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock size={20} className="text-blue-400" />
                              <span>{formatDuration(featuredTracks[currentSlide].duration)}</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Boutons d'action */}
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.3, duration: 0.8 }}
                          className="flex flex-wrap items-center gap-4"
                        >
                          {/* Bouton Play */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => playTrack(featuredTracks[currentSlide]._id)}
                            className="flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-purple-500/25"
                          >
                            {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? (
                              <Pause size={24} />
                            ) : (
                              <Play size={24} className="ml-1" />
                            )}
                            <span>
                              {currentTrack?._id === featuredTracks[currentSlide]._id && audioState.isPlaying ? 'Pause' : 'Écouter'}
                            </span>
                          </motion.button>

                          {/* Bouton Like */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleLike(featuredTracks[currentSlide]._id)}
                            className={`flex items-center space-x-3 px-6 py-4 rounded-full font-semibold transition-all duration-300 backdrop-blur-sm ${
                              featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '')
                                ? 'text-red-500 bg-red-500/20 border border-red-500/30'
                                : 'text-white bg-white/10 border border-white/20 hover:bg-white/20'
                            }`}
                          >
                            <Heart 
                              size={20} 
                              fill={featuredTracks[currentSlide].isLiked || featuredTracks[currentSlide].likes.includes(user?.id || '') ? 'currentColor' : 'none'} 
                            />
                            <span>J'aime</span>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation du carrousel */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center space-x-4">
                {/* Bouton précédent */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </motion.button>

                {/* Indicateurs */}
                <div className="flex items-center space-x-2">
                  {featuredTracks.map((_, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? 'bg-white scale-125' 
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>

                {/* Bouton suivant */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <ChevronRight size={24} />
                </motion.button>
              </div>
            </div>

            {/* Effet de particules flottantes */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-white/20 rounded-full"
                  animate={{
                    x: [0, Math.random() * window.innerWidth],
                    y: [0, Math.random() * window.innerHeight],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    left: Math.random() * 100 + '%',
                    top: Math.random() * 100 + '%',
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section autres musiques */}
      {audioState.tracks.length > 5 && (
        <section className="py-16 bg-gradient-to-b from-transparent to-gray-900/50">
          <div className="container mx-auto px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-white mb-4">Découvrir plus</h2>
              <p className="text-gray-400 text-lg">Explorez notre collection de musiques</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {audioState.tracks.slice(5).map((track, index) => (
                <motion.div
                  key={track._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="group cursor-pointer"
                >
                  <div className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                    {/* Cover */}
                    <div className="relative aspect-square">
                      <img
                        src={track.coverUrl || '/default-cover.jpg'}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      
                      {/* Overlay avec bouton play */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => playTrack(track._id)}
                          className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                        >
                          {currentTrack?._id === track._id && audioState.isPlaying ? (
                            <Pause size={24} fill="white" />
                          ) : (
                            <Play size={24} fill="white" className="ml-1" />
                          )}
                        </motion.button>
                      </div>

                      {/* Badge durée */}
                      <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        {formatDuration(track.duration)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate mb-1 group-hover:text-purple-300 transition-colors">
                        {track.title}
                      </h3>
                      <p className="text-gray-300 text-sm truncate mb-3">
                        {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                      </p>
                      
                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatNumber(track.plays)} écoutes</span>
                        <div className="flex items-center space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => handleLike(track._id)}
                            className={`transition-colors ${
                              track.isLiked || track.likes.includes(user?.id || '')
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart size={14} fill={track.isLiked || track.likes.includes(user?.id || '') ? 'currentColor' : 'none'} />
                          </motion.button>
                          <span>{formatNumber(track.likes.length)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
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