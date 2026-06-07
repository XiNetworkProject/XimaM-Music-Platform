import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlobalSearchBar({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <View style={styles.brandBox}>
          <Image source={{ uri: 'https://xima-m-music-platform.vercel.app/brand/2026/synaura-symbol-2026.png' }} style={styles.logo} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>Synaura</Text>
          <Text style={styles.brandSubtitle}>ecoute · cree · remix</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.roundButton}>
          <Ionicons name="notifications-outline" size={20} color="rgba(23,19,19,0.68)" />
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Upload')} style={styles.publishButton}>
          <Text style={styles.publishText}>Publier</Text>
        </Pressable>
      </View>
      <View style={styles.searchStrip}>
        <Pressable onPress={onOpen} style={styles.searchPill}>
          <Ionicons name="search" size={17} color="rgba(23,19,19,0.40)" />
          <Text style={styles.searchPlaceholder}>Rechercher sons, artistes, playlists...</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Upload')} style={styles.studioMiniButton}>
          <Ionicons name="sparkles" size={15} color="rgba(23,19,19,0.68)" />
          <Text style={styles.studioMiniText}>Studio</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
    borderRadius: 26,
    backgroundColor: 'rgba(255,250,242,0.96)',
    padding: 10,
    shadowColor: '#1E1914',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  brandBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  logo: { width: 48, height: 48, resizeMode: 'contain' },
  brandText: { flex: 1, minWidth: 0 },
  brandTitle: { color: '#171313', fontSize: 22, fontWeight: '900' },
  brandSubtitle: {
    color: 'rgba(23,19,19,0.35)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  publishButton: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171313',
    paddingHorizontal: 14,
  },
  publishText: { color: '#FFFAF2', fontSize: 12, fontWeight: '900' },
  searchStrip: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  searchPill: {
    flex: 1,
    minWidth: 0,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 21,
    backgroundColor: 'rgba(255,250,242,0.96)',
    paddingHorizontal: 14,
  },
  searchPlaceholder: {
    flex: 1,
    minWidth: 0,
    color: 'rgba(23,19,19,0.40)',
    fontSize: 12,
    fontWeight: '800',
  },
  studioMiniButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 21,
    backgroundColor: 'rgba(255,250,242,0.96)',
    paddingHorizontal: 14,
  },
  studioMiniText: {
    color: 'rgba(23,19,19,0.68)',
    fontSize: 12,
    fontWeight: '900',
  },
});
