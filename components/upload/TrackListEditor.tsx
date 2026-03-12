'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Play, Pause, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

export type TrackMeta = {
  file: File;
  title: string;
  duration: number;
  genreOverride: string[] | null;
  isExplicitOverride: boolean | null;
  lyricsOverride: string | null;
};

interface Props {
  tracks: TrackMeta[];
  onChange: (tracks: TrackMeta[]) => void;
}

export default function TrackListEditor({ tracks, onChange }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    setPlayingIdx(null);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const togglePlay = (idx: number) => {
    if (playingIdx === idx) { cleanup(); return; }
    cleanup();
    const url = URL.createObjectURL(tracks[idx].file);
    urlRef.current = url;
    const a = new Audio(url);
    audioRef.current = a;
    a.addEventListener('ended', cleanup);
    a.play().catch(cleanup);
    setPlayingIdx(idx);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= tracks.length) return;
    const arr = [...tracks];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    onChange(arr);
  };

  const remove = (idx: number) => {
    if (playingIdx === idx) cleanup();
    onChange(tracks.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<TrackMeta>) => {
    onChange(tracks.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] divide-y divide-white/[0.06] overflow-hidden">
      {tracks.map((t, idx) => (
        <div key={idx}>
          <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2">
            <span className="w-5 text-center text-[10px] text-white/30 font-mono">{idx + 1}</span>

            <button
              type="button"
              onClick={() => togglePlay(idx)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition flex-shrink-0"
            >
              {playingIdx === idx ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={t.title}
                onChange={(e) => update(idx, { title: e.target.value })}
                className="w-full h-8 px-2 rounded-lg bg-transparent text-sm text-white outline-none focus:bg-white/[0.04] transition placeholder:text-white/20"
                placeholder={`Piste ${idx + 1}`}
              />
              <div className="flex items-center gap-2 px-2 text-[10px] text-white/30">
                <span>{(t.file.size / 1024 / 1024).toFixed(1)} MB</span>
                <span>{fmt(t.duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition text-white/30"
              >
                {expandedIdx === idx ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition text-white/30 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === tracks.length - 1} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition text-white/30 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => remove(idx)} className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition text-white/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {expandedIdx === idx && (
            <div className="px-3 pb-3 space-y-2 bg-white/[0.01]">
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input
                  type="checkbox"
                  checked={t.isExplicitOverride === true}
                  onChange={(e) => update(idx, { isExplicitOverride: e.target.checked ? true : null })}
                  className="h-3.5 w-3.5 rounded border-white/20"
                />
                Contenu explicite (cette piste)
              </label>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Paroles (optionnel)</label>
                <textarea
                  value={t.lyricsOverride || ''}
                  onChange={(e) => update(idx, { lyricsOverride: e.target.value || null })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] resize-none"
                  placeholder="Paroles de cette piste..."
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {tracks.length === 0 && (
        <div className="py-8 text-center text-sm text-white/30">
          Aucune piste ajoutee. Glissez vos fichiers audio ci-dessus.
        </div>
      )}
    </div>
  );
}
