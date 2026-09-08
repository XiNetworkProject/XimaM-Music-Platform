'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer, useAudioTime } from '@/app/providers';
import { coordinateSecondaryAudioElement } from '@/lib/audio/AudioCore';

function createToneUrl(frequency: number, seconds = 60) {
  const sampleRate = 8000;
  const samples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => value.split('').forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index += 1) {
    const fade = Math.min(1, index / 200, (samples - index) / 200);
    view.setInt16(44 + index * 2, Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 2600 * fade, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

let sharedHarnessUrls: string[] | null = null;

export default function AudioCoreHarnessClient() {
  const router = useRouter();
  const player = useAudioPlayer();
  const time = useAudioTime();
  const [urls, setUrls] = useState<string[]>([]);
  const secondaryRef = useRef<HTMLAudioElement | null>(null);
  const secondaryCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sharedHarnessUrls) sharedHarnessUrls = [createToneUrl(220), createToneUrl(330), createToneUrl(660, 1)];
    setUrls(sharedHarnessUrls);
    return () => {
      secondaryRef.current?.pause();
      secondaryCleanupRef.current?.();
    };
  }, []);

  const tracks = useMemo(() => urls.slice(0, 2).map((audioUrl, index) => ({
    _id: `audio-harness-${index + 1}`,
    title: `Harness ${index + 1}`,
    artist: { _id: 'audio-harness', name: 'Audio Harness', username: 'audio-harness' },
    audioUrl,
    duration: 60,
    likes: [],
    comments: [],
    plays: 0,
  })), [urls]);

  const playSecondary = () => {
    if (!urls[2]) return;
    secondaryRef.current?.pause();
    secondaryCleanupRef.current?.();
    const audio = new Audio(urls[2]);
    secondaryRef.current = audio;
    secondaryCleanupRef.current = coordinateSecondaryAudioElement(audio, 'preview');
    void audio.play();
  };

  const current = player.audioState.tracks[player.audioState.currentTrackIndex];
  return (
    <main className="min-h-screen bg-black p-8 text-white" data-testid="audio-core-harness">
      <h1 className="text-2xl font-bold">Audio Core development harness</h1>
      <div className="mt-4 grid gap-2 text-sm">
        <span data-testid="track-id">{current?._id || 'none'}</span>
        <span data-testid="playing">{String(player.audioState.isPlaying)}</span>
        <span data-testid="position">{time.currentTime.toFixed(2)}</span>
        <span data-testid="duration">{time.duration.toFixed(2)}</span>
        <span data-testid="queue-size">{player.audioState.tracks.length}</span>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button data-testid="play-a" disabled={!tracks.length} onClick={() => player.setQueueAndPlay(tracks, 0)}>Play A</button>
        <button data-testid="play-b" disabled={tracks.length < 2} onClick={() => player.playTrack(tracks[1])}>Play B</button>
        <button data-testid="pause" onClick={player.pause}>Pause</button>
        <button data-testid="resume" onClick={() => void player.play()}>Resume</button>
        <button data-testid="seek" onClick={() => player.seek(6)}>Seek 6s</button>
        <button data-testid="secondary" disabled={urls.length < 3} onClick={playSecondary}>Secondary preview</button>
        <button data-testid="route-link" onClick={() => router.push('/audio-core-harness/route')}>Navigate route probe</button>
      </div>
    </main>
  );
}
