'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Headphones,
  Heart,
  Music,
  TrendingUp,
  Users,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { StatsPageSkeleton } from '@/components/Skeletons';

type Daily = {
  day: string;
  views: number;
  plays: number;
  completes: number;
  likes: number;
  shares: number;
  favorites: number;
  total_listen_ms: number;
  unique_listeners: number;
  retention_complete_rate: number;
};

type TrackDetail = {
  daily: Daily[];
  rolling?: any;
  sources?: {
    source: string;
    views: number;
    plays: number;
    completes: number;
  }[];
  funnel?: {
    starts: number;
    p25Rate: number;
    p50Rate: number;
    p75Rate: number;
    completeRate: number;
  };
};

// Debug manuel par track_id (garde-le si tu veux faire des tests ponctuels)
function StatsTrackDebug() {
  const [trackId, setTrackId] = useState<string>('');
  const [data, setData] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!trackId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stats/tracks?track_id=${encodeURIComponent(trackId)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur chargement stats');
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Erreur');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hidden"> {/* gardé mais non affiché, juste pour debug interne si besoin */}
      <button onClick={fetchStats}>Debug stats</button>
      {loading && <div>Chargement…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {data && <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

function sum(arr: any[], key: string): number {
  return (arr || []).reduce((acc, x) => acc + (Number(x?.[key]) || 0), 0);
}

function avg(arr: any[], key: string): number {
  if (!arr || !arr.length) return 0;
  return sum(arr, key) / arr.length;
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function DonutWithLegend({
  data,
  topN = 6,
}: {
  data: Record<string, number>;
  topN?: number;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const others = sorted.slice(topN);
  const othersSum = others.reduce((s, [, v]) => s + Number(v || 0), 0);
  const entries = (othersSum > 0
    ? [...top, ['Autres', othersSum]]
    : top) as Array<[string, number]>;
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  let acc = 0;
  const colors = [
    '#8b5cf6',
    '#06b6d4',
    '#f59e0b',
    '#10b981',
    '#ef4444',
    '#22c55e',
    '#f97316',
    '#3b82f6',
  ];
  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="16"
        />
        {entries.map(([label, value], i) => {
          const pct = (value / total) * 100;
          const start: number = (acc / 100) * (2 * Math.PI);
          const end: number = ((acc + pct) / 100) * (2 * Math.PI);
          acc += pct;
          const x1 = 60 + 48 * Math.sin(start as number);
          const y1 = 60 - 48 * Math.cos(start as number);
          const x2 = 60 + 48 * Math.sin(end as number);
          const y2 = 60 - 48 * Math.cos(end as number);
          const largeArc = end - start > Math.PI ? 1 : 0;
          const d = `M ${x1} ${y1} A 48 48 0 ${largeArc} 1 ${x2} ${y2}`;
          return (
            <path
              key={label}
              d={d}
              stroke={colors[i % colors.length]}
              strokeWidth={16}
              fill="none"
            />
          );
        })}
        <circle cx="60" cy="60" r="34" fill="rgba(0,0,0,0.5)" />
      </svg>
      <div className="flex-1 space-y-2">
        {entries.map(([label, value], i) => (
          <div key={`${label}-${i}`} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="text-sm text-white/80 flex-1 truncate">{label}</span>
            <span className="text-sm text-white/70">
              {Math.round((value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Track = {
  id: string;
  _id?: string;
  title: string;
  plays: number;
  likes: number;
  cover_url?: string;
  coverUrl?: string;
  duration?: number;
  created_at?: string;
};

export default function StatsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [compareTrack, setCompareTrack] = useState<string>('');

  const [audience, setAudience] = useState<{
    countries?: Record<string, number>;
    devices?: Record<string, number>;
  }>({});
  const [audienceTech, setAudienceTech] = useState<{
    os?: Record<string, number>;
    browsers?: Record<string, number>;
  }>({});
  const [series, setSeries] = useState<
    Array<{ date: string; plays: number; uniques?: number; likes?: number }>
  >([]);
  const [compareSeries, setCompareSeries] = useState<
    Array<{ date: string; plays: number; uniques?: number; likes?: number }>
  >([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [metric, setMetric] = useState<'plays' | 'uniques' | 'likes'>('plays');
  const [heatmap, setHeatmap] = useState<number[][]>([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<{
    date: string;
    plays: number;
    uniques?: number;
    likes?: number;
  } | null>(null);

  const [trackDetail, setTrackDetail] = useState<TrackDetail | null>(null);
  const [loadingTrackDetail, setLoadingTrackDetail] = useState(false);

  // Onboarding: marquer la visite des stats
  useEffect(() => {
    try {
      localStorage.setItem('onboarding.viewedStats', '1');
      sessionStorage.setItem('onboarding.viewedStats', '1');
      window.dispatchEvent(new Event('onboardingStatsViewed'));
    } catch {}
  }, []);

  // Initialiser à partir de l'URL (track_id, range, compare)
  useEffect(() => {
    try {
      const trackId = searchParams?.get('track_id');
      if (trackId) setSelectedTrack(trackId);

      const r = searchParams?.get('range');
      if (r === '7d' || r === '30d' || r === '90d' || r === 'all') {
        setRange(r);
      }

      const c = searchParams?.get('compare');
      if (c) setCompareTrack(c);
    } catch {}
  }, [searchParams]);

  // Synchroniser les filtres → URL (shareable)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (selectedTrack && selectedTrack !== 'all') {
        params.set('track_id', selectedTrack);
      } else {
        params.delete('track_id');
      }
      params.set('range', range);
      if (compareTrack) {
        params.set('compare', compareTrack);
      } else {
        params.delete('compare');
      }

      const qs = params.toString();
      router.replace(`/stats${qs ? `?${qs}` : ''}`, { scroll: false });
    } catch {
      // ignore
    }
  }, [range, selectedTrack, compareTrack, router]);

  // Chargement principal (pistes + stats globales)
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!session?.user?.username) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/users/${session.user.username}`, {
          headers: { 'Cache-Control': 'no-store' },
        });
        if (!res.ok) {
          throw new Error('Erreur de récupération des stats');
        }
        const data = await res.json();
        const userTracks: Track[] = (data?.tracks || []).map((t: any) => ({
          id: t.id || t._id,
          title: t.title,
          plays: t.plays || 0,
          likes: t.likes || 0,
          cover_url: t.cover_url || t.coverUrl,
          duration: t.duration,
          created_at: t.created_at,
        }));
        setTracks(userTracks);

        // Audience + timeseries + heatmap + détail piste en parallèle
        setLoadingAudience(true);
        setLoadingSeries(true);

        await Promise.all([
          // Audience
          (async () => {
            try {
              const a = await fetch(
                `/api/stats/audience?range=${range}&track=${selectedTrack}`,
                { headers: { 'Cache-Control': 'no-store' } },
              );
              if (a.ok) {
                const json = await a.json();
                setAudience({ countries: json.countries, devices: json.devices });
                setAudienceTech({ os: json.os, browsers: json.browsers });
              } else {
                setAudience({});
                setAudienceTech({});
              }
            } catch {
              setAudience({});
              setAudienceTech({});
            } finally {
              setLoadingAudience(false);
            }
          })(),

          // Timeseries principale
          (async () => {
            try {
              const s = await fetch(
                `/api/stats/timeseries?range=${range}&track=${selectedTrack}`,
                { headers: { 'Cache-Control': 'no-store' } },
              );
              if (s.ok) setSeries(await s.json());
              else setSeries([]);
            } catch {
              setSeries([]);
            } finally {
              setLoadingSeries(false);
            }
          })(),

          // Timeseries comparée
          (async () => {
            try {
              if (compareTrack && compareTrack !== 'all' && compareTrack !== selectedTrack) {
                const s2 = await fetch(
                  `/api/stats/timeseries?range=${range}&track=${compareTrack}`,
                  { headers: { 'Cache-Control': 'no-store' } },
                );
                if (s2.ok) setCompareSeries(await s2.json());
                else setCompareSeries([]);
              } else {
                setCompareSeries([]);
              }
            } catch {
              setCompareSeries([]);
            }
          })(),

          // Heatmap
          (async () => {
            try {
              setLoadingHeatmap(true);
              const h = await fetch(
                `/api/stats/heatmap?range=${range}&track=${selectedTrack}`,
                { headers: { 'Cache-Control': 'no-store' } },
              );
              if (h.ok) {
                const json = await h.json();
                setHeatmap(json.matrix || []);
              } else {
                setHeatmap([]);
              }
            } catch {
              setHeatmap([]);
            } finally {
              setLoadingHeatmap(false);
            }
          })(),

          // Détail piste (rétention + sources + daily)
          (async () => {
            try {
              if (selectedTrack && selectedTrack !== 'all') {
                setLoadingTrackDetail(true);
                const t = await fetch(
                  `/api/stats/tracks?track_id=${encodeURIComponent(selectedTrack)}`,
                  { headers: { 'Cache-Control': 'no-store' } },
                );
                if (t.ok) {
                  const json = await t.json();
                  setTrackDetail(json);
                } else {
                  setTrackDetail({ daily: [] });
                }
              } else {
                setTrackDetail(null);
              }
            } catch {
              setTrackDetail({ daily: [] });
            } finally {
              setLoadingTrackDetail(false);
            }
          })(),
        ]);
      } catch (e: any) {
        setError(e.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [session?.user?.username, range, selectedTrack]);

  const totals = useMemo(() => {
    const totalPlays = tracks.reduce((s, t) => s + (t.plays || 0), 0);
    const totalLikes = tracks.reduce((s, t) => s + (t.likes || 0), 0);
    const totalTracks = tracks.length;
    const period = series.reduce(
      (acc: any, p: any) => {
        acc.plays += p.plays || 0;
        acc.uniques += p.uniques || 0;
        acc.likes += p.likes || 0;
        return acc;
      },
      { plays: 0, uniques: 0, likes: 0 },
    );
    return { totalPlays, totalLikes, totalTracks, period };
  }, [tracks, series]);

  const topTracks = useMemo(() => {
    return [...tracks]
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 10);
  }, [tracks]);

  const trackDaily = trackDetail?.daily || [];
  const trackFunnel = trackDetail?.funnel;
  const trackSources = trackDetail?.sources || [];
  const maxTrackSourcePlays = trackSources.length
    ? Math.max(1, ...trackSources.map((s: any) => s.plays || 0))
    : 1;

  if (loading) {
    return <StatsPageSkeleton />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-[var(--text)]">
      {/* Fond stats Synaura */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.25]" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[#050716] via-[#05010b] to-[#020008]" />
        <div
          className="absolute inset-[-1px]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(124,58,237,0.95) 0%, rgba(124,58,237,0.15) 40%, transparent 75%)',
          }}
        />
        <div
          className="absolute -bottom-40 right-[-60px] w-[380px] h-[380px] rounded-full blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(34,211,238,0.95) 0%, rgba(34,211,238,0.18) 40%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative z-10 px-2 sm:px-4 md:px-6 pt-10 pb-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Statistiques
              </h1>
              <p className="text-[var(--text-muted)]">
                Vue d’ensemble de tes performances sur Synaura
              </p>
            </div>
            <Link
              href="/profile"
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 text-white/90"
            >
              <Users size={16} /> Voir mon profil
            </Link>
          </div>

          {/* Filtres */}
          <div className="panel-suno border border-[var(--border)] rounded-2xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-wrap gap-2">
                {(['7d', '30d', '90d', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    aria-pressed={range === r}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      range === r
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow'
                        : 'bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 text-white/90'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              {(loadingSeries || loadingAudience) && (
                <SynauraSpinner label="Mise à jour des stats" />
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  disabled={loadingSeries || loading}
                  className="appearance-none bg-[var(--surface-2)]/70 backdrop-blur ring-1 ring-[var(--border)] hover:ring-[var(--color-primary)] focus:ring-[var(--color-primary)] transition-colors rounded-xl pl-3 pr-10 py-2 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed min-w-[220px]"
                >
                  <option value="all">Toutes les pistes</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70">
                  {loadingSeries ? (
                    <span className="relative inline-flex h-4 w-4">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)]/40 blur-[2px]" />
                      <span
                        className="relative inline-flex h-4 w-4 rounded-full border-2 border-transparent animate-spin"
                        style={{
                          borderTopColor: 'var(--color-accent)',
                          borderRightColor: 'var(--color-primary)',
                        }}
                      />
                    </span>
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </div>
              <div className="relative">
                <select
                  value={compareTrack}
                  onChange={(e) => setCompareTrack(e.target.value)}
                  disabled={loadingSeries || loading}
                  className="appearance-none bg-[var(--surface-2)]/70 backdrop-blur ring-1 ring-[var(--border)] hover:ring-[var(--color-primary)] focus:ring-[var(--color-primary)] transition-colors rounded-xl pl-3 pr-10 py-2 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed min-w-[220px]"
                >
                  <option value="">Comparer à… (optionnel)</option>
                  {tracks.map((t) => (
                    <option
                      key={`c-${t.id}`}
                      value={t.id}
                      disabled={t.id === selectedTrack}
                    >
                      {t.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Erreur globale */}
          {error && (
            <div className="panel-suno border border-red-500/40 rounded-2xl p-4 bg-red-500/10 text-red-100 mb-6">
              {error}
            </div>
          )}

          {/* Aucun titre encore */}
          {!error && tracks.length === 0 && (
            <EmptyStatsState />
          )}

          {!error && tracks.length > 0 && (
            <>
              {/* Détail piste sélectionnée (total + funnel + sources) */}
              {selectedTrack !== 'all' && (
                <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 mb-6 bg-black/40 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        Stats de la piste (total)
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">
                        Vue détaillée sur l’ensemble de sa vie
                      </p>
                    </div>
                    {loadingTrackDetail && (
                      <SynauraSpinner label="Détails piste" />
                    )}
                  </div>

                  {!loadingTrackDetail && Array.isArray(trackDaily) && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        <Card
                          label="Vues (total)"
                          value={sum(trackDaily, 'views')}
                        />
                        <Card
                          label="Lectures (total)"
                          value={sum(trackDaily, 'plays')}
                        />
                        <Card
                          label="Fins (total)"
                          value={sum(trackDaily, 'completes')}
                        />
                        <Card
                          label="Likes (total)"
                          value={sum(trackDaily, 'likes')}
                        />
                        <Card
                          label="Partages (total)"
                          value={sum(trackDaily, 'shares')}
                        />
                        <Card
                          label="Favoris (total)"
                          value={sum(trackDaily, 'favorites')}
                        />
                        <Card
                          label="Heures d’écoute (total)"
                          value={(
                            sum(trackDaily, 'total_listen_ms') / 3600000
                          ).toFixed(1)}
                        />
                        <Card
                          label="Rétention moyenne (%)"
                          value={avg(
                            trackDaily,
                            'retention_complete_rate',
                          ).toFixed(1)}
                        />
                      </div>

                      {/* Funnel + sources + mini tendance */}
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {trackFunnel && (
                          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
                            <h3 className="text-sm font-semibold mb-2 text-white">
                              Funnel de rétention (30 derniers jours)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-[var(--text-muted)]">
                              <div className="p-2 bg-[var(--surface-3)] rounded-lg">
                                <div className="text-[10px] uppercase tracking-wide">
                                  Starts
                                </div>
                                <div className="text-[var(--text)] font-semibold">
                                  {trackFunnel.starts}
                                </div>
                              </div>
                              <div className="p-2 bg-[var(--surface-3)] rounded-lg">
                                <div className="text-[10px] uppercase tracking-wide">
                                  25%
                                </div>
                                <div className="text-[var(--text)] font-semibold">
                                  {trackFunnel.p25Rate}%
                                </div>
                              </div>
                              <div className="p-2 bg-[var(--surface-3)] rounded-lg">
                                <div className="text-[10px] uppercase tracking-wide">
                                  50%
                                </div>
                                <div className="text-[var(--text)] font-semibold">
                                  {trackFunnel.p50Rate}%
                                </div>
                              </div>
                              <div className="p-2 bg-[var(--surface-3)] rounded-lg">
                                <div className="text-[10px] uppercase tracking-wide">
                                  75%
                                </div>
                                <div className="text-[var(--text)] font-semibold">
                                  {trackFunnel.p75Rate}%
                                </div>
                              </div>
                              <div className="p-2 bg-[var(--surface-3)] rounded-lg">
                                <div className="text-[10px] uppercase tracking-wide">
                                  Complet
                                </div>
                                <div className="text-[var(--text)] font-semibold">
                                  {trackFunnel.completeRate}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {trackSources && trackSources.length > 0 && (
                          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
                            <h3 className="text-sm font-semibold mb-2 text-white">
                              Sources de trafic (30 derniers jours)
                            </h3>
                            <div className="space-y-2 text-xs text-[var(--text-muted)]">
                              {trackSources.map((s) => (
                                <div
                                  key={s.source || 'unknown'}
                                  className="flex items-center gap-3"
                                >
                                  <span className="w-24 truncate">
                                    {s.source || 'Inconnu'}
                                  </span>
                                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
                                      style={{
                                        width: `${Math.max(
                                          4,
                                          (100 * (s.plays || 0)) /
                                            maxTrackSourcePlays,
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-white/70 whitespace-nowrap">
                                    {s.plays} plays · {s.completes} fins
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {trackDaily.length > 0 && (
                        <div className="mt-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 sm:p-4">
                          <h3 className="text-sm font-semibold mb-2 text-white">
                            Tendance sur 7 jours pour cette piste
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-[11px] text-[var(--text-muted)]">
                            {trackDaily.slice(-7).map((d) => (
                              <div
                                key={d.day}
                                className="p-2 bg-[var(--surface-3)] rounded-lg"
                              >
                                <div className="text-[10px]">
                                  {new Date(d.day).toLocaleDateString('fr-FR')}
                                </div>
                                <div>Plays: {d.plays}</div>
                                <div>Fin: {d.completes}</div>
                                <div>
                                  Ret: {Math.round(d.retention_complete_rate)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* KPIs globaux */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Kpi
                  icon={<Headphones size={16} />}
                  label="Écoutes totales"
                  value={formatNumber(totals.totalPlays)}
                />
                <Kpi
                  icon={<Heart size={16} />}
                  label="Likes totaux"
                  value={formatNumber(totals.totalLikes)}
                />
                <Kpi
                  icon={<Music size={16} />}
                  label="Pistes"
                  value={formatNumber(totals.totalTracks)}
                />
                <Kpi
                  icon={<TrendingUp size={16} />}
                  label="Top (10)"
                  value={formatNumber(topTracks.length)}
                />
              </div>

              {/* Évolution (timeseries) */}
              <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 mb-6 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Évolution des écoutes
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Suis la courbe de tes performances sur la période choisie
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['plays', 'uniques', 'likes'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMetric(m)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          metric === m
                            ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                            : 'bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 text-white/90'
                        }`}
                      >
                        {m === 'plays'
                          ? 'Écoutes'
                          : m === 'uniques'
                          ? 'Uniques'
                          : 'Likes'}
                      </button>
                    ))}
                  </div>
                </div>
                {loadingSeries ? (
                  <div className="h-48 flex items-center justify-center">
                    <SynauraSpinner label="Évolution" />
                  </div>
                ) : series.length === 0 ? (
                  <div className="text-[var(--text-muted)] text-sm text-center py-8">
                    Les stats s’affichent après tes premières écoutes.
                    Partage tes musiques pour commencer à voir des données.
                  </div>
                ) : (
                  <TimeseriesBars
                    series={series}
                    compareSeries={compareSeries}
                    metric={metric}
                    onHover={setHoverPoint}
                  />
                )}
                <div className="mt-3 text-xs text-white/70 flex flex-col gap-1">
                  <div>
                    Total période — Écoutes:{' '}
                    {formatNumber(totals.period.plays)} • Uniques:{' '}
                    {formatNumber(totals.period.uniques)} • Likes:{' '}
                    {formatNumber(totals.period.likes)}
                  </div>
                  {hoverPoint && (
                    <div className="text-white/80">
                      {hoverPoint.date} — Écoutes:{' '}
                      {formatNumber(hoverPoint.plays)} • Uniques:{' '}
                      {formatNumber(hoverPoint.uniques || 0)} • Likes:{' '}
                      {formatNumber(hoverPoint.likes || 0)}
                      {compareSeries.length
                        ? (() => {
                            const m =
                              metric === 'plays'
                                ? 'plays'
                                : metric === 'uniques'
                                ? 'uniques'
                                : 'likes';
                            const c = (compareSeries as any).find(
                              (x: any) => x.date === hoverPoint.date,
                            );
                            return c
                              ? ` • Comparé: ${formatNumber(c[m] || 0)}`
                              : '';
                          })()
                        : ''}
                    </div>
                  )}
                  {compareSeries.length > 0 && series.length > 0 && (
                    <div className="text-white/70">
                      {(() => {
                        const mainPlays = series.reduce(
                          (s: any, p: any) => s + (p.plays || 0),
                          0,
                        );
                        const compPlays = compareSeries.reduce(
                          (s: any, p: any) => s + (p.plays || 0),
                          0,
                        );
                        if (mainPlays === 0 && compPlays === 0) {
                          return 'Les deux pistes n’ont pas encore d’écoutes sur cette période.';
                        }
                        const titleA =
                          selectedTrack === 'all'
                            ? 'Toutes les pistes'
                            : tracks.find((t) => t.id === selectedTrack)?.title ||
                              'Piste sélectionnée';
                        const titleB =
                          tracks.find((t) => t.id === compareTrack)?.title ||
                          'Piste comparée';
                        if (!compPlays) {
                          return `${titleA} a ${formatNumber(
                            mainPlays,
                          )} écoutes, contre 0 pour ${titleB} sur cette période.`;
                        }
                        const diff = mainPlays - compPlays;
                        const pct = (diff / compPlays) * 100;
                        if (pct > 0) {
                          return `${titleA} fait environ +${pct.toFixed(
                            1,
                          )}% d’écoutes que ${titleB} sur cette période.`;
                        }
                        if (pct < 0) {
                          return `${titleA} fait environ ${pct.toFixed(
                            1,
                          )}% d’écoutes de moins que ${titleB} sur cette période.`;
                        }
                        return `${titleA} et ${titleB} sont à peu près au même niveau sur cette période.`;
                      })()}
                    </div>
                  )}
                  <TrendLine series={series as any} metric={metric} />
                </div>
              </div>

              {/* Heatmap heures/jours */}
              <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 mb-6 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-white">
                    Meilleurs créneaux (jour × heure)
                  </h2>
                </div>
                {loadingHeatmap ? (
                  <div className="h-40 flex items-center justify-center">
                    <SynauraSpinner label="Heatmap" />
                  </div>
                ) : (
                  <HeatmapGrid matrix={heatmap} />
                )}
              </div>

              {/* Audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 bg-black/40 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    Audience par pays
                  </h3>
                  {loadingAudience ? (
                    <div className="h-32 flex items-center justify-center">
                      <SynauraSpinner label="Pays" />
                    </div>
                  ) : audience.countries ? (
                    <ul className="space-y-2">
                      {Object.entries(audience.countries).map(
                        ([country, val]) => (
                          <li
                            key={country}
                            className="flex items-center gap-3"
                          >
                            <span className="w-28 text-white/70 text-sm truncate">
                              {country}
                            </span>
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
                                style={{ width: `${val}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm text-white/70">
                              {Math.round(val)}%
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <div className="text-[var(--text-muted)] text-sm">
                      Données d’audience à venir.
                    </div>
                  )}
                </div>
                <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 bg-black/40 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    Appareils
                  </h3>
                  {loadingAudience ? (
                    <div className="h-32 flex items-center justify-center">
                      <SynauraSpinner label="Appareils" />
                    </div>
                  ) : audience.devices ? (
                    <ul className="space-y-2">
                      {Object.entries(audience.devices).map(
                        ([device, val]) => (
                          <li
                            key={device}
                            className="flex items-center gap-3"
                          >
                            <span className="w-28 text-white/70 text-sm truncate capitalize">
                              {device}
                            </span>
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
                                style={{ width: `${val}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm text-white/70">
                              {Math.round(val)}%
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <div className="text-[var(--text-muted)] text-sm">
                      Données appareils à venir.
                    </div>
                  )}
                </div>
              </div>

              {/* Audience technique */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 bg-black/40 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    Systèmes d’exploitation
                  </h3>
                  {loadingAudience ? (
                    <div className="h-40 flex items-center justify-center">
                      <SynauraSpinner label="OS" />
                    </div>
                  ) : audienceTech.os ? (
                    <DonutWithLegend data={audienceTech.os} />
                  ) : (
                    <div className="text-[var(--text-muted)] text-sm">
                      Données OS indisponibles.
                    </div>
                  )}
                </div>
                <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 bg-black/40 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    Navigateurs
                  </h3>
                  {loadingAudience ? (
                    <div className="h-40 flex items-center justify-center">
                      <SynauraSpinner label="Navigateurs" />
                    </div>
                  ) : audienceTech.browsers ? (
                    <DonutWithLegend data={audienceTech.browsers} />
                  ) : (
                    <div className="text-[var(--text-muted)] text-sm">
                      Données navigateurs indisponibles.
                    </div>
                  )}
                </div>
              </div>

              {/* Top tracks */}
              <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.07),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.06),transparent)] bg-black/60 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-white">
                    Tes titres les plus écoutés
                  </h2>
                  <Link
                    href="/library"
                    className="hidden sm:inline-flex items-center gap-1 text-sm text-white/80 hover:underline"
                  >
                    Gérer <ArrowRight size={14} />
                  </Link>
                </div>
                {topTracks.length === 0 ? (
                  <div className="text-[var(--text-muted)]">
                    Aucune piste pour le moment.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--border)]/50">
                    {topTracks.map((t, i) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="w-6 text-white/70">{i + 1}</div>
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 ring-1 ring-[var(--border)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={(
                              t.cover_url ||
                              t.coverUrl ||
                              '/default-cover.jpg'
                            ).replace('/upload/', '/upload/f_auto,q_auto/')}
                            alt={t.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-white">
                            {t.title}
                          </div>
                          <div className="text-xs text-white/60">
                            {formatNumber(t.plays)} écoutes •{' '}
                            {formatNumber(t.likes)} likes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <StatsTrackDebug />
    </div>
  );
}

function EmptyStatsState() {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-2xl p-6 text-center bg-black/40 backdrop-blur-xl mb-8">
      <h2 className="text-xl font-semibold mb-2 text-white">
        Pas encore de stats
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-4 max-w-md mx-auto">
        Dès que tu publies ou génères tes premières musiques sur Synaura,
        leurs performances apparaîtront ici.
      </p>
      <Link
        href="/studio"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-medium shadow-[0_4px_24px_rgba(124,58,237,0.4)]"
      >
        <Music size={16} />
        Lancer le studio IA
      </Link>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-2xl p-3 sm:p-4 bg-white/5 bg-black/40 backdrop-blur-xl">
      <div className="text-white/70 text-xs flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold mt-1 text-white">
        {value}
      </div>
    </div>
  );
}

function formatNumber(num: number) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(num);
}

function TimeseriesBars({
  series,
  compareSeries = [],
  metric = 'plays',
  onHover,
}: {
  series: Array<{ date: string; plays: number; uniques?: number; likes?: number }>;
  compareSeries?: Array<{
    date: string;
    plays: number;
    uniques?: number;
    likes?: number;
  }>;
  metric?: 'plays' | 'uniques' | 'likes';
  onHover?: (
    p:
      | { date: string; plays: number; uniques?: number; likes?: number }
      | null,
  ) => void;
}) {
  const values = (p: any) =>
    metric === 'plays'
      ? p.plays
      : metric === 'uniques'
      ? p.uniques || 0
      : p.likes || 0;
  const max = Math.max(
    1,
    ...series.map(values),
    ...compareSeries.map(values),
  );
  const ticks = 4;
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
        {Array.from({ length: ticks }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-white/10"
            style={{ top: `${(i / ticks) * 100}%` }}
          />
        ))}
      </div>
      <div className="relative h-48">
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {compareSeries.map((p, i) => {
            const value = values(p);
            const h = (value / max) * 100;
            return (
              <div
                key={`c-${i}`}
                className="flex-1 rounded-sm bg-white/20"
                style={{ height: `${h}%` }}
                title={`Comparé ${p.date}: ${value}`}
              />
            );
          })}
        </div>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {series.map((p, i) => {
            const value = values(p);
            const h = (value / max) * 100;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-colors ${
                  metric === 'plays'
                    ? 'bg-gradient-to-t from-purple-600/60 to-cyan-400/70 hover:from-purple-500/80 hover:to-cyan-300/80'
                    : metric === 'uniques'
                    ? 'bg-gradient-to-t from-emerald-600/60 to-lime-400/70 hover:from-emerald-500/80 hover:to-lime-300/80'
                    : 'bg-gradient-to-t from-rose-600/60 to-orange-400/70 hover:from-rose-500/80 hover:to-orange-300/80'
                }`}
                style={{ height: `${h}%` }}
                title={`${p.date}: ${value}`}
                onMouseEnter={() => onHover && onHover(p)}
                onMouseLeave={() => onHover && onHover(null)}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/60">
        <span>{series[0]?.date}</span>
        <span>{series[Math.max(series.length - 1, 0)]?.date}</span>
      </div>
    </div>
  );
}

function SynauraSpinner({ label }: { label?: string }) {
  return (
    <div
      className="flex items-center gap-2 text-white"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="relative inline-flex h-7 w-7">
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] opacity-50 blur-[4px]" />
        <span
          className="relative inline-flex h-7 w-7 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: 'var(--color-accent)',
            borderRightColor: 'var(--color-primary)',
          }}
        />
        <span className="absolute h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </span>
      {label && <span className="text-sm font-semibold text-white">{label}</span>}
    </div>
  );
}

function HeatmapGrid({ matrix }: { matrix: number[][] }) {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `auto repeat(24, minmax(12px, 1fr))`,
          gap: 4,
        }}
      >
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div
            key={h}
            className="text-[10px] text-white/60 text-center"
          >
            {h}
          </div>
        ))}
        {matrix.map((row, d) => (
          <React.Fragment key={`row-${d}`}>
            <div className="text-xs text-white/70 pr-2">
              {days[d]}
            </div>
            {row.map((val, h) => {
              const intensity = val / max;
              const bg = `rgba(124,58,237,${0.15 + intensity * 0.85})`;
              return (
                <div
                  key={`${d}-${h}`}
                  className="h-4 rounded-sm"
                  style={{ background: bg }}
                  title={`${days[d]} ${h}h: ${val}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function TrendLine({
  series,
  metric,
}: {
  series: Array<{ date: string; plays: number; uniques?: number; likes?: number }>;
  metric: 'plays' | 'uniques' | 'likes';
}) {
  if (!series.length) return null;
  const values = series.map((p) =>
    metric === 'plays'
      ? p.plays
      : metric === 'uniques'
      ? p.uniques || 0
      : p.likes || 0,
  );
  const n = values.length;
  const avgFn = (arr: number[]) =>
    arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  const smooth = values.map((_, i) =>
    avgFn(values.slice(Math.max(0, i - 3), Math.min(n, i + 4))),
  );
  const max = Math.max(1, ...values, ...smooth);
  const points = smooth
    .map((v, i) => {
      const x = (i / Math.max(1, n - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <div className="mt-1">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-10">
        <polyline
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1"
          points={points}
        />
      </svg>
      <div className="text-[10px] text-white/60">
        Ligne lissée (moyenne mobile)
      </div>
    </div>
  );
}
