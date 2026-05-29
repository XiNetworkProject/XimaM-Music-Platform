'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Eye,
  Heart,
  Loader2,
  Megaphone,
  MessageCircle,
  Music,
  Trash2,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { SynauraAppShell, SynauraPanel, SynauraTopBar } from '@/components/synaura/SynauraShell';

type DBNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
};

const CATEGORIES = [
  { key: 'all', label: 'Tout' },
  { key: 'social', label: 'Social' },
  { key: 'music', label: 'Musique' },
  { key: 'message', label: 'Messages' },
  { key: 'milestone', label: 'Paliers' },
  { key: 'boost', label: 'Boost' },
  { key: 'admin', label: 'Annonces' },
];

const ICONS: Record<string, any> = {
  new_follower: UserPlus,
  new_like: Heart,
  post_like: Heart,
  new_comment: MessageCircle,
  post_comment: MessageCircle,
  new_message: MessageCircle,
  new_track_followed: Music,
  like_milestone: TrendingUp,
  view_milestone: Eye,
  boost_reminder: Zap,
  admin_broadcast: Megaphone,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'maintenant';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}j`;
  return `${Math.floor(days / 7)}sem`;
}

function NotificationIcon({ type }: { type: string }) {
  const Icon = ICONS[type] || Bell;
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] border border-black/[0.08] bg-[#fff8ee] text-[#171313]">
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<DBNotification[]>([]);
  const [category, setCategory] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const hasMore = useMemo(() => items.length < total, [items.length, total]);

  const load = useCallback(async (nextPage = 1, append = false) => {
    setLoading(!append);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '30' });
      if (category !== 'all') params.set('category', category);
      if (unreadOnly) params.set('unread', 'true');
      const res = await fetch(`/api/notifications?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Chargement impossible');
      const nextItems = Array.isArray(data?.notifications) ? data.notifications : [];
      setItems((prev) => append ? [...prev, ...nextItems] : nextItems);
      setUnread(Number(data?.unread || 0));
      setTotal(Number(data?.total || 0));
      setPage(nextPage);
    } catch (error: any) {
      notify.error('Notifications', error?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [category, unreadOnly]);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const markRead = async (id: number) => {
    const current = items.find((item) => item.id === id);
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
    if (current && !current.is_read) setUnread((prev) => Math.max(0, prev - 1));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', notificationId: id }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    setBusy(true);
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setUnread(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      notify.success('Notifications', 'Tout est marqué comme lu');
    } finally {
      setBusy(false);
    }
  };

  const deleteNotification = async (id: number) => {
    const current = items.find((item) => item.id === id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (current && !current.is_read) setUnread((prev) => Math.max(0, prev - 1));
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    }).catch(() => {});
  };

  const clearAll = async () => {
    if (!confirm('Supprimer toutes les notifications ?')) return;
    setBusy(true);
    setItems([]);
    setUnread(0);
    setTotal(0);
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      notify.success('Notifications', 'Notifications supprimées');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SynauraAppShell contentClassName="max-w-[1120px]">
      <SynauraTopBar searchLabel="Rechercher un son, un post, un profil..." />

      <div className="space-y-4 pb-28">
        <SynauraPanel className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/34">Notifications</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#171313] sm:text-5xl">Centre d’activité</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/52">
                Likes, commentaires, abonnements, nouveaux sons, posts, messages et annonces sont regroupés ici.
              </p>
            </div>
            <div className="rounded-full border border-black/[0.08] bg-black/[0.04] px-4 py-2 text-sm font-black text-black/58">
              {unread} non lue(s)
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  category === item.key
                    ? 'bg-[#171313] text-white'
                    : 'border border-black/[0.08] bg-black/[0.04] text-black/56 hover:bg-black/[0.08] hover:text-[#171313]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUnreadOnly((value) => !value)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                unreadOnly
                  ? 'bg-[#7c5cff] text-white'
                  : 'border border-black/[0.08] bg-black/[0.04] text-black/56 hover:bg-black/[0.08] hover:text-[#171313]'
              }`}
            >
              Non lues
            </button>
          </div>
        </SynauraPanel>

        <SynauraPanel className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-black text-[#171313]">{total} notification(s)</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markAllRead}
                disabled={busy || unread === 0}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black/[0.08] bg-black/[0.04] px-4 text-sm font-black text-black/58 transition hover:bg-black/[0.08] hover:text-[#171313] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck className="h-4 w-4" />
                Tout lire
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={busy || items.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ff6f61]/22 bg-[#ff6f61]/8 px-4 text-sm font-black text-[#8f3d34] transition hover:bg-[#ff6f61]/14 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm font-semibold text-black/45">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1.2rem] bg-black/[0.05] text-black/30">
                <Bell className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-black text-black/55">Aucune notification</p>
              <p className="mt-1 text-xs font-semibold text-black/35">Les nouvelles activités apparaîtront ici.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {items.map((item) => {
                const content = (
                  <div className={`flex items-start gap-3 rounded-[1.15rem] border p-3 transition ${
                    item.is_read
                      ? 'border-black/[0.06] bg-[#fff8ee]'
                      : 'border-[#7c5cff]/20 bg-[#7c5cff]/8'
                  }`}>
                    <NotificationIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-[#171313]">{item.title}</div>
                        {!item.is_read ? <span className="h-2 w-2 rounded-full bg-[#7c5cff]" /> : null}
                      </div>
                      <div className="mt-1 text-sm font-semibold leading-6 text-black/54">{item.message}</div>
                      <div className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-black/34">{timeAgo(item.created_at)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteNotification(item.id);
                      }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/28 transition hover:bg-black/[0.06] hover:text-[#171313]"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.is_read) void markRead(item.id);
                      if (item.action_url) router.push(item.action_url, { scroll: false });
                    }}
                    className="block w-full cursor-pointer text-left"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (!item.is_read) void markRead(item.id);
                        if (item.action_url) router.push(item.action_url, { scroll: false });
                      }
                    }}
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              onClick={() => void load(page + 1, true)}
              className="mt-4 w-full rounded-full border border-black/[0.08] bg-black/[0.04] px-4 py-3 text-sm font-black text-black/58 transition hover:bg-black/[0.08] hover:text-[#171313]"
            >
              Charger plus
            </button>
          ) : null}
        </SynauraPanel>
      </div>
    </SynauraAppShell>
  );
}
