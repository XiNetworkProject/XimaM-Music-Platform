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
    <div className={variant === 'panel' ? 'rounded-2xl border border-white/[0.06] bg-white/[0.02]' : ''}>
      <button
        type="button"
        onClick={onToggle}
        className="group w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left rounded-xl hover:bg-white/[0.04] transition-all"
        aria-expanded={isOpen}
      >
        <span className="text-white/30 group-hover:text-white/50 shrink-0 transition-colors">
          {leftIcon ? (
            leftIcon
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="m12 12.604 3.9-3.9a.99.99 0 1 1 1.4 1.4l-4.593 4.593a1 1 0 0 1-1.414 0L6.7 10.104a.99.99 0 0 1 1.4-1.4z" />
            </svg>
          )}
        </span>

        <span className="text-white/90 font-medium text-[13px] flex-1 min-w-0">
          {title}
          {description ? (
            <span className="block text-[10px] font-normal text-white/35 mt-0.5 truncate">
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
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

