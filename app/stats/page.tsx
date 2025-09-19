"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Headphones, Heart, Music, TrendingUp, Users, ArrowRight } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [audience, setAudience] = useState<{ countries?: Record<string, number>; devices?: Record<string, number> }>({});
  const [series, setSeries] = useState<Array<{ date: string; plays: number }>>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!session?.user?.username) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/users/${session.user.username}`, { headers: { 'Cache-Control': 'no-store' } });
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
          created_at: t.created_at
        }));
        setTracks(userTracks);
        // Audience (placeholder API)
        try {
          const a = await fetch(`/api/stats/audience?range=${range}`, { headers: { 'Cache-Control': 'no-store' } });
          if (a.ok) setAudience(await a.json());
        } catch {}
        // Timeseries (placeholder API)
        try {
          const s = await fetch(`/api/stats/timeseries?range=${range}&track=${selectedTrack}`, { headers: { 'Cache-Control': 'no-store' } });
          if (s.ok) setSeries(await s.json());
        } catch {}
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
    return { totalPlays, totalLikes, totalTracks };
  }, [tracks]);

  const topTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10);
  }, [tracks]);

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-10 pb-24 text-[var(--text)]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Statistiques</h1>
            <p className="text-[var(--text-muted)]">Vue d’ensemble de vos performances</p>
          </div>
          <Link href="/profile" className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10">
            <Users size={16} /> Voir mon profil
          </Link>
        </div>

        {/* Filtres */}
        <div className="panel-suno border border-[var(--border)] rounded-2xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['7d','30d','90d','all'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-full text-sm ${range===r?'bg-white/15 ring-1 ring-white/25':'bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10'}`}>{r.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedTrack} onChange={(e)=>setSelectedTrack(e.target.value)} className="bg-white/5 ring-1 ring-[var(--border)] rounded-lg px-3 py-1.5 text-sm">
              <option value="all">Toutes les pistes</option>
              {tracks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">Chargement…</div>
        ) : error ? (
          <div className="panel-suno border border-red-500/40 rounded-2xl p-4">{error}</div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <Kpi icon={<Headphones size={16} />} label="Écoutes totales" value={formatNumber(totals.totalPlays)} />
              <Kpi icon={<Heart size={16} />} label="Likes totaux" value={formatNumber(totals.totalLikes)} />
              <Kpi icon={<Music size={16} />} label="Pistes" value={formatNumber(totals.totalTracks)} />
              <Kpi icon={<TrendingUp size={16} />} label="Top (10)" value={formatNumber(topTracks.length)} />
            </div>

            {/* Évolution (timeseries) */}
            <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Évolution des écoutes</h2>
              </div>
              {series.length === 0 ? (
                <div className="text-[var(--text-muted)] text-sm">Courbe à venir (en attente des endpoints). Votre total sert aux KPI ci‑dessus.</div>
              ) : (
                <TimeseriesBars series={series} />
              )}
            </div>

            {/* Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-3">Audience par pays</h3>
                {audience.countries ? (
                  <ul className="space-y-2">
                    {Object.entries(audience.countries).map(([country, val]) => (
                      <li key={country} className="flex items-center gap-3">
                        <span className="w-28 text-white/70 text-sm truncate">{country}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${val}%` }} />
                        </div>
                        <span className="w-10 text-right text-sm text-white/70">{Math.round(val)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[var(--text-muted)] text-sm">Données d’audience à venir.</div>
                )}
              </div>
              <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-3">Appareils</h3>
                {audience.devices ? (
                  <ul className="space-y-2">
                    {Object.entries(audience.devices).map(([device, val]) => (
                      <li key={device} className="flex items-center gap-3">
                        <span className="w-28 text-white/70 text-sm truncate capitalize">{device}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${val}%` }} />
                        </div>
                        <span className="w-10 text-right text-sm text-white/70">{Math.round(val)}%</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[var(--text-muted)] text-sm">Données appareils à venir.</div>
                )}
              </div>
            </div>

            {/* Top tracks */}
            <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 sm:p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.07),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.06),transparent)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Vos titres les plus écoutés</h2>
                <Link href="/library" className="hidden sm:inline-flex items-center gap-1 text-sm text-white/80 hover:underline">
                  Gérer <ArrowRight size={14} />
                </Link>
              </div>
              {topTracks.length === 0 ? (
                <div className="text-[var(--text-muted)]">Aucune piste pour le moment.</div>
              ) : (
                <div className="flex flex-col divide-y divide-[var(--border)]/50">
                  {topTracks.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 py-2">
                      <div className="w-6 text-white/70">{i + 1}</div>
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 ring-1 ring-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.cover_url || t.coverUrl || '/default-cover.jpg'} alt={t.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{t.title}</div>
                        <div className="text-xs text-white/60">{formatNumber(t.plays)} écoutes • {formatNumber(t.likes)} likes</div>
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
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel-suno border border-[var(--border)] rounded-2xl p-3 sm:p-4 bg-white/5">
      <div className="text-white/70 text-xs flex items-center gap-2">{icon}<span>{label}</span></div>
      <div className="text-2xl sm:text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function formatNumber(num: number) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(num);
}

function TimeseriesBars({ series }: { series: Array<{ date: string; plays: number }> }) {
  const max = Math.max(1, ...series.map(p => p.plays));
  const ticks = 4;
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
        {Array.from({ length: ticks }).map((_, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-white/10" style={{ top: `${(i / ticks) * 100}%` }} />
        ))}
      </div>
      <div className="flex items-end gap-[2px] h-48">
        {series.map((p, i) => {
          const h = (p.plays / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-purple-600/60 to-cyan-400/70 hover:from-purple-500/80 hover:to-cyan-300/80 transition-colors"
              style={{ height: `${h}%` }}
              title={`${p.date}: ${p.plays}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-white/60">
        <span>{series[0]?.date}</span>
        <span>{series[Math.max(series.length - 1, 0)]?.date}</span>
      </div>
    </div>
  );
}


