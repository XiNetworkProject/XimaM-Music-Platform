import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getHomeData } from '@/api/client';
import type { Playlist } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackList } from '@/components/TrackList';
import { MotionPressable, Reveal } from '@/components/motion/Motion';
import { useLibrary } from '@/library/LibraryProvider';
import { colors, radius, spacing } from '@/theme/tokens';

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const library = useLibrary();
  const [tab, setTab] = useState<'favorites' | 'recent'>('favorites');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const tracks = tab === 'favorites' ? library.favorites : library.recent;

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const data = await getHomeData();
      setPlaylists(data.playlists);
    } finally {
      setLoadingPlaylists(false);
    }
  }, []);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  return (
    <SynauraBackground>
      <TrackList
        tracks={tracks}
        emptyTitle={tab === 'favorites' ? 'Aucun favori' : 'Aucun historique'}
        emptyText={tab === 'favorites' ? 'Ajoute des titres avec le coeur sur les cartes.' : 'Les pistes ecoutees apparaissent ici automatiquement.'}
        header={
          <View style={styles.header}>
            <Reveal>
              <View style={styles.titleRow}>
                <View>
                  <Text style={styles.kicker}>TA MUSIQUE, RELIÉE</Text>
                  <Text style={styles.title}>Bibliothèque</Text>
                </View>
                <MotionPressable accessibilityLabel="Découvrir des sons" onPress={() => navigation.navigate('Discover')} style={styles.discoverButton} scaleTo={0.9}>
                  <Ionicons name="compass-outline" size={20} color="#FFFAF2" />
                </MotionPressable>
              </View>
            </Reveal>

            <Reveal delay={60}>
              <View style={styles.segment}>
                <Pressable onPress={() => setTab('favorites')} style={[styles.segmentButton, tab === 'favorites' && styles.segmentButtonActive]}>
                  <Ionicons name={tab === 'favorites' ? 'heart' : 'heart-outline'} size={15} color={tab === 'favorites' ? colors.black : colors.textSecondary} />
                  <Text style={[styles.segmentText, tab === 'favorites' && styles.segmentTextActive]}>Favoris</Text>
                </Pressable>
                <Pressable onPress={() => setTab('recent')} style={[styles.segmentButton, tab === 'recent' && styles.segmentButtonActive]}>
                  <Ionicons name="time-outline" size={15} color={tab === 'recent' ? colors.black : colors.textSecondary} />
                  <Text style={[styles.segmentText, tab === 'recent' && styles.segmentTextActive]}>Récents</Text>
                </Pressable>
              </View>
            </Reveal>

            <Reveal delay={110}>
              <View style={styles.sectionHead}>
                <View>
                  <Text style={styles.sectionTitle}>Albums et playlists</Text>
                  <Text style={styles.sectionText}>Passe d'une collection à son univers complet.</Text>
                </View>
                {loadingPlaylists ? <ActivityIndicator color="#7C5CFF" /> : null}
              </View>
              {playlists.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistRail}>
                  {playlists.slice(0, 10).map((playlist) => (
                    <MotionPressable
                      key={playlist.id}
                      accessibilityLabel={`Ouvrir ${playlist.title}`}
                      onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })}
                      style={styles.playlistCard}
                      lift={2}
                    >
                      <View style={styles.playlistCover}>
                        {playlist.covers[0] ? <Image source={{ uri: playlist.covers[0] }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={24} color="rgba(23,19,19,0.36)" />}
                        <View style={styles.playlistArrow}><Ionicons name="arrow-forward" size={13} color="#171313" /></View>
                      </View>
                      <Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text>
                      <Text numberOfLines={1} style={styles.playlistMeta}>{playlist.tracks}</Text>
                    </MotionPressable>
                  ))}
                </ScrollView>
              ) : !loadingPlaylists ? (
                <Pressable onPress={() => navigation.navigate('Discover')} style={styles.noPlaylist}>
                  <Ionicons name="add" size={17} color="#171313" />
                  <Text style={styles.noPlaylistText}>Trouver une playlist</Text>
                </Pressable>
              ) : null}
            </Reveal>

            <Reveal delay={160}>
              <MotionPressable onPress={() => navigation.navigate('Subscriptions')} style={styles.membership} lift={2}>
                <View style={styles.membershipIcon}><Ionicons name="sparkles" size={19} color="#FFFAF2" /></View>
                <View style={styles.membershipCopy}>
                  <Text style={styles.membershipTitle}>Une bibliothèque qui grandit avec toi</Text>
                  <Text style={styles.membershipText}>Plus de créations et de stockage avec Synaura+.</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="rgba(23,19,19,0.38)" />
              </MotionPressable>
            </Reveal>

            <View style={styles.listHead}>
              <Text style={styles.sectionTitle}>{tab === 'favorites' ? 'Tes favoris' : 'Reprendre l’écoute'}</Text>
              {tab === 'recent' && library.recent.length > 0 ? (
                <Pressable onPress={library.clearRecent} style={styles.clearButton}>
                  <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.clearText}>Vider</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
      />
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: colors.textTertiary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  title: { marginTop: 3, color: colors.text, fontSize: 31, fontWeight: '900' },
  discoverButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171313' },
  segment: { marginTop: spacing.lg, flexDirection: 'row', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface, padding: 4 },
  segmentButton: { flex: 1, height: 40, flexDirection: 'row', gap: 7, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: colors.white },
  segmentText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  segmentTextActive: { color: colors.black },
  sectionHead: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionText: { marginTop: 3, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  playlistRail: { gap: spacing.sm, paddingTop: spacing.md, paddingRight: spacing.lg },
  playlistCard: { width: 132 },
  playlistCover: { width: 132, height: 132, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,19,0.06)' },
  playlistArrow: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.94)' },
  playlistTitle: { marginTop: 8, color: colors.text, fontSize: 12, fontWeight: '900' },
  playlistMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  noPlaylist: { marginTop: spacing.md, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  noPlaylistText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  membership: { marginTop: spacing.xl, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(124,92,255,0.18)', backgroundColor: 'rgba(245,239,255,0.76)', padding: spacing.md },
  membershipIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF' },
  membershipCopy: { flex: 1, minWidth: 0 },
  membershipTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  membershipText: { marginTop: 3, color: colors.textTertiary, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  listHead: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearButton: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  clearText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
});
