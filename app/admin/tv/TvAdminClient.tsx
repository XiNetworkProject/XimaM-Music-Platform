'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Radio, Settings2, KeyRound, ExternalLink, Wand2 } from 'lucide-react';

type Settings = {
  id: number;
  provider: string | null;
  enabled: boolean | null;
  playback_url: string | null;
  rtmp_url: string | null;
  stream_key: string | null;
  mux_live_stream_id: string | null;
  mux_playback_id: string | null;
  updated_at: string | null;
};

async function apiGet() {
  const res = await fetch('/api/admin/tv', { cache: 'no-store' });
  return (await res.json()) as { ok: boolean; settings?: Settings | null; error?: string };
}

async function apiPatch(patch: Partial<Settings>) {
  const res = await fetch('/api/admin/tv', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return (await res.json()) as { ok: boolean; settings?: Settings | null; error?: string };
}

async function apiMuxCreate() {
  const res = await fetch('/api/admin/tv/mux/create', { method: 'POST' });
  return (await res.json()) as {
    ok: boolean;
    mux?: { playbackUrl: string; rtmpUrl: string; streamKey: string };
    settings?: Settings | null;
    error?: string;
  };
}

export default function TvAdminClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provider = (settings?.provider || 'manual') as string;
  const enabled = Boolean(settings?.enabled);

  const playbackUrl = settings?.playback_url || '';
  const rtmpUrl = settings?.rtmp_url || '';
  const streamKey = settings?.stream_key || '';

  const canOpenTv = useMemo(() => Boolean(enabled && playbackUrl), [enabled, playbackUrl]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet();
        if (!res.ok) throw new Error(res.error || 'Erreur chargement');
        setSettings(res.settings || null);
      } catch (e: any) {
        setError(e?.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleEnabled = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPatch({ enabled: !enabled });
      if (!res.ok) throw new Error(res.error || 'Erreur sauvegarde');
      setSettings(res.settings || null);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const createMux = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiMuxCreate();
      if (!res.ok) throw new Error(res.error || 'Erreur Mux');
      setSettings(res.settings || null);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const saveManual = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiPatch({
        provider: 'manual',
        playback_url: playbackUrl,
        rtmp_url: rtmpUrl,
        stream_key: streamKey,
      });
      if (!res.ok) throw new Error(res.error || 'Erreur sauvegarde');
      setSettings(res.settings || null);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl border border-border-secondary bg-background-tertiary grid place-items-center">
              <Settings2 className="h-5 w-5 text-foreground-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-base md:text-lg font-semibold">SYNAURA TV</div>
              <div className="text-xs md:text-sm text-foreground-tertiary">Configuration du live (sans replay)</div>
            </div>
          </div>
        </div>

        <button
          onClick={toggleEnabled}
          disabled={busy || loading}
          className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-border-secondary bg-background-tertiary text-foreground-primary hover:bg-overlay-on-primary disabled:opacity-60"
        >
          <Radio className="h-4 w-4" />
          <span className="text-sm font-semibold">{enabled ? 'Désactiver' : 'Activer'}</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-foreground-primary">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4">
        <div className="lg:col-span-7 rounded-3xl border border-border-secondary bg-background-tertiary p-4">
          <div className="text-sm font-semibold text-foreground-primary">Option recommandée: Mux</div>
          <div className="mt-1 text-xs text-foreground-tertiary">
            Clique pour générer automatiquement la config OBS (RTMPS + clé) et l’URL de lecture HLS.
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              onClick={createMux}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-border-secondary bg-background-primary text-foreground-primary hover:bg-overlay-on-primary disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Créer un live Mux</span>
            </button>
            {canOpenTv && (
              <a
                href="/tv"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-10 px-3 rounded-2xl border border-border-secondary bg-background-primary text-foreground-primary hover:bg-overlay-on-primary"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm font-semibold">Ouvrir /tv</span>
              </a>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-border-secondary/60 bg-background-primary px-3 py-2">
              <div className="text-xs font-semibold text-foreground-secondary mb-1">Provider</div>
              <div className="text-sm text-foreground-primary">{provider}</div>
            </div>
            <div className="rounded-2xl border border-border-secondary/60 bg-background-primary px-3 py-2">
              <div className="text-xs font-semibold text-foreground-secondary mb-1">Playback (HLS)</div>
              <div className="text-xs text-foreground-tertiary break-all">{playbackUrl || '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-secondary/60 bg-background-primary px-3 py-2">
              <div className="text-xs font-semibold text-foreground-secondary mb-1">Serveur OBS (RTMPS)</div>
              <div className="text-xs text-foreground-tertiary break-all">{rtmpUrl || '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-secondary/60 bg-background-primary px-3 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground-secondary mb-1">
                <KeyRound className="h-3.5 w-3.5" />
                Clé de stream
              </div>
              <div className="text-xs text-foreground-tertiary break-all">{streamKey ? streamKey : '—'}</div>
              <div className="mt-1 text-[11px] text-foreground-tertiary">
                Ne partage jamais cette clé (elle permet de streamer sur SYNAURA TV).
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-3xl border border-border-secondary bg-background-tertiary p-4">
          <div className="text-sm font-semibold text-foreground-primary">Mode manuel (fallback)</div>
          <div className="mt-1 text-xs text-foreground-tertiary">
            Si tu veux utiliser un autre provider, colle ici l’URL HLS et la config OBS.
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-semibold text-foreground-secondary mb-1">Playback URL (m3u8)</div>
              <input
                value={playbackUrl}
                onChange={(e) => setSettings((s) => ({ ...(s || ({} as any)), playback_url: e.target.value }))}
                className="w-full h-11 rounded-2xl border border-border-secondary bg-background-primary px-3 text-sm text-foreground-primary outline-none"
                placeholder="https://.../live.m3u8"
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground-secondary mb-1">RTMP(S) URL</div>
              <input
                value={rtmpUrl}
                onChange={(e) => setSettings((s) => ({ ...(s || ({} as any)), rtmp_url: e.target.value }))}
                className="w-full h-11 rounded-2xl border border-border-secondary bg-background-primary px-3 text-sm text-foreground-primary outline-none"
                placeholder="rtmps://..."
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground-secondary mb-1">Stream key</div>
              <input
                value={streamKey}
                onChange={(e) => setSettings((s) => ({ ...(s || ({} as any)), stream_key: e.target.value }))}
                className="w-full h-11 rounded-2xl border border-border-secondary bg-background-primary px-3 text-sm text-foreground-primary outline-none"
                placeholder="xxxx-xxxx-xxxx"
              />
            </div>
            <button
              onClick={saveManual}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 h-11 px-3 rounded-2xl border border-border-secondary bg-background-primary text-foreground-primary hover:bg-overlay-on-primary disabled:opacity-60"
            >
              <span className="text-sm font-semibold">Sauvegarder (manuel)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

