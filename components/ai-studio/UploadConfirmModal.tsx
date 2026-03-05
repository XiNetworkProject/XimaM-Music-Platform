'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Upload, Clock } from 'lucide-react';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface UploadConfirmModalProps {
  isOpen: boolean;
  file: File | null;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export function UploadConfirmModal({
  isOpen,
  file,
  onConfirm,
  onCancel,
}: UploadConfirmModalProps) {
  const defaultTitle = file ? file.name.replace(/\.[^.]+$/, '').trim() || '' : '';
  const [title, setTitle] = useState(defaultTitle);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    if (!file || !isOpen) {
      setDurationSec(null);
      return;
    }
    setTitle(file.name.replace(/\.[^.]+$/, '').trim() || '');
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const onLoaded = () => {
      const d = audio.duration;
      if (Number.isFinite(d)) setDurationSec(d);
      URL.revokeObjectURL(url);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
    });
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      URL.revokeObjectURL(url);
    };
  }, [file, isOpen]);

  const handleSave = () => {
    const t = title.trim() || defaultTitle;
    onConfirm(t || 'Audio uploadé');
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
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
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <Upload className="h-4 w-4 text-cyan-300" />
                </div>
                <h3 id="upload-modal-title" className="text-base font-semibold text-white/90">Confirmer l&apos;upload</h3>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={onCancel}
                className="rounded-xl p-2 text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Title edit */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold">Titre</label>
                <div className="flex items-center gap-2">
                  {editingTitle ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setEditingTitle(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                      className="flex-1 min-w-0 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-indigo-400/30 focus:bg-white/[0.05] transition-all"
                      placeholder="Titre du morceau"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="flex-1 min-w-0 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 flex items-center cursor-pointer hover:bg-white/[0.05] transition-colors"
                      onClick={() => setEditingTitle(true)}
                    >
                      <span className="text-sm text-white/80 truncate">{title || 'Sans titre'}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Modifier le titre"
                    onClick={() => setEditingTitle(!editingTitle)}
                    className="shrink-0 w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.03] flex items-center justify-center text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                <Clock className="w-3.5 h-3.5 text-white/30" />
                <span className="font-mono text-sm text-white/50 tabular-nums">
                  {durationSec != null ? formatDuration(durationSec) : '— : —'}
                </span>
                {file && (
                  <span className="ml-auto text-[11px] text-white/25">{(file.size / 1024 / 1024).toFixed(1)} Mo</span>
                )}
              </div>

              {/* Info */}
              <p className="text-[10px] text-white/25 text-center">
                Audio entre 6 secondes et 8 minutes
              </p>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 h-11 rounded-xl border border-white/[0.06] bg-white/[0.03] text-sm font-medium text-white/60 hover:bg-white/[0.06] transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:brightness-110 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
