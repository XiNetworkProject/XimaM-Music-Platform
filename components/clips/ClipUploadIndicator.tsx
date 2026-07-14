'use client';

import { useSyncExternalStore } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import {
  getClientClipUploadServerSnapshot,
  getClientClipUploadSnapshot,
  retryClientClipUpload,
  subscribeClientClipUpload,
} from '@/lib/clientClipUploadQueue';

export default function ClipUploadIndicator() {
  const task = useSyncExternalStore(subscribeClientClipUpload, getClientClipUploadSnapshot, getClientClipUploadServerSnapshot);
  if (task.status === 'idle' || !task.source) return null;
  const failed = task.status === 'failed';
  const completed = task.status === 'completed';
  const progress = Math.max(2, Math.round(task.progress * 100));
  return (
    <button
      type="button"
      disabled={!failed}
      onClick={retryClientClipUpload}
      className="fixed left-4 top-20 z-[90] grid w-[72px] justify-items-center gap-1 text-white disabled:cursor-default"
      aria-label={failed ? `Échec de l’envoi. ${task.error || ''} Réessayer` : 'Publication du Clip en cours'}
    >
      <span className="relative grid h-14 w-14 place-items-center rounded-full p-1" style={{ background: `conic-gradient(${failed ? '#D96D63' : completed ? '#4A9EAA' : '#F7F6F3'} ${progress}%, rgba(255,255,255,.2) 0)` }}>
        <img src={task.source.coverUrl || '/brand/2026/synaura-symbol-2026.png'} alt="" className="h-11 w-11 rounded-full object-cover" />
        {(failed || completed) ? <span className={`absolute inset-[10px] grid place-items-center rounded-full ${failed ? 'bg-[#D96D63]' : 'bg-[#4A9EAA]'}`}>{failed ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}</span> : null}
      </span>
      <span className="max-w-[72px] truncate text-[10px] font-black drop-shadow">{failed ? 'Réessayer' : completed ? 'Clip publié' : `${progress} %`}</span>
    </button>
  );
}
