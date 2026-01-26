'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HlsVideoPlayer from '@/components/HlsVideoPlayer';
import { Tv, Radio, RefreshCw } from 'lucide-react';

type TvStatus = {
  ok: boolean;
  provider?: string;
  enabled?: boolean;
  isLive?: boolean;
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

  const isLive = Boolean(status?.ok && status?.enabled && status?.isLive && status?.playbackUrl);
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
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <div className="mx-auto max-w-7xl px-3 md:px-4 py-4 md:py-6">
        <div className="rounded-3xl border border-border-secondary bg-background-fog-thin overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border-secondary/60">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-tertiary grid place-items-center">
                    <Tv className="h-5 w-5 text-foreground-secondary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base md:text-lg font-semibold leading-tight">SYNAURA TV</div>
                    <div className="text-xs md:text-sm text-foreground-tertiary">
                      Lives officiels sur la plateforme — latence quasi temps réel
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={refresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-border-secondary bg-background-tertiary text-foreground-primary hover:bg-overlay-on-primary disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-semibold">Actualiser</span>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                  isLive
                    ? 'border-border-secondary bg-background-tertiary text-foreground-primary'
                    : 'border-border-secondary/60 bg-background-primary text-foreground-tertiary'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                {headerText}
              </span>
              {loading && <span className="text-xs text-foreground-tertiary">chargement…</span>}
            </div>
          </div>

          <div className="p-3 md:p-6">
            {isLive ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
                <div className="lg:col-span-8">
                  <div className="rounded-3xl border border-border-secondary bg-background-tertiary p-2">
                    <HlsVideoPlayer src={playbackUrl} className="aspect-video w-full" />
                  </div>
                </div>
                <div className="lg:col-span-4">
                  <div className="rounded-3xl border border-border-secondary bg-background-tertiary p-4">
                    <div className="text-sm font-semibold text-foreground-primary">Infos</div>
                    <div className="mt-1 text-xs text-foreground-tertiary">
                      Chat & planning arrivent après le MVP. Pour le moment: live + statut.
                    </div>
                    <div className="mt-3 rounded-2xl border border-border-secondary/60 bg-background-primary px-3 py-2 text-xs text-foreground-tertiary break-all">
                      <div className="text-foreground-secondary font-semibold mb-1">Flux</div>
                      {playbackUrl}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-border-secondary bg-background-tertiary p-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-3xl border border-border-secondary bg-background-primary grid place-items-center">
                  <Radio className="h-6 w-6 text-foreground-tertiary" />
                </div>
                <div className="mt-3 text-base font-semibold">Aucun live en cours</div>
                <div className="mt-1 text-sm text-foreground-tertiary">
                  Reviens plus tard — dès qu’un live démarre, le player s’affiche automatiquement.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

