import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { MessagingUser } from '@/api/client';
import { colors } from '@/theme/tokens';

export function MessagingAvatar({ user, size = 48, active = false }: { user: MessagingUser; size?: number; active?: boolean }) {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S';
  return (
    <View style={{ width: size, height: size }}>
      {user.avatar ? (
        <Image source={{ uri: user.avatar }} contentFit="cover" transition={140} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted }} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text maxFontSizeMultiplier={1.1} style={[styles.initials, { fontSize: Math.max(11, size * 0.3) }]}>{initials}</Text>
        </View>
      )}
      {active ? <View style={[styles.active, { borderRadius: Math.max(4, size * 0.11), width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24) }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong },
  initials: { color: colors.text, fontWeight: '900' },
  active: { position: 'absolute', right: -1, bottom: -1, backgroundColor: colors.cyan, borderWidth: 2.5, borderColor: colors.background },
});
