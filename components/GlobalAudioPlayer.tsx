'use client';

import { useAudioPlayer } from '@/app/providers';
import AudioPlayer from './AudioPlayer';

export default function GlobalAudioPlayer() {
  const { audioState } = useAudioPlayer();

  if (!audioState.showPlayer || audioState.tracks.length === 0) {
    return null;
  }

  return <AudioPlayer />;
} 