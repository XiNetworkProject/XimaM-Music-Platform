'use client';

import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Headphones, Heart, Music, TrendingUp, TrendingDown,
  Users, Clock, Target, Sparkles, ChevronDown, Search,
  ArrowUpDown, Star, Zap, BarChart3, Play, Disc3,
  ArrowRight, Eye, Volume2,
} from 'lucide-react';
import { StatsPageSkeleton } from '@/components/Skeletons';

/* ═══════════════════ Recharts (dynamic) ═══════════════════ */

const RechartsArea = dynamic(
  () => import('recharts').then((m) => {
    const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = m;
    return function RArea(props: any) {
      const { data, metric, compareSeries } = props;
      const color = metric === 'plays' ? '#6e56cf' : metric === 'uniques' ? '#00d3a7' : '#f43f5e';
      const gid = `sg-${metric}`;
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sg-cmp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d3a7" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#00d3a7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.08)" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }}
              tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }}
              interval="preserveStartEnd" minTickGap={50} />
            <YAxis stroke="rgba(255,255,255,0.05)" tick={{ fill:'rgba(255,255,255,0.2)', fontSize:10 }} width={36} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background:'rgba(10,10,16,0.95)', border:'1px solid rgba(110,86,207,0.3)', borderRadius:14, color:'#f6f7fb', fontSize:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}
              labelFormatter={(v: any) => new Date(String(v)).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
              formatter={(val: any, name: any) => [val, name === 'compare' ? 'Comparaison' : metric === 'plays' ? 'Écoutes' : metric === 'uniques' ? 'Uniques' : 'Likes']}
            />
            {compareSeries?.length > 0 && <Area type="monotone" dataKey="compare" stroke="#00d3a7" strokeWidth={1.5} fill="url(#sg-cmp)" dot={false} name="compare" />}
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} dot={false}
              activeDot={{ r: 6, fill: color, stroke:'#fff', strokeWidth:2, filter:'drop-shadow(0 0 6px rgba(110,86,207,0.6))' }} name="main" />
          </AreaChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-2xl" style={{ background:'linear-gradient(135deg,rgba(110,86,207,0.05),rgba(0,211,167,0.03))' }} /> }
);

const RechartsPie = dynamic(
  () => import('recharts').then((m) => {
    const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = m;
    const C = ['#6e56cf','#00d3a7','#f59e0b','#10b981','#ef4444','#3b82f6','#f97316','#22c55e'];
    return function RPie(props: any) {
      const entries = Object.entries(props.data||{}).sort(([,a]: any,[,b]: any) => b-a).slice(0,8).map(([name,value]) => ({name,value:Number(value)}));
      if (!entries.length) return <div className="text-white/30 text-sm text-center py-10">Aucune donnée</div>;
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={entries} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
              {entries.map((_,i) => <Cell key={i} fill={C[i%C.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background:'rgba(10,10,16,0.95)', border:'1px solid rgba(110,86,207,0.3)', borderRadius:12, color:'#f6f7fb', fontSize:12, backdropFilter:'blur(20px)' }}
              formatter={(val: any, name: any) => [`${val}%`, name]} />
          </PieChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-2xl" style={{ background:'linear-gradient(135deg,rgba(110,86,207,0.05),rgba(0,211,167,0.03))' }} /> }
);

const RechartsBar = dynamic(
  () => import('recharts').then((m) => {
    const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } = m;
    return function RBar(props: any) {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={props.data} layout="vertical" margin={{ left: 4, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.08)" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.08)" tick={{ fill:'rgba(255,255,255,0.5)', fontSize:10 }} width={70} />
            <Tooltip contentStyle={{ background:'rgba(10,10,16,0.95)', border:'1px solid rgba(110,86,207,0.3)', borderRadius:12, color:'#f6f7fb', fontSize:11, backdropFilter:'blur(20px)' }} />
            <Bar dataKey="plays" fill="#6e56cf" radius={[0,6,6,0]} name="Lectures" />
            <Bar dataKey="completes" fill="#00d3a7" radius={[0,6,6,0]} name="Complétions" />
          </BarChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse rounded-2xl" style={{ background:'linear-gradient(135deg,rgba(110,86,207,0.05),rgba(0,211,167,0.03))' }} /> }
);

/* ═══════════════════ Types ═══════════════════ */

type OverviewData = {
  plays: number; playsVariation: number; likes: number; likesVariation: number;
  followers: number; totalTracks: number; normalTracks: number; aiTracks: number;
  listenHours: number; avgRetention: number;
  bestTrack: { id: string; title: string; plays: number } | null;
  ai: { count: number; plays: number; likes: number };
};

type UnifiedTrack = {
  id: string; title: string; coverUrl: string; duration: number;
  createdAt: string; plays: number; likes: number;
  isAI: boolean; isRemix: boolean; retention: number; trend7d: number;
};

/* ═══════════════════ Page ═══════════════════ */

function StatsPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d'|'30d'|'90d'|'all'>('30d');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [compareTrack, setCompareTrack] = useState('');
  const [metric, setMetric] = useState<'plays'|'uniques'|'likes'>('plays');
  const [searchQuery, setSearchQuery] = useState('');
  const [trackSort, setTrackSort] = useState<'plays'|'likes'|'recent'|'retention'|'trend'>('plays');
  const [activeTab, setActiveTab] = useState<'all'|'normal'|'ai'>('all');

  const [overview, setOverview] = useState<OverviewData|null>(null);
  const [allTracks, setAllTracks] = useState<UnifiedTrack[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [compareSeries, setCompareSeries] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>({});
  const [audienceTech, setAudienceTech] = useState<any>({});
  const [heatmap, setHeatmap] = useState<number[][]>([]);
  const [trackDetail, setTrackDetail] = useState<any>(null);

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { try { localStorage.setItem('onboarding.viewedStats','1'); sessionStorage.setItem('onboarding.viewedStats','1'); window.dispatchEvent(new Event('onboardingStatsViewed')); } catch {} }, []);

  useEffect(() => {
    try {
      const t = searchParams?.get('track_id'); if (t) setSelectedTrack(t);
      const r = searchParams?.get('range'); if (r === '7d' || r === '30d' || r === '90d' || r === 'all') setRange(r);
      const c = searchParams?.get('compare'); if (c) setCompareTrack(c);
    } catch {}
  }, [searchParams]);

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (selectedTrack && selectedTrack !== 'all') p.set('track_id', selectedTrack); else p.delete('track_id');
      p.set('range', range);
      if (compareTrack) p.set('compare', compareTrack); else p.delete('compare');
      router.replace(`/stats${p.toString() ? `?${p}` : ''}`, { scroll: false });
    } catch {}
  }, [range, selectedTrack, compareTrack, router]);

  const fetchAll = useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setLoading(true);
    const hdr = { 'Cache-Control': 'no-store' };
    await Promise.all([
      (async () => {
        setLoadingOverview(true);
        try {
          const r = await fetch(`/api/stats/overview?range=${range}`, { headers: hdr });
          const d = await r.json();
          if (r.ok) { setOverview(d); console.log('[stats] overview:', d); }
          else console.warn('[stats] overview error:', r.status, d);
        } catch (e) { console.error('[stats] overview fetch fail:', e); }
        finally { setLoadingOverview(false); }
      })(),
      (async () => {
        setLoadingTracks(true);
        try {
          const r = await fetch('/api/stats/all-tracks', { headers: hdr });
          const d = await r.json();
          if (r.ok) { setAllTracks(d.tracks || []); console.log('[stats] all-tracks:', d.tracks?.length, 'normal:', d.debug?.normalCount, 'ai:', d.debug?.aiCount); }
          else console.warn('[stats] all-tracks error:', r.status, d);
        } catch (e) { console.error('[stats] all-tracks fetch fail:', e); }
        finally { setLoadingTracks(false); }
      })(),
      (async () => {
        setLoadingSeries(true);
        try {
          const r = await fetch(`/api/stats/timeseries?range=${range}&track=${selectedTrack}`, { headers: hdr });
          if (r.ok) { const d = await r.json(); setSeries(d); console.log('[stats] timeseries:', d.length, 'points, hasData:', d.some((p: any) => p.plays > 0)); }
          else { setSeries([]); console.warn('[stats] timeseries error:', r.status); }
        } catch { setSeries([]); }
        finally { setLoadingSeries(false); }
      })(),
      (async () => {
        if (compareTrack && compareTrack !== 'all' && compareTrack !== selectedTrack) {
          try { const r = await fetch(`/api/stats/timeseries?range=${range}&track=${compareTrack}`, { headers: hdr }); if (r.ok) setCompareSeries(await r.json()); else setCompareSeries([]); } catch { setCompareSeries([]); }
        } else setCompareSeries([]);
      })(),
      (async () => {
        setLoadingAudience(true);
        try {
          const r = await fetch(`/api/stats/audience?range=${range}&track=${selectedTrack}`, { headers: hdr });
          if (r.ok) { const d = await r.json(); setAudience({ countries: d.countries, devices: d.devices }); setAudienceTech({ os: d.os, browsers: d.browsers }); console.log('[stats] audience:', d); }
        } catch {}
        finally { setLoadingAudience(false); }
      })(),
      (async () => {
        setLoadingHeatmap(true);
        try {
          const r = await fetch(`/api/stats/heatmap?range=${range}&track=${selectedTrack}`, { headers: hdr });
          if (r.ok) { const d = await r.json(); setHeatmap(d.matrix || []); }
        } catch {}
        finally { setLoadingHeatmap(false); }
      })(),
      (async () => {
        if (selectedTrack && selectedTrack !== 'all') {
          setLoadingDetail(true);
          try {
            const r = await fetch(`/api/stats/tracks?track_id=${encodeURIComponent(selectedTrack)}`, { headers: hdr });
            if (r.ok) { const d = await r.json(); setTrackDetail(d); console.log('[stats] track detail:', d); }
            else setTrackDetail(null);
          } catch { setTrackDetail(null); }
          finally { setLoadingDetail(false); }
        } else setTrackDetail(null);
      })(),
    ]);
    setLoading(false);
  }, [session?.user?.id, range, selectedTrack, compareTrack]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const chartData = useMemo(() => {
    const cm = new Map(compareSeries.map((p: any) => [p.date, p]));
    return series.map((p: any) => {
      const c = cm.get(p.date);
      return { date: p.date, value: metric === 'plays' ? p.plays : metric === 'uniques' ? (p.uniques||0) : (p.likes||0), compare: c ? (metric === 'plays' ? c.plays : metric === 'uniques' ? (c.uniques||0) : (c.likes||0)) : undefined };
    });
  }, [series, compareSeries, metric]);

  const filteredTracks = useMemo(() => {
    let result = [...allTracks];
    if (activeTab === 'ai') result = result.filter(t => t.isAI);
    else if (activeTab === 'normal') result = result.filter(t => !t.isAI);
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); result = result.filter(t => t.title.toLowerCase().includes(q)); }
    result.sort((a, b) => {
      switch (trackSort) {
        case 'plays': return b.plays - a.plays;
        case 'likes': return b.likes - a.likes;
        case 'recent': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'retention': return b.retention - a.retention;
        case 'trend': return b.trend7d - a.trend7d;
        default: return b.plays - a.plays;
      }
    });
    return result;
  }, [allTracks, activeTab, searchQuery, trackSort]);

  const periodTotals = useMemo(() => series.reduce((a: any, p: any) => ({ plays: a.plays+(p.plays||0), uniques: a.uniques+(p.uniques||0), likes: a.likes+(p.likes||0) }), { plays:0, uniques:0, likes:0 }), [series]);

  if (loading && !overview) return <StatsPageSkeleton />;

  const userName = (session?.user as any)?.name || (session?.user as any)?.username || '';
  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Bonjour'; if (h < 18) return 'Bon après-midi'; return 'Bonsoir'; })();

  return (
    <div className="relative min-h-screen w-full">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-[200px] -left-[100px] w-[600px] h-[600px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, rgba(110,86,207,1) 0%, transparent 70%)', filter:'blur(80px)' }} />
        <div className="absolute top-[40%] -right-[150px] w-[500px] h-[500px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, rgba(0,211,167,1) 0%, transparent 70%)', filter:'blur(80px)' }} />
        <div className="absolute -bottom-[150px] left-[30%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,1) 0%, transparent 70%)', filter:'blur(80px)' }} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 pb-28">

        {/* ── Hero Header ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-white/40 text-sm mb-1">{greeting}{userName ? `, ${userName}` : ''}</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold">
                <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                  Tes statistiques
                </span>
              </h1>
              <p className="text-white/40 text-sm mt-2 max-w-lg">
                Analyse les performances de tes pistes, comprends ton audience et optimise ta visibilité sur Synaura.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] text-white/80 text-sm transition-all">
                <Users size={15} /> Mon profil
              </Link>
              <Link href="/studio" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] text-white text-sm font-medium shadow-[0_4px_20px_rgba(110,86,207,0.35)] hover:shadow-[0_4px_28px_rgba(110,86,207,0.5)] transition-all">
                <Sparkles size={15} /> Studio
              </Link>
            </div>
          </div>
        </div>

        {/* ── Range + Track filters ── */}
        <div className="panel-suno rounded-2xl border border-white/[0.06] p-3 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {(['7d','30d','90d','all'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${range===r
                  ? 'bg-gradient-to-r from-[#6e56cf] to-[#5b45be] text-white shadow-[0_2px_12px_rgba(110,86,207,0.4)]'
                  : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] text-white/60'}`}>
                {r === 'all' ? 'Tout' : r.toUpperCase()}
              </button>
            ))}
            {(loadingSeries || loadingOverview) && <Spinner />}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedTrack} onChange={setSelectedTrack} options={[{ value:'all', label:'Toutes les pistes' }, ...allTracks.map(t => ({ value:t.id, label:`${t.isAI?'[IA] ':''}${t.title}` }))]} />
            <Select value={compareTrack} onChange={setCompareTrack} options={[{ value:'', label:'Comparer...' }, ...allTracks.filter(t => t.id !== selectedTrack).map(t => ({ value:t.id, label:`${t.isAI?'[IA] ':''}${t.title}` }))]} />
          </div>
        </div>

        {!overview && !loadingOverview && allTracks.length === 0 && <EmptyState />}

        {(overview || loadingOverview) && (
          <>
            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <KpiCard icon={<Headphones size={18}/>} label="Écoutes" value={overview?.plays??0} variation={overview?.playsVariation} loading={loadingOverview} gradient="from-violet-500/20 to-purple-600/5" iconBg="bg-violet-500/20" />
              <KpiCard icon={<Heart size={18}/>} label="Likes" value={overview?.likes??0} variation={overview?.likesVariation} loading={loadingOverview} gradient="from-rose-500/20 to-pink-600/5" iconBg="bg-rose-500/20" />
              <KpiCard icon={<Users size={18}/>} label="Followers" value={overview?.followers??0} loading={loadingOverview} gradient="from-blue-500/20 to-indigo-600/5" iconBg="bg-blue-500/20" />
              <KpiCard icon={<Music size={18}/>} label="Pistes" value={overview?.totalTracks??0} loading={loadingOverview} subtitle={overview ? `${overview.normalTracks} std + ${overview.aiTracks} IA` : undefined} gradient="from-emerald-500/20 to-teal-600/5" iconBg="bg-emerald-500/20" />
              <KpiCard icon={<Clock size={18}/>} label="Heures d'écoute" value={overview?.listenHours??0} loading={loadingOverview} suffix="h" gradient="from-amber-500/20 to-orange-600/5" iconBg="bg-amber-500/20" />
              <KpiCard icon={<Target size={18}/>} label="Rétention moy." value={overview?.avgRetention??0} loading={loadingOverview} suffix="%" gradient="from-cyan-500/20 to-teal-600/5" iconBg="bg-cyan-500/20" />
            </div>

            {/* ── AI / Best Track Banner ── */}
            {overview && (overview.ai.count > 0 || overview.bestTrack) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {overview.ai.count > 0 && (
                  <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 flex items-center gap-4"
                    style={{ background:'linear-gradient(135deg, rgba(110,86,207,0.08) 0%, rgba(0,211,167,0.04) 100%)' }}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6e56cf] to-[#00d3a7] flex items-center justify-center shrink-0">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{overview.ai.count} piste{overview.ai.count > 1 ? 's' : ''} IA</div>
                      <div className="text-xs text-white/40">{fmt(overview.ai.plays)} écoutes &middot; {fmt(overview.ai.likes)} likes</div>
                    </div>
                  </div>
                )}
                {overview.bestTrack && (
                  <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 flex items-center gap-4"
                    style={{ background:'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)' }}>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Star size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">Top : {overview.bestTrack.title}</div>
                      <div className="text-xs text-white/40">{fmt(overview.bestTrack.plays)} écoutes sur la période</div>
                    </div>
                    <button onClick={() => setSelectedTrack(overview.bestTrack!.id)} className="text-xs text-[#6e56cf] hover:text-[#00d3a7] transition-colors shrink-0">
                      Détails <ArrowRight size={12} className="inline" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Chart ── */}
            <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#6e56cf]" /> Évolution
                  </h2>
                  <p className="text-xs text-white/30 mt-0.5">Courbe interactive &mdash; survole pour détailler</p>
                </div>
                <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
                  {(['plays','uniques','likes'] as const).map((m) => (
                    <button key={m} onClick={() => setMetric(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${metric===m
                        ? 'bg-[#6e56cf] text-white shadow-[0_2px_8px_rgba(110,86,207,0.4)]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}`}>
                      {m === 'plays' ? 'Écoutes' : m === 'uniques' ? 'Uniques' : 'Likes'}
                    </button>
                  ))}
                </div>
              </div>
              {loadingSeries ? (
                <div className="h-[320px] flex items-center justify-center"><Spinner label="Chargement des données" /></div>
              ) : chartData.length === 0 ? (
                <div className="h-[320px] flex flex-col items-center justify-center gap-2">
                  <BarChart3 size={32} className="text-white/10" />
                  <p className="text-white/30 text-sm">Les données apparaîtront après les premières écoutes</p>
                </div>
              ) : (
                <RechartsArea data={chartData} metric={metric} compareSeries={compareSeries} />
              )}
              {chartData.length > 0 && (
                <div className="mt-4 flex gap-4 flex-wrap text-xs border-t border-white/[0.06] pt-3">
                  <span className="text-white/30">Écoutes : <span className="text-white font-semibold">{fmt(periodTotals.plays)}</span></span>
                  <span className="text-white/30">Uniques : <span className="text-white font-semibold">{fmt(periodTotals.uniques)}</span></span>
                  <span className="text-white/30">Likes : <span className="text-white font-semibold">{fmt(periodTotals.likes)}</span></span>
                </div>
              )}
            </div>

            {/* ── Track Detail ── */}
            {selectedTrack !== 'all' && trackDetail && <TrackDetailPanel detail={trackDetail} loading={loadingDetail} />}

            {/* ── Tracks Table ── */}
            <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Disc3 size={18} className="text-[#00d3a7]" /> Toutes tes pistes
                  <span className="text-xs font-normal text-white/30 ml-1">({allTracks.length})</span>
                </h2>
                <div className="flex gap-1.5 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
                  {(['all','normal','ai'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeTab===tab
                        ? 'bg-[#6e56cf] text-white shadow-[0_2px_8px_rgba(110,86,207,0.4)]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}`}>
                      {tab === 'all' ? 'Toutes' : tab === 'normal' ? 'Standard' : 'IA'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-white/20 focus:border-[#6e56cf]/40 outline-none transition-colors" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([['plays','Écoutes'],['likes','Likes'],['recent','Récent'],['retention','Rétention'],['trend','7j']] as const).map(([key,label]) => (
                    <button key={key} onClick={() => setTrackSort(key as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all ${trackSort===key
                        ? 'bg-[#6e56cf]/20 text-[#6e56cf] border border-[#6e56cf]/30'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]'}`}>
                      <ArrowUpDown size={9} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {loadingTracks ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
              ) : filteredTracks.length === 0 ? (
                <div className="text-center py-10 text-white/25 text-sm">Aucune piste trouvée</div>
              ) : (
                <div className="space-y-1">
                  {filteredTracks.map((t, i) => (
                    <div key={t.id}
                      onClick={() => setSelectedTrack(t.id === selectedTrack ? 'all' : t.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${selectedTrack === t.id
                        ? 'bg-[#6e56cf]/10 border border-[#6e56cf]/20'
                        : 'hover:bg-white/[0.03] border border-transparent'}`}>
                      <span className="text-xs text-white/20 w-6 text-right shrink-0 tabular-nums">{i+1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.coverUrl?.replace('/upload/','/upload/f_auto,q_auto,w_80/') || '/default-cover.jpg'} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-white font-medium truncate">{t.title}</span>
                          {t.isAI && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#6e56cf]/20 text-[#6e56cf]">IA</span>}
                          {t.isRemix && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-fuchsia-500/20 text-fuchsia-400">Remix</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/25 mt-0.5">
                          <span className="flex items-center gap-0.5"><Play size={9}/> {fmt(t.plays)}</span>
                          <span className="flex items-center gap-0.5"><Heart size={9}/> {fmt(t.likes)}</span>
                          <span className={`${t.retention > 50 ? 'text-emerald-400/60' : ''}`}>{t.retention}%</span>
                          {t.trend7d !== 0 && <span className={t.trend7d > 0 ? 'text-emerald-400/60' : 'text-red-400/60'}>{t.trend7d > 0 ? '+' : ''}{fmt(t.trend7d)}</span>}
                        </div>
                      </div>
                      <div className="text-xs text-white/15 hidden sm:block shrink-0">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Heatmap ── */}
            <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Clock size={18} className="text-amber-400" /> Meilleurs créneaux
              </h2>
              {loadingHeatmap ? <div className="h-40 flex items-center justify-center"><Spinner /></div> : <HeatmapGrid matrix={heatmap} />}
            </div>

            {/* ── Audience ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <AudienceCard title="Pays" icon={<Eye size={16} className="text-blue-400"/>} data={audience.countries} loading={loadingAudience} />
              <AudienceCard title="Appareils" icon={<Volume2 size={16} className="text-emerald-400"/>} data={audience.devices} loading={loadingAudience} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <AudienceCard title="Systèmes" icon={<Disc3 size={16} className="text-violet-400"/>} data={audienceTech.os} loading={loadingAudience} />
              <AudienceCard title="Navigateurs" icon={<Search size={16} className="text-cyan-400"/>} data={audienceTech.browsers} loading={loadingAudience} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StatsPage() {
  return <Suspense fallback={<StatsPageSkeleton />}><StatsPageInner /></Suspense>;
}

/* ═══════════════════ Components ═══════════════════ */

function KpiCard({ icon, label, value, variation, loading, suffix, subtitle, gradient, iconBg }: {
  icon: React.ReactNode; label: string; value: number; variation?: number; loading?: boolean; suffix?: string; subtitle?: string; gradient?: string; iconBg?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] p-3.5 sm:p-4 bg-gradient-to-br ${gradient || 'from-white/[0.04] to-transparent'}`}
      style={{ background: `linear-gradient(135deg, rgba(10,10,16,0.6) 0%, rgba(10,10,16,0.3) 100%)`, backdropFilter:'blur(10px)' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg || 'bg-white/10'}`}>{icon}</div>
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      {loading ? <div className="h-8 w-20 bg-white/[0.04] rounded-lg animate-pulse" /> : (
        <>
          <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{fmt(value)}{suffix||''}</div>
          {variation !== undefined && variation !== 0 && (
            <div className={`flex items-center gap-1 text-[11px] mt-1.5 font-medium ${variation > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {variation > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
              {variation > 0 ? '+' : ''}{variation}%
            </div>
          )}
          {subtitle && <div className="text-[10px] text-white/25 mt-1">{subtitle}</div>}
        </>
      )}
    </div>
  );
}

function TrackDetailPanel({ detail, loading }: { detail: any; loading: boolean }) {
  if (loading) return <div className="panel-suno rounded-2xl border border-white/[0.06] p-6 mb-6 flex items-center justify-center h-40"><Spinner label="Chargement détail" /></div>;
  const daily = detail?.daily || [];
  const funnel = detail?.funnel;
  const sources = detail?.sources || [];
  const totalPlays = daily.reduce((s: number, d: any) => s+(d.plays||0), 0);
  const totalCompletes = daily.reduce((s: number, d: any) => s+(d.completes||0), 0);
  const totalViews = daily.reduce((s: number, d: any) => s+(d.views||0), 0);
  const totalLikes = daily.reduce((s: number, d: any) => s+(d.likes||0), 0);
  const avgRet = daily.length ? Math.round(daily.reduce((s: number, d: any) => s+(d.retention_complete_rate||0), 0)/daily.length*10)/10 : 0;
  const listenH = Math.round(daily.reduce((s: number, d: any) => s+(d.total_listen_ms||0), 0)/3600000*10)/10;
  const srcData = sources.map((s: any) => ({ name: s.source||'Direct', plays: s.plays||0, completes: s.completes||0 }));

  return (
    <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 sm:p-6 mb-6"
      style={{ background:'linear-gradient(135deg, rgba(110,86,207,0.04) 0%, rgba(0,211,167,0.02) 100%)' }}>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Target size={18} className="text-[#00d3a7]" /> Détail piste (30 derniers jours)
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
        {[
          { l:'Vues', v:totalViews }, { l:'Lectures', v:totalPlays }, { l:'Complétions', v:totalCompletes },
          { l:'Likes', v:totalLikes }, { l:'Heures', v:listenH, s:'h' }, { l:'Rétention', v:avgRet, s:'%' },
        ].map(m => (
          <div key={m.l} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/25 mb-1">{m.l}</div>
            <div className="text-lg font-bold text-white tabular-nums">{fmt(m.v)}{m.s||''}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {funnel && funnel.starts > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-white">Funnel de rétention</h3>
            <div className="space-y-2.5">
              {[{l:'Démarrage',p:100},{l:'25%',p:funnel.p25Rate},{l:'50%',p:funnel.p50Rate},{l:'75%',p:funnel.p75Rate},{l:'Complet',p:funnel.completeRate}].map(s => (
                <div key={s.l} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-white/40">{s.l}</span>
                  <div className="flex-1 h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] rounded-full transition-all duration-700" style={{ width:`${Math.max(2,s.p)}%` }} />
                  </div>
                  <span className="w-12 text-xs text-white/50 text-right tabular-nums">{s.p}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {srcData.length > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-white">Sources de trafic</h3>
            <RechartsBar data={srcData} />
          </div>
        )}
      </div>
      {daily.length > 0 && (
        <div className="mt-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-white">7 derniers jours</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {daily.slice(-7).map((d: any) => (
              <div key={d.day} className="p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <div className="text-[10px] text-white/30">{new Date(d.day).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</div>
                <div className="text-white text-sm font-semibold mt-1">{d.plays}</div>
                <div className="text-[10px] text-white/25">{Math.round(d.retention_complete_rate||0)}% rét.</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AudienceCard({ title, icon, data, loading }: { title: string; icon: React.ReactNode; data?: Record<string,number>; loading: boolean }) {
  return (
    <div className="panel-suno rounded-2xl border border-white/[0.06] p-4 sm:p-5">
      <h3 className="text-sm font-semibold mb-3 text-white flex items-center gap-2">{icon} {title}</h3>
      {loading ? <div className="h-[200px] flex items-center justify-center"><Spinner /></div> :
        data && Object.keys(data).length > 0 ? <><RechartsPie data={data} /><PieLegend data={data} /></> :
        <div className="h-[200px] flex flex-col items-center justify-center gap-2"><Eye size={24} className="text-white/10" /><p className="text-white/20 text-xs">Pas encore de données</p></div>}
    </div>
  );
}

function HeatmapGrid({ matrix }: { matrix: number[][] }) {
  const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  if (!matrix.length) return <div className="text-white/20 text-sm text-center py-8">Pas encore de données</div>;
  const flat = matrix.flat();
  const max = Math.max(1,...flat);
  const bestIdx = flat.indexOf(max);
  const bestDay = Math.floor(bestIdx / (matrix[0]?.length || 24));
  const bestHour = bestIdx % (matrix[0]?.length || 24);
  return (
    <div>
      {max > 1 && (
        <div className="mb-3 text-sm text-white/40 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          Meilleur créneau : <span className="text-white font-medium">{days[bestDay]} à {bestHour}h</span> <span className="text-white/25">({max} écoutes)</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: `48px repeat(24, minmax(16px, 1fr))`, gap: 2 }}>
          <div />
          {Array.from({length:24}).map((_,h) => <div key={h} className="text-[9px] text-white/20 text-center">{h}</div>)}
          {matrix.map((row,d) => (
            <React.Fragment key={`r-${d}`}>
              <div className="text-[11px] text-white/30 pr-2 flex items-center justify-end">{days[d]}</div>
              {row.map((val,h) => {
                const intensity = val / max;
                return (
                  <div key={`${d}-${h}`} className="h-[18px] rounded-[3px] relative group cursor-default transition-transform hover:scale-110"
                    style={{ background: intensity > 0 ? `rgba(110,86,207,${0.1 + intensity * 0.9})` : 'rgba(255,255,255,0.02)' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/95 text-white text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-white/10 shadow-xl">
                      {days[d]} {h}h : {val}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-[9px] text-white/20">
        <span>Moins</span>
        {[0.1,0.3,0.5,0.7,0.9].map(v => <div key={v} className="w-4 h-3 rounded-[2px]" style={{ background:`rgba(110,86,207,${v})` }} />)}
        <span>Plus</span>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#6e56cf','#00d3a7','#f59e0b','#10b981','#ef4444','#3b82f6','#f97316','#22c55e'];

function PieLegend({ data }: { data: Record<string,number> }) {
  const sorted = Object.entries(data).sort(([,a],[,b]) => Number(b)-Number(a)).slice(0,8);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs">
      {sorted.map(([name,value],i) => (
        <div key={name} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i%PIE_COLORS.length] }} />
          <span className="text-white/50">{name}</span>
          <span className="text-white/25 tabular-nums">{Math.round(Number(value))}%</span>
        </div>
      ))}
    </div>
  );
}

function Select({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] focus:border-[#6e56cf]/40 transition-colors rounded-xl pl-3 pr-10 py-2 text-sm text-white min-w-[180px] outline-none backdrop-blur-sm">
        {options.map((o) => <option key={o.value} value={o.value} className="bg-[#0a0a14]">{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
    </div>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor:'#6e56cf', borderRightColor:'#00d3a7' }} />
      </div>
      {label && <span className="text-xs text-white/40">{label}</span>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel-suno rounded-2xl border border-white/[0.06] p-8 sm:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6e56cf]/20 to-[#00d3a7]/10 flex items-center justify-center mx-auto mb-4">
        <BarChart3 size={28} className="text-[#6e56cf]" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-white">Pas encore de stats</h2>
      <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">Dès que tu publies ou génères tes premières musiques sur Synaura, leurs performances apparaîtront ici.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/upload" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white text-sm transition-all">
          <Music size={16} /> Uploader une piste
        </Link>
        <Link href="/studio" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] text-white text-sm font-medium shadow-[0_4px_20px_rgba(110,86,207,0.35)] transition-all">
          <Sparkles size={16} /> Créer avec l&apos;IA
        </Link>
      </div>
    </div>
  );
}

function fmt(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return String(Math.round(num * 10) / 10);
}
