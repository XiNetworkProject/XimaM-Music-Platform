'use client';

import type { ReactNode } from 'react';
import { SynauraOverlay, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';

export default function DrawerInspector({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="lg:hidden">
      <SynauraOverlay open={isOpen} onClose={onClose} presentation="sheet" className="max-h-[78dvh]">
        <div className="border-b border-[var(--syn-border)] p-4">
          <SynauraOverlayTitle className="truncate text-sm">{title}</SynauraOverlayTitle>
        </div>
        <div className="overflow-y-auto p-3">{children}</div>
      </SynauraOverlay>
    </div>
  );
}

