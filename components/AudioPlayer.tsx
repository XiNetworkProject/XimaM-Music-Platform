'use client';

import { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from '@/app/providers';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AudioPlayer() {
  const { audioState, setIsPlaying, setCurrentTrackIndex } = useAudioPlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioState.isPlaying && currentTrack) {
      playTrack();
    } else if (!audioState.isPlaying) {
      pauseTrack();
    }
  }, [audioState.isPlaying, audioState.currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.load();
      if (audioState.isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Erreur lecture nouvelle piste:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack, audioState.isPlaying, setIsPlaying]);

  const playTrack = async () => {
    if (!currentTrack) return;

    try {
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur lecture audio:', error);
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (audioState.isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  };

  const nextTrack = () => {
    if (audioState.tracks.length === 0) return;
    
    let nextIndex = audioState.currentTrackIndex + 1;
    if (nextIndex >= audioState.tracks.length) {
      nextIndex = 0; // Retour au début
    }
    
    setCurrentTrackIndex(nextIndex);
  };

  const previousTrack = () => {
    if (audioState.tracks.length === 0) return;
    
    let prevIndex = audioState.currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = audioState.tracks.length - 1; // Aller à la fin
    }
    
    setCurrentTrackIndex(prevIndex);
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
    // Passer à la piste suivante
    nextTrack();
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioState.showPlayer || !currentTrack) {
    return null;
  }

  return (
    <>
      {/* Élément audio caché */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={(e) => {
          console.error('Erreur audio:', e);
          setIsPlaying(false);
        }}
      />

      {/* Interface du lecteur */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className={`fixed bottom-20 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40 ${
          audioState.isMinimized ? 'h-16' : 'h-24'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 h-full">
          {/* Informations de la piste */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <img
              src={currentTrack.coverUrl || '/default-cover.jpg'}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-medium truncate text-sm">
                {currentTrack.title}
              </h3>
              <p className="text-gray-400 text-xs truncate">
                {currentTrack.artist.name}
              </p>
            </div>
          </div>

          {/* Contrôles principaux */}
          <div className="flex items-center space-x-4">
            <button
              onClick={previousTrack}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={audioState.tracks.length <= 1}
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors"
            >
              {audioState.isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={nextTrack}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={audioState.tracks.length <= 1}
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Contrôles de volume */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Barre de progression */}
        {!audioState.isMinimized && (
          <div className="px-4 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 w-8">
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-400 w-8">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
} 