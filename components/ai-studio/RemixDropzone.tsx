// components/ai-studio/RemixDropzone.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, UploadCloud } from 'lucide-react';
import { SUNO_CARD } from '@/components/ui/sunoClasses';

interface RemixDropzoneProps {
  onFileSelected: (file: File) => void;
  uploading: boolean;
  file?: File | null;
}

export function RemixDropzone({
  onFileSelected,
  uploading,
  file,
}: RemixDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      const audioFile = acceptedFiles[0];
      onFileSelected(audioFile);
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`${SUNO_CARD} border-dashed px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
        isDragActive ? 'border-accent-brand/70 bg-accent-brand/10' : 'hover:bg-overlay-on-primary'
      }`}
    >
      <input {...getInputProps()} />
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        {uploading ? (
          <div className="w-4 h-4 border-2 border-accent-brand border-t-transparent rounded-full animate-spin" />
        ) : file ? (
          <Music className="w-4 h-4 text-accent-brand" />
        ) : (
          <UploadCloud className="w-4 h-4 text-foreground-secondary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground-primary truncate">
          {file ? file.name : 'Dépose un extrait audio ou clique pour choisir'}
        </p>
        <p className="text-[11px] text-foreground-tertiary">
          MP3 / WAV / OGG · max ~30s recommandé
        </p>
      </div>
    </div>
  );
}

