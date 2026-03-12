'use client';

import React, { useEffect, useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Headphones, Heart, Music, TrendingUp, TrendingDown,
  Users, Clock, Target, Sparkles, ChevronDown, Search,
  ArrowUpDown, Star, Zap, BarChart3, Play, Disc3,
  ArrowRight, Eye, Volume2, Lightbulb, Award, Flame,
  Share2, Upload, Globe, Smartphone, Trophy, Crown,
  Medal, AlertTriangle, CheckCircle, Info, Rocket,
} from 'lucide-react';
import { StatsPageSkeleton } from '@/components/Skeletons';

/* ═══════════════════ Recharts (lazy client-side) ═══════════════════ */

let _rechartsModule: any = null;

function useRecharts() {
  const [mod, setMod] = useState<any>(_rechartsModule);
  useEffect(() => {
    if (_rechartsModule) { setMod(_rechartsModule); return; }
    import('recharts').then((m) => { _rechartsModule = m; setMod(m); });
  }, []);
  return mod;
}

const PIE_CHART_COLORS = ['#6e56cf','#00d3a7','#f59e0b','#10b981','#ef4444','#3b82f6','#f97316','#22c55e'];
const TOOLTIP_STYLE = { background:'rgba(10,10,16,0.95)', border:'1px solid rgba(110,86,207,0.3)', borderRadius:14, color:'#f6f7fb', fontSize:12, backdropFilter:'blur(20px)', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' };

function LazyAreaChart({ data, metric, compareSeries }: { data: any[]; metric: string; compareSeries?: any[] }) {
  const rc = useRecharts();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 300 });
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) setDims({ w: e.contentRect.width, h: 300 }); });
    obs.observe(containerRef.current);
    setDims({ w: containerRef.current.clientWidth, h: 300 });
    return () => obs.disconnect();
  }, []);
  if (!rc || dims.w === 0) return <div ref={containerRef} className="h-[300px] animate-pulse rounded-2xl" style={{ background:'linear-gradient(135deg,rgba(110,86,207,0.05),rgba(0,211,167,0.03))' }} />;
  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = rc;
  const color = metric === 'plays' ? '#6e56cf' : metric === 'uniques' ? '#00d3a7' : '#f43f5e';
  const gid = `sg-${metric}-${Date.now() % 10000}`;
  return (
    <div ref={containerRef} style={{ width: '100%', height: 300 }}>
      <AreaChart data={data} width={dims.w} height={dims.h} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id={`${gid}-cmp`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d3a7" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#00d3a7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.1)" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }}
          tickFormatter={(v: string) => { const d = new Date(v + 'T12:00:00'); return `${d.getDate()}/${d.getMonth()+1}`; }}
          interval="preserveStartEnd" minTickGap={50} />
        <YAxis stroke="rgba(255,255,255,0.06)" tick={{ fill:'rgba(255,255,255,0.25)', fontSize:10 }} width={36} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE}
          labelFormatter={(v: any) => new Date(String(v) + 'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
          formatter={(val: any, name: any) => [val, name === 'compare' ? 'Comparaison' : metric === 'plays' ? 'Écoutes' : metric === 'uniques' ? 'Uniques' : 'Likes']} />
        {compareSeries && compareSeries.length > 0 && (
          <Area type="monotone" dataKey="compare" stroke="#00d3a7" strokeWidth={2} fill={`url(#${gid}-cmp)`} dot={false} isAnimationActive={false} name="compare" />
        )}
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fill={`url(#${gid})`}
          dot={{ r: 2, fill: color, stroke: 'none' }}
          activeDot={{ r: 6, fill: color, stroke:'#fff', strokeWidth:2, filter:'drop-shadow(0 0 6px rgba(110,86,207,0.6))' }}
          isAnimationActive={false} name="main" />
      </AreaChart>
    </div>
  );
}

function LazyPieChart({ data }: { data: Record<string, number> }) {
  const rc = useRecharts();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) setWidth(e.contentRect.width); });
    obs.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => obs.disconnect();
  }, []);
  const entries = useMemo(() =>
    Object.entries(data || {}).sort(([,a],[,b]) => Number(b)-Number(a)).slice(0,8).map(([name,value]) => ({name, value:Number(value)})),
  [data]);
  if (!entries.length) return <div className="text-white/30 text-sm text-center py-8">Aucune donnee</div>;
  if (!rc || width === 0) return <div ref={containerRef} className="h-[180px] animate-pulse rounded-2xl" style={{ background:'linear-gradient(135deg,rgba(110,86,207,0.05),rgba(0,211,167,0.03))' }} />;
  const { PieChart, Pie, Cell, Tooltip } = rc;
  const size = Math.min(width, 180);
  const outerR = size * 0.42; const innerR = outerR * 0.58;
  return (
    <div ref={containerRef} style={{ width: '100%', height: 180, display: 'flex', justifyContent: 'center' }}>
      <PieChart width={size} height={180}>
        <Pie data={entries} cx="50%" cy="50%" innerRadius={innerR} outerRadius={outerR} paddingAngle={entries.length > 1 ? 3 : 0} dataKey="value" stroke="none" isAnimationActive={false}>
          {entries.map((_: any, i: number) => <Cell key={i} fill={PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ ...TOOLTIP_STYLE, borderRadius:12 }} formatter={(val: any, name: any) => [`${val}%`, name]} />
      </PieChart>
    </div>
  );
}

function LazyBarChart({ data }: { data: any[] }) {
  const rc = useRecharts();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => { if (e.contentRect.width > 0) setWidth(e.contentRect.width); });
    obs.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => obs.disconnect();
  }, []);
  if (!rc || width === 0) return <div ref={containerRef} className="h-[200px] animate-pulse rounded-2xl" style={{ background:'linear-gradient(135deg,rgba(110,86,207,0.05),rgba(0,211,167,0.03))' }} />;
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } = rc;
  return (
    <div ref={containerRef} style={{ width: '100%', height: 200 }}>
      <BarChart data={data} width={width} height={200} layout="vertical" margin={{ left: 4, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
        <XAxis type="number" stroke="rgba(255,255,255,0.08)" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10 }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.08)" tick={{ fill:'rgba(255,255,255,0.5)', fontSize:10 }} width={70} />
        <Tooltip contentStyle={{ ...TOOLTIP_STYLE, fontSize: 11 }} />
        <Bar dataKey="plays" fill="#6e56cf" radius={[0,6,6,0]} name="Lectures" isAnimationActive={false} />
        <Bar dataKey="completes" fill="#00d3a7" radius={[0,6,6,0]} name="Completions" isAnimationActive={false} />
      </BarChart>
    </div>
  );
}

/* ═══════════════════ Types ═══════════════════ */

type OverviewData = {
  plays: number; playsVariation: number; likes: number; likesVariation: number;
  followers: number; totalTracks: number; normalTracks: number; aiTracks: number;
  listenHours: number; listenHoursEstimated?: boolean;
  avgRetention: number; avgRetentionEstimated?: boolean;
  bestTrack: { id: string; title: string; plays: number } | null;
  ai: { count: number; plays: number; likes: number };
};

type UnifiedTrack = {
  id: string; title: string; coverUrl: string; duration: number;
  createdAt: string; plays: number; likes: number;
  isAI: boolean; isRemix: boolean; retention: number; trend7d: number;
};

type Tip = {
  id: string;
  type: 'success' | 'warning' | 'info' | 'action';
  title: string;
  message: string;
  cta?: { label: string; href: string };
  priority: number;
};

/* ═══════════════════ Score & Sparkline ═══════════════════ */

function computeScore(ov: OverviewData | null, audience: any): number {
  if (!ov) return 0;
  let s = 0;
  s += Math.min(100, ov.plays > 0 ? Math.log10(ov.plays + 1) * 33 : 0) * 0.3;
  s += Math.min(100, Math.max(0, 50 + Math.min(50, Math.max(-50, ov.playsVariation)))) * 0.2;
  const likeR = ov.plays > 0 ? (ov.likes / ov.plays) * 100 : 0;
  s += Math.min(100, likeR * 20) * 0.15;
  s += Math.min(100, ov.avgRetention) * 0.15;
  s += Math.min(100, ov.followers > 0 ? Math.log10(ov.followers + 1) * 50 : 0) * 0.1;
  const countries = Object.keys(audience?.countries || {}).length;
  s += Math.min(100, countries * 25) * 0.1;
  return Math.round(Math.max(0, Math.min(100, s)));
}

function getLevel(score: number): { label: string; color: string; next: string } {
  if (score >= 76) return { label: 'Star', color: '#f59e0b', next: 'Tu es au sommet !' };
  if (score >= 51) return { label: 'Confirme', color: '#00d3a7', next: `${76 - score} pts pour Star` };
  if (score >= 26) return { label: 'En croissance', color: '#6e56cf', next: `${51 - score} pts pour Confirme` };
  return { label: 'Debutant', color: '#3b82f6', next: `${26 - score} pts pour En croissance` };
}

function PerformanceScore({ score, loading }: { score: number; loading: boolean }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  const ARC = C * 0.75;
  const filled = ARC * (score / 100);
  const level = getLevel(score);

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 sm:p-6 mb-6"
      style={{ background: 'linear-gradient(135deg, rgba(10,10,16,0.7) 0%, rgba(110,86,207,0.06) 50%, rgba(0,211,167,0.04) 100%)' }}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Arc SVG */}
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          {loading ? (
            <div className="w-full h-full rounded-full bg-white/[0.03] animate-pulse" />
          ) : (
            <svg viewBox="0 0 180 180" width={160} height={160}>
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6e56cf" />
                  <stop offset="100%" stopColor="#00d3a7" />
                </linearGradient>
              </defs>
              <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
                strokeDasharray={`${ARC} ${C}`} strokeLinecap="round"
                transform="rotate(135 90 90)" />
              <circle cx="90" cy="90" r={R} fill="none" stroke="url(#scoreGrad)" strokeWidth={10}
                strokeDasharray={`${filled} ${C}`} strokeLinecap="round"
                transform="rotate(135 90 90)"
                style={{ transition: 'stroke-dasharray 1s ease-out' }} />
              <text x="90" y="82" textAnchor="middle" fill="white" fontSize="36" fontWeight="800">{score}</text>
              <text x="90" y="102" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="11" fontWeight="500">/100</text>
            </svg>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Score de Performance</h2>
          <p className="text-white/40 text-sm mb-4">
            Analyse globale de tes metriques sur la periode selectionnee.
          </p>
          {!loading && (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold border"
                  style={{ color: level.color, borderColor: `${level.color}55`, background: `${level.color}15` }}>
                  {level.label}
                </span>
                <span className="text-xs text-white/30">{level.next}</span>
              </div>
              <div className="w-full max-w-xs bg-white/[0.04] rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${score}%`, background: `linear-gradient(90deg, #6e56cf, #00d3a7)` }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ data, color = '#6e56cf', w = 80, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data.length || data.every(v => v === 0)) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0 opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════ Coach Tips ═══════════════════ */

function generateTips(ov: OverviewData | null, tracks: UnifiedTrack[], series: any[], audience: any, heatmap: number[][]): Tip[] {
  if (!ov) return [];
  const tips: Tip[] = [];
  const likeR = ov.plays > 0 ? (ov.likes / ov.plays) * 100 : 0;
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

  if (ov.avgRetention > 0 && ov.avgRetention < 40) {
    tips.push({ id:'ret-low', type:'warning', title:'Accroche tes auditeurs', message:'Les 15 premieres secondes sont cruciales. Travaille tes intros pour garder l\'attention de tes auditeurs.', cta:{ label:'Ouvrir le Studio', href:'/studio' }, priority:90 });
  }
  if (ov.plays > 5 && likeR < 3) {
    tips.push({ id:'like-low', type:'info', title:'Engage ta communaute', message:'Ton ratio likes/ecoutes est faible. Encourage tes auditeurs a liker en ajoutant un appel a l\'action dans ta bio.', cta:{ label:'Modifier mon profil', href:'/profile' }, priority:70 });
  }
  const mobileP = Number(audience?.devices?.['Mobile'] || 0);
  if (ov.plays > 10 && mobileP === 0) {
    tips.push({ id:'no-mobile', type:'info', title:'Capte l\'audience mobile', message:'Tu n\'as aucune ecoute mobile. Partage tes pistes sur Instagram, TikTok et Snapchat pour toucher ce public.', priority:60 });
  }
  if (ov.playsVariation < -10) {
    tips.push({ id:'decline', type:'warning', title:'Relance ta visibilite', message:'Tes ecoutes sont en baisse. Publie regulierement pour rester dans les recommandations.', cta:{ label:'Uploader une piste', href:'/upload' }, priority:85 });
  }
  if (heatmap.length > 0) {
    const flat = heatmap.flat();
    const mx = Math.max(...flat);
    if (mx > 2) {
      const idx = flat.indexOf(mx);
      const day = Math.floor(idx / (heatmap[0]?.length || 24));
      const hour = idx % (heatmap[0]?.length || 24);
      tips.push({ id:'best-time', type:'info', title:'Publie au bon moment', message:`Ton audience est la plus active le ${days[day]} a ${hour}h. Publie a ce creneau pour maximiser l'impact.`, priority:50 });
    }
  }
  if (ov.totalTracks < 3) {
    tips.push({ id:'few-tracks', type:'action', title:'Publie plus de pistes', message:'Plus tu publies, plus l\'algorithme te recommande. Lance-toi avec le Studio IA !', cta:{ label:'Creer avec l\'IA', href:'/studio' }, priority:80 });
  }
  if (ov.bestTrack && ov.plays > 0 && ov.bestTrack.plays / ov.plays > 0.5 && tracks.length > 1) {
    tips.push({ id:'diversify', type:'info', title:'Diversifie ton catalogue', message:`"${ov.bestTrack.title}" concentre plus de la moitie de tes ecoutes. Cree des pistes dans le meme style pour elargir ton audience.`, priority:55 });
  }
  if (ov.avgRetention >= 70 && !ov.avgRetentionEstimated) {
    tips.push({ id:'ret-great', type:'success', title:'Retention excellente', message:'Ta musique captive les auditeurs jusqu\'au bout. Continue sur cette lancee !', priority:40 });
  }
  if (tracks.some(t => t.trend7d > 0)) {
    tips.push({ id:'trending', type:'success', title:'En progression', message:'Certaines pistes gagnent en ecoutes cette semaine. Profite de l\'elan pour publier du nouveau contenu !', cta:{ label:'Studio', href:'/studio' }, priority:45 });
  }
  if (ov.followers > 0 && ov.plays > 20) {
    tips.push({ id:'boost', type:'action', title:'Boost ta visibilite', message:'Utilise les Boosters pour propulser tes meilleures pistes dans les recommandations et toucher plus de monde.', cta:{ label:'Ouvrir les Boosters', href:'/boosters' }, priority:35 });
  }
  if (ov.playsVariation > 20) {
    tips.push({ id:'momentum', type:'success', title:'Bel elan !', message:`Tes ecoutes augmentent de ${Math.round(ov.playsVariation)}%. C'est le moment ideal pour publier et capitaliser sur cette dynamique.`, priority:65 });
  }

  return tips.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

const TIP_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
  action: <Rocket size={18} />,
};
const TIP_COLORS: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  success: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
  warning: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
  info: { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  action: { bg: 'rgba(110,86,207,0.06)', border: 'rgba(110,86,207,0.15)', text: 'text-[#6e56cf]', iconBg: 'bg-[#6e56cf]/20' },
};

function CoachTips({ tips }: { tips: Tip[] }) {
  if (!tips.length) return null;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
        <Lightbulb size={18} className="text-amber-400" /> Coach Synaura
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tips.map((t) => {
          const style = TIP_COLORS[t.type];
          return (
            <div key={t.id} className="rounded-xl border p-4 flex flex-col gap-2.5 transition-all hover:scale-[1.01]"
              style={{ background: style.bg, borderColor: style.border }}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg} ${style.text}`}>
                  {TIP_ICONS[t.type]}
                </div>
                <span className="text-sm font-semibold text-white">{t.title}</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed flex-1">{t.message}</p>
              {t.cta && (
                <Link href={t.cta.href} className={`text-xs font-medium ${style.text} hover:underline flex items-center gap-1 mt-auto`}>
                  {t.cta.label} <ArrowRight size={11} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ Engagement Panel ═══════════════════ */

function EngagementGauge({ value, max, label, color, suffix = '%' }: { value: number; max: number; label: string; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-white/50">{label}</span>
          <span className="text-sm font-bold text-white tabular-nums">{typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(1)) : value}{suffix}</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

function EngagementPanel({ overview, periodTotals }: { overview: OverviewData | null; periodTotals: { plays: number; uniques: number; likes: number } }) {
  if (!overview) return null;
  const likeRatio = overview.plays > 0 ? Math.round((overview.likes / overview.plays) * 1000) / 10 : 0;
  const avgPlaysPerTrack = overview.totalTracks > 0 ? Math.round(overview.plays / overview.totalTracks) : 0;
  const listenerDiv = periodTotals.plays > 0 ? Math.round((periodTotals.uniques / periodTotals.plays) * 1000) / 10 : 0;

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 h-full">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Flame size={16} className="text-orange-400" /> Qualite d&apos;engagement
      </h3>
      <div className="space-y-4">
        <EngagementGauge value={likeRatio} max={10} label="Ratio likes/ecoutes" color="#f43f5e" />
        <EngagementGauge value={avgPlaysPerTrack} max={Math.max(100, avgPlaysPerTrack)} label="Ecoutes / piste" color="#6e56cf" suffix="" />
        <EngagementGauge value={listenerDiv} max={100} label="Diversite auditeurs" color="#00d3a7" />
        <EngagementGauge value={overview.avgRetention} max={100} label="Taux de completion" color="#f59e0b" />
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-white">{fmt(overview.followers)}</div>
            <div className="text-[10px] text-white/30">Followers</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-white">{overview.normalTracks + overview.aiTracks}</div>
            <div className="text-[10px] text-white/30">Pistes</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Main Page ═══════════════════ */

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
      (async () => { setLoadingOverview(true); try { const r = await fetch(`/api/stats/overview?range=${range}`, { headers: hdr }); if (r.ok) setOverview(await r.json()); } catch {} finally { setLoadingOverview(false); } })(),
      (async () => { setLoadingTracks(true); try { const r = await fetch('/api/stats/all-tracks', { headers: hdr }); if (r.ok) { const d = await r.json(); setAllTracks(d.tracks || []); } } catch {} finally { setLoadingTracks(false); } })(),
      (async () => { setLoadingSeries(true); try { const r = await fetch(`/api/stats/timeseries?range=${range}&track=${selectedTrack}`, { headers: hdr }); if (r.ok) setSeries(await r.json()); else setSeries([]); } catch { setSeries([]); } finally { setLoadingSeries(false); } })(),
      (async () => { if (compareTrack && compareTrack !== 'all' && compareTrack !== selectedTrack) { try { const r = await fetch(`/api/stats/timeseries?range=${range}&track=${compareTrack}`, { headers: hdr }); if (r.ok) setCompareSeries(await r.json()); else setCompareSeries([]); } catch { setCompareSeries([]); } } else setCompareSeries([]); })(),
      (async () => { setLoadingAudience(true); try { const r = await fetch(`/api/stats/audience?range=${range}&track=${selectedTrack}`, { headers: hdr }); if (r.ok) { const d = await r.json(); setAudience({ countries: d.countries, devices: d.devices }); setAudienceTech({ os: d.os, browsers: d.browsers }); } } catch {} finally { setLoadingAudience(false); } })(),
      (async () => { setLoadingHeatmap(true); try { const r = await fetch(`/api/stats/heatmap?range=${range}&track=${selectedTrack}`, { headers: hdr }); if (r.ok) { const d = await r.json(); setHeatmap(d.matrix || []); } } catch {} finally { setLoadingHeatmap(false); } })(),
      (async () => { if (selectedTrack && selectedTrack !== 'all') { setLoadingDetail(true); try { const r = await fetch(`/api/stats/tracks?track_id=${encodeURIComponent(selectedTrack)}`, { headers: hdr }); if (r.ok) setTrackDetail(await r.json()); else setTrackDetail(null); } catch { setTrackDetail(null); } finally { setLoadingDetail(false); } } else setTrackDetail(null); })(),
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

  const playsSparkData = useMemo(() => series.slice(-14).map((p: any) => p.plays || 0), [series]);
  const likesSparkData = useMemo(() => series.slice(-14).map((p: any) => p.likes || 0), [series]);

  const perfScore = useMemo(() => computeScore(overview, audience), [overview, audience]);
  const tips = useMemo(() => generateTips(overview, allTracks, series, audience, heatmap), [overview, allTracks, series, audience, heatmap]);

  const maxTrackPlays = useMemo(() => Math.max(1, ...filteredTracks.map(t => t.plays)), [filteredTracks]);

  if (loading && !overview) return <StatsPageSkeleton />;

  const userName = (session?.user as any)?.name || (session?.user as any)?.username || '';
  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Bonjour'; if (h < 18) return 'Bon apres-midi'; return 'Bonsoir'; })();

  return (
    <div className="relative min-h-screen w-full">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-[200px] -left-[100px] w-[600px] h-[600px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, rgba(110,86,207,1) 0%, transparent 70%)', filter:'blur(80px)' }} />
        <div className="absolute top-[40%] -right-[150px] w-[500px] h-[500px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, rgba(0,211,167,1) 0%, transparent 70%)', filter:'blur(80px)' }} />
        <div className="absolute -bottom-[150px] left-[30%] w-[400px] h-[400px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,1) 0%, transparent 70%)', filter:'blur(80px)' }} />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 2xl:px-12 py-6 md:py-10 pb-28">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-white/40 text-sm mb-1">{greeting}{userName ? `, ${userName}` : ''}</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold">
                <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">Tes statistiques</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.06] text-white/70 font-medium hover:bg-white/[0.1] text-sm transition-all">
                <Users size={15} /> Profil
              </Link>
              <Link href="/studio" className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all">
                <Sparkles size={15} /> Studio
              </Link>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-white/[0.04] rounded-full p-0.5">
            {(['7d','30d','90d','all'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${range===r
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/30 hover:text-white/60'}`}>
                {r === 'all' ? 'Tout' : r.toUpperCase()}
              </button>
            ))}
            </div>
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
            {/* ══════ SECTION 1: Score + KPIs ══════ */}
            <PerformanceScore score={perfScore} loading={loadingOverview} />

            {/* KPI Row 1 - Primary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <KpiCardPrimary icon={<Headphones size={20}/>} label="Ecoutes" value={overview?.plays??0} variation={overview?.playsVariation} loading={loadingOverview} sparkData={playsSparkData} color="#6e56cf" />
              <KpiCardPrimary icon={<Heart size={20}/>} label="Likes" value={overview?.likes??0} variation={overview?.likesVariation} loading={loadingOverview} sparkData={likesSparkData} color="#f43f5e" />
              <KpiCardPrimary icon={<Users size={20}/>} label="Followers" value={overview?.followers??0} loading={loadingOverview} color="#3b82f6" />
            </div>
            {/* KPI Row 2 - Secondary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <KpiCardSecondary icon={<Music size={16}/>} label="Pistes" value={overview?.totalTracks??0} subtitle={overview ? `${overview.normalTracks} std + ${overview.aiTracks} IA` : undefined} loading={loadingOverview} />
              <KpiCardSecondary icon={<Clock size={16}/>} label="Heures d'ecoute" value={overview?.listenHours??0} suffix="h" estimated={overview?.listenHoursEstimated} loading={loadingOverview} />
              <KpiCardSecondary icon={<Target size={16}/>} label="Retention moy." value={overview?.avgRetention??0} suffix="%" estimated={overview?.avgRetentionEstimated} loading={loadingOverview} />
            </div>

            {/* ══════ SECTION 2: Insights ══════ */}
            {overview && (overview.ai.count > 0 || overview.bestTrack) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {overview.ai.count > 0 && (
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4"
                    style={{ background:'linear-gradient(135deg, rgba(110,86,207,0.08) 0%, rgba(0,211,167,0.04) 100%)' }}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6e56cf] to-[#00d3a7] flex items-center justify-center shrink-0">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{overview.ai.count} piste{overview.ai.count > 1 ? 's' : ''} IA</div>
                      <div className="text-xs text-white/40">{fmt(overview.ai.plays)} ecoutes &middot; {fmt(overview.ai.likes)} likes</div>
                    </div>
                  </div>
                )}
                {overview.bestTrack && (
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4"
                    style={{ background:'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)' }}>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Trophy size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">Top : {overview.bestTrack.title}</div>
                      <div className="text-xs text-white/40">{fmt(overview.bestTrack.plays)} ecoutes sur la periode</div>
                    </div>
                    <button onClick={() => setSelectedTrack(overview.bestTrack!.id)} className="text-xs text-[#6e56cf] hover:text-[#00d3a7] transition-colors shrink-0">
                      Details <ArrowRight size={12} className="inline" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <CoachTips tips={tips} />

            {/* ══════ SECTION 3: Performance ══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-6">
              {/* Chart */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <BarChart3 size={18} className="text-[#6e56cf]" /> Evolution
                  </h2>
                  <div className="inline-flex bg-white/[0.04] rounded-full p-0.5">
                    {(['plays','uniques','likes'] as const).map((m) => (
                      <button key={m} onClick={() => setMetric(m)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${metric===m
                          ? 'bg-white/[0.1] text-white'
                          : 'text-white/30 hover:text-white/60'}`}>
                        {m === 'plays' ? 'Ecoutes' : m === 'uniques' ? 'Uniques' : 'Likes'}
                      </button>
                    ))}
                  </div>
                </div>
                {loadingSeries ? (
                  <div className="h-[300px] flex items-center justify-center"><Spinner label="Chargement" /></div>
                ) : chartData.length === 0 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center gap-2">
                    <BarChart3 size={32} className="text-white/10" />
                    <p className="text-white/30 text-sm">Les donnees apparaitront apres les premieres ecoutes</p>
                  </div>
                ) : (
                  <LazyAreaChart data={chartData} metric={metric} compareSeries={compareSeries} />
                )}
                {chartData.length > 0 && (
                  <div className="mt-3 flex gap-4 flex-wrap text-xs border-t border-white/[0.06] pt-3">
                    <span className="text-white/30">Ecoutes : <span className="text-white font-semibold">{fmt(periodTotals.plays)}</span></span>
                    <span className="text-white/30">Uniques : <span className="text-white font-semibold">{fmt(periodTotals.uniques)}</span></span>
                    <span className="text-white/30">Likes : <span className="text-white font-semibold">{fmt(periodTotals.likes)}</span></span>
                  </div>
                )}
              </div>
              {/* Engagement */}
              <EngagementPanel overview={overview} periodTotals={periodTotals} />
            </div>

            {/* ══════ SECTION 4: Track Detail ══════ */}
            {selectedTrack !== 'all' && trackDetail && <TrackDetailPanel detail={trackDetail} loading={loadingDetail} />}

            {/* ══════ SECTION 5: Pistes ══════ */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Disc3 size={18} className="text-[#00d3a7]" /> Toutes tes pistes
                  <span className="text-xs font-normal text-white/30 ml-1">({allTracks.length})</span>
                </h2>
                <div className="inline-flex bg-white/[0.04] rounded-full p-0.5">
                  {(['all','normal','ai'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeTab===tab
                        ? 'bg-white/[0.1] text-white'
                        : 'text-white/30 hover:text-white/60'}`}>
                      {tab === 'all' ? 'Toutes' : tab === 'normal' ? 'Standard' : 'IA'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] outline-none transition-colors" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([['plays','Ecoutes'],['likes','Likes'],['recent','Recent'],['retention','Retention'],['trend','7j']] as const).map(([key,label]) => (
                    <button key={key} onClick={() => setTrackSort(key as any)}
                      className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all ${trackSort===key
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'}`}>
                      <ArrowUpDown size={9} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              {loadingTracks ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
              ) : filteredTracks.length === 0 ? (
                <div className="text-center py-10 text-white/25 text-sm">Aucune piste trouvee</div>
              ) : (
                <div className="space-y-1">
                  {filteredTracks.map((t, i) => (
                    <div key={t.id}
                      onClick={() => setSelectedTrack(t.id === selectedTrack ? 'all' : t.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${selectedTrack === t.id
                        ? 'bg-[#6e56cf]/10 border border-[#6e56cf]/20'
                        : 'hover:bg-white/[0.03] border border-transparent'}`}>
                      {/* Rank / Medal */}
                      <div className="w-6 text-center shrink-0">
                        {i === 0 ? <Crown size={16} className="text-amber-400 mx-auto" /> :
                         i === 1 ? <Medal size={14} className="text-slate-300 mx-auto" /> :
                         i === 2 ? <Medal size={14} className="text-amber-600 mx-auto" /> :
                         <span className="text-xs text-white/20 tabular-nums">{i+1}</span>}
                      </div>
                      {/* Cover */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.coverUrl?.replace('/upload/','/upload/f_auto,q_auto,w_80/') || '/default-cover.svg'} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      {/* Info + Progress bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-white font-medium truncate">{t.title}</span>
                          {t.isAI && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#6e56cf]/20 text-[#6e56cf]">IA</span>}
                          {t.isRemix && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-fuchsia-500/20 text-fuchsia-400">Remix</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/25 mt-0.5">
                          <span className="flex items-center gap-0.5"><Play size={9}/> {fmt(t.plays)}</span>
                          <span className="flex items-center gap-0.5"><Heart size={9}/> {fmt(t.likes)}</span>
                          <span className={t.retention > 50 ? 'text-emerald-400/70' : ''}>{t.retention}%</span>
                          {t.trend7d !== 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${t.trend7d > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                              {t.trend7d > 0 ? '+' : ''}{fmt(t.trend7d)}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(t.plays / maxTrackPlays) * 100}%`, background: 'linear-gradient(90deg, #6e56cf, #00d3a7)' }} />
                        </div>
                      </div>
                      <div className="text-xs text-white/15 hidden sm:block shrink-0">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══════ SECTION 6: Audience ══════ */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Globe size={18} className="text-blue-400" /> Connais ton audience
              </h2>
              {/* Heatmap */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-amber-400" /> Meilleurs creneaux
                </h3>
                {loadingHeatmap ? <div className="h-40 flex items-center justify-center"><Spinner /></div> : <HeatmapGrid matrix={heatmap} />}
              </div>
              {/* 4 Audience charts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <AudienceCard title="Pays" icon={<Globe size={14} className="text-blue-400"/>} data={audience.countries} loading={loadingAudience} />
                <AudienceCard title="Appareils" icon={<Smartphone size={14} className="text-emerald-400"/>} data={audience.devices} loading={loadingAudience} />
                <AudienceCard title="Systemes" icon={<Disc3 size={14} className="text-violet-400"/>} data={audienceTech.os} loading={loadingAudience} />
                <AudienceCard title="Navigateurs" icon={<Search size={14} className="text-cyan-400"/>} data={audienceTech.browsers} loading={loadingAudience} />
              </div>
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

/* ═══════════════════ KPI Cards ═══════════════════ */

function KpiCardPrimary({ icon, label, value, variation, loading, sparkData, color }: {
  icon: React.ReactNode; label: string; value: number; variation?: number; loading?: boolean; sparkData?: number[]; color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-4 sm:p-5"
      style={{ background: `linear-gradient(135deg, ${color}12 0%, rgba(10,10,16,0.5) 100%)`, backdropFilter:'blur(10px)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}25`, color }}>
            {icon}
          </div>
          <span className="text-xs font-medium text-white/45 uppercase tracking-wider">{label}</span>
        </div>
        {sparkData && <MiniSparkline data={sparkData} color={color} />}
      </div>
      {loading ? <div className="h-9 w-24 bg-white/[0.04] rounded-lg animate-pulse mt-1" /> : (
        <div className="flex items-end gap-3">
          <div className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">{fmt(value)}</div>
          {variation !== undefined && variation !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-semibold pb-1 ${variation > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {variation > 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {variation > 0 ? '+' : ''}{variation}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCardSecondary({ icon, label, value, loading, suffix, subtitle, estimated }: {
  icon: React.ReactNode; label: string; value: number; loading?: boolean; suffix?: string; subtitle?: string; estimated?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] p-3 sm:p-3.5"
      style={{ background: 'linear-gradient(135deg, rgba(10,10,16,0.5) 0%, rgba(10,10,16,0.3) 100%)', backdropFilter:'blur(10px)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.06] text-white/50">{icon}</div>
        <span className="text-[10px] font-medium text-white/35 uppercase tracking-wider">{label}</span>
      </div>
      {loading ? <div className="h-6 w-16 bg-white/[0.04] rounded animate-pulse" /> : (
        <>
          <div className="text-xl font-bold text-white tabular-nums">
            {estimated ? '~' : ''}{fmt(value)}{suffix||''}
          </div>
          {estimated && <div className="text-[9px] text-amber-400/50">Estimation</div>}
          {subtitle && <div className="text-[9px] text-white/25">{subtitle}</div>}
        </>
      )}
    </div>
  );
}

/* ═══════════════════ Sub Components ═══════════════════ */

function TrackDetailPanel({ detail, loading }: { detail: any; loading: boolean }) {
  if (loading) return <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 mb-6 flex items-center justify-center h-40"><Spinner label="Chargement detail" /></div>;
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
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 sm:p-5 mb-6"
      style={{ background:'linear-gradient(135deg, rgba(110,86,207,0.04) 0%, rgba(0,211,167,0.02) 100%)' }}>
      <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <Target size={16} className="text-[#00d3a7]" /> Detail piste (30 derniers jours)
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {[
          { l:'Vues', v:totalViews }, { l:'Lectures', v:totalPlays }, { l:'Completions', v:totalCompletes },
          { l:'Likes', v:totalLikes }, { l:'Heures', v:listenH, s:'h' }, { l:'Retention', v:avgRet, s:'%' },
        ].map(m => (
          <div key={m.l} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
            <div className="text-[9px] uppercase tracking-wider text-white/25 mb-0.5">{m.l}</div>
            <div className="text-base font-bold text-white tabular-nums">{fmt(m.v)}{m.s||''}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {funnel && funnel.starts > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-white">Funnel de retention</h3>
            <div className="space-y-2.5">
              {[{l:'Demarrage',p:100},{l:'25%',p:funnel.p25Rate},{l:'50%',p:funnel.p50Rate},{l:'75%',p:funnel.p75Rate},{l:'Complet',p:funnel.completeRate}].map(s => (
                <div key={s.l} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-white/40">{s.l}</span>
                  <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#6e56cf] to-[#00d3a7] rounded-full" style={{ width:`${Math.max(2,s.p)}%` }} />
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
            <LazyBarChart data={srcData} />
          </div>
        )}
      </div>
      {daily.length > 0 && (
        <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
          <h3 className="text-xs font-semibold mb-2 text-white">7 derniers jours</h3>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {daily.slice(-7).map((d: any) => (
              <div key={d.day} className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04] text-center">
                <div className="text-[9px] text-white/30">{new Date(d.day).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}</div>
                <div className="text-white text-sm font-bold mt-0.5">{d.plays}</div>
                <div className="text-[9px] text-white/25">{Math.round(d.retention_complete_rate||0)}% ret.</div>
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
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4">
      <h3 className="text-xs font-semibold mb-2 text-white flex items-center gap-1.5">{icon} {title}</h3>
      {loading ? <div className="h-[180px] flex items-center justify-center"><Spinner /></div> :
        data && Object.keys(data).length > 0 ? <><LazyPieChart data={data} /><PieLegend data={data} /></> :
        <div className="h-[180px] flex flex-col items-center justify-center gap-2"><Eye size={20} className="text-white/10" /><p className="text-white/20 text-[10px]">Pas de donnees</p></div>}
    </div>
  );
}

function HeatmapGrid({ matrix }: { matrix: number[][] }) {
  const days = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  if (!matrix.length) return <div className="text-white/20 text-sm text-center py-6">Pas encore de donnees</div>;
  const flat = matrix.flat();
  const max = Math.max(1,...flat);
  const bestIdx = flat.indexOf(max);
  const bestDay = Math.floor(bestIdx / (matrix[0]?.length || 24));
  const bestHour = bestIdx % (matrix[0]?.length || 24);
  return (
    <div>
      {max > 1 && (
        <div className="mb-2 text-sm text-white/40 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          Meilleur creneau : <span className="text-white font-medium">{days[bestDay]} a {bestHour}h</span> <span className="text-white/25">({max} ecoutes)</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: `44px repeat(24, minmax(14px, 1fr))`, gap: 2 }}>
          <div />
          {Array.from({length:24}).map((_,h) => <div key={h} className="text-[8px] text-white/20 text-center">{h}</div>)}
          {matrix.map((row,d) => (
            <React.Fragment key={`r-${d}`}>
              <div className="text-[10px] text-white/30 pr-1.5 flex items-center justify-end">{days[d]}</div>
              {row.map((val,h) => {
                const intensity = val / max;
                return (
                  <div key={`${d}-${h}`} className="h-[16px] rounded-[3px] relative group cursor-default transition-transform hover:scale-110"
                    style={{ background: intensity > 0 ? `rgba(110,86,207,${0.1 + intensity * 0.9})` : 'rgba(255,255,255,0.02)' }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/95 text-white text-[9px] px-2 py-0.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-white/10">
                      {days[d]} {h}h : {val}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 text-[8px] text-white/20">
        <span>Moins</span>
        {[0.1,0.3,0.5,0.7,0.9].map(v => <div key={v} className="w-3.5 h-2.5 rounded-[2px]" style={{ background:`rgba(110,86,207,${v})` }} />)}
        <span>Plus</span>
      </div>
    </div>
  );
}

function PieLegend({ data }: { data: Record<string,number> }) {
  const sorted = Object.entries(data).sort(([,a],[,b]) => Number(b)-Number(a)).slice(0,6);
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
      {sorted.map(([name,value],i) => (
        <div key={name} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_CHART_COLORS[i%PIE_CHART_COLORS.length] }} />
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
        className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl pl-3 pr-10 py-2 text-sm text-white min-w-[180px] outline-none transition-colors focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]">
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
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 sm:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6e56cf]/20 to-[#00d3a7]/10 flex items-center justify-center mx-auto mb-4">
        <BarChart3 size={28} className="text-[#6e56cf]" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-white">Pas encore de stats</h2>
      <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">Des que tu publies ou generes tes premieres musiques sur Synaura, leurs performances apparaitront ici.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/upload" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] text-white/70 font-medium hover:bg-white/[0.1] text-sm transition-all">
          <Music size={16} /> Uploader une piste
        </Link>
        <Link href="/studio" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all">
          <Sparkles size={16} /> Creer avec l&apos;IA
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
