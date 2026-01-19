'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SunoAccordionSectionProps {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  defaultOpen?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function SunoAccordionSection({
  title,
  description,
  rightSlot,
  isOpen,
  onToggle,
  children,
}: SunoAccordionSectionProps) {
  return (
    <div className="panel-suno">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-overlay-on-primary transition-colors"
      >
        <span className="text-foreground-primary font-semibold text-sm flex-1">
          {title}
          {description ? (
            <span className="block text-[11px] font-normal text-foreground-tertiary mt-0.5">
              {description}
            </span>
          ) : null}
        </span>

        {rightSlot ? <span onClick={(e) => e.stopPropagation()}>{rightSlot}</span> : null}

        <span className="text-foreground-tertiary shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M16.657 9c.89 0 1.337 1.077.707 1.707l-4.657 4.657a1 1 0 0 1-1.414 0l-4.657-4.657C6.006 10.077 6.452 9 7.343 9z" />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

