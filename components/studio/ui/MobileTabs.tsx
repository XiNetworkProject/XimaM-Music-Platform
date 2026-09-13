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
        aria-pressed={active}
        className={`min-w-0 flex-1 min-h-12 rounded-lg transition flex flex-col items-center justify-center gap-1 text-[10px] ${
          active ? 'bg-[var(--v2-raised)] text-[var(--v2-accent)]' : 'text-[var(--v2-muted)] hover:bg-[var(--v2-raised)]'
        }`}
        onClick={() => setUI({ mobileTab: id })}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="chambre-studio-mobile-tabs fixed bottom-[max(env(safe-area-inset-bottom,0px),0.75rem)] left-3 right-3 z-[var(--syn-z-overlay)] lg:hidden">
      <div className="panel-suno p-1 flex items-center gap-1">
        {btn('generate', 'Construire', Wand2)}
        {btn('library', 'Créations', ListMusic)}
        {btn('timeline', 'Activité', LayoutGrid)}
        {btn('inspector', 'Inspecteur', SlidersHorizontal)}
      </div>
    </div>
  );
}

