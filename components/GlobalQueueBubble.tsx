'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QueueBubble from '@/components/QueueBubble';
import QueueDialog from '@/components/QueueDialog';

export default function GlobalQueueBubble() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return (
    <>
      {createPortal(<QueueBubble onClick={() => setOpen(true)} />, document.body)}
      <QueueDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

