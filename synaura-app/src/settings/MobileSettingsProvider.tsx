import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';

export type ThemeMode = 'dark' | 'light' | 'system';

export type MobileSettings = {
  autoplay: boolean;
  highQuality: boolean;
  activityVisible: boolean;
  pushDevice: boolean;
  reducedMotion: boolean;
  dataSaver: boolean;
  coverVideos: boolean;
  dynamicBackground: boolean;
  themeMode: ThemeMode;
};

const DEFAULT_SETTINGS: MobileSettings = {
  autoplay: false,
  highQuality: true,
  activityVisible: true,
  pushDevice: true,
  reducedMotion: false,
  dataSaver: false,
  coverVideos: true,
  dynamicBackground: true,
  themeMode: 'system',
};

const BOOLEAN_SETTINGS: Array<Exclude<keyof MobileSettings, 'themeMode'>> = [
  'autoplay',
  'highQuality',
  'activityVisible',
  'pushDevice',
  'reducedMotion',
  'dataSaver',
  'coverVideos',
  'dynamicBackground',
];

function sanitizeSettings(value: unknown): MobileSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<MobileSettings>;
  const next = { ...DEFAULT_SETTINGS };
  BOOLEAN_SETTINGS.forEach((key) => {
    if (typeof candidate[key] === 'boolean') next[key] = candidate[key] as boolean;
  });
  if (candidate.themeMode === 'dark' || candidate.themeMode === 'light' || candidate.themeMode === 'system') {
    next.themeMode = candidate.themeMode;
  }
  return next;
}

export const MOBILE_SETTINGS_KEY = 'synaura.mobile.settings.v1';

type MobileSettingsContextValue = {
  settings: MobileSettings;
  resolvedTheme: 'dark' | 'light';
  updateSettings: (patch: Partial<MobileSettings>) => Promise<void>;
};

const MobileSettingsContext = createContext<MobileSettingsContextValue | null>(null);

export function MobileSettingsProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useColorScheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(MOBILE_SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const next = sanitizeSettings(JSON.parse(raw));
        settingsRef.current = next;
        setSettings(next);
      })
      .catch(() => AsyncStorage.removeItem(MOBILE_SETTINGS_KEY).catch(() => {}));
  }, []);

  useEffect(() => {
    try {
      Appearance.setColorScheme(settings.themeMode === 'system' ? null : settings.themeMode);
    } catch {
      // Some Android vendors reject runtime overrides; semantic colors still follow resolvedTheme.
    }
  }, [settings.themeMode]);

  const updateSettings = useCallback(async (patch: Partial<MobileSettings>) => {
    const next = sanitizeSettings({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    setSettings(next);
    await AsyncStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(next));
  }, []);

  const resolvedTheme = settings.themeMode === 'system' ? (systemTheme === 'light' ? 'light' : 'dark') : settings.themeMode;
  const value = useMemo(() => ({ settings, resolvedTheme, updateSettings }), [resolvedTheme, settings, updateSettings]);
  return <MobileSettingsContext.Provider value={value}>{children}</MobileSettingsContext.Provider>;
}

export function useMobileSettings() {
  const context = useContext(MobileSettingsContext);
  if (!context) throw new Error('useMobileSettings must be used inside MobileSettingsProvider');
  return context;
}
