'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNativeFeatures } from '@/hooks/useNativeFeatures';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Heart, X, Minimize2, Maximize2 } from 'lucide-react';

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

interface AudioPlayerProps {
  tracks: Track[];
  currentTrackIndex?: number;
  isPlaying?: boolean;
  isMinimized?: boolean;
  onTrackChange?: (index: number) => void;
  onPlayPause?: (playing: boolean) => void;
  onLike?: (trackId: string) => void;
  onClose?: () => void;
  onMinimize?: (minimized: boolean) => void;
}

export default function AudioPlayer({ 
  tracks, 
  currentTrackIndex = 0, 
  isPlaying = false,
  isMinimized = false,
  onTrackChange, 
  onPlayPause,
  onLike,
  onClose,
  onMinimize
}: AudioPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [showVolume, setShowVolume] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { isNative, showNotification } = useNativeFeatures();

  const currentTrack = tracks[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying && currentTrack) {
      playTrack();
    } else if (!isPlaying) {
      pauseTrack();
    }
  }, [isPlaying, currentTrackIndex]);

  const playTrack = async () => {
    if (!currentTrack) return;

    try {
      if (audioRef.current) {
        await audioRef.current.play();
        onPlayPause?.(true);
        
        if (isNative) {
          await showNotification(
            'Lecture en cours',
            `${currentTrack.title} - ${currentTrack.artist?.name || currentTrack.artist?.username}`
          );
        }
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      onPlayPause?.(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // Fin de la playlist
      }
    }
    
    onTrackChange?.(nextIndex);
  };

  const previousTrack = () => {
    if (tracks.length === 0) return;
    
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = tracks.length - 1;
      } else {
        return; // Début de la playlist
      }
    }
    
    onTrackChange?.(prevIndex);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      // Rejouer la même piste
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        playTrack();
      }
    } else {
      nextTrack();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const toggleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLike = () => {
    if (onLike && currentTrack) {
      onLike(currentTrack._id);
    }
  };

  const handleClose = () => {
    // Ne pas arrêter la musique automatiquement
    // pauseTrack();
    onClose?.();
  };

  const handleMinimize = (minimized: boolean) => {
    onMinimize?.(minimized);
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50">
      {/* Audio element - toujours présent */}
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Version minimisée */}
      {isMinimized ? (
        <div className="bg-black/90 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <img
                src={currentTrack.coverUrl || '/default-cover.jpg'}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{currentTrack.title}</h4>
                <p className="text-xs text-gray-400 truncate">
                  {currentTrack.artist?.name || currentTrack.artist?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={togglePlay}
                className="p-2 rounded-full bg-white text-black hover:bg-gray-200"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              
              <button
                onClick={() => handleMinimize(false)}
                className="p-2 rounded-full text-gray-400 hover:text-white"
              >
                <Maximize2 size={16} />
              </button>
              
              <button
                onClick={handleClose}
                className="p-2 rounded-full text-gray-400 hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Version complète */
        <div className="bg-black/90 backdrop-blur-md rounded-xl p-4 shadow-2xl border border-white/10">
          {/* Header avec contrôles de fenêtre */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <img
                src={currentTrack.coverUrl || '/default-cover.jpg'}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h4 className="font-medium truncate">{currentTrack.title}</h4>
                <p className="text-sm text-gray-400 truncate">
                  {currentTrack.artist?.name || currentTrack.artist?.username}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleMinimize(true)}
                className="p-2 rounded-full text-gray-400 hover:text-white"
              >
                <Minimize2 size={16} />
              </button>
              
              <button
                onClick={handleClose}
                className="p-2 rounded-full text-gray-400 hover:text-red-400"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>{formatDuration(currentTime)}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-1 relative">
                <div
                  className="bg-primary-500 h-1 rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Main controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-full ${isShuffled ? 'text-primary-500' : 'text-gray-400'} hover:text-white`}
              >
                <Shuffle size={18} />
              </button>
              
              <button
                onClick={previousTrack}
                className="p-2 rounded-full text-white hover:bg-white/10"
              >
                <SkipBack size={20} />
              </button>
            </div>

            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-white text-black hover:bg-gray-200"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={nextTrack}
                className="p-2 rounded-full text-white hover:bg-white/10"
              >
                <SkipForward size={20} />
              </button>
              
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded-full ${repeatMode !== 'none' ? 'text-primary-500' : 'text-gray-400'} hover:text-white`}
              >
                <Repeat size={18} />
              </button>
            </div>
          </div>

          {/* Volume and like */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleLike}
              className={`p-2 rounded-full ${
                currentTrack.isLiked ? 'text-red-500' : 'text-gray-400'
              } hover:text-red-500`}
            >
              <Heart size={18} fill={currentTrack.isLiked ? 'currentColor' : 'none'} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowVolume(!showVolume)}
                className="p-2 rounded-full text-gray-400 hover:text-white"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              
              {showVolume && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 p-3 rounded-lg">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 