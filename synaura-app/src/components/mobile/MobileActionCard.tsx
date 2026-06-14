import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotionPressable } from '@/components/motion/Motion';
import { colors, shadows } from '@/theme/tokens';

const tones = {
  violet: ['#EEE7FF', '#FFF9EF'],
  cyan: ['#DDF8FA', '#FFF9EF'],
  coral: ['#FFE4DE', '#FFF9EF'],
  gold: ['#FFF0C9', '#FFF9EF'],
} as const;

export function MobileActionCard({
  title,
  caption,
  icon,
  tone,
  onPress,
}: {
  title: string;
  caption: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: keyof typeof tones;
  onPress: () => void;
}) {
  const accent = tone === 'violet' ? colors.violet : tone === 'cyan' ? '#0099A7' : tone === 'coral' ? colors.coral : '#C78300';
  return (
    <MotionPressable onPress={onPress} style={styles.card} scaleTo={0.97}>
      <LinearGradient colors={tones[tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.icon, { backgroundColor: accent }]}><Ionicons name={icon} size={20} color={colors.paper} /></View>
      <View style={styles.copy}><Text numberOfLines={1} style={styles.title}>{title}</Text><Text numberOfLines={1} style={styles.caption}>{caption}</Text></View>
      <View style={styles.arrow}><Ionicons name="arrow-forward" size={14} color={colors.text} /></View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 92,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.soft,
  },
  icon: { width: 39, height: 39, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { marginTop: 10, paddingRight: 24 },
  title: { color: colors.text, fontSize: 13, fontWeight: '900' },
  caption: { marginTop: 3, color: colors.textSecondary, fontSize: 9, fontWeight: '700' },
  arrow: { position: 'absolute', right: 10, bottom: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
});
