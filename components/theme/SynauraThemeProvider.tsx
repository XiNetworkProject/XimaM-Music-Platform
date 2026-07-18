'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

export type SynauraThemeMode = 'dark' | 'light' | 'system';

export const SYNAURA_THEME_STORAGE_KEY = 'synaura.theme.mode.v1';

type ThemeContextValue = {
  mode: SynauraThemeMode;
  resolvedTheme: 'dark' | 'light';
  setMode: (mode: SynauraThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is SynauraThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

function systemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: SynauraThemeMode) {
  const resolved = mode === 'system' ? systemTheme() : mode;
  const root = document.documentElement;
  root.dataset.synauraThemeMode = mode;
  root.dataset.synauraTheme = resolved;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  root.style.colorScheme = resolved;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = resolved === 'dark' ? '#0D0D0D' : '#F7F6F3';
  });
  return resolved;
}

function readStoredMode(): SynauraThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(SYNAURA_THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : 'system';
}

export function SynauraThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<SynauraThemeMode>(readStoredMode);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return mode === 'system' ? systemTheme() : mode;
  });

  useEffect(() => {
    setResolvedTheme(applyTheme(mode));
    if (mode !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: SynauraThemeMode) => {
    window.localStorage.setItem(SYNAURA_THEME_STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, resolvedTheme, setMode }), [mode, resolvedTheme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useSynauraTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useSynauraTheme must be used inside SynauraThemeProvider');
  return value;
}

const OPTIONS: Array<{ value: SynauraThemeMode; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'system', label: 'Système', icon: Monitor },
];

export function SynauraThemeSelector({ className = '' }: { className?: string }) {
  const { mode, setMode } = useSynauraTheme();
  return (
    <div className={`grid grid-cols-3 gap-1 rounded-xl border border-[var(--syn-border)] bg-[var(--syn-surface-muted)] p-1 ${className}`} role="radiogroup" aria-label="Thème de l'interface">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(option.value)}
            className={`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-black transition ${selected ? 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)] shadow-sm' : 'text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)]'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
