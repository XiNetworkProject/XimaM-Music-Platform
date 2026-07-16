import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { usePlayer } from '@/player/PlayerProvider';

type Variant = 'warm' | 'feed' | 'dark';

type Props = {
  children?: React.ReactNode;
  variant?: Variant;
  showGrid?: boolean;
  animated?: boolean;
};

const BASES: Record<Variant, [string, string, string]> = {
  warm: ['#F7F6F3', '#F7F6F3', '#F1EFEA'],
  feed: ['#FAF9F6', '#F7F6F3', '#F7F6F3'],
  dark: ['#090909', '#0D0D0D', '#151412'],
};

const TRACK_TONES = ['#7357C6', '#4A9EAA', '#D96D63', '#B88B3B', '#C85D82'];

export function SynauraBackground({ children, variant = 'warm', showGrid = false }: Props) {
  const { settings } = useMobileSettings();
  const player = usePlayer();
  const activeKey = player.current?._id || player.current?.title || '';
  const activeTone = TRACK_TONES[Array.from(activeKey).reduce((sum, char) => sum + char.charCodeAt(0), 0) % TRACK_TONES.length];
  const dynamic = Boolean(player.current && settings.dynamicBackground);
  const base = BASES[variant];
  const toneOpacity = variant === 'dark' ? '1A' : '0D';

  return (
    <View pointerEvents={children ? 'auto' : 'none'} style={[styles.root, !children && styles.backdrop, { backgroundColor: base[0] }]}>
      <LinearGradient colors={base} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFillObject} />
      {dynamic ? (
        <LinearGradient
          pointerEvents="none"
          colors={[`${activeTone}${toneOpacity}`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.55 }}
          style={styles.trackWash}
        />
      ) : null}
      {showGrid ? <View pointerEvents="none" style={[styles.rule, { backgroundColor: variant === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,17,0.07)' }]} /> : null}
      {dynamic ? <View pointerEvents="none" style={[styles.signal, { backgroundColor: activeTone }]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  trackWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  signal: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.88 },
  rule: { position: 'absolute', top: '34%', left: 18, right: 18, height: StyleSheet.hairlineWidth },
});
