import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

const TASK_NAME = 'synaura-background-notifications';
const AUTH_TOKEN_KEY = 'synaura.mobile.auth.token';
const SHOWN_IDS_KEY = 'synaura.notification-fallback.shown.v1';
const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined)
  || process.env.EXPO_PUBLIC_API_BASE_URL
  || 'https://xima-m-music-platform.vercel.app';

type RawNotification = {
  id?: string | number;
  title?: string;
  message?: string;
  action_url?: string | null;
  data?: { action_url?: string | null } | null;
  is_read?: boolean;
};

export async function pollNotificationFallback() {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return false;

  const response = await fetch(`${API_BASE_URL}/api/notifications?limit=20&unread=true`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Auth-Token': token,
    },
  });
  if (!response.ok) return false;

  const payload = await response.json().catch(() => null);
  const notifications = (Array.isArray(payload?.notifications) ? payload.notifications : []) as RawNotification[];
  const currentIds = notifications.map((item) => String(item.id || '')).filter(Boolean);
  const stored = await AsyncStorage.getItem(SHOWN_IDS_KEY);

  // The first run establishes a baseline so old notifications do not flood the phone.
  if (!stored) {
    await AsyncStorage.setItem(SHOWN_IDS_KEY, JSON.stringify(currentIds.slice(0, 100)));
    return true;
  }

  const shown = new Set<string>(JSON.parse(stored));
  const fresh = notifications.filter((item) => {
    const id = String(item.id || '');
    return id && !shown.has(id) && !item.is_read;
  }).slice(0, 4);

  for (const item of fresh.reverse()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title || 'Synaura',
        body: item.message || 'Tu as une nouvelle notification.',
        data: { url: item.action_url || item.data?.action_url || '/notifications' },
        sound: 'default',
      },
      trigger: null,
    });
  }

  await AsyncStorage.setItem(
    SHOWN_IDS_KEY,
    JSON.stringify([...currentIds, ...shown].slice(0, 100)),
  );
  return true;
}

if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await pollNotificationFallback();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundNotificationFallback() {
  if (!await TaskManager.isAvailableAsync()) return false;
  if (!await TaskManager.isTaskRegisteredAsync(TASK_NAME)) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
  }
  return true;
}

export async function unregisterBackgroundNotificationFallback() {
  if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) {
    await BackgroundTask.unregisterTaskAsync(TASK_NAME);
  }
}
