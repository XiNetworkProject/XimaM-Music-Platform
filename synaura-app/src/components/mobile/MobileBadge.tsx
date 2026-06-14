import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme/tokens';

const TIERS = {
  bronze: { colors: ['#D7A57A', '#F2D6B9'] as const, icon: 'sparkles' as const },
  silver: { colors: ['#AEB8C4', '#EDF2F7'] as const, icon: 'diamond' as const },
  gold: { colors: ['#F5B84B', '#FFE8A3'] as const, icon: 'trophy' as const },
  prism: { colors: ['#8B5CF6', '#22D3EE'] as const, icon: 'pulse' as const },
};

export function MobileBadge({
  label,
  description,
  tier = 'prism',
  progress,
}: {
  label: string;
  description?: string;
  tier?: keyof typeof TIERS;
  progress?: number;
}) {
  const meta = TIERS[tier];
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));
  return (
    <View style={styles.root}>
      <LinearGradient colors={meta.colors} style={styles.icon}>
        <Ionicons name={meta.icon} size={18} color={colors.paper} />
      </LinearGradient>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.label}>{label}</Text>
        {description ? <Text numberOfLines={2} style={styles.description}>{description}</Text> : null}
        {progress !== undefined ? <View style={styles.track}><LinearGradient colors={['#8B5CF6', '#22D3EE']} style={[styles.fill, { width: `${safeProgress}%` }]} /></View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,249,239,0.82)',
    padding: 10,
  },
  icon: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.text, fontSize: 11, fontWeight: '900' },
  description: { marginTop: 3, color: colors.textSecondary, fontSize: 8, lineHeight: 12, fontWeight: '700' },
  track: { height: 4, marginTop: 7, overflow: 'hidden', borderRadius: 2, backgroundColor: 'rgba(23,19,19,0.07)' },
  fill: { height: 4, borderRadius: 2 },
});
