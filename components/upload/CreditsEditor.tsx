'use client';

import { CREDIT_ROLES } from '@/lib/genres';

export type Credits = Record<string, string>;

interface Props {
  credits: Credits;
  onChange: (credits: Credits) => void;
}

export default function CreditsEditor({ credits, onChange }: Props) {
  const set = (key: string, value: string) => {
    onChange({ ...credits, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {CREDIT_ROLES.map((r) => (
        <div key={r.key} className="space-y-1">
          <label className="text-xs text-white/40">{r.label}</label>
          <input
            type="text"
            value={credits[r.key] || ''}
            onChange={(e) => set(r.key, e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
            placeholder={r.label}
          />
        </div>
      ))}
    </div>
  );
}
