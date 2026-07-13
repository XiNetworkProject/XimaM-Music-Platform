import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedAnnouncement } from './feedTypes';

type Props = {
  announcement: FeedAnnouncement;
  height: number;
  topPad: number;
  bottomPad: number;
  onOpen: () => void;
};

export function AnnouncementSlide({ announcement, height, topPad, bottomPad, onOpen }: Props) {
  return (
    <View style={[styles.root, { height, paddingTop: topPad + 92, paddingBottom: bottomPad + 24 }]}>
      <LinearGradient colors={['#fffaf2', '#eaf6f6', '#f6ece2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="megaphone" size={22} color="#FFFAF2" /></View>
        <Text style={styles.kicker}>ACTU SYNAURA</Text>
        <Text style={styles.title}>{announcement.title}</Text>
        {announcement.description ? <Text style={styles.text}>{announcement.description}</Text> : null}
        <Text style={styles.count}>
          {announcement.tracksCount} morceau{announcement.tracksCount > 1 ? 'x' : ''} à découvrir
        </Text>
        <Pressable accessibilityLabel="Découvrir" onPress={onOpen} style={styles.button}>
          <Text style={styles.buttonText}>Découvrir</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFAF2" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', justifyContent: 'center', paddingHorizontal: 18 },
  card: {
    overflow: 'hidden', borderRadius: 34, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)',
    backgroundColor: 'rgba(255,250,242,0.9)', padding: 24,
    shadowColor: '#1E1914', shadowOpacity: 0.16, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 10,
  },
  icon: { width: 52, height: 52, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  kicker: { marginTop: 20, color: '#4A9EAA', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { marginTop: 8, color: '#171313', fontSize: 27, lineHeight: 30, fontWeight: '900' },
  text: { marginTop: 12, color: 'rgba(23,19,19,0.58)', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  count: { marginTop: 14, color: 'rgba(23,19,19,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  button: {
    marginTop: 22, alignSelf: 'flex-start', height: 46, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, borderRadius: 23, backgroundColor: '#171313',
  },
  buttonText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
});

export default AnnouncementSlide;
