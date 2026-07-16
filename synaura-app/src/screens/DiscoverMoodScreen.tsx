import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDiscoverMoodTracks } from '@/api/client';
import type { Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { AppHeader } from '@/components/ui/AppHeader';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';
import { getMoodById } from '@/discover/moods';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export function DiscoverMoodScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const player = usePlayer();
  const mood = getMoodById(route.params?.moodId);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [hasEnough, setHasEnough] = useState(true);

  const load = useCallback(async () => {
    if (!mood) return;
    setLoading(true);
    try {
      const result = await getDiscoverMoodTracks(mood.id, 40);
      setTracks(result.tracks);
      setHasEnough(result.hasEnough);
    } catch {
      setHasEnough(false);
    } finally {
      setLoading(false);
    }
  }, [mood]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!mood) {
    return (
      <SynauraBackground>
        <AppHeader title="Ambiance" onBack={() => navigation.goBack()} />
        <View style={styles.emptyState}><Text style={styles.emptyText}>Ambiance introuvable.</Text></View>
      </SynauraBackground>
    );
  }

  const playable = tracks.filter((track) => track.audioUrl);

  return (
    <SynauraBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          responsive.pageContent,
          { paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 120, responsive.miniPlayerClearance) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title="Découvrir" onBack={() => navigation.goBack()} />

        <LinearGradient colors={mood.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          {playable[0]?.coverUrl ? <Image source={{ uri: playable[0].coverUrl }} blurRadius={4} style={StyleSheet.absoluteFillObject} /> : null}
          <LinearGradient colors={['rgba(17,17,17,0.16)', 'rgba(17,17,17,0.82)']} style={StyleSheet.absoluteFillObject} />
          <Text style={styles.bannerTitle}>{mood.label}</Text>
          <Text style={styles.bannerPromise}>{mood.promise}</Text>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={colors.text} style={styles.loader} />
        ) : hasEnough && playable.length ? (
          <>
            <Pressable onPress={() => void player.setQueueAndPlay(playable, 0)} style={styles.playAll}>
              <Ionicons name="play" size={16} color={colors.paper} />
              <Text style={styles.playAllText}>Tout lire</Text>
            </Pressable>
            <View style={styles.grid}>
              {playable.map((track) => (
                <Pressable
                  key={track._id}
                  onPress={() => void player.setQueueAndPlay(playable, playable.findIndex((item) => item._id === track._id))}
                  style={[styles.gridItem, { width: responsive.gridColumns === 3 ? '31%' : responsive.gridColumns === 2 ? '47.5%' : '100%' }]}
                >
                  <View style={styles.gridCoverWrap}>
                    <TrackCover track={track} active={player.current?._id === track._id && player.isPlaying} style={styles.gridCover} />
                    <View style={styles.gridPlay}>
                      <Ionicons name={player.current?._id === track._id && player.isPlaying ? 'pause' : 'play'} size={14} color={colors.black} />
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.gridTitle}>{track.title}</Text>
                  <Text numberOfLines={1} style={styles.gridArtist}>{track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="compass-outline" size={30} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Pas encore assez de morceaux pour cette ambiance.</Text>
            <Text style={styles.emptyText}>Reviens bientôt, ou explore une autre ambiance en attendant.</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Voir les autres ambiances</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 10 },
  banner: { marginTop: 4, overflow: 'hidden', borderRadius: 14, padding: 20, minHeight: 190, justifyContent: 'flex-end', borderWidth: 1, borderColor: colors.borderStrong },
  bannerTitle: { color: colors.paper, fontSize: 29, lineHeight: 33, fontWeight: '900' },
  bannerPromise: { marginTop: 6, color: 'rgba(255,250,242,0.76)', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: '85%' },
  loader: { marginVertical: 60 },
  playAll: { marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: colors.violet, paddingHorizontal: 16, paddingVertical: 11 },
  playAllText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
  grid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  gridItem: { width: '31%', borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 7 },
  gridCoverWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: 8, backgroundColor: colors.surfaceMuted },
  gridCover: { width: '100%', height: '100%' },
  gridPlay: { position: 'absolute', right: 6, bottom: 6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
  gridTitle: { marginTop: 7, color: colors.text, fontSize: 10, fontWeight: '900' },
  gridArtist: { marginTop: 1, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  emptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.textTertiary, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  emptyButton: { marginTop: 6, borderRadius: 999, backgroundColor: colors.violet, paddingHorizontal: 16, paddingVertical: 11 },
  emptyButtonText: { color: colors.paper, fontSize: 12, fontWeight: '900' },
});

export default DiscoverMoodScreen;
