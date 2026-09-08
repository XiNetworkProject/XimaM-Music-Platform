export type SynauraNotificationType = 'success' | 'error' | 'info' | 'warning' | 'music' | 'like' | 'message' | 'follow'
  | 'new_follower' | 'new_like' | 'like_milestone' | 'new_comment' | 'new_message'
  | 'new_track_followed' | 'view_milestone' | 'boost_reminder' | 'admin_broadcast' | 'general'
  | 'post_like' | 'post_comment' | 'message_request' | 'message_request_accepted';

export interface SynauraTransientNotification {
  id: string;
  type: SynauraNotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

class SynauraNotificationStore {
  private listeners = new Set<(notifications: SynauraTransientNotification[]) => void>();
  private notifications: SynauraTransientNotification[] = [];

  subscribe(listener: (notifications: SynauraTransientNotification[]) => void) {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => { this.listeners.delete(listener); };
  }

  add(notification: Omit<SynauraTransientNotification, 'id'>) {
    const next = { ...notification, id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, duration: notification.duration ?? 5000 };
    this.notifications = [next, ...this.notifications];
    this.publish();
    if (next.duration && next.duration > 0) setTimeout(() => this.remove(next.id), next.duration);
  }

  remove(id: string) {
    this.notifications = this.notifications.filter((notification) => notification.id !== id);
    this.publish();
  }

  clear() {
    this.notifications = [];
    this.publish();
  }

  private publish() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }
}

export const notificationStore = new SynauraNotificationStore();

const add = (type: SynauraNotificationType) => (title: string, message?: string, duration?: number) => notificationStore.add({ type, title, message, duration });
export const notify = {
  success: add('success'), error: add('error'), info: add('info'), warning: add('warning'),
  music: add('music'), like: add('like'), message: add('message'), follow: add('follow'),
};
