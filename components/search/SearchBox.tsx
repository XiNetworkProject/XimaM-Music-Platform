'use client';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
export default function SearchBox({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  autoFocus = false,
  compact = false,
  placeholder = 'Un son, un artiste, une envie…',
  ...aria
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  compact?: boolean;
  placeholder?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
  role?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      role="search"
      className={`sx-search-box ${compact ? 'sx-search-box--compact' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Search size={compact ? 18 : 24} aria-hidden="true" />
      <input
        ref={input}
        {...aria}
        aria-autocomplete={aria.role === 'combobox' ? 'list' : undefined}
        aria-label="Rechercher dans Synaura"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        maxLength={120}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        type="search"
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => {
            onChange('');
            input.current?.focus();
          }}
        >
          <X size={18} />
        </button>
      )}
      <button type="submit" className="sx-search-submit" aria-label="Lancer la recherche">
        <ArrowUpRight size={compact ? 18 : 22} />
      </button>
    </form>
  );
}
