import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  getTrackById,
  registerNativePushToken,
  sendNativePushTest,
  unregisterNativePushToken,
} from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { navigationRef } from '@/navigation/navigationRef';
import {
  pollNotificationFallback,
  registerBackgroundNotificationFallback,
  unregisterBackgroundNotificationFallback,
} from '@/notifications/backgroundNotificationTask';
import { usePlayer } from '@/player/PlayerProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

const TOKEN_KEY = 'synaura.native-push-token.v1';
const CHANNEL_ID = 'synaura-activity';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NativePushStatus = 'disabled' | 'requesting' | 'ready' | 'fallback' | 'denied' | 'unsupported' | 'error';

type NativeNotificationsContextValue = {
  status: NativePushStatus;
  error: string | null;
  token: string | null;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
};

const NativeNotificationsContext = createContext<NativeNotificationsContextValue | null>(null);

function projectId() {
  return Constants.easConfig?.projectId
    || (Constants.expoConfig?.extra?.eas?.projectId as string | undefined)
    || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
}

function rootPath(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '/notifications';
  try {
    if (/^https?:\/\//i.test(value)) return new URL(value).pathname;
  } catch {
    return '/notifications';
  }
  return value.startsWith('/') ? value : `/${value}`;
}

export function NativeNotificationsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const player = usePlayer();
  const mobileSettings = useMobileSettings();
  const [status, setStatus] = useState<NativePushStatus>(mobileSettings.settings.pushDevice ? 'requesting' : 'disabled');
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const openNotification = useCallback(async (value: unknown) => {
    if (!navigationRef.isReady()) return;
    const parts = rootPath(value).split('/').filter(Boolean);
    const [root, id] = parts;
    if ((root === 'track' || root === 'tracks') && id) {
      const track = await getTrackById(decodeURIComponent(id)).catch(() => null);
      if (track) {
        await player.playTrack(track);
        navigationRef.navigate('Tabs', { screen: 'Swipe' });
      }
      return;
    }
    if (root === 'profile' && id) {
      navigationRef.navigate('Tabs', { screen: 'PublicProfile', params: { username: decodeURIComponent(id) } });
      return;
    }
    if ((root === 'post' || root === 'posts') && id) {
      navigationRef.navigate('Tabs', { screen: 'PostDetail', params: { postId: decodeURIComponent(id) } });
      return;
    }
    if (root === 'city' || root === 'events') {
      navigationRef.navigate('Tabs', { screen: 'City' });
      return;
    }
    if (root === 'community') {
      navigationRef.navigate('Tabs', { screen: 'Community' });
      return;
    }
    if (root === 'studio' || root === 'ai-generator') {
      navigationRef.navigate('Tabs', { screen: 'AIStudio' });
      return;
    }
    if (root === 'subscriptions' || root === 'pricing' || root === 'boosters') {
      navigationRef.navigate('Tabs', { screen: 'Subscriptions' });
      return;
    }
    navigationRef.navigate('Tabs', { screen: 'Notifications' });
  }, [player]);

  const enable = useCallback(async () => {
    if (!auth.user || !auth.token || !mobileSettings.settings.pushDevice) {
      setStatus('disabled');
      return false;
    }
    if (!Device.isDevice) {
      setStatus('unsupported');
      setError('Les notifications push distantes nécessitent un téléphone physique.');
      return false;
    }

    setStatus('requesting');
    setError(null);
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Activité Synaura',
          description: 'Likes, commentaires, nouveaux abonnés, messages et Events.',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 180, 80, 180],
          lightColor: '#8B5CF6',
          sound: 'default',
          showBadge: true,
        });
      }

      const current = await Notifications.getPermissionsAsync();
      const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        setError('Autorisation refusée dans les réglages Android.');
        return false;
      }

      const id = projectId();
      if (!id) throw new Error('Projet push Synaura non configuré.');
      const result = await Notifications.getExpoPushTokenAsync({ projectId: id });
      await registerNativePushToken({
        token: result.data,
        platform: Platform.OS,
        deviceName: Device.deviceName,
        appVersion: Constants.expoConfig?.version,
      });
      await AsyncStorage.setItem(TOKEN_KEY, result.data);
      await unregisterBackgroundNotificationFallback().catch(() => {});
      setToken(result.data);
      setStatus('ready');
      return true;
    } catch (nextError) {
      const fallbackReady = await registerBackgroundNotificationFallback().catch(() => false);
      if (fallbackReady) {
        setStatus('fallback');
        setError('Relais Android actif. Les alertes peuvent arriver avec un léger délai lorsque l’app est fermée.');
        return true;
      }
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'Activation push impossible.');
      return false;
    }
  }, [auth.token, auth.user, mobileSettings.settings.pushDevice]);

  const disable = useCallback(async () => {
    const stored = token || await AsyncStorage.getItem(TOKEN_KEY);
    if (stored && auth.token) await unregisterNativePushToken(stored).catch(() => {});
    await AsyncStorage.removeItem(TOKEN_KEY);
    await unregisterBackgroundNotificationFallback().catch(() => {});
    setToken(null);
    setStatus('disabled');
    setError(null);
  }, [auth.token, token]);

  const sendTest = useCallback(async () => {
    const ready = status === 'ready' || status === 'fallback' || await enable();
    if (!ready) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test local Synaura',
          body: 'Les alertes locales fonctionnent. Le push distant doit encore être activé.',
          data: { url: '/notifications' },
          sound: 'default',
        },
        trigger: null,
      });
      return;
    }
    if (status === 'fallback') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Notifications Synaura actives',
          body: 'Le relais Android peut maintenant afficher tes alertes, même après avoir quitté l’app.',
          data: { url: '/notifications' },
          sound: 'default',
        },
        trigger: null,
      });
      return;
    }
    await sendNativePushTest();
  }, [enable, status]);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(setToken).catch(() => {});
  }, []);

  useEffect(() => {
    if (auth.user && mobileSettings.settings.pushDevice) void enable();
    if (!mobileSettings.settings.pushDevice) void disable();
  }, [auth.user?.id, mobileSettings.settings.pushDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'fallback') return;
    void pollNotificationFallback();
    const interval = setInterval(() => void pollNotificationFallback(), 45_000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {});
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      void openNotification(event.notification.request.content.data?.url);
    });
    void Notifications.getLastNotificationResponseAsync().then((event) => {
      if (event) void openNotification(event.notification.request.content.data?.url);
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [openNotification]);

  const value = useMemo(() => ({ status, error, token, enable, disable, sendTest }), [disable, enable, error, sendTest, status, token]);
  return <NativeNotificationsContext.Provider value={value}>{children}</NativeNotificationsContext.Provider>;
}

export function useNativeNotifications() {
  const value = useContext(NativeNotificationsContext);
  if (!value) throw new Error('useNativeNotifications must be used inside NativeNotificationsProvider');
  return value;
}
