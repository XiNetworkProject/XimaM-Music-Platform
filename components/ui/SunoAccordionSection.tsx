'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SunoAccordionSectionProps {
  title: string;
  description?: string;
  leftIcon?: ReactNode;
  rightActions?: ReactNode;
  variant?: 'panel' | 'bare';
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function SunoAccordionSection({
  title,
  description,
  leftIcon,
  rightActions,
  variant = 'panel',
  isOpen,
  onToggle,
  children,
}: SunoAccordionSectionProps) {
  return (
    <div className={variant === 'panel' ? 'panel-suno' : ''}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-overlay-on-primary transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-foreground-tertiary shrink-0">
          {leftIcon ? (
            leftIcon
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="m12 12.604 3.9-3.9a.99.99 0 1 1 1.4 1.4l-4.593 4.593a1 1 0 0 1-1.414 0L6.7 10.104a.99.99 0 0 1 1.4-1.4z" />
            </svg>
          )}
        </span>

        <span className="text-foreground-primary font-semibold text-sm flex-1">
          {title}
          {description ? (
            <span className="block text-[11px] font-normal text-foreground-tertiary mt-0.5">
              {description}
            </span>
          ) : null}
        </span>

        {rightActions ? <span onClick={(e) => e.stopPropagation()}>{rightActions}</span> : null}
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

