'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HlsVideoPlayer from '@/components/HlsVideoPlayer';
import { Tv, Radio, RefreshCw } from 'lucide-react';

type TvStatus = {
  ok: boolean;
  provider?: string;
  enabled?: boolean;
  isLive?: boolean;
  providerStatus?: string | null;
  playbackUrl?: string | null;
};

async function fetchStatus(signal?: AbortSignal): Promise<TvStatus> {
  const res = await fetch('/api/tv/status', { cache: 'no-store', signal });
  const json = (await res.json().catch(() => ({}))) as TvStatus;
  return json;
}

export default function TvClient() {
  const [status, setStatus] = useState<TvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canPlay = Boolean(status?.ok && status?.enabled && status?.playbackUrl);
  const isLive = Boolean(status?.ok && status?.enabled && status?.isLive);
  const playbackUrl = status?.playbackUrl || '';

  const headerText = useMemo(() => {
    if (!status) return 'Chargement…';
    if (!status.ok) return 'Indisponible';
    if (!status.enabled) return 'Hors ligne';
    return isLive ? 'En direct' : 'Hors ligne';
  }, [status, isLive]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const s = await fetchStatus();
      setStatus(s);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const s = await fetchStatus(ac.signal);
        setStatus(s);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // Polling léger (10s)
  useEffect(() => {
    const t = setInterval(() => {
      refresh().catch(() => {});
    }, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* “TV chrome” minimal */}
      <div className="mx-auto max-w-6xl px-3 md:px-4 py-4 md:py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 rounded-2xl border border-white/15 bg-white/10 grid place-items-center">
              <Tv className="h-5 w-5 text-white/85" />
            </div>
            <div className="min-w-0">
              <div className="text-base md:text-lg font-semibold leading-tight">SYNAURA TV</div>
              <div className="text-xs md:text-sm text-white/60">Mode TV — plein écran, simple, direct</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                isLive ? 'border-red-500/40 bg-red-500/15 text-white' : 'border-white/15 bg-white/10 text-white/75'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              {isLive ? 'DIRECT' : headerText}
            </span>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-semibold">Actualiser</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          {canPlay ? (
            <div className="rounded-[28px] border border-white/15 bg-gradient-to-b from-white/10 to-black p-2">
              <div className="rounded-[22px] overflow-hidden bg-black">
                <HlsVideoPlayer src={playbackUrl} className="aspect-video w-full" autoPlay muted controls />
              </div>
              {!isLive && (
                <div className="mt-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/70">
                  Statut live non confirmé (Mux/serveur). Si le flux est actif, tu peux quand même le lire ici.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-3xl border border-white/15 bg-white/10 grid place-items-center">
                <Radio className="h-6 w-6 text-white/65" />
              </div>
              <div className="mt-3 text-base font-semibold">Aucun live en cours</div>
              <div className="mt-1 text-sm text-white/60">
                Active SYNAURA TV dans <span className="font-semibold">/admin/tv</span>, puis lance OBS.
              </div>
              {loading && <div className="mt-2 text-xs text-white/50">chargement…</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

