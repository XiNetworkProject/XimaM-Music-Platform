'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Eye,
  FileText,
  Headphones,
  Heart,
  Loader2,
  MessageCircle,
  Music2,
  PenLine,
  Radio,
  Share2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  Wand2,
} from 'lucide-react';
import {
  SynauraAppShell,
  SynauraInkPanel,
  SynauraPanel,
  SynauraTopBar,
} from '@/components/synaura/SynauraShell';

type RangeKey = '7d' | '30d' | '90d' | 'all';
type ViewKey = 'global' | 'tracks' | 'posts';
type MetricKey = 'plays' | 'likes' | 'uniques' | 'retention' | 'posts' | 'comments';

type OverviewData = {
  plays: number;
  playsVariation: number;
  likes: number;
  likesVariation: number;
  followers: number;
  totalTracks: number;
  normalTracks: number;
  aiTracks: number;
  listenHours: number;
  listenHoursEstimated?: boolean;
  avgRetention: number;
  avgRetentionEstimated?: boolean;
  bestTrack: { id: string; title: string; plays: number } | null;
};

type TrackStat = {
  id: string;
  title: string;
  coverUrl: string;
  createdAt: string;
  plays: number;
  likes: number;
  isAI: boolean;
  retention: number;
  trend7d: number;
};

type TrackPoint = {
  date: string;
  plays: number;
  uniques: number;
  likes: number;
  starts?: number;
  completes?: number;
  retention?: number | null;
  listenMs?: number;
  dataQuality?: 'real' | 'insufficient';
};
type PostPoint = { date: string; posts: number; likes: number; comments: number };

type PostStat = {
  id: string;
  type: string;
  typeLabel: string;
  content: string;
  imageUrl: string | null;
  trackTitle: string | null;
  createdAt: string;
  likes: number;
  comments: number;
  score: number;
};

type PostStats = {
  totalPosts: number;
  postsInRange: number;
  likes: number;
  comments: number;
  engagement: number;
  byType: Record<string, number>;
  series: PostPoint[];
  bestPost: PostStat | null;
  posts: PostStat[];
};

type TrackDetail = {
  daily: Array<{ day: string; views: number; plays: number; completes: number; likes: number; total_listen_ms: number; retention_complete_rate: number }>;
  sources: Array<{ source: string; plays: number; completes: number }>;
  funnel: { starts: number; p25Rate: number; p50Rate: number; p75Rate: number; completeRate: number };
};

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: 'all', label: 'Global' },
];

const VIEWS: Array<{ key: ViewKey; label: string }> = [
  { key: 'global', label: 'Vue globale' },
  { key: 'tracks', label: 'Sons' },
  { key: 'posts', label: 'Posts' },
];

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: 'plays', label: 'Écoutes' },
  { key: 'likes', label: 'Likes' },
  { key: 'uniques', label: 'Uniques' },
  { key: 'retention', label: 'Rétention' },
  { key: 'posts', label: 'Posts' },
  { key: 'comments', label: 'Commentaires' },
];

function fmt(value: number | null | undefined) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n * 10) / 10}`;
}

function pct(value: number | null | undefined) {
  const n = Number(value || 0);
  return `${n > 0 ? '+' : ''}${Math.round(n * 10) / 10}%`;
}

function safeDate(raw: string) {
  if (!raw) return 'Date inconnue';
  try {
    return new Date(raw).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch {
    return 'Date inconnue';
  }
}

function areaPath(points: number[], width = 520, height = 170) {
  if (!points.length) return '';
  const max = Math.max(1, ...points);
  const step = width / Math.max(1, points.length - 1);
  return points
    .map((value, index) => {
      const x = index * step;
      const y = height - 18 - (value / max) * (height - 34);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function metricValue(metric: MetricKey, trackPoint?: TrackPoint, postPoint?: PostPoint) {
  if (metric === 'likes') return (trackPoint?.likes || 0) + (postPoint?.likes || 0);
  if (metric === 'uniques') return trackPoint?.uniques || 0;
  if (metric === 'retention') return trackPoint?.retention ?? 0;
  if (metric === 'posts') return postPoint?.posts || 0;
  if (metric === 'comments') return postPoint?.comments || 0;
  return trackPoint?.plays || 0;
}

function formatMetric(metric: MetricKey, value: number | null | undefined) {
  if (metric === 'retention') return value == null ? '—' : `${fmt(value)}%`;
  return fmt(value || 0);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'dark',
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  tone?: 'dark' | 'coral' | 'violet' | 'mint';
}) {
  const tones = {
    dark: 'bg-[#171313] text-[#fffaf2]',
    coral: 'bg-[#ff6f61] text-white',
    violet: 'bg-[#7c5cff] text-white',
    mint: 'bg-[#0f766e] text-white',
  };
  return (
    <div className={`relative overflow-hidden rounded-[1.4rem] p-4 shadow-[0_16px_44px_rgba(30,25,20,0.12)] ${tones[tone]}`}>
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/14 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-56">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs font-bold opacity-58">{hint}</p> : null}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/14">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MiniArea({
  trackSeries,
  postSeries,
  view,
  metric,
  compareSeries,
}: {
  trackSeries: TrackPoint[];
  postSeries: PostPoint[];
  view: ViewKey;
  metric: MetricKey;
  compareSeries: TrackPoint[];
}) {
  const values = useMemo(() => {
    if (view === 'posts') return postSeries.map((point) => metricValue(metric, undefined, point));
    if (view === 'tracks') return trackSeries.map((point) => metricValue(metric, point));
    return trackSeries.map((point, index) => metricValue(metric, point, postSeries[index]));
  }, [metric, postSeries, trackSeries, view]);

  const compareValues = useMemo(() => {
    if (!compareSeries.length || metric === 'posts' || metric === 'comments') return [];
    return compareSeries.map((point) => metricValue(metric, point));
  }, [compareSeries, metric]);

  const path = areaPath(values);
  const comparePath = areaPath(compareValues);
  const last = values.at(-1) || 0;
  const prev = values.at(-2) || 0;
  const direction = last >= prev ? 'en hausse' : 'plus calme';

  return (
    <SynauraPanel className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Tendance</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Activité sur la période</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-black/48">
            Lecture jour par jour sur la métrique active, avec comparaison quand elle est disponible.
          </p>
        </div>
        <div className="rounded-full bg-black/[0.06] px-4 py-2 text-sm font-black text-black/54">
          Dernier jour: {formatMetric(metric, last)} · {direction}
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white/70 p-3">
        <svg viewBox="0 0 520 170" className="h-[210px] w-full">
          <defs>
            <linearGradient id="statsArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff6f61" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={`${path} L 520 170 L 0 170 Z`} fill="url(#statsArea)" />
          {comparePath ? (
            <path d={comparePath} fill="none" stroke="#7c5cff" strokeDasharray="8 8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          <path d={path} fill="none" stroke="#171313" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {values.map((value, index) => {
            if (index % Math.max(1, Math.ceil(values.length / 9)) !== 0 && index !== values.length - 1) return null;
            const max = Math.max(1, ...values);
            const x = (index / Math.max(1, values.length - 1)) * 520;
            const y = 170 - 18 - (value / max) * (170 - 34);
            return <circle key={index} cx={x} cy={y} r="4" fill="#ff6f61" stroke="#fffaf2" strokeWidth="2" />;
          })}
        </svg>
        {comparePath ? (
          <div className="mt-2 flex items-center gap-2 text-xs font-black text-black/44">
            <span className="h-1 w-8 rounded-full bg-[#171313]" /> Sélection
            <span className="ml-2 h-1 w-8 rounded-full border-t-2 border-dashed border-[#7c5cff]" /> Comparaison
          </div>
        ) : null}
      </div>
    </SynauraPanel>
  );
}

function TypeBreakdown({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((acc, [, value]) => acc + value, 0);
  return (
    <SynauraPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Formats</p>
          <h3 className="mt-1 text-xl font-black">Répartition des posts</h3>
        </div>
        <FileText className="h-5 w-5 text-black/30" />
      </div>
      <div className="mt-5 space-y-3">
        {rows.length ? rows.map(([label, value]) => {
          const width = total ? Math.max(5, (value / total) * 100) : 0;
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-sm font-bold text-black/58">
                <span>{label}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                <div className="h-full rounded-full bg-[#171313]" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        }) : <p className="text-sm font-semibold text-black/42">Aucun post pour le moment.</p>}
      </div>
    </SynauraPanel>
  );
}

function DataQualityNotice({ overview, series }: { overview: OverviewData | null; series: TrackPoint[] }) {
  const realDays = series.filter((point) => point.dataQuality === 'real').length;
  const hasRealRetention = realDays > 0 && !overview?.avgRetentionEstimated;
  return (
    <div className={`rounded-[1.2rem] border p-4 ${hasRealRetention ? 'border-emerald-700/10 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-400/12'}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${hasRealRetention ? 'bg-emerald-500/14 text-emerald-700' : 'bg-amber-500/18 text-amber-700'}`}>
          {hasRealRetention ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-black">{hasRealRetention ? 'Rétention basée sur les écoutes réelles' : 'Rétention insuffisante pour être fiable'}</p>
          <p className="mt-1 text-xs font-semibold text-black/48">
            {hasRealRetention
              ? `${realDays} jour(s) contiennent des événements play_start/play_complete.`
              : 'Il manque des événements de lecture complets. La page affiche “—” au lieu de fabriquer un pourcentage.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function DailyBreakdown({ trackSeries, postSeries, metric }: { trackSeries: TrackPoint[]; postSeries: PostPoint[]; metric: MetricKey }) {
  const rows = trackSeries.map((point, index) => ({ track: point, post: postSeries[index] || { date: point.date, posts: 0, likes: 0, comments: 0 } })).slice(-14).reverse();
  return (
    <SynauraPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Jour par jour</p>
          <h3 className="mt-1 text-xl font-black">Ce qui marche vraiment</h3>
        </div>
        <CalendarDays className="h-5 w-5 text-black/30" />
      </div>
      <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-black/[0.06]">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-2 bg-black/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black/38">
          <span>Jour</span>
          <span>Écoutes</span>
          <span>Posts</span>
          <span>Likes</span>
          <span>Rétention</span>
        </div>
        {rows.map(({ track, post }) => {
          const active = metricValue(metric, track, post);
          return (
            <div key={track.date} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] items-center gap-2 border-t border-black/[0.05] bg-white/54 px-3 py-2 text-sm font-bold">
              <span className="truncate">{safeDate(track.date)}</span>
              <span>{fmt(track.plays)}</span>
              <span>{fmt(post.posts)}</span>
              <span>{fmt((track.likes || 0) + (post.likes || 0))}</span>
              <span className={track.dataQuality === 'real' ? 'text-emerald-700' : 'text-black/28'}>
                {track.retention == null ? '—' : `${fmt(track.retention)}%`}
              </span>
              <span className="sr-only">Métrique active: {formatMetric(metric, active)}</span>
            </div>
          );
        })}
      </div>
    </SynauraPanel>
  );
}

function ComparisonPanel({
  tracks,
  selectedTrack,
  compareTrack,
  onSelectedTrack,
  onCompareTrack,
}: {
  tracks: TrackStat[];
  selectedTrack: string;
  compareTrack: string;
  onSelectedTrack: (value: string) => void;
  onCompareTrack: (value: string) => void;
}) {
  return (
    <SynauraPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Comparaison</p>
          <h3 className="mt-1 text-xl font-black">Comparer deux sons</h3>
        </div>
        <BarChart3 className="h-5 w-5 text-black/30" />
      </div>
      <div className="mt-5 grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-xs font-black text-black/40">Son analysé</span>
          <select value={selectedTrack} onChange={(event) => onSelectedTrack(event.target.value)} className="h-11 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black outline-none">
            <option value="all">Tous les sons</option>
            {tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-black text-black/40">Comparer avec</span>
          <select value={compareTrack} onChange={(event) => onCompareTrack(event.target.value)} className="h-11 rounded-full border border-black/[0.08] bg-white px-4 text-sm font-black outline-none">
            <option value="">Aucune comparaison</option>
            {tracks.filter((track) => track.id !== selectedTrack).map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}
          </select>
        </label>
      </div>
    </SynauraPanel>
  );
}

function AudienceBreakdown({ audience }: { audience: any }) {
  const countries = Object.entries(audience?.countries || {}).slice(0, 5) as Array<[string, number]>;
  const devices = Object.entries(audience?.devices || {}).slice(0, 4) as Array<[string, number]>;
  const rows = [...countries.map(([label, value]) => ({ label, value, group: 'Pays' })), ...devices.map(([label, value]) => ({ label, value, group: 'Appareil' }))];
  return (
    <SynauraPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Audience</p>
          <h3 className="mt-1 text-xl font-black">Qui écoute</h3>
        </div>
        <Users className="h-5 w-5 text-black/30" />
      </div>
      <div className="mt-5 space-y-3">
        {rows.length ? rows.map((row) => (
          <div key={`${row.group}-${row.label}`}>
            <div className="mb-1 flex items-center justify-between text-sm font-bold text-black/58">
              <span>{row.label}</span>
              <span>{fmt(row.value)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-[#7c5cff]" style={{ width: `${Math.max(4, row.value)}%` }} />
            </div>
          </div>
        )) : <p className="text-sm font-semibold text-black/42">Pas assez de données audience.</p>}
      </div>
    </SynauraPanel>
  );
}

function HeatmapPanel({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat());
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return (
    <SynauraPanel className="p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Heures fortes</p>
        <h3 className="mt-1 text-xl font-black">Quand ton audience réagit</h3>
      </div>
      <div className="mt-5 space-y-1">
        {matrix.map((row, dayIndex) => (
          <div key={dayIndex} className="grid grid-cols-[34px_1fr] items-center gap-2">
            <span className="text-[10px] font-black text-black/36">{days[dayIndex]}</span>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
              {row.map((value, hour) => (
                <div
                  key={hour}
                  title={`${days[dayIndex]} ${hour}h: ${value}`}
                  className="h-3 rounded-[3px]"
                  style={{ background: value ? `rgba(255,111,97,${0.16 + (value / max) * 0.74})` : 'rgba(0,0,0,0.05)' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] font-black text-black/32">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </SynauraPanel>
  );
}

function FunnelPanel({ detail, selectedTrack }: { detail: TrackDetail | null; selectedTrack: string }) {
  const steps = [
    { label: 'Départs', value: detail?.funnel?.starts || 0, max: Math.max(1, detail?.funnel?.starts || 0), suffix: '' },
    { label: '25%', value: detail?.funnel?.p25Rate || 0, max: 100, suffix: '%' },
    { label: '50%', value: detail?.funnel?.p50Rate || 0, max: 100, suffix: '%' },
    { label: '75%', value: detail?.funnel?.p75Rate || 0, max: 100, suffix: '%' },
    { label: 'Complet', value: detail?.funnel?.completeRate || 0, max: 100, suffix: '%' },
  ];
  return (
    <SynauraPanel className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Funnel d’écoute</p>
          <h3 className="mt-1 text-xl font-black">Où les gens décrochent</h3>
        </div>
        <Headphones className="h-5 w-5 text-black/30" />
      </div>
      {selectedTrack === 'all' ? (
        <p className="mt-5 rounded-[1.1rem] bg-black/[0.04] p-4 text-sm font-semibold text-black/46">
          Sélectionne un son précis pour afficher le funnel détaillé et les sources de lecture.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {steps.map((step) => (
            <div key={step.label}>
              <div className="mb-1 flex items-center justify-between text-sm font-bold text-black/58">
                <span>{step.label}</span>
                <span>{fmt(step.value)}{step.suffix}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
                <div className="h-full rounded-full bg-[#171313]" style={{ width: `${Math.max(3, Math.min(100, (step.value / step.max) * 100))}%` }} />
              </div>
            </div>
          ))}
          <div className="border-t border-black/[0.06] pt-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/32">Sources</p>
            <div className="mt-2 grid gap-2">
              {(detail?.sources || []).slice(0, 4).map((source) => (
                <div key={source.source} className="flex items-center justify-between rounded-[0.9rem] bg-black/[0.04] px-3 py-2 text-sm font-bold">
                  <span>{source.source}</span>
                  <span className="text-black/42">{fmt(source.plays)} plays · {fmt(source.completes)} complets</span>
                </div>
              ))}
              {!detail?.sources?.length ? <p className="text-sm font-semibold text-black/42">Pas encore de source détectée.</p> : null}
            </div>
          </div>
        </div>
      )}
    </SynauraPanel>
  );
}

function TrackRow({ track, maxPlays }: { track: TrackStat; maxPlays: number }) {
  const width = Math.max(4, (track.plays / Math.max(1, maxPlays)) * 100);
  return (
    <Link href={`/track/${track.id}`} className="group flex items-center gap-3 rounded-[1.2rem] border border-black/[0.06] bg-white/62 p-3 transition hover:-translate-y-0.5 hover:bg-white">
      <img
        src={track.coverUrl || '/brand/2026/synaura-symbol-2026-white.png'}
        alt=""
        className="h-14 w-14 shrink-0 rounded-[1rem] object-cover"
        onError={(event) => {
          event.currentTarget.src = '/brand/2026/synaura-symbol-2026-white.png';
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black">{track.title}</p>
          {track.isAI ? <span className="rounded-full bg-[#7c5cff]/12 px-2 py-0.5 text-[10px] font-black text-[#7c5cff]">IA</span> : null}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full rounded-full bg-[#ff6f61]" style={{ width: `${width}%` }} />
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <p className="text-sm font-black">{fmt(track.plays)}</p>
        <p className="text-xs font-bold text-black/40">{fmt(track.likes)} likes</p>
      </div>
    </Link>
  );
}

function PostRow({ post }: { post: PostStat }) {
  return (
    <Link href={`/posts/${post.id}`} className="group block rounded-[1.2rem] border border-black/[0.06] bg-white/62 p-4 transition hover:-translate-y-0.5 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/48">
            {post.typeLabel}
          </span>
          <p className="mt-3 line-clamp-2 text-sm font-black">
            {post.trackTitle || post.content || 'Post sans texte'}
          </p>
          {post.content && post.trackTitle ? <p className="mt-1 line-clamp-1 text-xs font-semibold text-black/42">{post.content}</p> : null}
        </div>
        {post.imageUrl ? <img src={post.imageUrl} alt="" className="h-14 w-14 rounded-[1rem] object-cover" /> : null}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs font-black text-black/42">
        <span>{safeDate(post.createdAt)}</span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {fmt(post.likes)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {fmt(post.comments)}</span>
        </span>
      </div>
    </Link>
  );
}

function LoadingCard() {
  return (
    <SynauraPanel className="grid min-h-[360px] place-items-center p-8">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-black/36" />
        <p className="mt-3 text-sm font-black text-black/40">Chargement des statistiques...</p>
      </div>
    </SynauraPanel>
  );
}

export default function StatsPage() {
  const { data: session, status } = useSession();
  const [range, setRange] = useState<RangeKey>('30d');
  const [view, setView] = useState<ViewKey>('global');
  const [metric, setMetric] = useState<MetricKey>('plays');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [compareTrack, setCompareTrack] = useState('');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [tracks, setTracks] = useState<TrackStat[]>([]);
  const [trackSeries, setTrackSeries] = useState<TrackPoint[]>([]);
  const [compareSeries, setCompareSeries] = useState<TrackPoint[]>([]);
  const [posts, setPosts] = useState<PostStats | null>(null);
  const [audience, setAudience] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<number[][]>([]);
  const [trackDetail, setTrackDetail] = useState<TrackDetail | null>(null);

  const loadStats = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const headers = { 'Cache-Control': 'no-store' };
    try {
      const [overviewRes, tracksRes, seriesRes, compareRes, postsRes, audienceRes, heatmapRes, detailRes] = await Promise.all([
        fetch(`/api/stats/overview?range=${range}`, { headers }),
        fetch('/api/stats/all-tracks', { headers }),
        fetch(`/api/stats/timeseries?range=${range}&track=${encodeURIComponent(selectedTrack)}`, { headers }),
        compareTrack ? fetch(`/api/stats/timeseries?range=${range}&track=${encodeURIComponent(compareTrack)}`, { headers }) : Promise.resolve(null),
        fetch(`/api/stats/posts?range=${range}`, { headers }),
        fetch(`/api/stats/audience?range=${range}&track=${encodeURIComponent(selectedTrack)}`, { headers }),
        fetch(`/api/stats/heatmap?range=${range}&track=${encodeURIComponent(selectedTrack)}`, { headers }),
        selectedTrack !== 'all' ? fetch(`/api/stats/tracks?track_id=${encodeURIComponent(selectedTrack)}`, { headers }) : Promise.resolve(null),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (tracksRes.ok) {
        const json = await tracksRes.json();
        setTracks(Array.isArray(json?.tracks) ? json.tracks : []);
      }
      if (seriesRes.ok) setTrackSeries(await seriesRes.json());
      if (compareRes && compareRes.ok) setCompareSeries(await compareRes.json());
      else setCompareSeries([]);
      if (postsRes.ok) setPosts(await postsRes.json());
      if (audienceRes.ok) setAudience(await audienceRes.json());
      if (heatmapRes.ok) {
        const json = await heatmapRes.json();
        setHeatmap(Array.isArray(json?.matrix) ? json.matrix : []);
      }
      if (detailRes && detailRes.ok) setTrackDetail(await detailRes.json());
      else setTrackDetail(null);
    } finally {
      setLoading(false);
    }
  }, [compareTrack, range, selectedTrack, session?.user?.id]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const sortedTracks = useMemo(() => [...tracks].sort((a, b) => b.plays - a.plays).slice(0, 8), [tracks]);
  const maxTrackPlays = useMemo(() => Math.max(1, ...sortedTracks.map((track) => track.plays)), [sortedTracks]);
  const topAiTracks = useMemo(() => tracks.filter((track) => track.isAI).sort((a, b) => b.plays - a.plays).slice(0, 4), [tracks]);
  const countryCount = useMemo(() => Object.keys(audience?.countries || {}).length, [audience]);
  const postSeries = posts?.series || [];
  const totalInteractions = (overview?.likes || 0) + (posts?.likes || 0) + (posts?.comments || 0);
  const realRetention = overview?.avgRetentionEstimated ? 0 : overview?.avgRetention || 0;
  const creatorScore = Math.min(100, Math.round(
    Math.log10((overview?.plays || 0) + 1) * 24 +
    Math.log10(totalInteractions + 1) * 18 +
    Math.min(28, realRetention / 3) +
    Math.min(20, (posts?.engagement || 0) * 2)
  ));

  if (status === 'loading' || loading) {
    return (
      <SynauraAppShell>
        <SynauraTopBar primaryHref="/upload" primaryLabel="Publier" secondaryHref="/studio" secondaryLabel="Studio" />
        <LoadingCard />
      </SynauraAppShell>
    );
  }

  if (!session?.user) {
    return (
      <SynauraAppShell>
        <SynauraTopBar />
        <SynauraInkPanel className="p-8 sm:p-10">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffcf9f]">Stats créateur</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Connecte-toi pour voir tes chiffres.</h1>
            <p className="mt-4 text-base font-semibold text-white/58">
              Les statistiques regroupent tes écoutes, tes posts, tes likes, tes commentaires et ton audience.
            </p>
            <Link href="/auth/signin?callbackUrl=/stats" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#fffaf2] px-6 text-sm font-black text-[#171313]">
              Connexion <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </SynauraInkPanel>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell>
      <SynauraTopBar primaryHref="/upload" primaryLabel="Publier" secondaryHref="/studio" secondaryLabel="Studio" />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-black/36">Tableau de bord</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Stats Synaura</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-black/48">
            Sons, posts, audience et engagement au même endroit.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRange(item.key)}
              className={`h-10 rounded-full px-4 text-xs font-black transition ${
                range === item.key ? 'bg-[#171313] text-white' : 'bg-[#fffaf2]/88 text-black/52 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <SynauraInkPanel className="mb-4 p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/60">
              <Sparkles className="h-3.5 w-3.5" /> Score créateur
            </div>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="text-7xl font-black tracking-tighter sm:text-8xl">{creatorScore}</div>
              <div className="pb-3">
                <p className="text-xl font-black">Performance générale</p>
                <p className="mt-1 max-w-xl text-sm font-semibold text-white/52">
                  Calculée avec tes écoutes, interactions, rétention et activité sociale.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[1.25rem] bg-white/10 p-4">
              <p className="text-2xl font-black">{fmt(overview?.followers)}</p>
              <p className="text-xs font-bold text-white/44">Abonnés</p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 p-4">
              <p className="text-2xl font-black">{fmt(countryCount)}</p>
              <p className="text-xs font-bold text-white/44">Pays détectés</p>
            </div>
          </div>
        </div>
      </SynauraInkPanel>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Headphones} label="Écoutes" value={fmt(overview?.plays)} hint={pct(overview?.playsVariation)} tone="dark" />
        <MetricCard icon={Heart} label="Likes sons" value={fmt(overview?.likes)} hint={pct(overview?.likesVariation)} tone="coral" />
        <MetricCard icon={PenLine} label="Posts publiés" value={fmt(posts?.postsInRange)} hint={`${fmt(posts?.totalPosts)} au total`} tone="violet" />
        <MetricCard icon={MessageCircle} label="Interactions posts" value={fmt((posts?.likes || 0) + (posts?.comments || 0))} hint={`${fmt(posts?.engagement)} / post`} tone="mint" />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto rounded-[1.4rem] border border-black/[0.08] bg-[#fffaf2]/84 p-2">
        {VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setView(item.key)}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
              view === item.key ? 'bg-[#171313] text-white' : 'text-black/48 hover:bg-black/[0.06]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto rounded-[1.4rem] border border-black/[0.08] bg-[#fffaf2]/70 p-2">
        {METRICS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetric(item.key)}
            className={`h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${
              metric === item.key ? 'bg-[#ff6f61] text-white' : 'text-black/48 hover:bg-black/[0.06]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <ComparisonPanel
          tracks={tracks}
          selectedTrack={selectedTrack}
          compareTrack={compareTrack}
          onSelectedTrack={(value) => {
            setSelectedTrack(value);
            if (compareTrack === value) setCompareTrack('');
          }}
          onCompareTrack={setCompareTrack}
        />
        <DataQualityNotice overview={overview} series={trackSeries} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
        <MiniArea trackSeries={trackSeries} postSeries={postSeries} view={view} metric={metric} compareSeries={compareSeries} />

        <SynauraPanel className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Meilleur contenu</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-[1.2rem] bg-black/[0.05] p-4">
              <div className="flex items-center gap-2 text-sm font-black">
                <Music2 className="h-4 w-4" /> Son
              </div>
              <p className="mt-2 line-clamp-2 text-lg font-black">{overview?.bestTrack?.title || sortedTracks[0]?.title || 'Aucun son'}</p>
              <p className="mt-1 text-sm font-bold text-black/42">{fmt(overview?.bestTrack?.plays || sortedTracks[0]?.plays)} écoutes</p>
            </div>
            <div className="rounded-[1.2rem] bg-black/[0.05] p-4">
              <div className="flex items-center gap-2 text-sm font-black">
                <FileText className="h-4 w-4" /> Post
              </div>
              <p className="mt-2 line-clamp-2 text-lg font-black">{posts?.bestPost?.trackTitle || posts?.bestPost?.content || 'Aucun post'}</p>
              <p className="mt-1 text-sm font-bold text-black/42">
                {fmt(posts?.bestPost?.likes)} likes · {fmt(posts?.bestPost?.comments)} commentaires
              </p>
            </div>
          </div>
        </SynauraPanel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <DailyBreakdown trackSeries={trackSeries} postSeries={postSeries} metric={metric} />

        <HeatmapPanel matrix={heatmap.length ? heatmap : Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FunnelPanel detail={trackDetail} selectedTrack={selectedTrack} />
        <AudienceBreakdown audience={audience} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SynauraPanel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Classement sons</p>
              <h3 className="mt-1 text-xl font-black">Titres qui performent</h3>
            </div>
            <Radio className="h-5 w-5 text-black/30" />
          </div>
          <div className="mt-5 space-y-2">
            {sortedTracks.length ? sortedTracks.map((track) => (
              <TrackRow key={track.id} track={track} maxPlays={maxTrackPlays} />
            )) : <p className="rounded-[1.2rem] bg-black/[0.04] p-4 text-sm font-semibold text-black/42">Aucun son publié pour le moment.</p>}
          </div>
        </SynauraPanel>

        <SynauraPanel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Classement posts</p>
              <h3 className="mt-1 text-xl font-black">Posts qui font réagir</h3>
            </div>
            <Share2 className="h-5 w-5 text-black/30" />
          </div>
          <div className="mt-5 space-y-2">
            {posts?.posts?.length ? posts.posts.slice(0, 8).map((post) => <PostRow key={post.id} post={post} />) : (
              <p className="rounded-[1.2rem] bg-black/[0.04] p-4 text-sm font-semibold text-black/42">Aucun post publié pour le moment.</p>
            )}
          </div>
        </SynauraPanel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <TypeBreakdown data={posts?.byType || {}} />

        <SynauraPanel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">IA Studio</p>
              <h3 className="mt-1 text-xl font-black">Meilleurs sons IA</h3>
            </div>
            <Wand2 className="h-5 w-5 text-black/30" />
          </div>
          <div className="mt-5 space-y-3">
            {topAiTracks.length ? topAiTracks.map((track) => (
              <div key={track.id} className="flex items-center justify-between gap-3 rounded-[1rem] bg-black/[0.04] p-3">
                <p className="truncate text-sm font-black">{track.title}</p>
                <span className="shrink-0 text-xs font-black text-black/42">{fmt(track.plays)} écoutes</span>
              </div>
            )) : <p className="text-sm font-semibold text-black/42">Aucun son IA mesuré.</p>}
          </div>
        </SynauraPanel>

        <SynauraPanel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/34">Actions</p>
              <h3 className="mt-1 text-xl font-black">Continuer</h3>
            </div>
            <TrendingUp className="h-5 w-5 text-black/30" />
          </div>
          <div className="mt-5 grid gap-2">
            <Link href="/studio" className="flex items-center justify-between rounded-[1rem] bg-[#171313] px-4 py-3 text-sm font-black text-white">
              Créer un son <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/posts" className="flex items-center justify-between rounded-[1rem] bg-black/[0.06] px-4 py-3 text-sm font-black text-black/58">
              Voir les posts <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/profile/me" className="flex items-center justify-between rounded-[1rem] bg-black/[0.06] px-4 py-3 text-sm font-black text-black/58">
              Ouvrir le profil <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </SynauraPanel>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.3rem] border border-black/[0.08] bg-[#fffaf2]/70 p-4">
          <CalendarDays className="h-5 w-5 text-black/34" />
          <p className="mt-3 text-lg font-black">{fmt(overview?.listenHours)} h</p>
          <p className="text-xs font-bold text-black/42">Temps d’écoute{overview?.listenHoursEstimated ? ' estimé' : ''}</p>
        </div>
        <div className="rounded-[1.3rem] border border-black/[0.08] bg-[#fffaf2]/70 p-4">
          <Eye className="h-5 w-5 text-black/34" />
          <p className="mt-3 text-lg font-black">{fmt(trackSeries.reduce((acc, point) => acc + (point.uniques || 0), 0))}</p>
          <p className="text-xs font-bold text-black/42">Auditeurs uniques</p>
        </div>
        <div className="rounded-[1.3rem] border border-black/[0.08] bg-[#fffaf2]/70 p-4">
          <BarChart3 className="h-5 w-5 text-black/34" />
          <p className="mt-3 text-lg font-black">{overview?.avgRetentionEstimated ? '—' : `${fmt(overview?.avgRetention)}%`}</p>
          <p className="text-xs font-bold text-black/42">{overview?.avgRetentionEstimated ? 'Donnée insuffisante' : 'Rétention moyenne'}</p>
        </div>
        <div className="rounded-[1.3rem] border border-black/[0.08] bg-[#fffaf2]/70 p-4">
          <Users className="h-5 w-5 text-black/34" />
          <p className="mt-3 text-lg font-black">{fmt(overview?.totalTracks)}</p>
          <p className="text-xs font-bold text-black/42">Sons publiés</p>
        </div>
      </div>
    </SynauraAppShell>
  );
}
