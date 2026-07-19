import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  registerNativePushToken,
  sendNativePushTest,
  unregisterNativePushToken,
  getNotificationUnreadCount,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { openInternalLink } from '@/navigation/internalLinks';
import { navigationRef } from '@/navigation/navigationRef';

export type NativePushStatus = 'disabled' | 'requesting' | 'ready' | 'denied' | 'unsupported' | 'error';

type NativeNotificationsContextValue = {
  status: NativePushStatus;
  error: string | null;
  token: string | null;
  unreadCount: number;
  lastSyncedAt: number | null;
  syncError: string | null;
  notice: string | null;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
  refreshUnread: (knownCount?: number) => Promise<number>;
};

const TOKEN_KEY = 'synaura.native.push.token.v1';
const CHANNEL_ID = 'synaura-activity';
const MESSAGE_CHANNEL_ID = 'synaura-messages';
const FOREGROUND_SYNC_MS = 60_000;
const PUSH_REGISTRATION_COOLDOWN_MS = 5 * 60_000;
const PUSH_TOKEN_EVENT_COOLDOWN_MS = 60_000;
const NativeNotificationsContext = createContext<NativeNotificationsContextValue | null>(null);
let lastOpenedNotificationId = '';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Activite Synaura',
      description: 'Commentaires, reactions, abonnements et sorties musicales',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 180, 90, 180],
      lightColor: '#7357C6',
    }),
    Notifications.setNotificationChannelAsync(MESSAGE_CHANNEL_ID, {
      name: 'Messages Synaura',
      description: 'Messages prives, groupes et salons',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 120, 70, 120],
      lightColor: '#4A9EAA',
      showBadge: true,
    }),
    Notifications.setNotificationCategoryAsync('synaura-message', [{
      identifier: 'open-message',
      buttonTitle: 'Ouvrir',
      options: { opensAppToForeground: true },
    }]),
  ]);
}

function projectId() {
  return Constants.easConfig?.projectId || (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
}

function readablePushError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause || '');
  if (/firebase|fcm|google-services|default firebaseapp/i.test(message)) {
    return "Le centre Supabase est actif, mais le transport push Android n'est pas configuré sur cet APK.";
  }
  return message || 'Activation push impossible.';
}

function openNotificationResponse(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url !== 'string' || !url) return;
  const responseId = response?.notification.request.identifier || url;
  if (lastOpenedNotificationId === responseId) return;
  const open = () => {
    if (!navigationRef.isReady()) {
      setTimeout(open, 350);
      return;
    }
    lastOpenedNotificationId = responseId;
    void openInternalLink(navigationRef as any, url).finally(() => {
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    });
  };
  open();
}

export function NativeNotificationsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [status, setStatus] = useState<NativePushStatus>('disabled');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const registrationPromiseRef = useRef<Promise<string> | null>(null);
  const lastRegistrationRef = useRef<{ token: string; syncedAt: number } | null>(null);
  const lastPushTokenEventAtRef = useRef(0);

  const refreshUnread = useCallback(async (knownCount?: number) => {
    if (!auth.token) {
      setUnreadCount(0);
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      return 0;
    }
    try {
      const next = typeof knownCount === 'number' && Number.isFinite(knownCount)
        ? Math.max(0, knownCount)
        : await getNotificationUnreadCount();
      setUnreadCount(next);
      setLastSyncedAt(Date.now());
      setSyncError(null);
      await Notifications.setBadgeCountAsync(next).catch(() => {});
      DeviceEventEmitter.emit('synaura:notifications-changed', next);
      return next;
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : 'Synchronisation Supabase indisponible.');
      return 0;
    }
  }, [auth.token]);

  const syncPushRegistration = useCallback(async (force = false) => {
    if (!auth.token) throw new Error('Session requise pour enregistrer ce telephone.');
    if (registrationPromiseRef.current) return registrationPromiseRef.current;

    const registration = (async () => {
      const id = projectId();
      if (!id) throw new Error('Projet Expo non configure');

      const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
      const nextToken = result.data;
      const previous = lastRegistrationRef.current;
      const recentlySynced = previous?.token === nextToken
        && Date.now() - previous.syncedAt < PUSH_REGISTRATION_COOLDOWN_MS;

      if (force || !recentlySynced) {
        const response = await registerNativePushToken({
          token: nextToken,
          platform: Platform.OS,
          deviceName: Device.deviceName,
          appVersion: Application.nativeApplicationVersion,
        });
        if (!response.registered) throw new Error("Le telephone n'a pas ete confirme dans Supabase.");
        lastRegistrationRef.current = { token: nextToken, syncedAt: Date.now() };
      }

      await AsyncStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setStatus('ready');
      setError(null);
      return nextToken;
    })();

    registrationPromiseRef.current = registration;
    try {
      return await registration;
    } finally {
      if (registrationPromiseRef.current === registration) registrationPromiseRef.current = null;
    }
  }, [auth.token]);

  const enable = useCallback(async () => {
    if (!auth.token || !auth.user) {
      setStatus('error');
      setError('Connecte-toi pour activer les notifications sur ce telephone.');
      return false;
    }
    if (!Device.isDevice) {
      setStatus('unsupported');
      setError('Les notifications push necessitent un telephone physique.');
      return false;
    }

    setStatus('requesting');
    setError(null);
    setNotice(null);
    try {
      await configureAndroidChannel();
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        setError('Autorisation refusee. Tu peux la reactiver dans les reglages Android.');
        return false;
      }

      await syncPushRegistration(true);
      return true;
    } catch (cause) {
      setStatus('error');
      setError(readablePushError(cause));
      return false;
    }
  }, [auth.token, auth.user, syncPushRegistration]);

  const disable = useCallback(async () => {
    const stored = token || await AsyncStorage.getItem(TOKEN_KEY);
    if (stored && auth.token) await unregisterNativePushToken(stored).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_KEY);
    lastRegistrationRef.current = null;
    lastPushTokenEventAtRef.current = 0;
    setToken(null);
    setStatus('disabled');
    setError(null);
    setNotice(null);
    await Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [auth.token, token]);

  const sendTest = useCallback(async () => {
    setNotice(null);
    setError(null);
    try {
      const result = await sendNativePushTest();
      if (!result.ok) throw new Error('La notification de test n’a pas été créée.');
      await refreshUnread();
      setNotice(result.pushRequested
        ? 'Test créé dans Supabase. Le push Android a été demandé.'
        : 'Test créé dans Supabase. Il est visible dans la cloche.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Test push impossible.');
    }
  }, [refreshUnread]);

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(openNotificationResponse);
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void refreshUnread();
    });
    void Notifications.getLastNotificationResponseAsync().then(openNotificationResponse).catch(() => {});
    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [refreshUnread]);

  useEffect(() => {
    if (!auth.token) {
      setUnreadCount(0);
      setLastSyncedAt(null);
      setSyncError(null);
      void Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }
    void refreshUnread();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshUnread();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refreshUnread();
    }, FOREGROUND_SYNC_MS);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [auth.token, refreshUnread]);

  useEffect(() => {
    if (!auth.token) return;
    const subscription = Notifications.addPushTokenListener(() => {
      const now = Date.now();
      if (now - lastPushTokenEventAtRef.current < PUSH_TOKEN_EVENT_COOLDOWN_MS) return;
      lastPushTokenEventAtRef.current = now;
      void syncPushRegistration().catch(() => {
        setStatus('error');
        setError('Le token de notifications doit être resynchronisé.');
      });
    });
    return () => subscription.remove();
  }, [auth.token, syncPushRegistration]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.token) {
      lastRegistrationRef.current = null;
      lastPushTokenEventAtRef.current = 0;
      setToken(null);
      setStatus('disabled');
      return;
    }
    void (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== 'granted') {
          setStatus(permission.status === 'denied' ? 'denied' : 'disabled');
          if (permission.status === 'denied') setError('Les notifications sont désactivées dans les réglages Android.');
          return;
        }
        await configureAndroidChannel();
        await syncPushRegistration();
      } catch (cause) {
        setStatus('error');
        setError(readablePushError(cause));
      }
    })();
  }, [auth.loading, auth.token, syncPushRegistration]);

  const value = useMemo<NativeNotificationsContextValue>(() => ({
    status,
    error,
    token,
    unreadCount,
    lastSyncedAt,
    syncError,
    notice,
    enable,
    disable,
    sendTest,
    refreshUnread,
  }), [disable, enable, error, lastSyncedAt, notice, refreshUnread, sendTest, status, syncError, token, unreadCount]);

  return <NativeNotificationsContext.Provider value={value}>{children}</NativeNotificationsContext.Provider>;
}

export function useNativeNotifications() {
  const value = useContext(NativeNotificationsContext);
  if (!value) throw new Error('useNativeNotifications must be used inside NativeNotificationsProvider');
  return value;
}
