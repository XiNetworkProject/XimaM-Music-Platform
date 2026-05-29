'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  BellRing,
  X,
  Check,
  CheckCheck,
  AlertCircle,
  Info,
  Music,
  Heart,
  MessageCircle,
  UserPlus,
  TrendingUp,
  Eye,
  Megaphone,
  Zap,
  Trash2,
  Loader2,
} from 'lucide-react';
import { getBrowserNotificationStatus, registerPushSubscription } from '@/lib/pushClient';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'music' | 'like' | 'message' | 'follow'
  | 'new_follower' | 'new_like' | 'like_milestone' | 'new_comment' | 'new_message'
  | 'new_track_followed' | 'view_milestone' | 'boost_reminder' | 'admin_broadcast' | 'general'
  | 'post_like' | 'post_comment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface DBNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  action_url?: string;
  icon_url?: string;
  sender_id?: string;
  data?: Record<string, any>;
  created_at: string;
}

interface NotificationCenterProps {
  className?: string;
}

class NotificationStore {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  add(notification: Omit<Notification, 'id'>) {
    const n: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      duration: notification.duration ?? 5000,
    };
    this.notifications = [n, ...this.notifications];
    this.notify();
    if (n.duration && n.duration > 0) {
      setTimeout(() => this.remove(n.id), n.duration);
    }
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  clear() {
    this.notifications = [];
    this.notify();
  }

  private notify() {
    this.listeners.forEach(l => l([...this.notifications]));
  }
}

export const notificationStore = new NotificationStore();

export const notify = {
  success: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'success', title, message, duration }),
  error: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'error', title, message, duration }),
  info: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'info', title, message, duration }),
  warning: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'warning', title, message, duration }),
  music: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'music', title, message, duration }),
  like: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'like', title, message, duration }),
  message: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'message', title, message, duration }),
  follow: (title: string, message?: string, duration?: number) =>
    notificationStore.add({ type: 'follow', title, message, duration }),
};

const NOTIF_ICONS: Record<string, any> = {
  success: Check, error: AlertCircle, info: Info, warning: AlertCircle,
  music: Music, like: Heart, message: MessageCircle, follow: UserPlus,
  new_follower: UserPlus, new_like: Heart, like_milestone: TrendingUp,
  new_comment: MessageCircle, new_message: MessageCircle,
  new_track_followed: Music, view_milestone: Eye,
  post_like: Heart, post_comment: MessageCircle,
  boost_reminder: Zap, admin_broadcast: Megaphone, general: Info,
};

const NOTIF_COLORS: Record<string, string> = {
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  error: 'text-red-700 bg-red-50 border-red-200',
  info: 'text-blue-700 bg-blue-50 border-blue-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  music: 'text-[#7c5cff] bg-[#7c5cff]/8 border-[#7c5cff]/18',
  like: 'text-pink-700 bg-pink-50 border-pink-200',
  message: 'text-blue-700 bg-blue-50 border-blue-200',
  follow: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  new_follower: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  new_like: 'text-pink-700 bg-pink-50 border-pink-200',
  like_milestone: 'text-amber-700 bg-amber-50 border-amber-200',
  new_comment: 'text-blue-700 bg-blue-50 border-blue-200',
  new_message: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  new_track_followed: 'text-[#7c5cff] bg-[#7c5cff]/8 border-[#7c5cff]/18',
  view_milestone: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  post_like: 'text-pink-700 bg-pink-50 border-pink-200',
  post_comment: 'text-blue-700 bg-blue-50 border-blue-200',
  boost_reminder: 'text-orange-700 bg-orange-50 border-orange-200',
  admin_broadcast: 'text-[#7c5cff] bg-[#7c5cff]/8 border-[#7c5cff]/18',
  general: 'text-[#5f5650] bg-[#fff8ee] border-[#dccfbb]',
};

const CATEGORIES = [
  { key: 'all', label: 'Tout' },
  { key: 'social', label: 'Social' },
  { key: 'music', label: 'Musique' },
  { key: 'message', label: 'Messages' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'boost', label: 'Boost' },
  { key: 'admin', label: 'Annonces' },
];

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
  const Icon = NOTIF_ICONS[type] || Info;
  const color = NOTIF_COLORS[type] || NOTIF_COLORS.general;
  return (
    <div className={`p-2 rounded-xl border ${color} flex-shrink-0`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function ToastItem({ notification, onRemove }: { notification: Notification; onRemove: () => void }) {
  if (notification.type === 'error') {
    return (
      <motion.div
        role="status"
        aria-atomic="true"
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="relative flex flex-row rounded-2xl border-2 border-transparent bg-accent-error p-4 font-sans text-lg text-white shadow-lg max-w-[420px] w-full overflow-hidden"
      >
        <button type="button" onClick={onRemove}
          className="absolute top-2 right-2 rounded-full p-1.5 text-white/90 hover:bg-white/10 transition-colors"
          aria-label="Fermer">
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-1 flex-col justify-center pr-10">
          <h3 className="font-sans text-base font-medium text-white">{notification.title}</h3>
          {notification.message && <span className="font-sans text-sm opacity-80">{notification.message}</span>}
        </div>
        {notification.duration && notification.duration > 0 && (
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: notification.duration / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 rounded-b-2xl origin-left"
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="panel-suno border border-[var(--border)] rounded-2xl p-3.5 shadow-lg backdrop-blur-md max-w-[420px] w-full"
    >
      <div className="flex items-start gap-3">
        <NotificationIcon type={notification.type} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text)] mb-0.5">{notification.title}</h4>
          {notification.message && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">{notification.message}</p>
          )}
          {notification.action && (
            <button
              onClick={() => { notification.action?.onClick(); onRemove(); }}
              className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>
        <button onClick={onRemove}
          className="p-1 rounded-lg hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Fermer">
          <X className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>
      {notification.duration && notification.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: notification.duration / 1000, ease: 'linear' }}
          className="h-0.5 bg-[var(--color-primary)] rounded-full mt-2.5 origin-left"
        />
      )}
    </motion.div>
  );
}

function DBNotifItem({
  n,
  onMarkRead,
  onDelete,
}: {
  n: DBNotification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative cursor-pointer rounded-[1rem] border p-3 transition ${
        n.is_read
          ? 'border-[#dccfbb] bg-[#fff8ee] hover:bg-[#fff3e4]'
          : 'border-[#7c5cff]/18 bg-[#7c5cff]/8 hover:bg-[#7c5cff]/12'
      }`}
      onClick={() => {
        if (!n.is_read) onMarkRead(n.id);
        if (n.action_url) window.location.href = n.action_url;
      }}
    >
      <div className="flex items-start gap-2.5">
        <NotificationIcon type={n.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-black ${n.is_read ? 'text-[#5f5650]' : 'text-[#171313]'}`}>
              {n.title}
            </span>
            {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[#7c5cff] flex-shrink-0" />}
          </div>
          <p className={`text-xs mt-0.5 line-clamp-2 font-semibold ${n.is_read ? 'text-black/42' : 'text-black/58'}`}>
            {n.message}
          </p>
          <span className="text-[11px] text-black/34 mt-1 block font-black uppercase tracking-[0.08em]">{timeAgo(n.created_at)}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
          className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/[0.06] transition-all flex-shrink-0"
          aria-label="Supprimer"
        >
          <X className="w-3.5 h-3.5 text-black/38" />
        </button>
      </div>
    </motion.div>
  );
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === 'authenticated';

  const [toasts, setToasts] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [dbNotifs, setDbNotifs] = useState<DBNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [pushStatus, setPushStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported' | 'unavailable'>('unknown');
  const [pushLoading, setPushLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return notificationStore.subscribe(setToasts);
  }, []);

  // Detecter le statut de permission push
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;
    const perm = getBrowserNotificationStatus();
    if (perm === 'unsupported') { setPushStatus('unsupported'); return; }
    if (perm === 'granted') setPushStatus('granted');
    else if (perm === 'denied') setPushStatus('denied');
    else setPushStatus('unknown');
  }, [isAuthenticated]);

  const handleEnablePush = useCallback(async () => {
    setPushLoading(true);
    const result = await registerPushSubscription();
    setPushLoading(false);
    if (result === 'granted' || result === 'already') {
      setPushStatus('granted');
      notify.success('Notifications activees', 'Tu recevras les notifications meme hors du site');
    } else if (result === 'denied') {
      setPushStatus('denied');
      notify.warning('Notifications', 'Permission refusée par le navigateur.');
    } else if (result === 'unavailable') {
      setPushStatus('unavailable');
      notify.warning('Notifications', 'Le service push du navigateur est indisponible pour le moment.');
    } else {
      setPushStatus('unsupported');
      notify.warning('Notifications', 'Notifications navigateur non supportées sur cet environnement.');
    }
  }, []);

  const doFetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=1');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unread || 0);
    } catch {}
  }, []);

  const fetchNotifs = useCallback(async (cat?: string) => {
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (cat && cat !== 'all') params.set('category', cat);
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setDbNotifs(data.notifications || []);
      setUnreadCount(data.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    doFetchUnread();
    const interval = setInterval(doFetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, doFetchUnread]);

  useEffect(() => {
    if (showPanel && isAuthenticated) {
      setLoading(true);
      fetchNotifs(category).finally(() => setLoading(false));
    }
  }, [showPanel, category, isAuthenticated, fetchNotifs]);

  useEffect(() => {
    if (!showPanel) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPanel]);

  const markRead = useCallback(async (notificationId: number) => {
    setDbNotifs(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationId }),
      });
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setDbNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
    } catch {}
  }, []);

  const deleteNotif = useCallback(async (notificationId: number) => {
    const was = dbNotifs.find(n => n.id === notificationId);
    setDbNotifs(prev => prev.filter(n => n.id !== notificationId));
    if (was && !was.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
    } catch {}
  }, [dbNotifs]);

  const clearAll = useCallback(async () => {
    setDbNotifs([]);
    setUnreadCount(0);
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
    } catch {}
  }, []);

  const totalBadge = unreadCount + toasts.length;

  return (
    <>
      {/* Bell button */}
      <div className="relative" ref={panelRef}>
        <button
          aria-label="Notifications"
          onClick={() => setShowPanel(!showPanel)}
          className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-[var(--surface-2)] transition-all duration-200 relative ${className} ${showPanel ? 'bg-[var(--surface-2)]' : ''}`}
        >
          <Bell className="w-5 h-5" />
          {totalBadge > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1.5 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-violet-500/30"
            >
              {totalBadge > 99 ? '99+' : totalBadge}
            </motion.div>
          )}
        </button>

        {/* Panel */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed left-3 right-3 top-[5.25rem] z-[1000] flex max-h-[min(72vh,650px)] flex-col overflow-hidden rounded-[1.6rem] border border-[#d8cbb8] bg-[#fff7ec] shadow-[0_28px_90px_rgba(30,25,20,0.28)] sm:left-auto sm:right-4 sm:w-[440px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#e2d6c4] bg-[#fffaf2] px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-black text-[#171313]">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-black bg-[#7c5cff]/12 text-[#7c5cff] rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="p-1.5 rounded-lg text-black/38 transition hover:bg-black/[0.06] hover:text-[#171313]"
                      title="Tout marquer comme lu">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  {dbNotifs.length > 0 && (
                    <button onClick={clearAll}
                      className="p-1.5 rounded-lg text-black/38 transition hover:bg-[#ff6f61]/10 hover:text-[#8f3d34]"
                      title="Tout supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Push notification opt-in banner */}
              {isAuthenticated && pushStatus === 'unknown' && (
                <div className="mx-3 mt-3 px-3 py-2.5 rounded-[1rem] bg-[#7c5cff]/8 border border-[#7c5cff]/18 flex items-center gap-2.5">
                  <BellRing className="w-4 h-4 text-[#7c5cff] flex-shrink-0" />
                  <p className="text-[12px] font-semibold text-[#4d3aa0] flex-1">Activer les notifs même hors du site</p>
                  <button
                    onClick={handleEnablePush}
                    disabled={pushLoading}
                    className="px-3 py-1 text-[11px] font-black bg-[#171313] hover:scale-[1.02] text-white rounded-full transition flex-shrink-0"
                  >
                    {pushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Activer'}
                  </button>
                </div>
              )}

              {isAuthenticated && pushStatus === 'denied' && (
                <div className="mx-3 mt-3 px-3 py-2 rounded-[1rem] bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <BellOff className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-800 flex-1">
                    Notifs bloquées — autoriser dans les réglages du navigateur
                  </p>
                </div>
              )}

              {isAuthenticated && pushStatus === 'unavailable' && (
                <div className="mx-3 mt-3 px-3 py-2 rounded-[1rem] bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <BellOff className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-amber-800 flex-1">
                    Service push indisponible sur ce navigateur pour le moment.
                  </p>
                </div>
              )}

              {/* Category filter */}
              <div className="flex gap-1 px-3 py-2 border-b border-[#e2d6c4] overflow-x-auto scrollbar-hide mt-1">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`px-3 py-1.5 text-[12px] font-black rounded-full whitespace-nowrap transition ${
                      category === c.key
                        ? 'bg-[#171313] text-white'
                        : 'bg-[#efe4d4] text-[#5f5650] hover:bg-[#e7dac8] hover:text-[#171313]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-black/35 animate-spin" />
                  </div>
                ) : dbNotifs.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#efe4d4] flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-black/24" />
                    </div>
                    <p className="text-sm font-black text-black/45">Aucune notification</p>
                    <p className="text-xs font-semibold text-black/28 mt-1">Les notifications apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {dbNotifs.map(n => (
                      <DBNotifItem
                        key={n.id}
                        n={n}
                        onMarkRead={markRead}
                        onDelete={deleteNotif}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-[#e2d6c4] bg-[#fffaf2] px-4 py-3">
                <Link
                  href="/notifications"
                  onClick={() => setShowPanel(false)}
                  className="text-xs font-black text-[#171313] transition hover:text-[#7c5cff]"
                >
                  Voir toutes
                </Link>
                <Link
                  href="/settings?tab=preferences"
                  onClick={() => setShowPanel(false)}
                  className="text-xs font-semibold text-black/40 transition hover:text-[#7c5cff]"
                >
                  Préférences
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.slice(0, 3).map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem
                notification={toast}
                onRemove={() => notificationStore.remove(toast.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
