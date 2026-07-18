import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContext } from '@react-navigation/native';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { usePlayer } from '@/player/PlayerProvider';

type Variant = 'warm' | 'feed' | 'dark';

type Props = {
  children?: React.ReactNode;
  variant?: Variant;
  showGrid?: boolean;
  animated?: boolean;
};

const DARK_BASES: Record<Variant, [string, string, string]> = {
  warm: ['#0D0D0D', '#101010', '#090909'],
  feed: ['#090909', '#0D0D0D', '#090909'],
  dark: ['#080909', '#0D0D0D', '#101010'],
};

const LIGHT_BASES: Record<Variant, [string, string, string]> = {
  warm: ['#F7F6F3', '#F1EFEA', '#ECEAE5'],
  feed: ['#F7F6F3', '#F3F1EC', '#ECEAE5'],
  // Les surfaces media explicitement sombres restent immersives.
  dark: DARK_BASES.dark,
};

const TRACK_TONES = ['#7357C6', '#4A9EAA', '#D96D63', '#B88B3B', '#C85D82'];

export function SynauraBackground({ children, variant = 'warm', showGrid = false, animated = true }: Props) {
  const { settings, resolvedTheme } = useMobileSettings();
  const player = usePlayer();
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused?.() ?? true);
  const drift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const activeKey = player.current?._id || player.current?.title || '';
  const activeTone = TRACK_TONES[Array.from(activeKey).reduce((sum, char) => sum + char.charCodeAt(0), 0) % TRACK_TONES.length];
  const dynamic = Boolean(player.current && settings.dynamicBackground);
  const isLight = resolvedTheme === 'light' && variant !== 'dark';
  const base = isLight ? LIGHT_BASES[variant] : DARK_BASES[variant];
  const toneOpacity = variant === 'dark' ? '1F' : '1A';

  useEffect(() => {
    if (!navigation) {
      setFocused(true);
      return undefined;
    }
    setFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubscribeBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    if (!animated || !focused || settings.reducedMotion || !settings.dynamicBackground) {
      drift.stopAnimation();
      shimmer.stopAnimation();
      drift.setValue(0);
      shimmer.setValue(0);
      return;
    }

    const driftLoop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    const shimmerLoop = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 7600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true, isInteraction: false }),
      Animated.timing(shimmer, { toValue: 0, duration: 7600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true, isInteraction: false }),
    ]));
    driftLoop.start();
    shimmerLoop.start();
    return () => {
      driftLoop.stop();
      shimmerLoop.stop();
    };
  }, [animated, drift, focused, settings.dynamicBackground, settings.reducedMotion, shimmer]);

  return (
    <View pointerEvents={children ? 'auto' : 'none'} style={[styles.root, !children && styles.backdrop, { backgroundColor: base[0] }]}>
      <LinearGradient colors={base} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        pointerEvents="none"
        colors={isLight ? ['rgba(115,87,198,0.10)', 'rgba(115,87,198,0.02)', 'transparent'] : ['rgba(115,87,198,0.11)', 'rgba(115,87,198,0.025)', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.86 }}
        style={styles.topAtmosphere}
      />
      <LinearGradient
        pointerEvents="none"
        colors={isLight ? ['transparent', 'rgba(74,158,170,0.012)', 'rgba(74,158,170,0.06)'] : ['transparent', 'rgba(74,158,170,0.018)', 'rgba(74,158,170,0.075)']}
        locations={[0, 0.58, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.movingField,
          {
            opacity: dynamic ? (isLight ? 0.46 : 0.72) : (isLight ? 0.2 : 0.35),
            transform: [
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-34, 22] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[dynamic ? `${activeTone}${toneOpacity}` : isLight ? 'rgba(217,109,99,0.045)' : 'rgba(217,109,99,0.065)', isLight ? 'rgba(217,109,99,0.012)' : 'rgba(217,109,99,0.018)', 'transparent']}
          locations={[0, 0.42, 1]}
          start={{ x: 0, y: 0.1 }}
          end={{ x: 1, y: 0.76 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.signalField,
          {
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] }),
            transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) }],
          },
        ]}
      >
        <LinearGradient colors={['transparent', 'rgba(115,87,198,0.18)', 'rgba(74,158,170,0.12)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.signalLine} />
        <LinearGradient colors={['transparent', 'rgba(217,109,99,0.1)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.signalLine, styles.signalLineSecondary]} />
      </Animated.View>
      {showGrid ? <View pointerEvents="none" style={styles.grid}>{[0, 1, 2, 3].map((index) => <View key={index} style={styles.rule} />)}</View> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  topAtmosphere: { position: 'absolute', top: 0, left: 0, right: 0, height: 430 },
  movingField: { position: 'absolute', top: -80, left: -70, width: '125%', height: 520 },
  signalField: { position: 'absolute', top: '28%', left: -24, right: -24, height: 180 },
  signalLine: { position: 'absolute', top: 16, left: 0, right: 0, height: 1 },
  signalLineSecondary: { top: 122, left: '16%', right: '-12%' },
  grid: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-evenly', opacity: 0.38 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.08)' },
});
