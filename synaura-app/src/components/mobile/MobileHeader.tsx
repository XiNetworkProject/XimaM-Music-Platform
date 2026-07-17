import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/player/PlayerProvider';
import { MobileAccountButton } from '@/components/account/MobileAccountMenu';
import { MobileAnimatedLogo } from '@/components/mobile/MobileAnimatedLogo';
import { colors, shadows } from '@/theme/tokens';

export const MOBILE_HEADER_EXPANDED_HEIGHT = 108;

export function MobileHeader({
  scrollY,
  unread = 0,
  onSearch,
  onPublish,
  onNotifications,
}: {
  scrollY: Animated.Value;
  unread?: number;
  onSearch: () => void;
  onPublish: () => void;
  onNotifications: () => void;
}) {
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [compact, setCompact] = useState(false);
  const progress = scrollY.interpolate({ inputRange: [0, 78], outputRange: [0, 1], extrapolate: 'clamp' });
  const height = scrollY.interpolate({
    inputRange: [0, 78],
    outputRange: [insets.top + MOBILE_HEADER_EXPANDED_HEIGHT, insets.top + 64],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setCompact((current) => {
        const next = current ? value > 28 : value > 48;
        return current === next ? current : next;
      });
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  return (
    <Animated.View style={[styles.shell, { height }]}>
      <BlurView intensity={56} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents={compact ? 'none' : 'auto'} style={[styles.large, { paddingTop: insets.top + 7, opacity: progress.interpolate({ inputRange: [0, 0.64], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }]}>
        <View style={styles.brandRow}>
          <MobileAnimatedLogo playing={player.isPlaying} loading={player.isLoading} size={46} />
          <View style={styles.brandCopy}><Text style={styles.brand}>Synaura</Text><Text style={styles.signature}>ÉCOUTE · CRÉE · REMIX</Text></View>
          <HeaderIcon icon="notifications-outline" badge={unread} onPress={onNotifications} />
          <Pressable accessibilityLabel="Publier" onPress={onPublish} style={styles.add}><Ionicons name="add" size={21} color={colors.paper} /></Pressable>
          <MobileAccountButton compact />
        </View>
        <Pressable accessibilityLabel="Rechercher sur Synaura" onPress={onSearch} style={styles.largeSearch}>
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <Text numberOfLines={1} style={styles.searchText}>Rechercher sons, artistes, playlists...</Text>
          <Ionicons name="options-outline" size={16} color={colors.textTertiary} />
        </Pressable>
      </Animated.View>

      <Animated.View pointerEvents={compact ? 'auto' : 'none'} style={[styles.compact, { paddingTop: insets.top + 7, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
        <MobileAnimatedLogo playing={player.isPlaying} loading={player.isLoading} size={39} />
        <Pressable accessibilityLabel="Rechercher sur Synaura" onPress={onSearch} style={styles.compactSearch}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <Text numberOfLines={1} style={styles.searchText}>Rechercher sur Synaura...</Text>
        </Pressable>
        <HeaderIcon icon="notifications-outline" badge={unread} onPress={onNotifications} compact />
        <Pressable accessibilityLabel="Publier" onPress={onPublish} style={styles.add}><Ionicons name="add" size={21} color={colors.paper} /></Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function HeaderIcon({ icon, badge = 0, onPress, compact = false }: { icon: React.ComponentProps<typeof Ionicons>['name']; badge?: number; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.iconButton, compact && styles.iconButtonCompact]}>
      <Ionicons name={icon} size={compact ? 18 : 19} color={colors.text} />
      {badge ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    zIndex: 50,
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    backgroundColor: 'rgba(13,13,13,0.9)',
    ...shadows.soft,
  },
  large: { ...StyleSheet.absoluteFillObject, paddingHorizontal: 9, paddingBottom: 8 },
  brandRow: { height: 49, flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandCopy: { flex: 1, minWidth: 0 },
  brand: { color: colors.text, fontSize: 20, fontWeight: '900' },
  signature: { marginTop: 1, color: colors.textTertiary, fontSize: 7, fontWeight: '900', letterSpacing: 1.05 },
  publish: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 19, backgroundColor: colors.text, paddingHorizontal: 11 },
  publishText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  largeSearch: { height: 42, marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 12 },
  searchText: { flex: 1, minWidth: 0, color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  compact: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: 9 },
  compactSearch: { flex: 1, height: 39, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 11 },
  iconButton: { position: 'relative', width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  iconButtonCompact: { width: 39, height: 39, borderRadius: 11 },
  badge: { position: 'absolute', right: -2, top: -2, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coral, paddingHorizontal: 3 },
  badgeText: { color: colors.paper, fontSize: 7, fontWeight: '900' },
  add: { width: 39, height: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
});
