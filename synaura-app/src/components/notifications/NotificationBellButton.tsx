import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MotionPressable } from '@/components/motion/Motion';
import { useAuth } from '@/auth/AuthProvider';
import { useNativeNotifications } from '@/notifications/NativeNotificationsProvider';
import { colors } from '@/theme/tokens';

export function NotificationBellButton({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const notifications = useNativeNotifications();
  const count = Math.max(0, notifications.unreadCount);

  return (
    <MotionPressable
      accessibilityLabel={count ? `Activité, ${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}` : 'Activité'}
      onPress={() => {
        if (auth.requireAuth()) navigation.navigate('Notifications');
      }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        dark && styles.buttonDark,
      ]}
      scaleTo={0.9}
    >
      <Ionicons name={count ? 'notifications' : 'notifications-outline'} size={compact ? 19 : 20} color={dark ? colors.paper : colors.text} />
      {count ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonCompact: { width: 36, height: 36, borderRadius: 9 },
  buttonDark: {
    borderColor: 'rgba(255,250,242,0.14)',
    backgroundColor: 'rgba(255,250,242,0.08)',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: { color: colors.paper, fontSize: 8, lineHeight: 10, fontWeight: '900' },
});
