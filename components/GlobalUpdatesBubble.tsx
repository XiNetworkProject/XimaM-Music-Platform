'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAudioPlayer } from '@/app/providers';
import UpdatesBubble from '@/components/UpdatesBubble';
import UpdatesDialog from '@/components/UpdatesDialog';

const UPDATES_VERSION = '2026-01-23';
const STORAGE_KEY = 'ui.updates.lastSeenVersion';

export default function GlobalUpdatesBubble() {
  const { audioState } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== UPDATES_VERSION) {
        setOpen(true);
      }
    } catch {}
  }, [mounted]);

  const bottomOffsetRem = useMemo(() => (audioState.showPlayer ? '10.5rem' : '7.25rem'), [audioState.showPlayer]);

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, UPDATES_VERSION);
    } catch {}
  };

  if (!mounted || typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(<UpdatesBubble onClick={() => setOpen(true)} bottomOffsetRem={bottomOffsetRem} />, document.body)}
      <UpdatesDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onMarkSeen={() => markSeen()}
      />
    </>
  );
}

