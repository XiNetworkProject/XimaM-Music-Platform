'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

type Props = {
  onClick: () => void;
  className?: string;
  bottomOffsetRem?: string;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function UpdatesBubble({ onClick, className = '', bottomOffsetRem = '7.25rem' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'fixed left-4 z-[390] pointer-events-auto rounded-full border border-border-secondary bg-background-tertiary/80 backdrop-blur-xl shadow-xl hover:bg-overlay-on-primary transition',
        'h-12 w-12 sm:w-auto px-0 sm:px-4 flex items-center justify-center sm:justify-start gap-2',
        className,
      )}
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffsetRem})`,
      }}
      aria-label="Nouveautés"
      title="Nouveautés"
    >
      <Sparkles className="h-5 w-5 text-foreground-secondary" />
      <span className="hidden sm:inline text-sm text-foreground-primary">Nouveautés</span>
    </button>
  );
}

