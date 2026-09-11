'use client';

import { Layers3, Replace, X } from 'lucide-react';
import { SynauraOverlayDescription, SynauraOverlayTitle } from '@/components/ui/SynauraOverlay';
import type { ContextSurfaceRendererProps } from './ContextSurfaceController';

export default function ContextSurfaceDemo({
  entry,
  closeSurface,
  openSurface,
  replaceSurface,
}: ContextSurfaceRendererProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[var(--syn-border)] p-5 pr-14 sm:p-6 sm:pr-14">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--syn-accent)]">Phase 4B.2 · Dev only</p>
        <SynauraOverlayTitle className="mt-2">Surface contextuelle</SynauraOverlayTitle>
        <SynauraOverlayDescription className="mt-2">
          Démonstration technique sans contenu Profile ou Comments métier.
        </SynauraOverlayDescription>
      </header>

      <div className="context-surface-scroll flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--syn-radius-lg)] bg-[var(--syn-soft)] p-4 text-sm">
          <dt className="font-black">Surface</dt><dd className="truncate">{entry.surface}</dd>
          <dt className="font-black">Entité</dt><dd className="truncate">{entry.entityType}:{entry.entityId || 'aucune'}</dd>
          <dt className="font-black">Origine</dt><dd>{entry.origin}</dd>
          <dt className="font-black">Profondeur</dt><dd>{entry.historyKey.slice(0, 8)}</dd>
        </dl>

        <div className="grid gap-3">
          <button
            type="button"
            data-context-surface-trigger-key="demo-replace"
            onClick={(event) => replaceSurface({
              ...entry,
              entityType: 'demo',
              entityId: entry.entityId === 'replacement' ? 'primary' : 'replacement',
            }, { trigger: event.currentTarget })}
            className="syn-interactive syn-touch-target flex w-full items-center justify-center gap-2 rounded-full bg-[var(--syn-soft-strong)] px-5 text-sm font-black"
          >
            <Replace className="h-4 w-4" /> Remplacer sans nouvelle entrée Back
          </button>
          <button
            type="button"
            data-context-surface-trigger-key="demo-nested"
            onClick={(event) => openSurface({
              surface: 'context-surface-demo',
              entityType: 'demo-child',
              entityId: 'nested',
              origin: entry.origin,
              presentation: entry.presentation,
              returnSnapshotId: entry.returnSnapshotId,
            }, { trigger: event.currentTarget })}
            className="syn-interactive syn-touch-target flex w-full items-center justify-center gap-2 rounded-full border border-[var(--syn-border)] px-5 text-sm font-black"
          >
            <Layers3 className="h-4 w-4" /> Ouvrir une surface justifiée
          </button>
          <button
            type="button"
            onClick={closeSurface}
            className="syn-interactive syn-touch-target flex w-full items-center justify-center gap-2 rounded-full bg-[var(--syn-accent)] px-5 text-sm font-black text-white"
          >
            <X className="h-4 w-4" /> Fermer la surface
          </button>
        </div>

        <section aria-labelledby="context-scroll-title" className="space-y-3">
          <h3 id="context-scroll-title" className="text-sm font-black">Scroll interne indépendant</h3>
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="rounded-[var(--syn-radius-md)] border border-[var(--syn-border)] p-4 text-sm text-[var(--syn-text-secondary)]">
              Élément de validation {index + 1} — le fond reste monté, verrouillé et sans saut.
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
