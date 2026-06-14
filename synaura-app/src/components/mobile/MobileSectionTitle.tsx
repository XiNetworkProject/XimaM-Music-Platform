import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

export function MobileSectionTitle({ eyebrow, title, subtitle, action, onAction, style }: { eyebrow?: string; title: string; subtitle?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? <Pressable onPress={onAction} style={styles.action}><Text style={styles.actionText}>{action}</Text><Ionicons name="arrow-forward" size={13} color={colors.text} /></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 12 },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.violet, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase' },
  title: { marginTop: 3, color: colors.text, fontSize: 22, lineHeight: 25, fontWeight: '900' },
  subtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  action: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 17, backgroundColor: 'rgba(255,249,239,0.74)', paddingHorizontal: 11 },
  actionText: { color: colors.text, fontSize: 9, fontWeight: '900' },
});
