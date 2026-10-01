'use client';
import { useCallback, useEffect, useState } from 'react';

/** Lazy reads are aborted and isolated by account, URL and mutation revision. */
export function useBoosterResource<T>(
  url: string | null,
  identity: string,
  revision = 0
) {
  const [retry, setRetry] = useState(0);
  const key = `${identity}:${url}:${revision}:${retry}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ key: '', data: null, error: null, loading: false });
  useEffect(() => {
    if (!url || !identity) return;
    const controller = new AbortController();
    setState({ key, data: null, error: null, loading: true });
    void (async () => {
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || 'Chargement indisponible.');
        if (!controller.signal.aborted)
          setState({ key, data, error: null, loading: false });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : 'Connexion indisponible.',
            loading: false,
          });
      }
    })();
    return () => controller.abort();
  }, [url, identity, key]);
  const reload = useCallback(() => setRetry((value) => value + 1), []);
  return {
    ...(state.key === key
      ? state
      : { data: null, error: null, loading: !!url && !!identity }),
    reload,
  };
}
