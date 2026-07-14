import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useAuth } from '@/auth/AuthProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useNativeNotifications } from './NativeNotificationsProvider';
import { colors, radius, spacing } from '@/theme/tokens';

const NUDGE_KEY = 'synaura.native.push.nudge.v2';
const NUDGE_DELAY_MS = 4200;
const NUDGE_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const BLOCKED_ROUTES = new Set(['Welcome', 'Onboarding', 'Login', 'Register', 'ForgotPassword']);

export function NativeNotificationNudge({ activeRoute }: { activeRoute: string }) {
  const auth = useAuth();
  const notifications = useNativeNotifications();
  const mobileSettings = useMobileSettings();
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const eligible = Boolean(
      auth.user
      && auth.token
      && mobileSettings.settings.pushDevice
      && !notifications.token
      && notifications.status !== 'ready'
      && notifications.status !== 'unsupported'
      && !BLOCKED_ROUTES.has(activeRoute),
    );
    if (!eligible) {
      setChecking(false);
      setVisible(false);
      return;
    }
    void AsyncStorage.getItem(NUDGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        const last = Number(raw || 0);
        if (last && Date.now() - last < NUDGE_COOLDOWN_MS) return;
        timer = setTimeout(() => {
          if (mounted) setVisible(true);
        }, NUDGE_DELAY_MS);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [activeRoute, auth.token, auth.user, mobileSettings.settings.pushDevice, notifications.status, notifications.token]);

  const close = async () => {
    setVisible(false);
    await AsyncStorage.setItem(NUDGE_KEY, String(Date.now())).catch(() => {});
  };

  const activate = async () => {
    const enabled = await notifications.enable();
    await mobileSettings.updateSettings({ pushDevice: enabled });
    if (enabled) {
      await AsyncStorage.setItem(NUDGE_KEY, String(Date.now())).catch(() => {});
      setVisible(false);
    }
  };

  if (checking) return null;

  return (
    <BottomSheet visible={visible} title="Reste dans le rythme" subtitle="Les alertes utiles, sans bruit inutile." onClose={() => void close()} maxHeight="82%">
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.icon}><Ionicons name="notifications" size={26} color={colors.warmWhite} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Synaura peut te prévenir au bon moment.</Text>
            <Text style={styles.heroText}>Commentaires, nouveaux abonnés, variations à valider et sorties des artistes suivis.</Text>
          </View>
        </View>
        <View style={styles.signals}>
          <Signal icon="chatbubble-ellipses-outline" text="Quand quelqu’un réagit à ton son" />
          <Signal icon="repeat-outline" text="Quand une variation attend ta validation" />
          <Signal icon="musical-notes-outline" text="Quand un artiste suivi publie" />
        </View>
        {notifications.error ? <Text style={styles.error}>{notifications.error}</Text> : null}
        <Pressable disabled={notifications.status === 'requesting'} onPress={() => void activate()} style={styles.primary}>
          {notifications.status === 'requesting' ? <ActivityIndicator color={colors.warmWhite} /> : <Ionicons name="notifications-outline" size={18} color={colors.warmWhite} />}
          <Text style={styles.primaryText}>{notifications.status === 'requesting' ? 'Activation...' : 'Activer les notifications'}</Text>
        </Pressable>
        <Pressable onPress={() => void close()} style={styles.secondary}><Text style={styles.secondaryText}>Pas maintenant</Text></Pressable>
      </View>
    </BottomSheet>
  );
}

function Signal({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return <View style={styles.signal}><Ionicons name={icon} size={17} color={colors.violet} /><Text style={styles.signalText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingTop: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.dark },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: colors.warmWhite, fontSize: 16, lineHeight: 21, fontWeight: '900' },
  heroText: { marginTop: 5, color: 'rgba(247,246,243,0.62)', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  signals: { gap: 8 },
  signal: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: colors.surfaceMuted },
  signalText: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '800' },
  error: { color: colors.coral, fontSize: 10, lineHeight: 15, fontWeight: '800' },
  primary: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, backgroundColor: colors.text },
  primaryText: { color: colors.warmWhite, fontSize: 13, fontWeight: '900' },
  secondary: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
});
