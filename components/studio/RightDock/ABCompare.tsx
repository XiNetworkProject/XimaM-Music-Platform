'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store';
import { getABTracks } from '@/lib/studio/selectors';

export default function ABCompare({
  onGenerateVariantFromTrack,
}: {
  onGenerateVariantFromTrack: (trackId: string) => void;
}) {
  const tracks = useStudioStore((s) => s.tracks);
  const aId = useStudioStore((s) => s.abTrackIdA);
  const bId = useStudioStore((s) => s.abTrackIdB);
  const swapAB = useStudioStore((s) => s.swapAB);
  const clearAB = useStudioStore((s) => s.clearAB);
  const selectTrack = useStudioStore((s) => s.selectTrack);

  const { a, b } = getABTracks(tracks, aId, bId);

  return (
    <div className="panel-suno overflow-hidden">
      <div className="px-4 py-3 border-b border-border-secondary flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground-primary">A/B Compare</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 w-8 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
            onClick={swapAB}
            title="Swap"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-xs"
            onClick={clearAB}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="p-4 grid gap-3 text-sm">
        <div>
          <div className="text-[11px] text-foreground-tertiary mb-1">Track A</div>
          <div className="text-foreground-primary font-semibold">{a?.title || '—'}</div>
          <div className="text-[11px] text-foreground-tertiary mt-1 line-clamp-3">{a?.prompt || ''}</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-xs"
              disabled={!a}
              onClick={() => {
                if (!a) return;
                selectTrack(a.id);
                clearAB();
              }}
            >
              Keep A
            </button>
            <button
              type="button"
              className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-xs"
              disabled={!a}
              onClick={() => {
                if (!a) return;
                onGenerateVariantFromTrack(a.id);
              }}
            >
              Variant from A
            </button>
          </div>
        </div>
        <div className="h-px bg-border-secondary" />
        <div>
          <div className="text-[11px] text-foreground-tertiary mb-1">Track B</div>
          <div className="text-foreground-primary font-semibold">{b?.title || '—'}</div>
          <div className="text-[11px] text-foreground-tertiary mt-1 line-clamp-3">{b?.prompt || ''}</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-2 rounded-xl border border-border-secondary bg-white/5 hover:bg-white/10 transition text-xs"
              disabled={!b}
              onClick={() => {
                if (!b) return;
                selectTrack(b.id);
                clearAB();
              }}
            >
              Keep B
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

