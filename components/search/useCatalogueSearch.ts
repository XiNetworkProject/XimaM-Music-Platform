'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptySearch, SEARCH_KINDS, type SearchFilter, type SearchKind } from '@/lib/search/model';

type Page = {
  results: ReturnType<typeof emptySearch>;
  pagination: Partial<Record<SearchKind, { hasMore: boolean; nextCursor: string | null }>>;
};
const empty = (): Page => ({ results: emptySearch(), pagination: {} });
export function useCatalogueSearch(
  query: string,
  filter: SearchFilter = 'all',
  limit = 12,
  enabled = true,
) {
  const key = JSON.stringify([query.trim(), filter, limit]);
  const active = enabled && query.trim().length >= 2;
  const [state, setState] = useState<{ key: string; page: Page; loading: boolean; error: string }>({
    key: '',
    page: empty(),
    loading: false,
    error: '',
  });
  const [revision, retry] = useState(0);
  const [more, setMore] = useState(false);
  const moreLock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const current = useRef(key);
  current.current = key;
  useEffect(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    moreLock.current = false;
    setMore(false);
    if (!active) {
      setState({ key, page: empty(), loading: false, error: '' });
      return () => controller.abort();
    }
    setState({ key, page: empty(), loading: true, error: '' });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?${new URLSearchParams({ query: query.trim(), filter, limit: String(limit) })}`,
          { signal: controller.signal, cache: 'no-store' },
        );
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Recherche indisponible.');
        if (controller.signal.aborted || current.current !== key) return;
        const results = emptySearch();
        SEARCH_KINDS.forEach((kind) => {
          results[kind] = Array.isArray(json[kind]) ? json[kind] : [];
        });
        setState({
          key,
          page: { results, pagination: json.pagination || {} },
          loading: false,
          error: '',
        });
      } catch (error) {
        if (!controller.signal.aborted && current.current === key)
          setState({
            key,
            page: empty(),
            loading: false,
            error: error instanceof Error ? error.message : 'Recherche indisponible.',
          });
      }
    }, 240);
    return () => {
      clearTimeout(timer);
      controller.abort();
      request.current?.abort();
    };
  }, [key, active, revision]); // key contains every search parameter
  const loadMore = useCallback(async () => {
    const cursor = filter !== 'all' ? state.page.pagination[filter]?.nextCursor : null;
    if (!cursor || moreLock.current || current.current !== state.key) return;
    moreLock.current = true;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setMore(true);
    try {
      const response = await fetch(
        `/api/search?${new URLSearchParams({ query: query.trim(), filter, limit: String(limit), cursor })}`,
        { signal: controller.signal, cache: 'no-store' },
      );
      const json = await response.json();
      if (!response.ok) throw new Error('La suite n’a pas pu être chargée. Réessaie.');
      if (controller.signal.aborted || current.current !== key) return;
      setState((previous) => {
        const kind = filter as SearchKind,
          ids = new Set(previous.page.results[kind].map((item) => item._id || item.id));
        return {
          key,
          loading: false,
          error: '',
          page: {
            results: {
              ...previous.page.results,
              [kind]: [
                ...previous.page.results[kind],
                ...(json[kind] || []).filter((item: any) => !ids.has(item._id || item.id)),
              ],
            },
            pagination: json.pagination || {},
          },
        };
      });
    } catch (error) {
      if (!controller.signal.aborted && current.current === key)
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error.message : 'Recherche indisponible.',
        }));
    } finally {
      if (!controller.signal.aborted && current.current === key) {
        moreLock.current = false;
        setMore(false);
      }
    }
  }, [filter, key, limit, more, query, state]);
  useEffect(() => () => request.current?.abort(), []);
  return {
    ...(state.key === key && active ? state.page : empty()),
    loading: active && (state.key !== key || state.loading),
    error: state.key === key ? state.error : '',
    more,
    loadMore,
    retry: () => retry((value) => value + 1),
  };
}
