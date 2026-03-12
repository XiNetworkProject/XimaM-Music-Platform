'use client';

import { motion } from 'framer-motion';
import { Music, Disc3, Library } from 'lucide-react';

export type ReleaseType = 'single' | 'ep' | 'album';

interface Props {
  value: ReleaseType;
  onChange: (v: ReleaseType) => void;
}

const TYPES: { key: ReleaseType; label: string; desc: string; icon: typeof Music; limit: string }[] = [
  { key: 'single', label: 'Single', desc: '1 titre', icon: Music, limit: '1 piste' },
  { key: 'ep', label: 'EP', desc: '2 a 6 titres', icon: Disc3, limit: '2-6 pistes' },
  { key: 'album', label: 'Album', desc: '7+ titres', icon: Library, limit: '7-50 pistes' },
];

export default function ReleaseTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {TYPES.map((t) => {
        const active = value === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              'relative flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl border transition-all text-center',
              active
                ? 'border-violet-500/60 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]',
            ].join(' ')}
          >
            {active && (
              <motion.div
                layoutId="release-type-glow"
                className="absolute inset-0 rounded-2xl border border-violet-500/40"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${active ? 'text-violet-400' : 'text-white/40'}`} />
            <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/60'}`}>{t.label}</span>
            <span className={`text-[10px] sm:text-xs ${active ? 'text-violet-300/80' : 'text-white/30'}`}>{t.limit}</span>
          </button>
        );
      })}
    </div>
  );
}
