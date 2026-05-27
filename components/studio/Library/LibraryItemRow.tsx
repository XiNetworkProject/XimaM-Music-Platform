'use client';

import { Globe2, Music2, Play } from 'lucide-react';
import type { StudioTrack } from '@/lib/studio/types';
import { useStudioStore } from '@/lib/studio/store';
import { SUNO_ICON_PILL } from '@/components/ui/sunoClasses';

export default function LibraryItemRow({
  track,
  onPlay,
}: {
  track: StudioTrack;
  onPlay: (track: StudioTrack) => void;
}) {
  const selectedTrackIds = useStudioStore((s) => s.selectedTrackIds);
  const toggleSelectTrack = useStudioStore((s) => s.toggleSelectTrack);
  const isSelected = (selectedTrackIds || []).includes(track.id);

  return (
    <div
      className={`studio-rack-row group flex items-center gap-3 px-3 py-2 cursor-pointer ${
        isSelected ? 'ring-1 ring-indigo-400/30' : ''
      }`}
      onClick={(e) => {
        const ev = e as any;
        toggleSelectTrack(track.id, { multi: !!ev?.metaKey || !!ev?.ctrlKey, range: !!ev?.shiftKey });
      }}
      role="row"
    >
      <div className="studio-rack-led" aria-hidden="true" />
      <input
        type="checkbox"
        className="h-4 w-4 accent-indigo-400"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          const ev: any = e.nativeEvent;
          toggleSelectTrack(track.id, { multi: true, range: !!ev?.shiftKey });
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select"
      />
      <div className="w-10 h-10 rounded-xl bg-background-tertiary border border-border-primary overflow-hidden flex items-center justify-center shrink-0">
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <Music2 className="w-5 h-5 text-foreground-tertiary" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-[13px] text-foreground-primary truncate">{track.title}</div>
          {track.isPublic ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-400/12 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200">
              <Globe2 className="h-2.5 w-2.5" />
              Public
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-foreground-tertiary truncate">{(track.prompt || '').slice(0, 120)}</div>
      </div>

      <button
        type="button"
        className={SUNO_ICON_PILL}
        onClick={(e) => {
          e.stopPropagation();
          onPlay(track);
        }}
        aria-label="Play"
        title="Play"
      >
        <Play className="w-4 h-4" />
      </button>
    </div>
  );
}

