'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Megaphone,
  BarChart3,
  Send,
  Users,
  Crown,
  Music,
  Loader2,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';

type Tab = 'broadcast' | 'history' | 'stats';

const TARGETS = [
  { value: 'all', label: 'Tous les utilisateurs', icon: Users },
  { value: 'premium', label: 'Abonnes Premium', icon: Crown },
  { value: 'artists', label: 'Artistes uniquement', icon: Music },
];

const CATEGORIES = [
  { value: 'announcement', label: 'Annonce' },
  { value: 'update', label: 'Mise a jour' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'event', label: 'Evenement' },
  { value: 'maintenance', label: 'Maintenance' },
];

interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  category: string;
  target: string;
  sent_count: number;
  created_at: string;
}

interface Stats {
  totalNotifications: number;
  unreadNotifications: number;
  pushSubscriptions: number;
  totalBroadcasts: number;
  last7daysBreakdown: Record<string, number>;
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>('broadcast');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [category, setCategory] = useState('announcement');
  const [sending, setSending] = useState(false);

  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadBroadcasts = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?tab=broadcasts');
      const data = await res.json();
      setBroadcasts(data.broadcasts || []);
    } catch {} finally { setHistoryLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?tab=stats');
      const data = await res.json();
      setStats(data.stats || null);
    } catch {} finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'history') loadBroadcasts();
    if (tab === 'stats') loadStats();
  }, [tab, loadBroadcasts, loadStats]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      notify.warning('Titre et message requis');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), target, category }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success('Notification envoyee', `${data.sent} utilisateurs`);
        setTitle('');
        setMessage('');
      } else {
        notify.error('Erreur', data.error);
      }
    } catch (e: any) {
      notify.error('Erreur envoi', e.message);
    } finally {
      setSending(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    new_follower: 'Abonnements',
    new_like: 'Likes',
    like_milestone: 'Paliers likes',
    new_comment: 'Commentaires',
    new_message: 'Messages',
    new_track_followed: 'Nouvelles musiques',
    view_milestone: 'Paliers vues',
    boost_reminder: 'Rappels boost',
    admin_broadcast: 'Broadcasts',
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-400" />
            Notifications
          </div>
          <div className="text-sm text-white/30 mt-1">Envoyez et gerez les notifications de la plateforme.</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {([
          { key: 'broadcast', label: 'Envoyer', icon: Megaphone },
          { key: 'history', label: 'Historique', icon: Clock },
          { key: 'stats', label: 'Statistiques', icon: BarChart3 },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.key
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Broadcast ─── */}
      {tab === 'broadcast' && (
        <div className="space-y-4 max-w-2xl">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-4">Nouvelle notification</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Titre</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Nouvelle fonctionnalite disponible"
                  className="w-full h-10 px-3.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm text-white outline-none focus:border-violet-500/40 placeholder:text-white/20"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Decrivez la notification..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm text-white outline-none focus:border-violet-500/40 placeholder:text-white/20 resize-y min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Audience</label>
                  <div className="space-y-1.5">
                    {TARGETS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTarget(t.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border ${
                          target === t.value
                            ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                            : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60'
                        }`}
                      >
                        <t.icon className="h-3.5 w-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 block">Categorie</label>
                  <div className="space-y-1.5">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition border text-left ${
                          category === c.value
                            ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                            : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !message.trim()}
              className="mt-5 w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer la notification
            </button>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs text-amber-300/80 font-medium">
              La notification sera envoyee en push (si active) et dans le panneau de notifications de chaque utilisateur cible.
              Les utilisateurs ayant desactive les annonces dans leurs preferences ne la recevront pas.
            </div>
          </div>
        </div>
      )}

      {/* ─── History ─── */}
      {tab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-8 w-8 text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/30">Aucun broadcast envoye</p>
            </div>
          ) : (
            <div className="space-y-2">
              {broadcasts.map(b => (
                <div key={b.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/80">{b.title}</span>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/[0.06] text-white/40">{b.category}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">{b.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="h-3 w-3" />
                        {b.sent_count}
                      </div>
                      <div className="text-[11px] text-white/25 mt-1">
                        {new Date(b.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-white/25">Cible:</span>
                    <span className="text-[11px] text-white/40 font-medium">{b.target === 'all' ? 'Tous' : b.target === 'premium' ? 'Premium' : 'Artistes'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Stats ─── */}
      {tab === 'stats' && (
        <div>
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 text-white/30 animate-spin" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total notifs', value: stats.totalNotifications, icon: Bell, color: 'text-violet-400 bg-violet-400/10' },
                  { label: 'Non lues', value: stats.unreadNotifications, icon: Eye, color: 'text-amber-400 bg-amber-400/10' },
                  { label: 'Abonnes push', value: stats.pushSubscriptions, icon: Send, color: 'text-emerald-400 bg-emerald-400/10' },
                  { label: 'Broadcasts', value: stats.totalBroadcasts, icon: Megaphone, color: 'text-blue-400 bg-blue-400/10' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-bold text-white">{s.value.toLocaleString()}</div>
                    <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  7 derniers jours par type
                </h3>
                {Object.keys(stats.last7daysBreakdown).length === 0 ? (
                  <p className="text-xs text-white/25">Aucune notification cette semaine</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.last7daysBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const total = Object.values(stats.last7daysBreakdown).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                          <div key={type} className="flex items-center gap-3">
                            <span className="text-xs text-white/40 w-32 truncate">{TYPE_LABELS[type] || type}</span>
                            <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                              <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-white/50 w-10 text-right">{count}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/30">Erreur de chargement</p>
          )}
        </div>
      )}
    </div>
  );
}
