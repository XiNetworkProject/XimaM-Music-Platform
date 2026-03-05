// components/ai-studio/RemixDropzone.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, UploadCloud } from 'lucide-react';

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
      className={`rounded-xl border border-dashed px-3.5 py-3.5 flex items-center gap-3 cursor-pointer transition-all ${
        isDragActive
          ? 'border-cyan-400/50 bg-cyan-500/10'
          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
      }`}
    >
      <input {...getInputProps()} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        file ? 'bg-cyan-500/15' : 'bg-white/[0.04]'
      }`}>
        {uploading ? (
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        ) : file ? (
          <Music className="w-4 h-4 text-cyan-300" />
        ) : (
          <UploadCloud className="w-4 h-4 text-white/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-white/80 truncate">
          {file ? file.name : 'Dépose un extrait audio ou clique'}
        </p>
        <p className="text-[11px] text-white/35">
          MP3 / WAV / OGG · 6 s à 8 min
        </p>
        <p className="text-[10px] text-amber-200/50 mt-0.5">
          Contenu original uniquement. Suno refuse les œuvres protégées.
        </p>
      </div>
    </div>
  );
}
