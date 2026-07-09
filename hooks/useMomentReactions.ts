import { useCallback, useEffect, useMemo, useState } from 'react';
import { isMomentReactionType, type MomentReactionType } from '@/lib/momentReactions';

export type RawMomentReaction = { id: string; reactionType: MomentReactionType; timestampSeconds: number };

export type MomentReactionCluster = {
  id: string;
  timestampSeconds: number;
  total: number;
  byType: Partial<Record<MomentReactionType, number>>;
  topType: MomentReactionType;
};

/** Deux réactions à moins de 3s l'une de l'autre sont considérées comme "le même
 * moment" et regroupées sous un seul marqueur (évite un mur de pastilles). */
const CLUSTER_WINDOW_SECONDS = 3;

function normalize(raw: any): RawMomentReaction | null {
  if (!raw || !isMomentReactionType(raw.reactionType) || !Number.isFinite(Number(raw.timestampSeconds))) return null;
  return { id: String(raw.id || ''), reactionType: raw.reactionType, timestampSeconds: Number(raw.timestampSeconds) };
}

function clusterReactions(reactions: RawMomentReaction[]): MomentReactionCluster[] {
  if (!reactions.length) return [];
  const sorted = [...reactions].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const clusters: MomentReactionCluster[] = [];

  for (const reaction of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && reaction.timestampSeconds - last.timestampSeconds <= CLUSTER_WINDOW_SECONDS) {
      last.total += 1;
      last.byType[reaction.reactionType] = (last.byType[reaction.reactionType] || 0) + 1;
      let topType = last.topType;
      let topCount = last.byType[topType] || 0;
      (Object.keys(last.byType) as MomentReactionType[]).forEach((type) => {
        const count = last.byType[type] || 0;
        if (count > topCount) {
          topType = type;
          topCount = count;
        }
      });
      last.topType = topType;
    } else {
      clusters.push({
        id: `cluster-${reaction.id}`,
        timestampSeconds: reaction.timestampSeconds,
        total: 1,
        byType: { [reaction.reactionType]: 1 },
        topType: reaction.reactionType,
      });
    }
  }

  return clusters;
}

/** Réactions rapides horodatées d'un morceau, regroupées par moment pour l'affichage
 * sur la waveform. Requête dédiée et légère (pas de texte, pas d'identité). */
export function useMomentReactions(trackId: string | null | undefined) {
  const [raw, setRaw] = useState<RawMomentReaction[]>([]);

  const refresh = useCallback(async () => {
    if (!trackId) {
      setRaw([]);
      return;
    }
    try {
      const res = await fetch(`/api/tracks/${encodeURIComponent(trackId)}/reactions`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      const list = (Array.isArray(json?.reactions) ? json.reactions : [])
        .map(normalize)
        .filter((r: RawMomentReaction | null): r is RawMomentReaction => Boolean(r));
      setRaw(list);
    } catch {
      // silencieux : les réactions sont un enrichissement, pas une donnée critique
    }
  }, [trackId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addOptimistic = useCallback((reaction: RawMomentReaction) => {
    setRaw((current) => [...current, reaction]);
  }, []);

  const clusters = useMemo(() => clusterReactions(raw), [raw]);

  return { clusters, refresh, addOptimistic };
}
