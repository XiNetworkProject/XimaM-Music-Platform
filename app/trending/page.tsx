'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { 
  Play, 
  Pause, 
  Headphones,
  TrendingUp,
  Clock,
  ArrowLeft,
  Flame
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Track {
  _id: string;
  title: string;
  artist: {
    _id: string;
    username: string;
    name: string;
    avatar?: string;
  };
  coverUrl?: string;
  audioUrl: string;
  duration: number;
  genre?: string[];
  plays: number;
  likes: string[];
  comments: string[];
  createdAt?: string;
  rankingScore?: number;
}

export default function TrendingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { playTrack, audioState, setTracks: setAudioTracks, setCurrentTrackIndex } = useAudioPlayer();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  useEffect(() => {
    fetchTrendingTracks();
  }, []);

  const fetchTrendingTracks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tracks/trending?limit=100');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger les musiques');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track: Track) => {
    // Charger toutes les pistes dans le lecteur et jouer celle sélectionnée
    const trackIndex = tracks.findIndex(t => t._id === track._id);
    setAudioTracks(tracks);
    setCurrentTrackIndex(trackIndex >= 0 ? trackIndex : 0);
    playTrack(track);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getLikesCount = (likes: number | string[]) => {
    return Array.isArray(likes) ? likes.length : likes || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      {/* Header avec image de fond */}
      <div className="relative h-64 sm:h-80 bg-gradient-to-b from-orange-900/40 via-red-800/20 to-[var(--background)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(239,68,68,0.1),transparent_50%)]"></div>
        
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-6 sm:pb-8">
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={20} className="text-white sm:w-6 sm:h-6" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-lg shadow-2xl bg-gradient-to-br from-orange-600 via-red-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Flame size={48} className="text-white sm:w-16 sm:h-16" />
            </div>
            
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/30 backdrop-blur-sm border border-orange-400/30">
                  PLAYLIST
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-2 sm:mb-4 drop-shadow-lg">Les plus écoutées</h1>
              <p className="text-sm sm:text-base lg:text-lg text-white/80 mb-2 sm:mb-4 line-clamp-2">Les musiques les plus populaires en ce moment</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className="text-white/80 font-medium">{tracks.length} titres</span>
                <span className="text-white/60 hidden sm:inline">•</span>
                <span className="text-white/80 flex items-center gap-1">
                  <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Mis à jour en temps réel</span>
                  <span className="sm:hidden">Temps réel</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6 relative z-10">
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => {
              if (tracks.length > 0) {
                // Jouer toutes les pistes dans l'ordre
                setAudioTracks(tracks);
                setCurrentTrackIndex(0);
                playTrack(tracks[0]);
              }
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--color-primary)] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg"
          >
            {currentTrack && tracks.some(t => t._id === currentTrack._id) && audioState.isPlaying ? (
              <Pause size={20} className="text-white sm:w-6 sm:h-6" fill="white" />
            ) : (
              <Play size={20} className="text-white ml-0.5 sm:w-6 sm:h-6 sm:ml-1" fill="white" />
            )}
          </button>
        </div>

        {/* Liste des tracks */}
        <div className="space-y-0.5 sm:space-y-1">
          {/* Header - Desktop only */}
          <div className="hidden sm:grid grid-cols-[40px_1fr_minmax(120px,200px)_80px_100px] gap-3 lg:gap-4 px-3 sm:px-4 py-2 text-xs sm:text-sm text-[var(--text-muted)] border-b border-[var(--border)]">
            <div className="text-center">#</div>
            <div>Titre</div>
            <div>Genre</div>
            <div className="flex items-center justify-center gap-1">
              <Clock size={14} />
            </div>
            <div className="flex items-center justify-center gap-1">
              <Headphones size={14} />
            </div>
          </div>

          {/* Tracks */}
          {tracks.map((track, index) => {
            const isPlaying = currentTrack?._id === track._id && audioState.isPlaying;
            const isTopThree = index < 3;
            
            return (
              <div
                key={track._id}
                onClick={() => handlePlayTrack(track)}
                className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[40px_1fr_minmax(120px,200px)_80px_100px] gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] transition-colors cursor-pointer group ${
                  isTopThree ? 'bg-gradient-to-r from-orange-500/5 to-transparent' : ''
                }`}
              >
                {/* Numéro / Play icon - Desktop */}
                <div className="hidden sm:flex items-center justify-center text-[var(--text-muted)] w-10">
                  {isPlaying ? (
                    <div className="flex gap-0.5 items-end h-4">
                      <div className="w-0.5 h-2 bg-[var(--color-primary)] animate-[music-bar-1_0.8s_ease-in-out_infinite]"></div>
                      <div className="w-0.5 h-3 bg-[var(--color-primary)] animate-[music-bar-2_0.8s_ease-in-out_0.2s_infinite]"></div>
                      <div className="w-0.5 h-2.5 bg-[var(--color-primary)] animate-[music-bar-3_0.8s_ease-in-out_0.4s_infinite]"></div>
                    </div>
                  ) : (
                    <>
                      <span className={`group-hover:hidden text-sm font-semibold ${
                        isTopThree ? 'text-orange-500' : ''
                      }`}>
                        {index + 1}
                      </span>
                      <Play size={14} className="hidden group-hover:block" fill="currentColor" />
                    </>
                  )}
                </div>

                {/* Titre et artiste */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 col-span-1">
                  {/* Numéro / Play icon - Mobile */}
                  <div className="sm:hidden flex-shrink-0">
                    {isPlaying ? (
                      <div className="flex gap-0.5 items-end h-4 w-4">
                        <div className="w-0.5 h-2 bg-[var(--color-primary)] animate-[music-bar-1_0.8s_ease-in-out_infinite]"></div>
                        <div className="w-0.5 h-3 bg-[var(--color-primary)] animate-[music-bar-2_0.8s_ease-in-out_0.2s_infinite]"></div>
                        <div className="w-0.5 h-2.5 bg-[var(--color-primary)] animate-[music-bar-3_0.8s_ease-in-out_0.4s_infinite]"></div>
                      </div>
                    ) : (
                      <div className="relative w-5 h-5 flex items-center justify-center">
                        {isTopThree && (
                          <Flame size={10} className="absolute text-orange-500" />
                        )}
                        <span className={`text-xs font-bold ${isTopThree ? 'text-orange-500' : 'text-[var(--text-muted)]'}`}>
                          {index + 1}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                      }}
                    />
                    {isTopThree && (
                      <div className="hidden sm:block absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                        <Flame size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base text-[var(--text)] truncate flex items-center gap-1.5">
                      <span className="truncate">{track.title}</span>
                      {String(track._id || '').startsWith('ai-') && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-purple-600/20 text-purple-400 border border-purple-500/30 flex-shrink-0">
                          IA
                        </span>
                      )}
                      {isTopThree && (
                        <TrendingUp size={12} className="text-orange-500 flex-shrink-0 hidden sm:inline" />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--text-muted)] truncate">
                      {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                    </div>
                  </div>
                </div>

                {/* Genre - Desktop */}
                <div className="hidden sm:flex items-center text-sm text-[var(--text-muted)] truncate">
                  {track.genre?.[0] || 'Musique'}
                </div>

                {/* Durée - Desktop */}
                <div className="hidden sm:flex items-center justify-center text-sm text-[var(--text-muted)]">
                  {formatDuration(track.duration)}
                </div>

                {/* Lectures */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end sm:justify-center gap-0.5 sm:gap-0 text-xs sm:text-sm text-[var(--text-muted)]">
                  <span className="sm:hidden text-[10px] opacity-60">
                    <Headphones size={10} className="inline mr-0.5" />
                  </span>
                  <span className={`font-medium ${isTopThree ? 'text-orange-500 sm:font-semibold' : ''}`}>
                    {formatNumber(track.plays || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
            <p>Aucune musique tendance pour le moment</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes music-bar-1 {
          0%, 100% { height: 0.5rem; }
          50% { height: 1rem; }
        }
        @keyframes music-bar-2 {
          0%, 100% { height: 0.75rem; }
          50% { height: 1.25rem; }
        }
        @keyframes music-bar-3 {
          0%, 100% { height: 0.625rem; }
          50% { height: 1.125rem; }
        }
      `}</style>
    </div>
  );
}

