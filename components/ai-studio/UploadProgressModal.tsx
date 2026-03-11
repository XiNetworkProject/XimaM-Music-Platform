'use client';

import { Music, Loader2 } from 'lucide-react';
import { UModal, UButton } from '@/components/ui/UnifiedUI';

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
  return (
    <UModal open={isOpen} onClose={onCancel} size="md" zClass="z-[200]" showClose={false}>
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
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 animate-pulse" />
        </div>

        {/* Cancel */}
        <UButton variant="secondary" size="sm" onClick={onCancel}>
          Annuler
        </UButton>
      </div>
    </UModal>
  );
}
