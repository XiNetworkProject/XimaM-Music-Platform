'use client';

import { useMemo } from 'react';
import { Copy, Download, X, Package } from 'lucide-react';
import type { StudioTrack } from '@/lib/studio/types';
import { notify } from '@/components/NotificationCenter';
import { UModal, UButton } from '@/components/ui/UnifiedUI';

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
    <UModal open={isOpen} onClose={onClose} size="full" zClass="z-[200]" showClose={false} className="!max-w-[760px]">
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2 text-white text-lg font-semibold">
          <Package className="w-5 h-5 text-cyan-300" />
          Export pack social
        </div>
        <UButton variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
          <X className="w-5 h-5" />
        </UButton>
      </div>

      <div className="p-4 grid gap-4">
        <div className="text-[12px] text-white/40">
          Pack = liens audio/cover + caption copiable. (Zip auto viendra plus tard si tu veux.)
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <div className="text-sm font-semibold text-white mb-2">Téléchargements</div>
            <div className="grid gap-2">
              {tracks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] text-white truncate">{t.title}</div>
                    <div className="text-[11px] text-white/40 truncate">
                      {t.model} · {t.durationSec ? `${t.durationSec}s` : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.audioUrl ? (
                      <a
                        className="h-8 px-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition text-xs flex items-center gap-1 text-white/70"
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
                        className="h-8 px-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition text-xs flex items-center gap-1 text-white/70"
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

          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold text-white">Caption</div>
              <UButton variant="secondary" size="sm" onClick={() => copyText(caption)}>
                <Copy className="w-4 h-4" />
                Copy
              </UButton>
            </div>
            <textarea
              readOnly
              value={caption}
              className="w-full h-[220px] rounded-2xl border border-white/[0.08] bg-black/30 p-3 text-[12px] text-white/90"
            />
          </div>
        </div>
      </div>
    </UModal>
  );
}

