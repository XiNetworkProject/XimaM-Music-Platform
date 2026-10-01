'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import SearchBox from '@/components/search/SearchBox';
import { useCatalogueSearch } from '@/components/search/useCatalogueSearch';
import { SynauraImage } from '@/components/ui/SynauraImage';
import {
  SEARCH_KINDS,
  SEARCH_LABELS,
  creatorName,
  resultHref,
  searchHref,
} from '@/lib/search/model';
import { withCurrentHandoff } from '@/lib/creationHandoffClient';
import Link from '@/components/navigation/HandoffLink';
import '@/components/search/search-experience.css';

export default function SynauraUniversalSearch({
  compact = false,
  placeholder = 'Un son, un artiste…',
}: {
  compact?: boolean;
  placeholder?: string;
}) {
  const router = useRouter(),
    root = useRef<HTMLDivElement>(null),
    id = useId();
  const [query, setQuery] = useState(''),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const { results, loading, error } = useCatalogueSearch(query, 'all', 3, open);
  const items = SEARCH_KINDS.flatMap((kind) =>
    results[kind].slice(0, kind === 'tracks' ? 3 : 2).map((item) => ({ kind, item })),
  ).slice(0, 10);
  const show = open && query.trim().length >= 2;
  useEffect(() => {
    if (show && active >= 0)
      document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, show, id]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const all = () => {
    setOpen(false);
    router.push(withCurrentHandoff(searchHref(query)));
  };
  return (
    <div
      className="sx-quick"
      ref={root}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <SearchBox
        compact={compact}
        value={query}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={show}
        aria-controls={show ? id : undefined}
        aria-activedescendant={
          show && active >= 0 && active < items.length ? `${id}-${active}` : undefined
        }
        onChange={(value) => {
          setQuery(value);
          setActive(-1);
          setOpen(true);
        }}
        onSubmit={all}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((n) => Math.min(n + 1, items.length - 1));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((n) => Math.max(n - 1, -1));
          }
          if (event.key === 'Enter' && show && active >= 0 && items[active]) {
            event.preventDefault();
            const { kind, item } = items[active];
            setOpen(false);
            router.push(withCurrentHandoff(resultHref(kind, item)));
          }
        }}
      />
      {show && (
        <div className="sx-quick-results">
          <div role="listbox" id={id} aria-label="Suggestions de recherche">
            {loading ? (
              <p role="status">Recherche…</p>
            ) : error ? (
              <p role="status">{error}</p>
            ) : items.length ? (
              items.map(({ kind, item }, i) => (
                <Link
                  role="option"
                  aria-selected={i === active}
                  id={`${id}-${i}`}
                  className="sx-quick-option"
                  key={`${kind}-${item._id}`}
                  href={resultHref(kind, item)}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActive(i)}
                >
                  <SynauraImage
                    src={item.coverUrl || item.avatar || item.imageUrl || '/default-cover.svg'}
                    alt=""
                  />
                  <span>
                    <strong>
                      {kind === 'artists'
                        ? item.artistName || item.name
                        : kind === 'posts'
                          ? item.content
                          : item.title || item.name}
                    </strong>
                    <small>
                      {SEARCH_LABELS[kind]} ·{' '}
                      {kind === 'artists' ? `@${item.username}` : creatorName(item)}
                    </small>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))
            ) : (
              <p role="status">Aucune correspondance. Essaie un autre mot.</p>
            )}
          </div>
          <button type="button" className="sx-quick-all" onClick={all}>
            Ouvrir la recherche complète
            <ArrowUpRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
