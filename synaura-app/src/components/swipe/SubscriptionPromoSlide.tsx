import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type Props = {
  height: number;
  topPad: number;
  bottomPad: number;
  isActive: boolean;
  onOpenSubscriptions: () => void;
};

const benefits = [
  { icon: 'sparkles', label: 'Plus de créations IA' },
  { icon: 'cloud-upload-outline', label: 'Plus de stockage' },
  { icon: 'flash-outline', label: 'Mise en avant artiste' },
] as const;

export function SubscriptionPromoSlide({ height, topPad, bottomPad, isActive, onOpenSubscriptions }: Props) {
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      reveal.setValue(0);
      pulse.setValue(0);
      return;
    }
    Animated.spring(reveal, {
      toValue: 1,
      speed: 16,
      bounciness: 7,
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, pulse, reveal]);

  const open = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onOpenSubscriptions();
  };

  return (
    <View style={[styles.page, { height }]}>
      <ImageBackground
        source={require('../../assets/promos/synaura-subscriptions-interlude.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['rgba(4,4,10,0.18)', 'rgba(4,4,10,0.16)', 'rgba(4,4,10,0.96)']}
          locations={[0, 0.47, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.aura,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.58] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.12] }) }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: topPad + 88,
              paddingBottom: bottomPad + 26,
              opacity: reveal,
              transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
            },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/synaura-symbol-2026.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.kicker}>UN MOMENT POUR TON UNIVERS</Text>
              <Text style={styles.brand}>Synaura+</Text>
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Passe de l'idée au morceau qui reste.</Text>
            <Text style={styles.subtitle}>
              Crée davantage, publie sans te limiter et donne plus de portée à tes sorties.
            </Text>
          </View>

          <View style={styles.benefits}>
            {benefits.map((benefit, index) => (
              <Animated.View
                key={benefit.label}
                style={[
                  styles.benefit,
                  {
                    opacity: reveal,
                    transform: [{
                      translateX: reveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18 + index * 8, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Ionicons name={benefit.icon} size={17} color="#FFFAF2" />
                <Text style={styles.benefitText}>{benefit.label}</Text>
              </Animated.View>
            ))}
          </View>

          <Pressable accessibilityLabel="Découvrir les abonnements Synaura" onPress={open} style={styles.cta}>
            <LinearGradient colors={['#FF4B7A', '#E9385E', '#4FA8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Découvrir les offres</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFAF2" />
            </LinearGradient>
          </Pressable>

          <View style={styles.continueRow}>
            <Ionicons name="chevron-up" size={15} color="rgba(255,250,242,0.54)" />
            <Text style={styles.continueText}>Continue de swiper, la musique ne s'arrête pas</Text>
          </View>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', overflow: 'hidden', backgroundColor: '#05050B' },
  aura: {
    position: 'absolute',
    left: '18%',
    top: '28%',
    width: '64%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#FF4B7A',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 22,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,242,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  logo: { width: 40, height: 40 },
  kicker: { color: 'rgba(255,250,242,0.58)', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  brand: { marginTop: 2, color: '#FFFAF2', fontSize: 18, fontWeight: '900' },
  copy: { marginTop: 18 },
  title: { maxWidth: 330, color: '#FFFAF2', fontSize: 35, lineHeight: 38, fontWeight: '900' },
  subtitle: { maxWidth: 340, marginTop: 10, color: 'rgba(255,250,242,0.66)', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  benefits: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  benefit: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(5,5,11,0.42)',
    paddingHorizontal: 11,
  },
  benefitText: { color: 'rgba(255,250,242,0.82)', fontSize: 10, fontWeight: '900' },
  cta: { marginTop: 18, overflow: 'hidden', borderRadius: 24 },
  ctaGradient: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  ctaText: { color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  continueRow: { marginTop: 13, alignItems: 'center', gap: 2 },
  continueText: { color: 'rgba(255,250,242,0.46)', fontSize: 9, fontWeight: '800' },
});
