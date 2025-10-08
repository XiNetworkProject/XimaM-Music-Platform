'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  Sparkles,
  Music,
  Heart,
  MessageCircle,
  UserPlus,
  TrendingUp
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'music' | 'like' | 'message' | 'follow';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationCenterProps {
  className?: string;
}

// Store global pour les notifications
class NotificationStore {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  add(notification: Omit<Notification, 'id'>) {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      duration: notification.duration ?? 5000,
    };

    this.notifications = [newNotification, ...this.notifications];
    this.notify();

    // Auto-remove après duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => this.remove(newNotification.id), newNotification.duration);
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
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const notificationStore = new NotificationStore();

// Helper pour créer des notifications facilement
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

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    music: <Music className="w-5 h-5" />,
    like: <Heart className="w-5 h-5" />,
    message: <MessageCircle className="w-5 h-5" />,
    follow: <UserPlus className="w-5 h-5" />,
  };

  const colors = {
    success: 'text-green-400 bg-green-400/10 border-green-400/30',
    error: 'text-red-400 bg-red-400/10 border-red-400/30',
    info: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    music: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    like: 'text-pink-400 bg-pink-400/10 border-pink-400/30',
    message: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    follow: 'text-green-400 bg-green-400/10 border-green-400/30',
  };

  return (
    <div className={`p-2 rounded-lg border ${colors[type]}`}>
      {icons[type]}
    </div>
  );
};

function NotificationItem({ notification, onRemove }: { notification: Notification; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="panel-suno border border-[var(--border)] rounded-xl p-4 shadow-lg backdrop-blur-md"
      style={{ minWidth: '480px', width: '480px' }}
    >
      <div className="flex items-start gap-3">
        <NotificationIcon type={notification.type} />
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text)] mb-0.5">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
              {notification.message}
            </p>
          )}
          {notification.action && (
            <button
              onClick={() => {
                notification.action?.onClick();
                onRemove();
              }}
              className="mt-2 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        <button
          onClick={onRemove}
          className="p-1 rounded-lg hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: notification.duration / 1000, ease: 'linear' }}
          className="h-0.5 bg-[var(--color-primary)] rounded-full mt-3 origin-left"
        />
      )}
    </motion.div>
  );
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.length);
  }, [notifications]);

  const handleRemove = (id: string) => {
    notificationStore.remove(id);
  };

  const handleClearAll = () => {
    notificationStore.clear();
    setShowPanel(false);
  };

  return (
    <>
      {/* Notification Button */}
      <div className="relative">
        <button
          aria-label="Notifications"
          onClick={() => setShowPanel(!showPanel)}
          className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] shadow-sm transition-colors relative ${className}`}
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </button>

        {/* Notification Panel (optionnel, pour voir l'historique) */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 max-h-96 overflow-y-auto panel-suno border border-[var(--border)] rounded-xl shadow-xl z-50"
              style={{ width: '260px', minWidth: '260px' }}
            >
              <div className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--border)] p-3 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
              </div>

              <div className="p-2 space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRemove={() => handleRemove(notification.id)}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Container (en haut à droite) */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.slice(0, 3).map(notification => (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationItem
                notification={notification}
                onRemove={() => handleRemove(notification.id)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

