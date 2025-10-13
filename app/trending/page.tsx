'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAudioPlayer } from '@/app/providers';
import { 
  Play, 
  Pause, 
  Heart, 
  Headphones,
  TrendingUp,
  Clock,
  ArrowLeft,
  Share2,
  MoreHorizontal,
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
  const { playTrack, audioState } = useAudioPlayer();
  
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
      <div className="relative h-80 bg-gradient-to-b from-orange-900/40 via-red-800/20 to-[var(--background)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(239,68,68,0.1),transparent_50%)]"></div>
        
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-8">
          <button
            onClick={() => router.back()}
            className="absolute top-6 left-6 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>

          <div className="flex items-end gap-6">
            <div className="w-56 h-56 rounded-lg shadow-2xl bg-gradient-to-br from-orange-600 via-red-500 to-pink-500 flex items-center justify-center">
              <Flame size={80} className="text-white" />
            </div>
            
            <div className="flex-1 text-white pb-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/30 backdrop-blur-sm border border-orange-400/30">
                  PLAYLIST
                </span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-bold mb-4 drop-shadow-lg">Les plus écoutées</h1>
              <p className="text-lg text-white/80 mb-4">Les musiques les plus populaires en ce moment sur XimaM</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold">XimaM</span>
                <span className="text-white/60">•</span>
                <span className="text-white/80">{tracks.length} titres</span>
                <span className="text-white/60">•</span>
                <span className="text-white/80 flex items-center gap-1">
                  <TrendingUp size={14} />
                  Mis à jour en temps réel
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => tracks.length > 0 && handlePlayTrack(tracks[0])}
            className="w-14 h-14 rounded-full bg-[var(--color-primary)] hover:scale-105 transition-transform flex items-center justify-center shadow-lg"
          >
            <Play size={24} className="text-white ml-1" fill="white" />
          </button>
          
          <button className="p-3 rounded-full hover:bg-[var(--surface-2)] transition-colors">
            <Heart size={24} className="text-[var(--text-muted)]" />
          </button>
          
          <button className="p-3 rounded-full hover:bg-[var(--surface-2)] transition-colors">
            <Share2 size={24} className="text-[var(--text-muted)]" />
          </button>
          
          <button className="p-3 rounded-full hover:bg-[var(--surface-2)] transition-colors">
            <MoreHorizontal size={24} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Liste des tracks */}
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[16px_4fr_2fr_1fr_80px] gap-4 px-4 py-2 text-sm text-[var(--text-muted)] border-b border-[var(--border)]">
            <div className="text-center">#</div>
            <div>Titre</div>
            <div className="hidden sm:block">Genre</div>
            <div className="hidden md:flex items-center gap-1">
              <Clock size={16} />
            </div>
            <div className="text-center">
              <Headphones size={16} className="inline" />
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
                className={`grid grid-cols-[16px_4fr_2fr_1fr_80px] gap-4 px-4 py-3 rounded-lg hover:bg-[var(--surface-2)] transition-colors cursor-pointer group ${
                  isTopThree ? 'bg-gradient-to-r from-orange-500/5 to-transparent' : ''
                }`}
              >
                {/* Numéro / Play icon */}
                <div className="flex items-center justify-center text-[var(--text-muted)]">
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
                      <Play size={16} className="hidden group-hover:block" fill="currentColor" />
                    </>
                  )}
                </div>

                {/* Titre et artiste */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <img
                      src={track.coverUrl || '/default-cover.jpg'}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-cover.jpg';
                      }}
                    />
                    {isTopThree && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Flame size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--text)] truncate flex items-center gap-2">
                      {track.title}
                      {String(track._id || '').startsWith('ai-') && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600/20 text-purple-400 border border-purple-500/30">
                          IA
                        </span>
                      )}
                      {isTopThree && (
                        <TrendingUp size={14} className="text-orange-500" />
                      )}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] truncate">
                      {track.artist?.name || track.artist?.username || 'Artiste inconnu'}
                    </div>
                  </div>
                </div>

                {/* Genre */}
                <div className="hidden sm:flex items-center text-sm text-[var(--text-muted)] truncate">
                  {track.genre?.[0] || 'Musique'}
                </div>

                {/* Durée */}
                <div className="hidden md:flex items-center text-sm text-[var(--text-muted)]">
                  {formatDuration(track.duration)}
                </div>

                {/* Lectures */}
                <div className="flex items-center justify-center text-sm text-[var(--text-muted)]">
                  <span className={isTopThree ? 'font-semibold text-orange-500' : ''}>
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

