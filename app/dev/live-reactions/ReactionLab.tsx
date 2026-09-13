'use client';

import { useState } from 'react';
import ReactionPicker from '@/components/player/ReactionPicker';

/** Isolated visual QA: no reaction request, no audio and no persistent signal. */
export default function ReactionLab() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <main className="min-h-dvh bg-[var(--v2-bg)] p-6 text-[var(--v2-text)]">
      <h1>Réactions Live — aperçu isolé</h1>
      <p>Aucune réaction enregistrée. Sélections locales : {count}</p>
      <div className="relative mt-24 w-fit">
        <button type="button" className="min-h-11 rounded-full bg-[var(--v2-accent-fill)] px-6 text-white" onClick={() => setOpen(value => !value)}>Réagir</button>
        <ReactionPicker celebrate open={open} onClose={() => setOpen(false)} onPick={() => { setCount(value => value + 1); setOpen(false); }} className="bottom-full left-0 mb-3" />
      </div>
    </main>
  );
}
