'use client';

import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MOMENT_REACTION_TYPES, MOMENT_REACTION_META, type MomentReactionType } from '@/lib/momentReactions';

interface ReactionPickerProps {
  open: boolean;
  onPick: (type: MomentReactionType) => void;
  onClose: () => void;
  /** dark = carte/lecteur sombre (TikTokPlayer) ; light = carte crème Synaura (Scroll). */
  variant?: 'dark' | 'light';
  /** Positionnement (le parent doit être `position: relative`), ex. "bottom-full mb-2 right-0". */
  className?: string;
}

const THEME = {
  dark: { panel: 'border-white/10 bg-[#141019]/96', chip: 'bg-white/8 hover:bg-white/16' },
  light: { panel: 'border-black/[0.08] bg-[#fffaf2]/98', chip: 'bg-black/[0.05] hover:bg-[#171313]/10' },
} as const;

/** Popover léger de 6 réactions prédéfinies pour un instant précis du morceau.
 * Se ferme sur clic externe (même logique que le menu compte de SynauraShell). */
export default function ReactionPicker({ open, onPick, onClose, variant = 'dark', className = '' }: ReactionPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const theme = THEME[variant];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={rootRef}
          initial={{ opacity: 0, y: 6, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.94 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className={`absolute z-[136] flex gap-1 rounded-full border p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl ${theme.panel} ${className}`}
          onClick={(event: ReactMouseEvent) => event.stopPropagation()}
        >
          {MOMENT_REACTION_TYPES.map((type) => {
            const meta = MOMENT_REACTION_META[type];
            return (
              <button
                key={type}
                type="button"
                title={meta.label}
                aria-label={meta.label}
                onClick={() => onPick(type)}
                className={`grid h-10 w-10 place-items-center rounded-full text-xl transition active:scale-90 ${theme.chip}`}
              >
                {meta.emoji}
              </button>
            );
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
