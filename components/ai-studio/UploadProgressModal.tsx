'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Loader2 } from 'lucide-react';

interface UploadProgressModalProps {
  isOpen: boolean;
  title: string | null;
  onCancel: () => void;
}

export function UploadProgressModal({
  isOpen,
  title,
  onCancel,
}: UploadProgressModalProps) {
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[401] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Upload en cours"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.section
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0c0c14]/98 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,.8)] overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="p-6 flex flex-col items-center gap-5">
              {/* Animated icon */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin absolute" />
                <Music className="w-4 h-4 text-white/30 absolute" />
              </div>

              {/* Info */}
              <div className="text-center space-y-1.5">
                <p className="text-sm font-semibold text-white/80 truncate max-w-[280px]">
                  {title || 'Audio'}
                </p>
                <p className="text-[12px] text-white/40">
                  Préparation du remix en cours...
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-[240px] h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                  initial={{ width: '0%' }}
                  animate={{ width: ['0%', '70%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.3, ease: 'easeInOut' }}
                />
              </div>

              {/* Cancel */}
              <button
                type="button"
                onClick={onCancel}
                className="h-9 px-5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[12px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              >
                Annuler
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
