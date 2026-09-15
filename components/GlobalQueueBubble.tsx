'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import QueueBubble from '@/components/QueueBubble';
import QueueDialog from '@/components/QueueDialog';
import { isChamberProductRoute, isV2PilotRoute } from '@/lib/routeChrome';

export default function GlobalQueueBubble() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);

  const hiddenOnSynaura = pathname === '/' || pathname === '/landing' || pathname === '/live' || pathname?.startsWith('/discover') || pathname?.startsWith('/library') || isChamberProductRoute(pathname);

  if (!mounted || typeof document === 'undefined' || hiddenOnSynaura || isV2PilotRoute(pathname)) {
    return null;
  }

  return (
    <>
      {createPortal(<QueueBubble onClick={() => setOpen(true)} />, document.body)}
      <QueueDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

