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

const BASES: Record<Variant, [string, string, string]> = {
  warm: ['#121212', '#121212', '#0B0B0B'],
  feed: ['#121212', '#121212', '#0E0E0E'],
  dark: ['#090909', '#0D0D0D', '#121212'],
};

const TRACK_TONES = ['#7357C6', '#4A9EAA', '#D96D63', '#B88B3B', '#C85D82'];

export function SynauraBackground({ children, variant = 'warm', showGrid = false, animated = true }: Props) {
  const { settings } = useMobileSettings();
  const player = usePlayer();
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused?.() ?? true);
  const drift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const activeKey = player.current?._id || player.current?.title || '';
  const activeTone = TRACK_TONES[Array.from(activeKey).reduce((sum, char) => sum + char.charCodeAt(0), 0) % TRACK_TONES.length];
  const dynamic = Boolean(player.current && settings.dynamicBackground);
  const base = BASES[variant];
  const toneOpacity = variant === 'dark' ? '2D' : '24';

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
        colors={['rgba(115,87,198,0.20)', 'rgba(115,87,198,0.02)', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.86 }}
        style={styles.topAtmosphere}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(74,158,170,0.025)', 'rgba(74,158,170,0.14)']}
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
            opacity: dynamic ? 1 : 0.58,
            transform: [
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-34, 22] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[dynamic ? `${activeTone}${toneOpacity}` : 'rgba(217,109,99,0.12)', 'rgba(217,109,99,0.025)', 'transparent']}
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
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
            transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] }) }],
          },
        ]}
      >
        <LinearGradient colors={['transparent', 'rgba(115,87,198,0.34)', 'rgba(74,158,170,0.22)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.signalLine} />
        <LinearGradient colors={['transparent', 'rgba(217,109,99,0.18)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.signalLine, styles.signalLineSecondary]} />
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
