'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Booster, Plan, Pity, Rarity } from '@/lib/boosters/policy';

export type BoosterCatalogItem = Booster;
export interface InventoryItem {
  id: string;
  status: 'owned' | 'used';
  obtained_at: string;
  used_at?: string | null;
  booster: Booster;
  metadata?: {
    activation?: {
      type: string;
      targetId: string;
      multiplier: number;
      expiresAt: string;
    };
  };
}
type InventoryResponse = {
  catalog?: Booster[];
  inventory: InventoryItem[];
  cooldownMs: number;
  remainingMs: number;
  streak: number;
  plan: Plan;
  pity: Pity;
  nextRarity: Rarity;
  odds: { rarity: Rarity; percent: number }[];
  packs: Record<
    string,
    {
      periodStart: string;
      claimed: number;
      perWeek: number;
      size: number;
      eligible: boolean;
    }
  >;
};
type MutationResult = {
  ok: boolean;
  error?: string;
  data?: any;
  received?: { inventoryId: string; booster: Booster } | null;
};

export function useBoosters() {
  const { data: session, status } = useSession();
  const identity = status === 'authenticated' ? session?.user?.id || '' : '';
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const [snapshot, setSnapshot] = useState<{
    identity: string;
    data: InventoryResponse;
  } | null>(null);
  const [reading, setReading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState(0),
    [now, setNow] = useState(Date.now);
  const [lastOpened, setLastOpened] = useState<{
    inventoryId: string;
    booster: Booster;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null),
    request = useRef(0),
    mutation = useRef(false);
  const data = snapshot?.identity === identity ? snapshot.data : null;

  const fetchInventory = useCallback(async () => {
    controller.current?.abort();
    if (!identity) return;
    const version = ++request.current,
      abort = new AbortController();
    controller.current = abort;
    setReading(true);
    try {
      const response = await fetch('/api/boosters', {
        cache: 'no-store',
        signal: abort.signal,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Chargement impossible.');
      if (
        abort.signal.aborted ||
        version !== request.current ||
        identityRef.current !== identity
      )
        return;
      setSnapshot({ identity, data: json });
      setError(null);
      setDeadline(Date.now() + Math.max(0, Number(json.remainingMs) || 0));
      setNow(Date.now());
    } catch (cause) {
      if (!abort.signal.aborted && identityRef.current === identity)
        setError(
          cause instanceof Error ? cause.message : 'Connexion indisponible.'
        );
    } finally {
      if (version === request.current && identityRef.current === identity)
        setReading(false);
    }
  }, [identity]);

  useEffect(() => {
    setSnapshot(null);
    setLastOpened(null);
    setError(null);
    setDeadline(0);
    setReading(!!identity);
    if (identity) void fetchInventory();
    return () => {
      controller.current?.abort();
      request.current++;
    };
  }, [identity, fetchInventory]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const perform = useCallback(
    async (url: string, body?: unknown): Promise<MutationResult> => {
      if (!identity || mutation.current)
        return { ok: false, error: 'Une opération est déjà en cours.' };
      mutation.current = true;
      setBusy(true);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const json = await response.json();
        if (identityRef.current !== identity)
          return { ok: false, error: 'Le compte a changé.' };
        if (!response.ok) {
          if (typeof json.remainingMs === 'number')
            setDeadline(Date.now() + json.remainingMs);
          throw new Error(json.error || 'Opération indisponible.');
        }
        const received = json.received?.booster
          ? {
              inventoryId:
                json.received.inventoryId || json.received.inventory_id,
              booster: json.received.booster,
            }
          : null;
        if (received) setLastOpened(received);
        setRevision((value) => value + 1);
        await fetchInventory();
        return { ok: true, data: json, received };
      } catch (cause) {
        return {
          ok: false,
          error:
            cause instanceof Error
              ? cause.message
              : 'Connexion interrompue. Actualise tes boosts avant de réessayer.',
        };
      } finally {
        mutation.current = false;
        setBusy(false);
      }
    },
    [identity, fetchInventory]
  );

  const remainingMs = Math.max(0, deadline - now);
  const loading = reading || busy;
  const canOpen =
    !!identity && !!data && !error && !loading && remainingMs === 0;
  const openDaily = useCallback(
    () =>
      canOpen
        ? perform('/api/boosters/open')
        : Promise.resolve({
            ok: false,
            error: 'Booster non disponible.',
          } as MutationResult),
    [canOpen, perform]
  );
  const useOnTrack = useCallback(
    (inventoryId: string, targetTrackId: string) =>
      perform('/api/boosters/use', { inventoryId, targetTrackId }),
    [perform]
  );
  const useOnArtist = useCallback(
    (inventoryId: string) => perform('/api/boosters/use', { inventoryId }),
    [perform]
  );
  return {
    loading,
    busy,
    ready: !!data,
    error,
    revision,
    identity,
    now,
    inventory: data?.inventory || [],
    catalog: data?.catalog || [],
    cooldownMs: data?.cooldownMs || 86_400_000,
    remainingMs,
    streak: data?.streak || 0,
    lastOpened,
    canOpen,
    plan: data?.plan || 'free',
    pity: data?.pity,
    packs: data?.packs || {},
    odds: data?.odds || [],
    nextRarity: data?.nextRarity || 'common',
    fetchInventory,
    openDaily,
    useOnTrack,
    useOnArtist,
    perform,
  };
}
