import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedChallenge } from './feedTypes';

type Props = {
  challenge: FeedChallenge;
  height: number;
  topPad: number;
  bottomPad: number;
  isActive: boolean;
  onOpen: () => void;
  isMusicChallenge?: boolean;
};

export function ChallengeSlide({ challenge, height, topPad, bottomPad, isActive, onOpen, isMusicChallenge = false }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [isActive, pulse]);

  return (
    <View style={[styles.root, { height, paddingTop: topPad + 92, paddingBottom: bottomPad + 24 }]}>
      <LinearGradient colors={['#fffaf2', '#fff1e6', '#f6ece2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.14, 0.3, 0.14] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
          },
        ]}
      />
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="trophy" size={24} color="#FFFAF2" /></View>
        <Text style={styles.kicker}>{isMusicChallenge ? 'DÉFI SYNAURA' : 'DÉFI SYNAURA PULSE'}</Text>
        <Text style={styles.title}>{challenge.title}</Text>
        {challenge.description ? <Text style={styles.text}>{challenge.description}</Text> : null}
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statText}>{challenge.tracksCount} inscrits</Text></View>
          {typeof challenge.totalVotes === 'number' ? (
            <View style={styles.stat}><Text style={styles.statText}>{challenge.totalVotes} votes</Text></View>
          ) : null}
          {typeof challenge.participationCount === 'number' ? (
            <View style={styles.stat}><Text style={styles.statText}>{challenge.participationCount} participants</Text></View>
          ) : null}
        </View>
        <Pressable accessibilityLabel="Voir le défi" onPress={onOpen} style={styles.button}>
          <Text style={styles.buttonText}>Voir le défi</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFAF2" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', justifyContent: 'center', paddingHorizontal: 18 },
  orb: { position: 'absolute', right: -70, top: 120, width: 240, height: 240, borderRadius: 120, backgroundColor: '#D96D63' },
  card: {
    overflow: 'hidden', borderRadius: 34, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,250,242,0.9)', padding: 24,
    shadowColor: '#1E1914', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 10,
  },
  icon: { width: 56, height: 56, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  kicker: { marginTop: 22, color: '#D96D63', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { marginTop: 8, color: '#171313', fontSize: 30, lineHeight: 33, fontWeight: '900', letterSpacing: -1 },
  text: { marginTop: 12, color: 'rgba(23,19,19,0.58)', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  stats: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { paddingHorizontal: 12, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(23,19,19,0.055)' },
  statText: { color: 'rgba(23,19,19,0.62)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  button: {
    marginTop: 22, alignSelf: 'flex-start', height: 46, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, borderRadius: 23, backgroundColor: '#171313',
  },
  buttonText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
});

export default ChallengeSlide;
