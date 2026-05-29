'use client';

import { useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { notify } from '@/components/NotificationCenter';
import { registerPushSubscription as registerBrowserPushSubscription } from '@/lib/pushClient';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 min
const SEEN_KEY = 'boost-notif-seen';

function getSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const cutoff = Date.now() - 24 * 3600000;
    return new Set(parsed.filter((e: any) => e.ts > cutoff).map((e: any) => e.key));
  } catch { return new Set(); }
}

function markSeen(key: string) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr: Array<{ key: string; ts: number }> = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - 24 * 3600000;
    const filtered = arr.filter(e => e.ts > cutoff && e.key !== key);
    filtered.push({ key, ts: Date.now() });
    localStorage.setItem(SEEN_KEY, JSON.stringify(filtered.slice(-50)));
  } catch {}
}

export async function registerPushSubscription(): Promise<boolean> {
  const status = await registerBrowserPushSubscription();
  return status === 'granted' || status === 'already';
}

async function sendPushIfBackground(userId: string, title: string, body: string) {
  if (document.visibilityState === 'visible') return;
  try {
    await fetch('/api/notifications/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, url: '/boosters' }),
    });
  } catch {}
}

export function useBoostNotifications() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  // Tenter l'enregistrement push au chargement si permission deja accordee
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    // Si permission deja accordee, re-enregistrer silencieusement (refresh subscription)
    if (Notification.permission === 'granted') {
      registerPushSubscription().catch(() => {});
    }
  }, [status, userId]);

  const poll = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/notifications/boost', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
      const seen = getSeenKeys();

      for (const n of notifications) {
        if (seen.has(n.key)) continue;
        markSeen(n.key);

        if (n.type === 'daily_available') {
          notify.info(n.title, n.body);
        } else if (n.type === 'spin_available') {
          notify.info(n.title, n.body);
        } else if (n.type === 'boost_expiring') {
          notify.warning(n.title, n.body);
        }

        sendPushIfBackground(userId, n.title, n.body);
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(poll, 10000);
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [userId, poll]);
}
