'use client';

import React, { useState } from 'react';
import QueueBubble from '@/components/QueueBubble';
import QueueDialog from '@/components/QueueDialog';

export default function GlobalQueueBubble() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <QueueBubble onClick={() => setOpen(true)} />
      <QueueDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

