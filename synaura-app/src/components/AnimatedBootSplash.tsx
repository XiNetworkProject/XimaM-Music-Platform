import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { EntryAtmosphere } from '@/components/entry/EntryAtmosphere';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { entry } from '@/theme/entry';

export function AnimatedBootSplash() {
  const { settings } = useMobileSettings();
  const [visible, setVisible] = useState(true);
  const reveal = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let alive = true;
    let sequence: Animated.CompositeAnimation | undefined;
    // Never hold the app behind an animation or an accessibility bridge timeout.
    const watchdog = setTimeout(() => setVisible(false), 1600);
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then(reduced => {
      if (!alive) return;
      const minimal = reduced || settings.reducedMotion;
      sequence = Animated.sequence([
        Animated.timing(reveal, { toValue: 1, duration: minimal ? 0 : 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(minimal ? 100 : 160),
        Animated.timing(opacity, { toValue: 0, duration: minimal ? 0 : 280, useNativeDriver: true }),
      ]);
      sequence.start(({ finished }) => { if (alive && finished) setVisible(false); });
    });
    return () => { alive = false; clearTimeout(watchdog); sequence?.stop(); };
  }, [opacity, reveal, settings.reducedMotion]);
  if (!visible) return null;
  return <Animated.View style={[styles.overlay, { opacity }]} accessibilityViewIsModal>
    <EntryAtmosphere><View style={styles.center}>
      <Animated.View style={{ opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [.85, 1] }) }] }}><SynauraMark size={108} /></Animated.View>
      <Animated.View style={{ opacity: reveal }}><Text style={styles.name}>SYNAURA</Text><Text style={styles.caption}>LA MUSIQUE NOUS RELIE</Text></Animated.View>
    </View></EntryAtmosphere>
  </Animated.View>;
}
const styles = StyleSheet.create({ overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10000, elevation: 10000, backgroundColor: entry.background }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }, name: { fontFamily: 'Inter_800ExtraBold', fontSize: 27, letterSpacing: 4, color: entry.text, textAlign: 'center' }, caption: { marginTop: 12, color: entry.muted, fontSize: 9, letterSpacing: 2.2, textAlign: 'center' } });
