'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { X, Hash } from 'lucide-react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}

export default function TagsInput({ tags, onChange, max = 10 }: Props) {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '').toLowerCase();
    if (!tag || tags.includes(tag) || tags.length >= max) return;
    onChange([...tags, tag]);
    setInput('');
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && input.trim()) {
      e.preventDefault();
      add(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] cursor-text focus-within:border-white/[0.16] focus-within:ring-1 focus-within:ring-white/[0.08] transition"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-white/70"
        >
          <Hash className="w-3 h-3 text-white/30" />
          {t}
          <button type="button" onClick={() => remove(t)} className="hover:text-red-400 transition">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {tags.length < max && (
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => { if (input.trim()) add(input); }}
          className="flex-1 min-w-[100px] bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
          placeholder={tags.length === 0 ? 'Ajouter des tags...' : ''}
        />
      )}
      <span className="self-center text-[10px] text-white/20 ml-auto">{tags.length}/{max}</span>
    </div>
  );
}
