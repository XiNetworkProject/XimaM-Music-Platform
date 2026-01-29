'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Download, X, Package } from 'lucide-react';
import type { StudioTrack } from '@/lib/studio/types';
import { notify } from '@/components/NotificationCenter';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    notify.success('Export', 'Texte copié');
  } catch {
    notify.error('Export', 'Copie impossible');
  }
}

function makeCaption(tracks: StudioTrack[]) {
  const first = tracks[0];
  const tags = Array.from(new Set(tracks.flatMap((t) => t.tags || []))).slice(0, 12);
  const prompt = (first?.prompt || '').trim();
  const title = first?.title || 'Mon son IA';
  const tagsLine = tags.length ? tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ') : '';
  return `${title}\n\n${tagsLine}\n\nPrompt:\n${prompt}\n\nMade with SYNAURA Studio`;
}

export default function ExportPackModal({
  isOpen,
  onClose,
  tracks,
}: {
  isOpen: boolean;
  onClose: () => void;
  tracks: StudioTrack[];
}) {
  const caption = useMemo(() => makeCaption(tracks || []), [tracks]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 w-[92vw] max-w-[760px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-lg font-semibold">
                <Package className="w-5 h-5 text-cyan-300" />
                Export pack social
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid gap-4">
              <div className="text-[12px] text-[var(--text-muted)]">
                Pack = liens audio/cover + caption copiable. (Zip auto viendra plus tard si tu veux.)
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="panel-suno p-4">
                  <div className="text-sm font-semibold text-white mb-2">Téléchargements</div>
                  <div className="grid gap-2">
                    {tracks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[13px] text-white truncate">{t.title}</div>
                          <div className="text-[11px] text-[var(--text-muted)] truncate">
                            {t.model} · {t.durationSec ? `${t.durationSec}s` : '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.audioUrl ? (
                            <a
                              className="h-8 px-2 rounded-xl border border-[var(--border)] bg-white/5 hover:bg-white/10 transition text-xs flex items-center gap-1"
                              href={t.audioUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                            >
                              <Download className="w-4 h-4" />
                              Audio
                            </a>
                          ) : null}
                          {t.coverUrl ? (
                            <a
                              className="h-8 px-2 rounded-xl border border-[var(--border)] bg-white/5 hover:bg-white/10 transition text-xs flex items-center gap-1"
                              href={t.coverUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                            >
                              <Download className="w-4 h-4" />
                              Cover
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-suno p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-semibold text-white">Caption</div>
                    <button
                      type="button"
                      onClick={() => copyText(caption)}
                      className="h-8 px-2 rounded-xl border border-[var(--border)] bg-white/5 hover:bg-white/10 transition text-xs flex items-center gap-1"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={caption}
                    className="w-full h-[220px] rounded-2xl border border-[var(--border)] bg-black/30 p-3 text-[12px] text-white/90"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

