"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface BoosterCatalogItem {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "track" | "artist";
  rarity: "common" | "rare" | "epic";
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
}

export function useBoosters() {
  const [loading, setLoading] = useState<boolean>(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [cooldownMs, setCooldownMs] = useState<number>(24 * 3_600_000);
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [lastOpened, setLastOpened] = useState<{ inventoryId: string; booster: BoosterCatalogItem } | null>(null);

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
      setLastOpened(json.received);
      await fetchInventory();
      return { ok: true as const, received: json.received };
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

  return {
    loading,
    inventory,
    cooldownMs,
    remainingMs,
    streak,
    lastOpened,
    canOpen,
    fetchInventory,
    openDaily,
    useOnTrack,
  };
}


