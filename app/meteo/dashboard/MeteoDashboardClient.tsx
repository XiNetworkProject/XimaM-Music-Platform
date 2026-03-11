'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Cloud,
  Upload,
  Image as ImageIcon,
  FileText,
  LogOut,
  Eye,
  Clock,
  RefreshCw,
  RotateCcw,
  Send,
  Calendar,
  BarChart3,
  X,
  Copy,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  Pin,
  Tag,
  AlertTriangle,
  Users,
  UserPlus,
  Settings,
  Bell,
  XCircle,
  Zap,
  TrendingUp,
  Shield,
  History,
  FileEdit,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface MeteoDashboardClientProps {
  user: { id: string; email: string; name?: string };
  role: string;
}

interface Bulletin {
  id: string;
  title?: string;
  content?: string;
  image_url?: string;
  image_public_id?: string;
  is_current?: boolean;
  status?: 'draft' | 'published' | 'scheduled';
  category?: string;
  tags?: string[];
  allow_comments?: boolean;
  pinned?: boolean;
  views_count?: number;
  scheduled_at?: string | null;
  created_at: string;
  updated_at: string;
}

type TabId = 'bulletins' | 'alertes' | 'analytics' | 'equipe' | 'parametres';

interface MeteoTemplate {
  id: string;
  label: string;
  category: string;
  tags: string[];
  title: string;
  content: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'dans le futur';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l\u2019instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ === 1) return 'hier';
  return `il y a ${diffJ} j`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

// ─── Templates ──────────────────────────────────────────────────────────────────

const METEO_TEMPLATES: MeteoTemplate[] = [
  {
    id: 'classic',
    label: 'Bulletin classique',
    category: 'prevision',
    tags: ['prevision', 'quotidien'],
    title: 'Bulletin météo du jour',
    content:
      "Lundi [DATE]\n\nUne journée marquée par une alternance de nuages, d'éclaircies et d'averses sur l'est et le sud-ouest tandis que le nord-ouest et le sud-est bénéficiera de belles éclaircies entre deux passages nuageux.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMardi [DATE]\n\nLe temps s'améliore nettement : retour d'un soleil généreux au nord comme au sud, malgré quelques brumes matinales dans les plaines.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nIndice de confiance : 3/5\n\nRésumé de la tendance\n\nDébut de semaine variable mais plutôt lumineux. Les températures restent de saison avec un temps globalement agréable.",
  },
  {
    id: 'vigilance',
    label: 'Bulletin vigilance',
    category: 'vigilance',
    tags: ['vigilance', 'alerte'],
    title: 'Vigilance météo en cours',
    content:
      "Lundi [DATE]\n\nUn épisode de mauvais temps est en cours sur la région avec des précipitations soutenues et des rafales de vent localement fortes. Des cumuls importants sont attendus, notamment sur les reliefs où des risques de crues sont possibles.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nMardi [DATE]\n\nLa perturbation continue de sévir avec des précipitations abondantes et des vents violents. Restez vigilants et évitez les déplacements non essentiels.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nIndice de confiance : 4/5\n\nRésumé de la tendance\n\nÉpisode de mauvais temps marqué. Risques de crues et d'inondations localisées. Respectez les consignes de sécurité.",
  },
  {
    id: 'weekend',
    label: 'Bulletin week-end',
    category: 'prevision',
    tags: ['weekend', 'prevision'],
    title: 'Tendance météo pour le week-end',
    content:
      "Samedi [DATE]\n\nUn week-end qui débute sous un ciel partagé avec des passages nuageux alternant avec de belles éclaircies. Les températures restent douces pour la saison. Conditions globalement agréables pour les activités en extérieur.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nDimanche [DATE]\n\nAmélioration progressive avec un temps plus sec et lumineux. Le soleil devient plus généreux, notamment en matinée. Idéal pour les sorties.\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nIndice de confiance : 3/5\n\nRésumé de la tendance\n\nWeek-end agréable avec un temps globalement favorable, surtout dimanche. Profitez-en !",
  },
  {
    id: 'storms',
    label: 'Alerte orages',
    category: 'vigilance',
    tags: ['orages', 'vigilance'],
    title: 'Alerte orages en cours',
    content:
      "[DATE]\n\nUn épisode orageux significatif touche actuellement plusieurs départements. Des cellules orageuses actives remontent du sud-ouest, accompagnées de fortes pluies (20 à 40 mm en peu de temps), de grêle localement et de rafales pouvant atteindre 80 à 100 km/h.\n\nLes zones les plus exposées sont [ZONES]. La vigilance reste de mise jusqu'en soirée.\n\nConseils :\n- Évitez les déplacements non essentiels\n- Mettez à l'abri les objets susceptibles d'être emportés par le vent\n- Ne vous abritez pas sous les arbres\n- Restez informés de l'évolution de la situation\n\nIndice de confiance : 4/5",
  },
  {
    id: 'cold',
    label: 'Vague de froid',
    category: 'vigilance',
    tags: ['froid', 'vigilance'],
    title: 'Vague de froid attendue',
    content:
      "[DATE]\n\nUne masse d'air polaire s'installe sur le pays pour les prochains jours. Les températures chuteront nettement, avec des minimales comprises entre -5°C et -10°C sur la moitié nord et des maximales ne dépassant pas 0 à 3°C.\n\nLe ressenti sera encore plus froid en raison d'un vent de nord-est soutenu soufflant à 30-50 km/h. Des chutes de neige sont possibles, y compris en plaine, à partir de [JOUR].\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nConseils :\n- Protégez vos canalisations contre le gel\n- Limitez les sorties pour les personnes fragiles\n- Pensez aux sans-abri : signalez au 115\n\nIndice de confiance : 4/5",
  },
  {
    id: 'heat',
    label: 'Canicule',
    category: 'vigilance',
    tags: ['canicule', 'vigilance'],
    title: 'Episode de canicule',
    content:
      "[DATE]\n\nUn dôme de chaleur s'installe sur le pays avec des températures exceptionnellement élevées. Les maximales atteindront 35 à 40°C sur la majeure partie du territoire, sans véritable rafraîchissement nocturne (minimales de 20 à 24°C).\n\nCet épisode devrait durer au moins [NOMBRE] jours. L'indice UV sera très élevé (8 à 10).\n\nNord : [MIN]°C / [MAX]°C – Sud : [MIN]°C / [MAX]°C\n\nConseils :\n- Hydratez-vous régulièrement, même sans sensation de soif\n- Évitez les efforts physiques aux heures les plus chaudes (12h-16h)\n- Maintenez votre logement au frais\n- Prenez des nouvelles de vos proches vulnérables\n\nIndice de confiance : 5/5",
  },
  {
    id: 'weekly',
    label: 'Bilan hebdo',
    category: 'info',
    tags: ['bilan', 'hebdo'],
    title: 'Bilan météo de la semaine',
    content:
      "Semaine du [DATE_DEBUT] au [DATE_FIN]\n\nFaits marquants :\n- [FAIT 1]\n- [FAIT 2]\n- [FAIT 3]\n\nTempératures relevées :\n- Maximale la plus haute : [TEMP]°C le [JOUR] à [LIEU]\n- Minimale la plus basse : [TEMP]°C le [JOUR] à [LIEU]\n- Moyenne nationale : [TEMP]°C (normale de saison : [TEMP]°C)\n\nPrécipitations :\n- Cumul le plus important : [CUMUL] mm à [LIEU]\n- Nombre de jours de pluie : [NB]/7\n\nTendance pour la semaine prochaine :\n[TENDANCE]\n\nIndice de confiance : 3/5",
  },
  {
    id: 'special',
    label: 'Bulletin spécial',
    category: 'special',
    tags: ['special'],
    title: 'Bulletin spécial',
    content:
      "[DATE]\n\nBulletin spécial Alertemps\n\n[CONTEXTE]\n\nSituation actuelle :\n[DESCRIPTION DETAILLEE]\n\nEvolution prévue :\n[EVOLUTION]\n\nZones concernées : [ZONES]\n\nConseils et recommandations :\n- [CONSEIL 1]\n- [CONSEIL 2]\n- [CONSEIL 3]\n\nCe bulletin sera mis à jour dès que de nouvelles informations seront disponibles.\n\nIndice de confiance : [X]/5",
  },
];

const CATEGORIES = [
  { value: 'prevision', label: 'Prévision' },
  { value: 'vigilance', label: 'Vigilance' },
  { value: 'info', label: 'Info' },
  { value: 'special', label: 'Spécial' },
] as const;

const ROLE_COLORS: Record<string, string> = {
  admin: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  moderator: 'border-indigo-400/20 bg-indigo-500/10 text-indigo-300',
  contributor: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
};

// ─── Alertes Tab ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  info: { label: 'Info', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/15' },
  warning: { label: 'Avertissement', color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/15' },
  danger: { label: 'Danger', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/15' },
  critical: { label: 'Critique', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/15' },
};

interface MeteoAlert {
  id: string;
  title: string;
  content?: string;
  severity: string;
  regions: string[];
  is_active: boolean;
  sent_at: string;
  expires_at?: string | null;
}

function AlertesTab() {
  const [alerts, setAlerts] = useState<MeteoAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [severity, setSeverity] = useState('info');
  const [regions, setRegions] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/meteo/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleSend = async () => {
    if (!title.trim()) { notify.error('Titre requis'); return; }
    setSending(true);
    try {
      const expiresAt = new Date(Date.now() + parseInt(expiresIn) * 3600000).toISOString();
      const res = await fetch('/api/meteo/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || undefined,
          severity,
          regions: regions.split(',').map(r => r.trim()).filter(Boolean),
          expiresAt,
        }),
      });
      if (!res.ok) throw new Error();
      notify.success('Alerte envoyee');
      setTitle(''); setContent(''); setSeverity('info'); setRegions('');
      fetchAlerts();
    } catch { notify.error('Erreur envoi alerte'); }
    finally { setSending(false); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/meteo/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !active }),
      });
      fetchAlerts();
    } catch { notify.error('Erreur modification'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create Alert */}
      <div className="bg-white/[0.04] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-violet-400" />
          <h3 className="text-base font-semibold text-white/80">Nouvelle alerte</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Severite</label>
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:border-violet-500/40">
              {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Expire dans</label>
            <select value={expiresIn} onChange={e => setExpiresIn(e.target.value)} className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:border-violet-500/40">
              <option value="1">1 heure</option>
              <option value="6">6 heures</option>
              <option value="12">12 heures</option>
              <option value="24">24 heures</option>
              <option value="48">48 heures</option>
              <option value="72">72 heures</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Titre</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'alerte" className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Contenu (optionnel)</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Details de l'alerte..." rows={4} className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2.5 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Regions (separees par virgules)</label>
          <input type="text" value={regions} onChange={e => setRegions(e.target.value)} placeholder="Ile-de-France, PACA, Occitanie" className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
        </div>

        <button onClick={handleSend} disabled={sending || !title.trim()} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white text-[15px] font-semibold py-3 disabled:opacity-50 transition-all">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer l&apos;alerte
        </button>
      </div>

      {/* Alert History */}
      <div className="bg-white/[0.04] rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4">Historique des alertes</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">Aucune alerte envoyee</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {alerts.map(a => {
              const sev = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
              const expired = a.expires_at && new Date(a.expires_at) < new Date();
              return (
                <div key={a.id} className={`rounded-xl border ${sev.border} ${sev.bg} p-3 ${!a.is_active || expired ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-semibold ${sev.color}`}>{sev.label}</span>
                        {!a.is_active && <span className="text-[10px] text-white/30">Desactivee</span>}
                        {expired && <span className="text-[10px] text-white/30">Expiree</span>}
                      </div>
                      <p className="text-sm font-medium text-white/90 truncate">{a.title}</p>
                      {a.content && <p className="text-xs text-white/50 mt-1 line-clamp-2">{a.content}</p>}
                      <p className="text-[10px] text-white/30 mt-1.5">{formatDateTime(a.sent_at)}</p>
                    </div>
                    {a.is_active && !expired && (
                      <button onClick={() => toggleActive(a.id, a.is_active)} className="shrink-0 text-xs text-white/40 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {a.regions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.regions.map((r, i) => <span key={i} className="text-[10px] bg-white/[0.06] text-white/50 px-1.5 py-0.5 rounded">{r}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analytics Tab ──────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/meteo/stats?days=${period}`);
        if (res.ok) setStats(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, [period]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  const totalViews = stats?.totalViews || 0;
  const viewsPerDay = stats?.viewsPerDay || [];
  const bySource = stats?.bySource || [];
  const maxDayViews = Math.max(...viewsPerDay.map((d: any) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setPeriod(d)} className={`px-4 py-1.5 rounded-xl text-[13px] font-medium transition-all ${period === d ? 'bg-violet-500 text-white shadow-lg' : 'bg-white/[0.04] text-white/40 hover:text-white/60'}`}>
            {d} jours
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vues totales', value: totalViews, icon: Eye, color: 'text-violet-400' },
          { label: 'Moy. / jour', value: viewsPerDay.length > 0 ? Math.round(totalViews / viewsPerDay.length) : 0, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Sources', value: bySource.length, icon: BarChart3, color: 'text-purple-400' },
          { label: 'Meilleur jour', value: Math.max(...viewsPerDay.map((d: any) => d.count), 0), icon: Zap, color: 'text-amber-400' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white/[0.04] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-white/40">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold text-white/90">{kpi.value.toLocaleString('fr-FR')}</p>
          </div>
        ))}
      </div>

      {/* Views chart (bar chart with CSS) */}
      <div className="bg-white/[0.04] rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4">Vues par jour</h3>
        {viewsPerDay.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">Pas de donnees</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {viewsPerDay.map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-white/40">{d.count}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-500/60 to-violet-400/40 transition-all hover:from-violet-500/80 hover:to-violet-400/60" style={{ height: `${(d.count / maxDayViews) * 100}%`, minHeight: d.count > 0 ? '4px' : '1px' }} />
                <span className="text-[8px] text-white/30 truncate w-full text-center">{new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sources breakdown */}
      <div className="bg-white/[0.04] rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4">Repartition par source</h3>
        {bySource.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">Pas de donnees</p>
        ) : (
          <div className="space-y-3">
            {bySource.map((s: any, i: number) => {
              const pct = totalViews > 0 ? Math.round((s.count / totalViews) * 100) : 0;
              const colors = ['bg-violet-400', 'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400'];
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">{s.source || 'direct'}</span>
                    <span className="text-white/40">{s.count} ({pct}%)</span>
                  </div>
                    <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Equipe Tab ─────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  display_name?: string;
  status: string;
  invited_at: string;
  profile?: { name?: string; avatar?: string; email?: string };
}

function EquipeTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('contributor');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/meteo/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { notify.error('Email requis'); return; }
    setInviting(true);
    try {
      const res = await fetch('/api/meteo/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      notify.success('Membre ajoute');
      setInviteEmail('');
      fetchMembers();
    } catch (e: any) { notify.error(e.message || 'Erreur invitation'); }
    finally { setInviting(false); }
  };

  const changeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch('/api/meteo/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      notify.success('Role modifie');
      fetchMembers();
    } catch (e: any) { notify.error(e.message || 'Erreur'); }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Retirer ce membre ?')) return;
    try {
      const res = await fetch('/api/meteo/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      notify.success('Membre retire');
      fetchMembers();
    } catch (e: any) { notify.error(e.message || 'Erreur'); }
  };

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="bg-white/[0.04] rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-violet-400" />
          Inviter un membre
        </h3>
        <div className="flex gap-3 flex-wrap">
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@synaura.com" className="flex-1 min-w-[200px] bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:border-violet-500/40">
            <option value="contributor">Contributeur</option>
            <option value="moderator">Moderateur</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={handleInvite} disabled={inviting} className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white text-[13px] font-semibold px-5 py-2.5 disabled:opacity-50 transition-all">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Inviter
          </button>
        </div>
        <p className="text-[11px] text-white/30 mt-2">L&apos;utilisateur doit avoir un compte Synaura</p>
      </div>

      {/* Members list */}
      <div className="bg-white/[0.04] rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white/80 mb-4">Membres de l&apos;equipe ({members.length})</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
        ) : members.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">Aucun membre</p>
        ) : (
          <div className="space-y-2">
            {members.map(m => {
              const roleConf = ROLE_COLORS[m.role] || ROLE_COLORS.contributor;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] p-3">
                  {m.profile?.avatar ? (
                    <img src={m.profile.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 text-sm font-bold">
                      {(m.display_name || m.profile?.name || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{m.display_name || m.profile?.name || 'Membre'}</p>
                    <p className="text-[11px] text-white/40 truncate">{m.profile?.email}</p>
                  </div>
                  <span className={`text-[11px] font-medium capitalize px-2.5 py-0.5 rounded-full border ${roleConf}`}>{m.role}</span>
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)} className="bg-[#140e24] border border-white/[0.08] rounded-lg text-white/60 text-[11px] px-2 py-1 focus:outline-none">
                    <option value="contributor">Contributeur</option>
                    <option value="moderator">Moderateur</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => removeMember(m.id)} className="text-white/30 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Parametres Tab ─────────────────────────────────────────────────────────────

function ParametresTab() {
  const [settings, setSettings] = useState<{ notify_new_bulletin: boolean; daily_email_summary: boolean }>({
    notify_new_bulletin: false,
    daily_email_summary: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/meteo/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSettings(data.settings);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const toggleSetting = async (key: 'notify_new_bulletin' | 'daily_email_summary') => {
    const newValue = !settings[key];
    setSaving(key);
    setSettings(prev => ({ ...prev, [key]: newValue }));
    try {
      const res = await fetch('/api/meteo/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        notify.error(data.error || 'Erreur');
        setSettings(prev => ({ ...prev, [key]: !newValue }));
      } else {
        notify.success('Parametre mis a jour');
      }
    } catch {
      notify.error('Erreur reseau');
      setSettings(prev => ({ ...prev, [key]: !newValue }));
    } finally { setSaving(null); }
  };

  return (
    <div className="bg-white/[0.04] rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white/80 mb-4 flex items-center gap-2">
        <Settings className="w-4 h-4 text-violet-400" />
        Parametres
      </h3>
      <div className="space-y-6">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <h4 className="text-sm font-semibold text-white/60 mb-3">Notifications automatiques</h4>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex-1 min-w-0 mr-4">
                  <span className="text-sm text-white/70 block">Notifier les utilisateurs lors d&apos;un nouveau bulletin</span>
                  <span className="text-xs text-white/30 block mt-0.5">Envoie une notification push aux utilisateurs Synaura</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('notify_new_bulletin')}
                  disabled={saving === 'notify_new_bulletin'}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.notify_new_bulletin ? 'bg-violet-500' : 'bg-white/[0.1]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${settings.notify_new_bulletin ? 'translate-x-5' : ''} ${saving === 'notify_new_bulletin' ? 'opacity-60' : ''}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex-1 min-w-0 mr-4">
                  <span className="text-sm text-white/70 block">Envoyer un resume quotidien par email</span>
                  <span className="text-xs text-white/30 block mt-0.5">Resume des bulletins et stats du jour envoye a l&apos;equipe</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('daily_email_summary')}
                  disabled={saving === 'daily_email_summary'}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.daily_email_summary ? 'bg-violet-500' : 'bg-white/[0.1]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${settings.daily_email_summary ? 'translate-x-5' : ''} ${saving === 'daily_email_summary' ? 'opacity-60' : ''}`} />
                </button>
              </label>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <h4 className="text-sm font-semibold text-white/60 mb-3">Informations</h4>
          <div className="text-sm text-white/50 space-y-1">
            <p>Version : Alertemps V3</p>
            <p>Integration : Synaura</p>
            <p>Source donnees : Open-Meteo, RainViewer</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── V3 Features ────────────────────────────────────────────────────────────────

const V3_FEATURES = [
  { id: 'equipe', title: 'Gestion d\'equipe', icon: Users, color: 'bg-violet-500/10 border-violet-500/15', description: 'Gerez votre equipe editoriale.', bullets: ['Inviter des membres par email', 'Roles : admin, moderateur, contributeur', 'Suivi d\'activite par membre'] },
  { id: 'alertes', title: 'Alertes push', icon: Bell, color: 'bg-amber-500/10 border-amber-500/15', description: 'Alertez vos utilisateurs en temps reel.', bullets: ['Severites : info, warning, danger, critique', 'Regions ciblees', 'Expiration automatique programmable'] },
  { id: 'commentaires', title: 'Commentaires & reactions', icon: MessageSquare, color: 'bg-indigo-500/10 border-indigo-500/15', description: 'Engagez la communaute sur vos bulletins.', bullets: ['Commentaires avec reponses imbriquees', 'Reactions : like et utile', 'Moderation integree pour l\'equipe'] },
  { id: 'categories', title: 'Categories & tags', icon: Tag, color: 'bg-emerald-500/10 border-emerald-500/15', description: 'Organisez vos bulletins.', bullets: ['4 categories : Prevision, Vigilance, Info, Special', 'Tags libres pour la recherche', 'Epinglage en haut de page'] },
  { id: 'analytics', title: 'Analytics avances', icon: BarChart3, color: 'bg-pink-500/10 border-pink-500/15', description: 'Comprenez votre audience.', bullets: ['Vues par jour sur 7/30/90 jours', 'Repartition par source', 'KPIs en temps reel'] },
  { id: 'templates', title: '8 modeles meteo', icon: FileText, color: 'bg-blue-500/10 border-blue-500/15', description: 'Redigez plus vite.', bullets: ['Classique, Vigilance, Week-end', 'Alerte orages, Vague de froid, Canicule', 'Bilan hebdo, Bulletin special'] },
  { id: 'communaute', title: 'Page publique enrichie', icon: Sparkles, color: 'bg-violet-500/10 border-violet-500/15', description: 'Une experience meteo complete.', bullets: ['Page de detail par bulletin', 'Partage et reactions publics', 'Historique accessible a tous'] },
  { id: 'programmation', title: 'Programmation & brouillons', icon: Calendar, color: 'bg-amber-500/10 border-amber-500/15', description: 'Automatisez vos publications.', bullets: ['Programmation date/heure', 'Brouillons editables', 'Publication automatique cote serveur'] },
];

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function MeteoDashboardClient({ user, role }: MeteoDashboardClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('bulletins');

  // V3 Modal
  const [showV3Modal, setShowV3Modal] = useState(false);
  const [v3FeatureIndex, setV3FeatureIndex] = useState(0);
  const [showV3Banner, setShowV3Banner] = useState(true);

  // Bulletin data
  const [currentBulletin, setCurrentBulletin] = useState<Bulletin | null>(null);
  const [publishedHistory, setPublishedHistory] = useState<Bulletin[]>([]);
  const [drafts, setDrafts] = useState<Bulletin[]>([]);
  const [scheduledBulletins, setScheduledBulletins] = useState<Bulletin[]>([]);

  // Loading states
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('prevision');
  const [tagsInput, setTagsInput] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duplicatedImageUrl, setDuplicatedImageUrl] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Schedule state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const tags = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput],
  );

  // ── Data Fetching ───────────────────────────────────────────────────────────

  const fetchCurrentBulletin = useCallback(async () => {
    try {
      setLoadingCurrent(true);
      const res = await fetch('/api/meteo/bulletin', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.bulletin) {
        setCurrentBulletin(data.bulletin);
      } else {
        setCurrentBulletin(null);
      }
    } catch {
      setCurrentBulletin(null);
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const [pubRes, draftRes, schedRes] = await Promise.all([
        fetch('/api/meteo/bulletins?status=published', { cache: 'no-store' }),
        fetch('/api/meteo/bulletins?status=draft', { cache: 'no-store' }),
        fetch('/api/meteo/bulletins?status=scheduled', { cache: 'no-store' }),
      ]);

      const [pubJson, draftJson, schedJson] = await Promise.all([
        pubRes.json(),
        draftRes.json(),
        schedRes.json(),
      ]);

      setPublishedHistory(pubRes.ok && Array.isArray(pubJson.bulletins) ? pubJson.bulletins : []);
      setDrafts(draftRes.ok && Array.isArray(draftJson.bulletins) ? draftJson.bulletins : []);
      setScheduledBulletins(schedRes.ok && Array.isArray(schedJson.bulletins) ? schedJson.bulletins : []);
    } catch {
      setPublishedHistory([]);
      setDrafts([]);
      setScheduledBulletins([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentBulletin();
    fetchHistory();

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/meteo/bulletin/publish-scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok && data.publishedCount > 0) {
          fetchHistory();
          fetchCurrentBulletin();
        }
      } catch {
        // silent
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchCurrentBulletin, fetchHistory]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ── Form Handlers ─────────────────────────────────────────────────────────

  const handleResetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setCategory('prevision');
    setTagsInput('');
    setAllowComments(true);
    setPinned(false);
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDuplicatedImageUrl(null);
    setScheduledDate('');
    setScheduledTime('');
    setEditingDraftId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file.name)) {
      notify.error('Format image invalide (PNG, JPG, WebP acceptés)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDuplicatedImageUrl(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      notify.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDuplicatedImageUrl(null);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = METEO_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setTitle(tpl.title);
    setContent(tpl.content);
    setCategory(tpl.category);
    setTagsInput(tpl.tags.join(', '));
    notify.info(`Modèle "${tpl.label}" appliqué`);
  };

  // ── CRUD Actions ──────────────────────────────────────────────────────────

  const handleSubmit = async (mode: 'publish' | 'draft' | 'schedule') => {
    if (loading) return;

    const errors: string[] = [];
    const hasImage = selectedFile || duplicatedImageUrl || editingDraftId;
    if (!editingDraftId && !hasImage) errors.push("Aucune image sélectionnée.");
    if (!content.trim()) errors.push("La description est vide.");

    if (mode === 'schedule' && (!scheduledDate || !scheduledTime)) {
      errors.push('Date et heure de programmation requises.');
    }

    if (errors.length > 0) {
      errors.forEach((msg) => notify.error(msg));
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', category);
      formData.append('tags', JSON.stringify(tags));
      formData.append('allow_comments', String(allowComments));
      formData.append('pinned', String(pinned));
      formData.append('mode', mode);

      if (selectedFile) {
        formData.append('image', selectedFile);
      } else if (duplicatedImageUrl) {
        formData.append('image_url', duplicatedImageUrl);
      }

      if (mode === 'schedule') {
        const dt = new Date(`${scheduledDate}T${scheduledTime}`);
        formData.append('scheduledAt', dt.toISOString());
      }

      const url = editingDraftId ? `/api/meteo/bulletin/${editingDraftId}` : '/api/meteo/bulletin';
      const method = editingDraftId ? 'PATCH' : 'POST';

      const res = await fetch(url, { method, body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erreur lors de la soumission');

      const labels = { publish: 'publié', draft: 'sauvegardé en brouillon', schedule: 'programmé' };
      notify.success(data.message || `Bulletin ${labels[mode]} avec succès`);

      handleResetForm();
      if (mode === 'publish' && data.bulletin) setCurrentBulletin(data.bulletin);
      await fetchHistory();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentBulletin();
    setRefreshing(false);
    notify.success('Bulletin actualisé');
  };

  const handleRestore = async (id: string) => {
    if (restoringId) return;
    setRestoringId(id);
    try {
      const res = await fetch('/api/meteo/bulletin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (data.bulletin) setCurrentBulletin(data.bulletin);
      await fetchHistory();
      notify.success('Bulletin restauré');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/meteo/bulletin/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Impossible de charger le bulletin');

      setTitle(data.title || '');
      setContent(data.content || '');
      setCategory(data.category || 'prevision');
      setTagsInput(Array.isArray(data.tags) ? data.tags.join(', ') : '');
      setDuplicatedImageUrl(data.image_url || null);
      setSelectedFile(null);
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setEditingDraftId(null);

      notify.success('Bulletin dupliqué dans le formulaire');
      setTimeout(() => {
        document.getElementById('bulletin-form')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Erreur de duplication');
    }
  };

  const handleEditDraft = (b: Bulletin) => {
    setEditingDraftId(b.id);
    setTitle(b.title || '');
    setContent(b.content || '');
    setCategory(b.category || 'prevision');
    setTagsInput(Array.isArray(b.tags) ? b.tags.join(', ') : '');
    setAllowComments(b.allow_comments ?? true);
    setPinned(b.pinned ?? false);
    if (b.image_url) setPreviewUrl(b.image_url);
    setTimeout(() => {
      document.getElementById('bulletin-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePublishDraft = async (id: string) => {
    if (publishingDraftId) return;
    setPublishingDraftId(id);
    try {
      const res = await fetch('/api/meteo/bulletin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'published' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      if (data.bulletin) setCurrentBulletin(data.bulletin);
      await fetchHistory();
      notify.success('Brouillon publié');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Erreur de publication');
    } finally {
      setPublishingDraftId(null);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      const res = await fetch(`/api/meteo/bulletin/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      await fetchHistory();
      notify.success('Brouillon supprimé');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/meteo/login');
  };

  // ── Preview ───────────────────────────────────────────────────────────────

  const livePreview = useMemo(() => {
    const image = previewUrl || duplicatedImageUrl || currentBulletin?.image_url || null;
    return {
      image,
      title: title || 'Nouveau bulletin météo',
      content: content || 'Votre description météo apparaîtra ici.',
      category,
      tags,
    };
  }, [previewUrl, duplicatedImageUrl, currentBulletin, title, content, category, tags]);

  const lineCount = useMemo(() => content.split('\n').length, [content]);

  // ── Tab definitions ───────────────────────────────────────────────────────

  const tabDefs: { id: TabId; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: 'bulletins', label: 'Bulletins', icon: FileText },
    { id: 'alertes', label: 'Alertes', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'equipe', label: 'Équipe', icon: Users, adminOnly: true },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ];

  const visibleTabs = tabDefs.filter((t) => !t.adminOnly || role === 'admin');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full text-white bg-[#0f0a1a]">
      {/* ─── Background ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a1a] via-[#110c20] to-[#0d0816]" />
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-violet-600/[0.06] rounded-full blur-[200px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/[0.04] rounded-full blur-[200px]" />
      </div>

      {/* ─── V3 Banner ─────────────────────────────────────────────── */}
      {showV3Banner && (
        <div className="relative z-10 bg-violet-500/[0.06] border-b border-white/[0.06]">
          <div className="px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <p className="text-[13px] text-white/70">
                <span className="font-semibold text-white/90">Alertemps V3</span>
                {' '}&mdash; Equipe, alertes push, commentaires, analytics et plus
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowV3Modal(true)} className="text-[13px] font-medium text-violet-400 hover:text-violet-300 transition-colors">
                Decouvrir
              </button>
              <button onClick={() => setShowV3Banner(false)} className="p-1 rounded-full hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── V3 Features Modal ─────────────────────────────────────── */}
      {showV3Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowV3Modal(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg mx-4 rounded-3xl bg-[#1a1230]/98 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="relative px-7 pt-7 pb-5">
              <button onClick={() => setShowV3Modal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 mb-4">
                <img src="/images/alertemps-logo.png" alt="Alertemps" className="h-10 w-auto" />
                <div>
                  <h2 className="text-xl font-bold">V3</h2>
                  <p className="text-sm text-white/40">Nouveau tableau de bord</p>
                </div>
              </div>
              <p className="text-[15px] text-white/60 leading-relaxed">
                Gestion d&apos;equipe, alertes push, commentaires communautaires, analytics avances et bien plus.
              </p>
            </div>

            {/* Feature carousel */}
            <div className="px-7 pb-5">
              {V3_FEATURES.length > 0 && (() => {
                const feature = V3_FEATURES[v3FeatureIndex] || V3_FEATURES[0];
                const FeatureIcon = feature.icon;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-white/40">{v3FeatureIndex + 1} / {V3_FEATURES.length}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setV3FeatureIndex(Math.max(0, v3FeatureIndex - 1))} disabled={v3FeatureIndex === 0} className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-30 transition-colors">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setV3FeatureIndex(Math.min(V3_FEATURES.length - 1, v3FeatureIndex + 1))} disabled={v3FeatureIndex === V3_FEATURES.length - 1} className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] disabled:opacity-30 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.04] p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${feature.color}`}>
                          <FeatureIcon className="w-5 h-5 text-white/80" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold">{feature.title}</h3>
                          <p className="text-sm text-white/50">{feature.description}</p>
                        </div>
                      </div>
                      <ul className="space-y-2.5">
                        {feature.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[15px] text-white/60">
                            <ArrowRight className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-5">
                      {V3_FEATURES.map((_, idx) => (
                        <button key={idx} onClick={() => setV3FeatureIndex(idx)} className={`h-2 rounded-full transition-all ${idx === v3FeatureIndex ? 'bg-violet-400 w-5' : 'w-2 bg-white/20 hover:bg-white/30'}`} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal footer */}
            <div className="px-7 pb-7">
              <button onClick={() => setShowV3Modal(false)} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white text-[15px] font-semibold py-3 active:scale-[0.98] transition-all">
                C&apos;est parti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#0f0a1a]/80 backdrop-blur-xl">
        <div className="w-full px-5 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/images/alertemps-logo.png" alt="Alertemps" className="h-8 w-auto" />
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs text-white/35">Tableau de bord</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowV3Modal(true)} className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-white/50 hover:text-white/70 px-3 py-2 text-[13px] transition-all">
              <Sparkles className="w-4 h-4" /> Nouveautes
            </button>
            <div className="hidden md:flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/[0.04]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-500/30 flex items-center justify-center text-xs font-semibold text-white/80">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <span className="text-[13px] text-white/60 truncate max-w-[120px]">{user.name || user.email}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.contributor}`}>
                {role}
              </span>
            </div>
            <button onClick={handleLogout} className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 text-white/40 hover:text-red-400 px-3 py-2 text-[13px] transition-all">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Tab Bar ───────────────────────────────────────────────────── */}
      <nav className="relative z-10 px-5 lg:px-8 py-3">
        <div className="inline-flex gap-1 p-1 rounded-2xl bg-white/[0.04] overflow-x-auto scrollbar-none">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-xl transition-all whitespace-nowrap ${
                  active
                    ? 'bg-violet-500 text-white shadow-lg'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-white/30'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── Content ───────────────────────────────────────────────────── */}
      <main className="relative z-10 w-full px-5 lg:px-8 py-6">
        {activeTab === 'bulletins' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left Column ──────────────────────────────────────────── */}
            <div className="space-y-5">
              {/* Current Bulletin */}
              <section className="rounded-2xl bg-white/[0.05] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white/80 flex items-center gap-2"><Cloud className="w-3.5 h-3.5 text-violet-400" /> Bulletin actuel</h2>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] text-white/50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingCurrent ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                  </div>
                ) : currentBulletin ? (
                  <div className="space-y-3">
                    {currentBulletin.image_url && (
                      <img
                        src={currentBulletin.image_url}
                        alt="Bulletin"
                        className="w-full h-32 object-cover rounded-xl"
                      />
                    )}
                    <h3 className="text-sm font-medium text-white/90">
                      {currentBulletin.title || 'Sans titre'}
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      {truncate(currentBulletin.content || '', 150)}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {formatDateTime(currentBulletin.updated_at)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-white/40 text-center py-6">Aucun bulletin actuel</p>
                )}
              </section>

              {/* Quick Stats */}
              {currentBulletin && (
                <section className="bg-white/[0.04] rounded-2xl p-5">
                  <h2 className="text-base font-semibold text-white/80 mb-3">Stats rapides</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-400/20">
                      <Eye className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white/90">
                        {(currentBulletin.views_count ?? 0).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-white/40">vues totales</p>
                    </div>
                  </div>
                </section>
              )}

              {/* History */}
              <section className="bg-white/[0.04] rounded-2xl p-5">
                <h2 className="text-base font-semibold text-white/80 mb-3">Historique</h2>
                {loadingHistory ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                  </div>
                ) : publishedHistory.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-4">Aucun bulletin publié</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {publishedHistory.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white/80 truncate">
                            {b.title || 'Sans titre'}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {relativeTime(b.updated_at)}
                            {b.views_count != null && ` · ${b.views_count} vues`}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(b.id)}
                            disabled={restoringId === b.id}
                            className="p-1 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
                            title="Restaurer"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${restoringId === b.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(b.id)}
                            className="p-1 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
                            title="Dupliquer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Drafts */}
              <section className="bg-white/[0.04] rounded-2xl p-5">
                <h2 className="text-base font-semibold text-white/80 mb-3">Brouillons</h2>
                {drafts.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-4">Aucun brouillon</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {drafts.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white/80 truncate">
                            {b.title || 'Sans titre'}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {relativeTime(b.updated_at)}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEditDraft(b)}
                            className="p-1 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-violet-400 transition-colors"
                            title="Modifier"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePublishDraft(b.id)}
                            disabled={publishingDraftId === b.id}
                            className="p-1 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-emerald-400 transition-colors"
                            title="Publier"
                          >
                            <Send className={`w-3.5 h-3.5 ${publishingDraftId === b.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(b.id)}
                            className="p-1 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-red-400 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Scheduled */}
              <section className="bg-white/[0.04] rounded-2xl p-5">
                <h2 className="text-base font-semibold text-white/80 mb-3">Programmes</h2>
                {scheduledBulletins.length === 0 ? (
                  <p className="text-xs text-white/40 text-center py-4">Aucun bulletin programmé</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {scheduledBulletins.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white/80 truncate">
                            {b.title || 'Sans titre'}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-amber-400/70" />
                            <p className="text-[11px] text-amber-400/70">
                              {b.scheduled_at ? formatDateTime(b.scheduled_at) : '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Center Column — Editor ───────────────────────────────── */}
            <div id="bulletin-form" className="space-y-5">
              <section className="bg-white/[0.04] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-white/80">
                    {editingDraftId ? 'Modifier brouillon' : 'Nouveau bulletin'}
                  </h2>
                  {editingDraftId && (
                    <button
                      onClick={handleResetForm}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Image Upload */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center w-full h-40 rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-violet-500/30 bg-white/[0.03] cursor-pointer transition-colors overflow-hidden"
                  >
                    {previewUrl || duplicatedImageUrl ? (
                      <>
                        <img
                          src={previewUrl || duplicatedImageUrl!}
                          alt="Aperçu"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Upload className="w-6 h-6 text-white/80" />
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-white/20 mb-2" />
                        <p className="text-xs text-white/40">
                          Glissez une image ou <span className="text-violet-400">parcourir</span>
                        </p>
                        <p className="text-[11px] text-white/30 mt-1">PNG, JPG, WebP · 10 Mo max</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Catégorie</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full appearance-none bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:border-violet-500/40"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value} className="bg-[#140e24]">
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Titre</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Bulletin météo du jour"
                      className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-white/40">Contenu</label>
                      <span className="text-[11px] text-white/30">{lineCount} ligne{lineCount > 1 ? 's' : ''}</span>
                    </div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Rédigez votre bulletin météo…"
                      rows={12}
                      className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2.5 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Tags (séparés par des virgules)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="prévision, semaine, soleil"
                      className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
                    />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[12px] text-violet-300"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/60">Autoriser les commentaires</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllowComments(!allowComments)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${allowComments ? 'bg-violet-500' : 'bg-white/[0.1]'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${allowComments ? 'translate-x-5' : ''}`}
                        />
                      </button>
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Pin className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/60">Épingler en haut</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPinned(!pinned)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${pinned ? 'bg-violet-500' : 'bg-white/[0.1]'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${pinned ? 'translate-x-5' : ''}`}
                        />
                      </button>
                    </label>
                  </div>

                  {/* Template Selector */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Modèle rapide</label>
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          if (e.target.value) applyTemplate(e.target.value);
                          e.target.value = '';
                        }}
                        defaultValue=""
                        className="w-full appearance-none bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 pr-8 focus:outline-none focus:border-violet-500/40"
                      >
                        <option value="" className="bg-[#140e24]">
                          Choisir un modèle…
                        </option>
                        {METEO_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id} className="bg-[#140e24]">
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    </div>
                  </div>

                  {/* Schedule Pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Date (prog.)</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:border-violet-500/40 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-1.5">Heure (prog.)</label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:border-violet-500/40 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleSubmit('publish')}
                      disabled={loading}
                      className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-white rounded-2xl px-5 py-3 text-[15px] font-semibold transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Publier
                    </button>
                    <button
                      onClick={() => handleSubmit('draft')}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 rounded-2xl px-5 py-3 text-[13px] font-medium transition-all disabled:opacity-50"
                    >
                      Brouillon
                    </button>
                    <button
                      onClick={() => handleSubmit('schedule')}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 rounded-2xl px-5 py-3 text-[13px] font-medium transition-all disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4" />
                      Programmer
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right Column — Live Preview ──────────────────────────── */}
            <div className="space-y-5">
              <section className="bg-white/[0.04] rounded-2xl p-6 sticky top-6">
                <div className="flex items-center gap-2 mb-5">
                  <Eye className="w-4 h-4 text-violet-400" />
                  <h2 className="text-base font-semibold text-white/80">Apercu</h2>
                </div>

                <div className="space-y-4">
                  {livePreview.image && (
                    <img
                      src={livePreview.image}
                      alt="Aperçu bulletin"
                      className="w-full h-40 object-cover rounded-xl"
                    />
                  )}

                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                      livePreview.category === 'vigilance'
                        ? 'border-amber-500/15 bg-amber-500/10 text-amber-300'
                        : livePreview.category === 'special'
                          ? 'border-red-500/15 bg-red-500/10 text-red-300'
                          : livePreview.category === 'info'
                            ? 'border-blue-500/15 bg-blue-500/10 text-blue-300'
                            : 'border-emerald-500/15 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {CATEGORIES.find((c) => c.value === livePreview.category)?.label || livePreview.category}
                  </span>

                  <h3 className="text-base font-semibold text-white/90 leading-snug">
                    {livePreview.title}
                  </h3>

                  <div className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-1">
                    {livePreview.content}
                  </div>

                  {livePreview.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                      {livePreview.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[12px] text-white/40"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'alertes' && <AlertesTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'equipe' && <EquipeTab />}
        {activeTab === 'parametres' && <ParametresTab />}
      </main>
    </div>
  );
}
