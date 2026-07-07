import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { FeedCollection } from './feedTypes';

type Props = {
  collection: FeedCollection;
  height: number;
  topPad: number;
  bottomPad: number;
  launching: boolean;
  onLaunch: () => void;
  onViewSelection: () => void;
};

export function CollectionSlide({ collection, height, topPad, bottomPad, launching, onLaunch, onViewSelection }: Props) {
  const colorsPair = collection.themeColors && collection.themeColors.length >= 2
    ? [collection.themeColors[0], collection.themeColors[1]]
    : ['#7357C6', '#4A9EAA'];

  return (
    <View style={[styles.root, { height, paddingTop: topPad + 92, paddingBottom: bottomPad + 24 }]}>
      <LinearGradient colors={colorsPair as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.scrim} />

      <View style={styles.center}>
        <View style={styles.coverShell}>
          <Image
            source={{ uri: collection.coverUrl || collection.bannerUrl || undefined }}
            style={styles.cover}
          />
        </View>
        <Text style={styles.badge}>{collection.badge || 'Collection'}</Text>
        <Text style={styles.title}>{collection.title}</Text>
        {collection.subtitle ? <Text numberOfLines={3} style={styles.subtitle}>{collection.subtitle}</Text> : null}
        <Text style={styles.count}>
          {collection.trackCount} morceau{collection.trackCount > 1 ? 'x' : ''}
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable accessibilityLabel="Lancer la collection" disabled={launching} onPress={onLaunch} style={styles.primaryButton}>
          {launching ? <ActivityIndicator color="#FFFAF2" /> : <Ionicons name="play" size={16} color="#FFFAF2" />}
          <Text style={styles.primaryText}>Lancer la collection</Text>
        </Pressable>
        <Pressable accessibilityLabel="Voir la sélection" onPress={onViewSelection} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Voir la sélection</Text>
          <Ionicons name="arrow-forward" size={14} color="#171313" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', paddingHorizontal: 20, justifyContent: 'space-between' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,10,14,0.38)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverShell: {
    width: 190, height: 190, borderRadius: 22, overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 10,
  },
  cover: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.08)' },
  badge: { marginTop: 22, color: 'rgba(255,250,242,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { marginTop: 8, maxWidth: 300, textAlign: 'center', color: '#FFFAF2', fontSize: 24, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { marginTop: 10, maxWidth: 280, textAlign: 'center', color: 'rgba(255,250,242,0.68)', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  count: { marginTop: 14, color: 'rgba(255,250,242,0.55)', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderRadius: 28, backgroundColor: 'rgba(255,250,242,0.96)', padding: 14 },
  primaryButton: {
    flex: 1, minWidth: 160, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 23, backgroundColor: '#171313',
  },
  primaryText: { color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: 'rgba(23,19,19,0.07)',
  },
  secondaryText: { color: '#171313', fontSize: 13, fontWeight: '900' },
});

export default CollectionSlide;
