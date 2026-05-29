'use client';

export type PushRegistrationStatus = 'granted' | 'denied' | 'unsupported' | 'unavailable' | 'already' | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function getBrowserNotificationStatus(): 'default' | 'denied' | 'granted' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function isPushServiceUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    message.includes('push service') ||
    message.includes('registration failed') ||
    message.includes('no sender id') ||
    message.includes('network')
  );
}

export async function registerPushSubscription(): Promise<PushRegistrationStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (!window.isSecureContext) return 'unsupported';
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return 'unsupported';

  try {
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }

    const ready = await navigator.serviceWorker.ready;
    const existing = await ready.pushManager.getSubscription();
    if (existing) {
      const sub = existing.toJSON();
      await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }),
      });
      return 'already';
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const subscription = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    const subscriptionJson = subscription.toJSON();
    await fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscriptionJson.endpoint, keys: subscriptionJson.keys }),
    });
    return 'granted';
  } catch (error) {
    return isPushServiceUnavailable(error) ? 'unavailable' : 'unsupported';
  }
}

export async function unregisterPushSubscription(): Promise<PushRegistrationStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return 'unsubscribed';

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch('/api/notifications/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    return 'unsubscribed';
  } catch {
    return 'unavailable';
  }
}
