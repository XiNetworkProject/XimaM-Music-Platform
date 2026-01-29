'use client';

import { useEffect } from 'react';
import { handleStudioHotkeys } from '@/lib/studio/hotkeys';

export function useStudioHotkeys({
  isPlaying,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onFocusSearch,
  onCloseInspector,
}: {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFocusSearch: () => void;
  onCloseInspector: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleStudioHotkeys(e, {
        onPlayPause: () => (isPlaying ? onPause() : onPlay()),
        onPrev,
        onNext,
        onFocusSearch,
        onClose: onCloseInspector,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, onCloseInspector, onFocusSearch, onNext, onPause, onPlay, onPrev]);
}

