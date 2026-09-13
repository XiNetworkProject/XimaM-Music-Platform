'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from '@/components/navigation/HandoffLink';
import { useHandoffRouter } from '@/hooks/useHandoffRouter';
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
import { notificationStore, notify, type SynauraNotificationType, type SynauraTransientNotification } from '@/lib/ui/notifications';

export { notificationStore, notify } from '@/lib/ui/notifications';

export type NotificationType = SynauraNotificationType;
export type Notification = SynauraTransientNotification;

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

const NOTIF_ICONS: Record<string, any> = {
  success: Check, error: AlertCircle, info: Info, warning: AlertCircle,
  music: Music, like: Heart, message: MessageCircle, follow: UserPlus,
  new_follower: UserPlus, new_like: Heart, like_milestone: TrendingUp,
  new_comment: MessageCircle, new_message: MessageCircle,
  message_request: UserPlus, message_request_accepted: MessageCircle,
  new_track_followed: Music, view_milestone: Eye,
  post_like: Heart, post_comment: MessageCircle,
  boost_reminder: Zap, admin_broadcast: Megaphone, general: Info,
};

const NOTIF_COLORS: Record<string, string> = {
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  error: 'text-red-700 bg-red-50 border-red-200',
  info: 'text-blue-700 bg-blue-50 border-blue-200',
  warning: 'text-amber-700 bg-amber-50 border-amber-200',
  music: 'text-[#7357C6] bg-[#7357C6]/8 border-[#7357C6]/18',
  like: 'text-pink-700 bg-pink-50 border-pink-200',
  message: 'text-blue-700 bg-blue-50 border-blue-200',
  follow: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  new_follower: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  new_like: 'text-pink-700 bg-pink-50 border-pink-200',
  like_milestone: 'text-amber-700 bg-amber-50 border-amber-200',
  new_comment: 'text-blue-700 bg-blue-50 border-blue-200',
  new_message: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  message_request: 'text-[#7357C6] bg-[#7357C6]/8 border-[#7357C6]/18',
  message_request_accepted: 'text-[#4A9EAA] bg-[#4A9EAA]/8 border-[#4A9EAA]/18',
  new_track_followed: 'text-[#7357C6] bg-[#7357C6]/8 border-[#7357C6]/18',
  view_milestone: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  post_like: 'text-pink-700 bg-pink-50 border-pink-200',
  post_comment: 'text-blue-700 bg-blue-50 border-blue-200',
  boost_reminder: 'text-orange-700 bg-orange-50 border-orange-200',
  admin_broadcast: 'text-[#7357C6] bg-[#7357C6]/8 border-[#7357C6]/18',
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
    <span className={`chambre-notification-icon p-2 rounded-xl border ${color} flex-shrink-0`}>
      <Icon className="w-4 h-4" />
    </span>
  );
}

function ToastItem({ notification, onRemove }: { notification: Notification; onRemove: () => void }) {
  if (notification.type === 'error') {
    return (
      <motion.div
        role="alert"
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
      role="status"
      aria-atomic="true"
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="rounded-[var(--syn-radius-lg)] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-3.5 text-[var(--syn-text-primary)] shadow-[var(--syn-shadow-medium)] backdrop-blur-xl max-w-[420px] w-full"
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
  const router = useHandoffRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="chambre-notification-item"
      data-read={n.is_read}
      data-notification-type={n.type}
    >
      <button
        type="button"
        className="chambre-notification-open"
        onClick={() => {
          if (!n.is_read) onMarkRead(n.id);
          if (n.action_url) router.push(n.action_url, { scroll: false });
        }}
      >
        <NotificationIcon type={n.type} />
        <span className="chambre-notification-copy">
          <span className="chambre-notification-title-row">
            <span className="chambre-notification-title">
              {n.title}
            </span>
            {!n.is_read && <span className="chambre-notification-unread" aria-label="Non lue" />}
          </span>
          <span className="chambre-notification-message">
            {n.message}
          </span>
          <span className="chambre-notification-time">{timeAgo(n.created_at)}</span>
        </span>
      </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
          className="chambre-notification-dismiss"
          aria-label="Supprimer"
        >
          <X className="w-4 h-4" />
        </button>
    </motion.div>
  );
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === 'authenticated';

  const [showPanel, setShowPanel] = useState(false);
  const [dbNotifs, setDbNotifs] = useState<DBNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [pushStatus, setPushStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported' | 'unavailable'>('unknown');
  const [pushLoading, setPushLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch('/api/notifications?countOnly=true');
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
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void doFetchUnread();
    }, 20000);
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void doFetchUnread();
    };
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
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

  return (
    <>
      {/* Bell button */}
      <div className="relative" ref={panelRef}>
        <button
          aria-label="Notifications"
          aria-expanded={showPanel}
          aria-controls="chambre-notification-panel"
          onClick={() => setShowPanel(!showPanel)}
          className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-[var(--surface-2)] transition-all duration-200 relative ${className} ${showPanel ? 'bg-[var(--surface-2)]' : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="chambre-notification-badge absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1.5 bg-[var(--v2-accent-fill)] text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
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
              className="chambre-notifications"
              id="chambre-notification-panel"
              role="region"
              aria-labelledby="chambre-notification-heading"
            >
              {/* Header */}
              <div className="chambre-notification-header">
                <div className="chambre-notification-heading">
                  <p className="chambre-notification-eyebrow">Votre activité</p>
                  <h3 id="chambre-notification-heading">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="chambre-notification-count" aria-label={`${unreadCount} non lues`}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="chambre-notification-tools">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="chambre-notification-tool"
                      aria-label="Tout marquer comme lu"
                      title="Tout marquer comme lu">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  {dbNotifs.length > 0 && (
                    <button onClick={clearAll}
                      className="chambre-notification-tool chambre-notification-tool--delete"
                      aria-label="Tout supprimer"
                      title="Tout supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="chambre-notification-scroll">
              {/* Push notification opt-in banner */}
              {isAuthenticated && pushStatus === 'unknown' && (
                <div className="chambre-notification-push">
                  <BellRing className="w-4 h-4 flex-shrink-0" />
                  <p>Activer les notifs même hors du site</p>
                  <button
                    onClick={handleEnablePush}
                    disabled={pushLoading}
                    className="chambre-notification-enable"
                    aria-label="Activer les notifications navigateur"
                  >
                    {pushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Activer'}
                  </button>
                </div>
              )}

              {isAuthenticated && pushStatus === 'denied' && (
                <div className="chambre-notification-push chambre-notification-push--warning">
                  <BellOff className="w-4 h-4 flex-shrink-0" />
                  <p>
                    Notifs bloquées — autoriser dans les réglages du navigateur
                  </p>
                </div>
              )}

              {isAuthenticated && pushStatus === 'unavailable' && (
                <div className="chambre-notification-push chambre-notification-push--warning">
                  <BellOff className="w-4 h-4 flex-shrink-0" />
                  <p>
                    Service push indisponible sur ce navigateur pour le moment.
                  </p>
                </div>
              )}

              {/* Category filter */}
              <div className="chambre-notification-filters" role="group" aria-label="Catégories de notifications">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className="chambre-notification-filter"
                    aria-pressed={category === c.key}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="chambre-notification-content">
                {loading ? (
                  <div className="chambre-notification-empty" role="status" aria-label="Chargement des notifications">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : dbNotifs.length === 0 ? (
                  <div className="chambre-notification-empty">
                    <div className="chambre-notification-empty-icon">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="chambre-notification-empty-title">Aucune notification</p>
                    <p>Les notifications apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="chambre-notification-list">
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
              </div>

              {/* Footer */}
              <div className="chambre-notification-footer">
                <Link
                  href="/notifications"
                  onClick={() => setShowPanel(false)}
                  className="chambre-notification-all"
                >
                  Voir toutes
                </Link>
                <Link
                  href="/settings?tab=preferences"
                  onClick={() => setShowPanel(false)}
                  className="chambre-notification-preferences"
                >
                  Préférences
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
