'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function SynauraPopover({
  open,
  onClose,
  trigger,
  children,
  align = 'end',
  label = 'Menu',
  role = 'dialog',
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  label?: string;
  role?: 'dialog' | 'menu';
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        previousFocusRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [onClose, open]);

  return <div ref={rootRef} className="relative inline-flex">{trigger}{open ? <div role={role} aria-label={label} className={`absolute top-[calc(100%+0.5rem)] z-[var(--syn-z-popover)] min-w-52 rounded-[var(--syn-radius-md)] border border-[var(--syn-border)] bg-[var(--syn-elevated-surface)] p-2 text-[var(--syn-text-primary)] shadow-[var(--syn-shadow-medium)] ${align === 'end' ? 'right-0' : 'left-0'} ${className}`}>{children}</div> : null}</div>;
}

export function SynauraContextMenu(props: Omit<Parameters<typeof SynauraPopover>[0], 'role'>) {
  return <SynauraPopover {...props} role="menu" />;
}

export function SynauraTooltip({ label, children }: { label: string; children: ReactNode }) {
  return <span className="group/syn-tooltip relative inline-flex">{children}<span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+0.4rem)] left-1/2 z-[var(--syn-z-popover)] hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--syn-contrast-bg)] px-2 py-1 text-[11px] font-bold text-[var(--syn-contrast-text)] shadow-[var(--syn-shadow-low)] group-hover/syn-tooltip:block group-focus-within/syn-tooltip:block">{label}</span></span>;
}
