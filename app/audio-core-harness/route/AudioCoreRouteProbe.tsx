'use client';

import { useRouter } from 'next/navigation';
import { useAudioPlayer, useAudioTime } from '@/app/providers';

export default function AudioCoreRouteProbe() {
  const router = useRouter();
  const player = useAudioPlayer();
  const time = useAudioTime();
  const current = player.audioState.tracks[player.audioState.currentTrackIndex];
  return (
    <main className="min-h-screen bg-black p-8 text-white" data-testid="audio-core-route-probe">
      <h1>Audio Core route probe</h1>
      <span data-testid="route-track-id">{current?._id || 'none'}</span>
      <span data-testid="route-playing">{String(player.audioState.isPlaying)}</span>
      <span data-testid="route-position">{time.currentTime.toFixed(2)}</span>
      <button data-testid="route-back" onClick={() => router.push('/audio-core-harness')}>Back to harness</button>
    </main>
  );
}
