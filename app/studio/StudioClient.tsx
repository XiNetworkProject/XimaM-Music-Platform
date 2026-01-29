'use client';

import { useRef, useState } from 'react';
import StudioBackground from '@/components/StudioBackground';
import BuyCreditsModal from '@/components/BuyCreditsModal';
import { useAudioPlayer } from '@/app/providers';
import { useAIQuota } from '@/hooks/useAIQuota';
import { useStudioStore } from '@/lib/studio/store';
import TransportBar from '@/components/studio/TransportBar';
import LeftDock from '@/components/studio/LeftDock/LeftDock';
import StudioTimeline from '@/components/studio/Center/StudioTimeline';
import Inspector from '@/components/studio/RightDock/Inspector';
import { useStudioLibrary } from '@/components/studio/hooks/useStudioLibrary';
import { useStudioHotkeys } from '@/components/studio/hooks/useStudioHotkeys';
import { useStudioGenerationQueue } from '@/components/studio/hooks/useStudioGenerationQueue';

export default function StudioClient() {
  const { audioState, play, pause, nextTrack, previousTrack } = useAudioPlayer();
  const { quota } = useAIQuota();

  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const setUI = useStudioStore((s) => s.setUI);
  const runningJobsCount = useStudioStore((s) => (s.queueItems || []).filter((q) => q.status === 'running').length);

  const { creditsBalance, setCreditsBalance, libraryLoading, libraryError, loadLibraryTracks, visibleTracks } =
    useStudioLibrary();

  useStudioHotkeys({
    isPlaying: audioState.isPlaying,
    onPlay: () => void play(),
    onPause: () => pause(),
    onPrev: () => previousTrack(),
    onNext: () => nextTrack(),
    onFocusSearch: () => searchRef.current?.focus(),
    onCloseInspector: () => setUI({ inspectorOpen: false }),
  });

  const { enqueueFromCurrentForm, generateVariantFromTrack } = useStudioGenerationQueue({
    onInsufficientCredits: () => setShowBuyCredits(true),
    onCreditsBalance: (b) => setCreditsBalance(b),
  });

  const currentTrack = audioState.tracks[audioState.currentTrackIndex];

  return (
    <div className="studio-pro relative h-[100svh] overflow-hidden bg-[#050505] text-white">
      <StudioBackground />

      <div className="relative z-10 flex flex-col h-full">
        <TransportBar
          currentTrackTitle={(currentTrack as any)?.title || ''}
          isPlaying={audioState.isPlaying}
          onPlayPause={() => (audioState.isPlaying ? pause() : void play())}
          onPrev={() => previousTrack()}
          onNext={() => nextTrack()}
          creditsBalance={creditsBalance}
          quotaRemaining={quota?.remaining ?? null}
          runningJobsCount={runningJobsCount}
          onOpenBuyCredits={() => setShowBuyCredits(true)}
        />

        <div className="flex-1 min-h-0 px-3 pb-3">
          <div className="h-full grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-3 min-h-0">
              <LeftDock onGenerate={enqueueFromCurrentForm} />
            </div>

            <div className="col-span-12 lg:col-span-6 min-h-0">
              <StudioTimeline
                tracks={visibleTracks}
                loading={libraryLoading}
                error={libraryError}
                bgGenerations={[]}
                onRefreshLibrary={loadLibraryTracks}
                searchRef={searchRef}
              />
            </div>

            <div className="col-span-12 lg:col-span-3 min-h-0">
              <Inspector onGenerateVariantFromTrack={generateVariantFromTrack} />
            </div>
          </div>
        </div>
      </div>

      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
    </div>
  );
}

