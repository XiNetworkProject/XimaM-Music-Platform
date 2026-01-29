'use client';

import { LayoutGrid, Wand2, ListMusic, SlidersHorizontal } from 'lucide-react';
import { useStudioStore } from '@/lib/studio/store';

export default function MobileTabs() {
  const ui = useStudioStore((s) => s.ui);
  const setUI = useStudioStore((s) => s.setUI);

  const tab = ui.mobileTab || 'library';

  const btn = (id: typeof tab, label: string, Icon: any) => {
    const active = tab === id;
    return (
      <button
        type="button"
        className={`flex-1 h-12 rounded-2xl border transition flex items-center justify-center gap-2 text-sm ${
          active ? 'border-white/20 bg-white/10' : 'border-border-secondary bg-white/5 hover:bg-white/10'
        }`}
        onClick={() => setUI({ mobileTab: id })}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-3 left-3 right-3 z-[210]">
      <div className="panel-suno p-2 flex items-center gap-2">
        {btn('generate', 'Generate', Wand2)}
        {btn('library', 'Library', ListMusic)}
        {btn('timeline', 'Timeline', LayoutGrid)}
        {btn('inspector', 'Inspect', SlidersHorizontal)}
      </div>
    </div>
  );
}

