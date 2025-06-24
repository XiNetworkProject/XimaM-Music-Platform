'use client';

import { useAudioPlayer } from '@/app/providers';
import AudioPlayer from './AudioPlayer';

export default function GlobalAudioPlayer() {
  const { audioState, setCurrentTrackIndex, setIsPlaying, setIsMinimized, handleLike, closePlayer } = useAudioPlayer();

  if (!audioState.showPlayer || audioState.tracks.length === 0) {
    return null;
  }

  return (
    <AudioPlayer
      tracks={audioState.tracks}
      currentTrackIndex={audioState.currentTrackIndex}
      isPlaying={audioState.isPlaying}
      isMinimized={audioState.isMinimized}
      onTrackChange={setCurrentTrackIndex}
      onPlayPause={setIsPlaying}
      onLike={handleLike}
      onClose={closePlayer}
      onMinimize={setIsMinimized}
    />
  );
} 