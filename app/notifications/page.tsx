'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Eye,
  Heart,
  Loader2,
  LogIn,
  Megaphone,
  MessageCircle,
  Music,
  Trash2,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';
import { notify } from '@/components/NotificationCenter';
import { SynauraAppShell, SynauraTopBar } from '@/components/synaura/SynauraShell';

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

function notificationGroup(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (dayDiff === 0) return "Aujourd'hui";
  if (dayDiff === 1) return 'Hier';
  if (dayDiff < 7) return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function NotificationIcon({ type }: { type: string }) {
  const Icon = ICONS[type] || Bell;
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-[var(--syn-border)] bg-[var(--syn-soft)] text-[var(--syn-accent)]">
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [items, setItems] = useState<DBNotification[]>([]);
  const [category, setCategory] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const hasMore = useMemo(() => items.length < total, [items.length, total]);
  const groupedItems = useMemo(() => {
    const groups: Array<{ label: string; items: DBNotification[] }> = [];
    items.forEach((item) => {
      const label = notificationGroup(item.created_at);
      const previous = groups[groups.length - 1];
      if (previous?.label === label) {
        previous.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }
    });
    return groups;
  }, [items]);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (sessionStatus !== 'authenticated') {
      setLoading(sessionStatus === 'loading');
      return;
    }
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
  }, [category, sessionStatus, unreadOnly]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      void load(1, false);
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [load, sessionStatus]);

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

  if (sessionStatus === 'loading') {
    return (
      <SynauraAppShell contentClassName="max-w-[1120px]">
        <SynauraTopBar searchLabel="Rechercher un son, un post, un profil..." />
        <div className="flex min-h-[50dvh] items-center justify-center gap-2 text-sm font-semibold text-[var(--syn-text-secondary)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement...
        </div>
      </SynauraAppShell>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <SynauraAppShell contentClassName="max-w-[720px]">
        <SynauraTopBar searchLabel="Rechercher un son, un post, un profil..." />
        <main className="grid min-h-[58dvh] place-items-center px-3 py-10">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[14px] bg-[var(--syn-soft)] text-[var(--syn-accent)]">
              <Bell className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-black text-[var(--syn-text-primary)]">Retrouve ton activité</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">
              Connecte-toi pour voir les réactions, messages et nouveaux abonnements.
            </p>
            <Link
              href="/auth/signin?callbackUrl=%2Fnotifications"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--syn-contrast-bg)] px-5 text-sm font-black text-[var(--syn-contrast-text)]"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Link>
          </div>
        </main>
      </SynauraAppShell>
    );
  }

  return (
    <SynauraAppShell contentClassName="max-w-[1120px]">
      <SynauraTopBar searchLabel="Rechercher un son, un post, un profil..." />

      <main className="pb-6">
        <header className="flex flex-col gap-4 px-1 pb-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[var(--syn-text-primary)] sm:text-4xl">Activité</h1>
            <p className="mt-1 text-sm font-semibold text-[var(--syn-text-secondary)]">
              {unread > 0 ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : 'Tu es à jour'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={busy || unread === 0}
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--syn-border)] bg-[var(--syn-surface)] px-3 text-sm font-black text-[var(--syn-text-secondary)] transition hover:text-[var(--syn-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Tout lire</span>
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy || items.length === 0}
              className="grid h-10 w-10 place-items-center rounded-[10px] border border-[color-mix(in_srgb,var(--syn-accent-coral)_28%,transparent)] bg-[color-mix(in_srgb,var(--syn-accent-coral)_10%,transparent)] text-[var(--syn-accent-coral)] transition hover:bg-[color-mix(in_srgb,var(--syn-accent-coral)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Supprimer toutes les notifications"
              title="Supprimer toutes les notifications"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            className="flex min-w-max gap-1 rounded-[12px] border border-[var(--syn-border)] bg-[var(--syn-soft)] p-1"
            role="tablist"
            aria-label="Filtrer les notifications"
          >
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                role="tab"
                aria-selected={category === item.key}
                className={`rounded-[8px] px-3 py-2 text-sm font-black transition ${
                  category === item.key
                    ? 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)] shadow-sm'
                    : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUnreadOnly((value) => !value)}
              role="tab"
              aria-selected={unreadOnly}
              className={`rounded-[8px] px-3 py-2 text-sm font-black transition ${
                unreadOnly
                  ? 'bg-[var(--syn-accent)] text-white shadow-sm'
                  : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
              }`}
            >
              Non lues
            </button>
          </div>
        </div>

        <section className="mt-4 border-t border-[var(--syn-border)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-[var(--syn-text-secondary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-[14px] bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] opacity-70">
                <Bell className="h-6 w-6" />
              </div>
              <p className="mt-4 text-sm font-black text-[var(--syn-text-primary)]">Aucune notification</p>
              <p className="mt-1 text-xs font-semibold text-[var(--syn-text-secondary)]">Les nouvelles activités apparaîtront ici.</p>
            </div>
          ) : (
            <div>
              {groupedItems.map((group) => (
                <section key={group.label} className="pt-5">
                  <h2 className="px-1 pb-2 text-xs font-black uppercase text-[var(--syn-text-secondary)]">{group.label}</h2>
                  <div className="divide-y divide-[var(--syn-border)]">
                    {group.items.map((item) => {
                      const content = (
                        <div className={`flex items-start gap-3 px-1 py-3 transition sm:px-2 ${
                          item.is_read
                            ? 'bg-transparent'
                            : 'bg-[color-mix(in_srgb,var(--syn-accent)_7%,transparent)]'
                        }`}>
                          <NotificationIcon type={item.type} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-black text-[var(--syn-text-primary)]">{item.title}</div>
                              {!item.is_read ? <span className="h-2 w-2 rounded-full bg-[var(--syn-accent)]" /> : null}
                            </div>
                            <div className="mt-1 text-sm font-semibold leading-6 text-[var(--syn-text-secondary)]">{item.message}</div>
                            <div className="mt-1 text-xs font-bold text-[var(--syn-text-secondary)] opacity-70">{timeAgo(item.created_at)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void deleteNotification(item.id);
                            }}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[var(--syn-text-secondary)] opacity-70 transition hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)] hover:opacity-100"
                            aria-label="Supprimer"
                            title="Supprimer"
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
                </section>
              ))}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              onClick={() => void load(page + 1, true)}
              className="mt-5 w-full rounded-[10px] border border-[var(--syn-border)] bg-[var(--syn-surface)] px-4 py-3 text-sm font-black text-[var(--syn-text-secondary)] transition hover:text-[var(--syn-text-primary)]"
            >
              Charger plus
            </button>
          ) : null}
        </section>
      </main>
    </SynauraAppShell>
  );
}
