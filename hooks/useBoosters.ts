"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface BoosterCatalogItem {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "track" | "artist";
  rarity: "common" | "rare" | "epic" | "legendary";
  multiplier: number;
  duration_hours: number;
}

export interface InventoryItem {
  id: string; // inventory id
  status: "owned" | "used";
  obtained_at: string;
  used_at?: string | null;
  booster: BoosterCatalogItem;
}

interface InventoryResponse {
  inventory: InventoryItem[];
  cooldownMs: number;
  remainingMs: number | null;
  streak: number;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
  pity?: { opens_since_rare: number; opens_since_epic: number; opens_since_legendary: number };
  packs?: Record<string, { periodStart: string; claimed: number; perWeek: number }>;
}

export function useBoosters() {
  const [loading, setLoading] = useState<boolean>(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cooldownMs, setCooldownMs] = useState<number>(24 * 3_600_000);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [lastOpened, setLastOpened] = useState<{ inventoryId: string; booster: BoosterCatalogItem } | null>(null);
  const [plan, setPlan] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free');
  const [pity, setPity] = useState<{ opens_since_rare: number; opens_since_epic: number; opens_since_legendary: number }>({
    opens_since_rare: 0,
    opens_since_epic: 0,
    opens_since_legendary: 0,
  });
  const [packs, setPacks] = useState<Record<string, { periodStart: string; claimed: number; perWeek: number }>>({});

  const canOpen = useMemo(() => !loading && (!remainingMs || remainingMs <= 0), [loading, remainingMs]);

  const tickRemaining = useCallback(() => {
    setRemainingMs((prev) => (prev > 0 ? Math.max(0, prev - 1000) : 0));
  }, []);

  useEffect(() => {
    if (!remainingMs || remainingMs <= 0) return;
    const id = setInterval(tickRemaining, 1000);
    return () => clearInterval(id);
  }, [remainingMs, tickRemaining]);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/boosters", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed inventory");
      const data: InventoryResponse = await res.json();
      setInventory(data.inventory || []);
      setCooldownMs(data.cooldownMs || 24 * 3_600_000);
      setRemainingMs(data.remainingMs || 0);
      setStreak(data.streak || 0);
      if (data.plan) setPlan(data.plan);
      if (data.pity) setPity(data.pity);
      if (data.packs) setPacks(data.packs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const openDaily = useCallback(async () => {
    if (!canOpen) return { ok: false as const };
    setLoading(true);
    try {
      const res = await fetch("/api/boosters/open", { method: "POST" });
      if (res.status === 429) {
        const j = await res.json().catch(() => ({}));
        setRemainingMs(typeof j.remainingMs === "number" ? j.remainingMs : cooldownMs);
        return { ok: false as const };
      }
      if (!res.ok) return { ok: false as const };
      const json = await res.json();
      const received = json?.received;
      const normalized = received
        ? {
            inventoryId: received.inventoryId || received.inventory_id,
            booster: received.booster,
          }
        : null;
      if (normalized) setLastOpened(normalized);
      await fetchInventory();
      return { ok: true as const, received: normalized };
    } finally {
      setLoading(false);
    }
  }, [canOpen, cooldownMs, fetchInventory]);

  const useOnTrack = useCallback(
    async (inventoryId: string, targetTrackId: string) => {
      if (!inventoryId || !targetTrackId) return { ok: false as const };
      setLoading(true);
      try {
        const res = await fetch("/api/boosters/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId, targetTrackId }),
        });
        if (!res.ok) return { ok: false as const };
        await fetchInventory();
        return { ok: true as const };
      } finally {
        setLoading(false);
      }
    },
    [fetchInventory]
  );

  const useOnArtist = useCallback(
    async (inventoryId: string) => {
      if (!inventoryId) return { ok: false as const };
      setLoading(true);
      try {
        const res = await fetch("/api/boosters/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventoryId }),
        });
        if (!res.ok) return { ok: false as const };
        await fetchInventory();
        return { ok: true as const };
      } finally {
        setLoading(false);
      }
    },
    [fetchInventory]
  );

  return {
    loading,
    inventory,
    cooldownMs,
    remainingMs,
    streak,
    lastOpened,
    canOpen,
    plan,
    pity,
    packs,
    fetchInventory,
    openDaily,
    useOnTrack,
    useOnArtist,
  };
}


