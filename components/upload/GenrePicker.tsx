'use client';
import { useMemo, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { GENRE_CATEGORIES, MUSIC_GENRES } from '@/lib/genres';
import { STYLE_FAMILIES, normalizeStyleSearch } from '@/lib/publication/styleFamilies';

export default function GenrePicker({ selected, onChange, max = 5 }: { selected: string[]; onChange: (genres: string[]) => void; max?: number }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = normalizeStyleSearch(search);
  const categories = useMemo(() => GENRE_CATEGORIES.map(c => ({ ...c, genres: c.genres.filter(g => !q || normalizeStyleSearch(g).includes(q) || normalizeStyleSearch(c.name).includes(q) || Object.entries(STYLE_FAMILIES[c.name] || {}).some(([parent, children]) => normalizeStyleSearch(parent).includes(q) && children.includes(g))) })).filter(c => c.genres.length), [q]);
  const toggle = (g: string) => onChange(selected.includes(g) ? selected.filter(x => x !== g) : selected.length < max ? [...selected, g] : selected);
  const chip = (g: string) => <button key={g} type="button" aria-pressed={selected.includes(g)} disabled={!selected.includes(g) && selected.length >= max} onClick={() => toggle(g)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-30 ${selected.includes(g) ? 'border-sky-300/40 bg-sky-300/15 text-sky-100' : 'border-white/10 text-slate-300 hover:bg-white/10'}`}>{g}</button>;
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">{selected.map((g, i) => <button type="button" key={g} onClick={() => toggle(g)} aria-label={`Retirer ${g}`} className="flex items-center gap-2 rounded-full bg-sky-200/15 px-3 py-2 text-xs text-sky-100">{i === 0 && <span className="text-[9px] uppercase opacity-60">Principal</span>}{g}<X size={12}/></button>)}</div>
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3"><Search size={15}/><input aria-label="Rechercher des genres et sous-genres" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Explorer ${MUSIC_GENRES.length} styles et sous-styles…`}/>{search && <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche"><X size={14}/></button>}</label>
    <p className="text-xs text-slate-400">{selected.length}/{max} · Facultatif. Le premier style est le principal.{selected.length >= max && ' Retire un style pour en choisir un autre.'}</p>
    <div className="max-h-[360px] overflow-y-auto overscroll-contain space-y-1 pr-1">
      {!categories.length && <p className="p-4 text-sm text-slate-400">Aucun style trouvé. Essaie un terme plus large.</p>}
      {categories.map(c => {
        const open = Boolean(q) || expanded === c.name;
        const families = Object.entries(STYLE_FAMILIES[c.name] || {});
        const children = new Set(families.flatMap(([, values]) => values));
        return <div key={c.name} className="rounded-xl border border-white/5">
          <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : c.name)} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm"><span aria-hidden>{c.emoji}</span><span className="flex-1">{c.name}</span><span className="text-xs text-slate-400">{c.genres.length}</span><ChevronDown size={14} className={open ? 'rotate-180' : ''}/></button>
          {open && <div className="space-y-3 px-3 pb-4"><div className="flex flex-wrap gap-1.5">{c.genres.filter(g => !children.has(g)).map(chip)}</div>{families.map(([parent, values]) => { const visible = values.filter(g => c.genres.includes(g)); return visible.length ? <div key={parent}><p className="mb-2 text-[11px] text-slate-400">Explorer {parent}</p><div className="flex flex-wrap gap-1.5">{visible.map(chip)}</div></div> : null; })}</div>}
        </div>;
      })}
    </div>
  </div>;
}
