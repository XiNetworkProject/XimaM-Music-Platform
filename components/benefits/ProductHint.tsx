'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import ProductHintCard from './ProductHintCard';
import { chooseHint, dismissHint, emptyHintHistory, hintBudgetAvailable, hintStorageKey, hintsFor, HINT_EVENT, parseHintFacts, parseHintHistory, recordHint, type HintHistory, type HintPlacement } from '@/lib/productHints';

// One mounted opportunity at a time, across placements sharing this browser tab.
let activeLease: symbol | null = null;
function readHistory(identity: string): HintHistory | null {
  try { return parseHintHistory(localStorage.getItem(hintStorageKey(identity)), Date.now()); } catch { return null; }
}
function writeHistory(identity: string, state: HintHistory) {
  try { localStorage.setItem(hintStorageKey(identity), JSON.stringify(state)); return true; } catch { return false; }
}

/** No timers that poll, no messages/notifications writes, no inactive-card queries. */
export default function ProductHint({ placement, enabled = true, compact = false, onNavigate }: {
  placement: HintPlacement; enabled?: boolean; compact?: boolean; onNavigate?: (href: string) => void;
}) {
  const { data: session, status } = useSession();
  const identity = status === 'authenticated' ? session?.user?.id || '' : '';
  const slot = useRef<HTMLDivElement>(null);
  const token = useRef(Symbol('hint'));
  const [visible, setVisible] = useState(false);
  const [preferences, setPreferences] = useState<{ identity: string; state: HintHistory } | null>(null);
  const [lease, setLease] = useState<{ identity: string; placement: HintPlacement; id: string } | null>(null);
  const state = preferences?.identity === identity ? preferences.state : null;
  const ownLease = lease?.identity === identity && lease.placement === placement ? lease : null;
  const blocked = !state || state.quietUntil > Date.now() || (!ownLease && !hintBudgetAvailable(state, Date.now()));

  useEffect(() => {
    setLease(null);
    const sync = () => { const current = identity ? readHistory(identity) : null; setPreferences(current ? { identity, state: current } : null); };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(HINT_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync); window.removeEventListener(HINT_EVENT, sync);
      if (activeLease === token.current) activeLease = null;
    };
  }, [identity, placement]);
  useEffect(() => {
    setVisible(false);
    const element = slot.current;
    if (!enabled || !element || !identity) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, identity]);
  useEffect(() => {
    if (!enabled && activeLease === token.current) { activeLease = null; setLease(null); }
  }, [enabled]);

  const query = useQuery({
    queryKey: ['synaura-product-opportunities', identity],
    enabled: Boolean(identity && enabled && visible && !blocked),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/boosters', { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Opportunities unavailable');
      const facts = parseHintFacts(await response.json());
      if (!facts) throw new Error('Invalid opportunities');
      return facts;
    },
    staleTime: 120_000, gcTime: 300_000, retry: false, refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!enabled || !visible || blocked || ownLease || !query.data || query.isError || query.isFetching) return;
    let cancelled = false;
    const claim = () => {
      if (cancelled || document.visibilityState !== 'visible' || activeLease) return;
      const latest = readHistory(identity);
      const hint = latest && chooseHint(query.data, placement, latest, Date.now());
      if (!hint || !latest) return;
      // Fail closed when preferences cannot be persisted: no repeated prompts.
      if (!writeHistory(identity, recordHint(latest, hint.id, Date.now()))) return;
      activeLease = token.current;
      setLease({ identity, placement, id: hint.id });
      window.dispatchEvent(new Event(HINT_EVENT));
    };
    const timer = window.setTimeout(() => {
      // Serialize the read/check/write between tabs when Web Locks is available.
      if (navigator.locks) void navigator.locks.request(hintStorageKey(identity), { ifAvailable: true }, lock => { if (lock) claim(); }).catch(() => {});
      else claim();
    }, 900);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [enabled, visible, blocked, ownLease, query.data, query.isError, query.isFetching, identity, placement]);

  const hint = enabled && ownLease && state && state.quietUntil <= Date.now() && !(state.dismissed[ownLease.id] > Date.now()) && query.data && !query.isError
    ? hintsFor(query.data, placement).find(item => item.id === ownLease.id) : null;
  const dismiss = (quiet = false) => {
    const latest = readHistory(identity) || state || emptyHintHistory();
    const next = dismissHint(latest, ownLease?.id || '', Date.now(), quiet);
    writeHistory(identity, next);
    setPreferences({ identity, state: next }); setLease(null);
    if (activeLease === token.current) activeLease = null;
    window.dispatchEvent(new Event(HINT_EVENT));
  };
  return <div ref={slot} className={`syn-hint-slot ${compact ? 'syn-hint-slot--compact' : ''}`} data-hint-visible={!!hint}>
    {hint && <ProductHintCard hint={hint} placement={placement} compact={compact} onDismiss={() => dismiss()} onQuiet={() => dismiss(true)} onNavigate={onNavigate} />}
  </div>;
}
