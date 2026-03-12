'use client';

import { MOODS, type MoodKey } from '@/lib/genres';

interface Props {
  value: MoodKey | null;
  onChange: (v: MoodKey | null) => void;
}

export default function MoodSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
      {MOODS.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(active ? null : m.key)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm transition-all',
              active
                ? 'bg-violet-500/15 border border-violet-500/40 text-violet-300'
                : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70',
            ].join(' ')}
          >
            <span className="text-sm">{m.emoji}</span>
            <span className="truncate">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
