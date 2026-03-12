'use client';

import { Clock, Zap } from 'lucide-react';

interface Props {
  mode: 'now' | 'scheduled';
  scheduledAt: string;
  onModeChange: (mode: 'now' | 'scheduled') => void;
  onDateChange: (iso: string) => void;
}

export default function ScheduleSelector({ mode, scheduledAt, onModeChange, onDateChange }: Props) {
  const minDate = new Date();
  minDate.setMinutes(minDate.getMinutes() + 30);
  const minStr = minDate.toISOString().slice(0, 16);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onModeChange('now')}
          className={[
            'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition',
            mode === 'now'
              ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
              : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.04]',
          ].join(' ')}
        >
          <Zap className="w-4 h-4" />
          Immediate
        </button>
        <button
          type="button"
          onClick={() => onModeChange('scheduled')}
          className={[
            'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition',
            mode === 'scheduled'
              ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
              : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.04]',
          ].join(' ')}
        >
          <Clock className="w-4 h-4" />
          Programmer
        </button>
      </div>

      {mode === 'scheduled' && (
        <div className="space-y-1.5">
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minStr}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] [color-scheme:dark]"
          />
          <p className="text-[10px] text-white/30">Le titre sera visible uniquement par toi avant la date choisie.</p>
        </div>
      )}
    </div>
  );
}
