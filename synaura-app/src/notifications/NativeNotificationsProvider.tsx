import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  registerNativePushToken,
  sendNativePushTest,
  unregisterNativePushToken,
  getNotifications,
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
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
  refreshUnread: () => Promise<number>;
};

const TOKEN_KEY = 'synaura.native.push.token.v1';
const CHANNEL_ID = 'synaura-activity';
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
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Activite Synaura',
    description: 'Commentaires, reactions, abonnements et sorties musicales',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 180, 90, 180],
    lightColor: '#7357C6',
  });
}

function projectId() {
  return Constants.easConfig?.projectId || (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
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

  const refreshUnread = useCallback(async () => {
    if (!auth.token) {
      setUnreadCount(0);
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      return 0;
    }
    try {
      const result = await getNotifications();
      const next = Math.max(0, Number(result.unread || 0));
      setUnreadCount(next);
      await Notifications.setBadgeCountAsync(next).catch(() => {});
      DeviceEventEmitter.emit('synaura:notifications-changed', next);
      return next;
    } catch {
      return 0;
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
    try {
      await configureAndroidChannel();
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        setError('Autorisation refusee. Tu peux la reactiver dans les reglages Android.');
        return false;
      }

      const id = projectId();
      if (!id) throw new Error('Projet Expo non configure');
      const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
      await registerNativePushToken({
        token: result.data,
        platform: Platform.OS,
        deviceName: Device.deviceName,
        appVersion: Application.nativeApplicationVersion,
      });
      await AsyncStorage.setItem(TOKEN_KEY, result.data);
      setToken(result.data);
      setStatus('ready');
      return true;
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Activation push impossible.');
      return false;
    }
  }, [auth.token, auth.user]);

  const disable = useCallback(async () => {
    const stored = token || await AsyncStorage.getItem(TOKEN_KEY);
    if (stored && auth.token) await unregisterNativePushToken(stored).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setStatus('disabled');
    setError(null);
    await Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [auth.token, token]);

  const sendTest = useCallback(async () => {
    const ready = status === 'ready' || await enable();
    if (!ready) return;
    try {
      await sendNativePushTest();
      setError('Notification de test envoyee.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Test push impossible.');
    }
  }, [enable, status]);

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
      void Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }
    void refreshUnread();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshUnread();
    });
    return () => subscription.remove();
  }, [auth.token, refreshUnread]);

  useEffect(() => {
    if (!auth.token) return;
    const subscription = Notifications.addPushTokenListener(() => {
      void (async () => {
        const id = projectId();
        if (!id) return;
        try {
          const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
          await registerNativePushToken({
            token: result.data,
            platform: Platform.OS,
            deviceName: Device.deviceName,
            appVersion: Application.nativeApplicationVersion,
          });
          await AsyncStorage.setItem(TOKEN_KEY, result.data);
          setToken(result.data);
          setStatus('ready');
          setError(null);
        } catch {
          setStatus('error');
          setError('Le token de notifications doit être resynchronisé.');
        }
      })();
    });
    return () => subscription.remove();
  }, [auth.token]);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.token) {
      setToken(null);
      setStatus('disabled');
      return;
    }
    void AsyncStorage.getItem(TOKEN_KEY).then(async (stored) => {
      if (!stored) return;
      setToken(stored);
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status !== 'granted') {
          setStatus('denied');
          setError('Les notifications sont désactivées dans les réglages Android.');
          return;
        }
        await configureAndroidChannel();
        await registerNativePushToken({
          token: stored,
          platform: Platform.OS,
          deviceName: Device.deviceName,
          appVersion: Application.nativeApplicationVersion,
        });
        setStatus('ready');
        setError(null);
      } catch {
        setStatus('error');
        setError('Le telephone doit etre reconnecte aux notifications.');
      }
    });
  }, [auth.loading, auth.token]);

  const value = useMemo<NativeNotificationsContextValue>(() => ({
    status,
    error,
    token,
    unreadCount,
    enable,
    disable,
    sendTest,
    refreshUnread,
  }), [disable, enable, error, refreshUnread, sendTest, status, token, unreadCount]);

  return <NativeNotificationsContext.Provider value={value}>{children}</NativeNotificationsContext.Provider>;
}

export function useNativeNotifications() {
  const value = useContext(NativeNotificationsContext);
  if (!value) throw new Error('useNativeNotifications must be used inside NativeNotificationsProvider');
  return value;
}
