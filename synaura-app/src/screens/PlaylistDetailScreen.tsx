import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlaylistDetail, type PlaylistDetail } from '@/api/client';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';

export function PlaylistDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const playlistId = String(route.params?.playlistId || '');
  const [playlist, setPlaylist] = React.useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPlaylistDetail(playlistId)
      .then((next) => { if (mounted) setPlaylist(next); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [playlistId]);

  const playAll = () => {
    if (!playlist?.tracksList.length) return;
    player.setQueueAndPlay(playlist.tracksList, 0);
  };

  return (
    <SynauraBackground variant="warm">
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 64 }]}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <Text style={styles.topTitle}>Playlist</Text>
        </View>
        {loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} /> : null}
        {playlist ? (
          <>
            <View style={styles.hero}>
              <View style={styles.coverWrap}>{playlist.covers[0] ? <Image source={{ uri: playlist.covers[0] }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={42} color="#6B5F5A" />}</View>
              <Text style={styles.title}>{playlist.title}</Text>
              <Text style={styles.meta}>{playlist.curator} · {playlist.tracks}</Text>
              {playlist.description ? <Text style={styles.description}>{playlist.description}</Text> : null}
              <Pressable onPress={playAll} style={styles.playAll}><Ionicons name="play" size={18} color="#FFF7ED" /><Text style={styles.playAllText}>Tout lire</Text></Pressable>
            </View>
            <View style={styles.list}>
              {playlist.tracksList.map((track) => (
                <Pressable key={track._id} onPress={() => player.setQueueAndPlay(playlist.tracksList, playlist.tracksList.findIndex((item) => item._id === track._id))} style={styles.trackRow}>
                  <TrackCover track={track} style={styles.trackCover} active={player.current?._id === track._id && player.isPlaying} autoPlayVideo={player.current?._id === track._id && player.isPlaying} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                    <Text numberOfLines={1} style={styles.trackMeta}>{track.artist?.name || track.artist?.username || 'Synaura'}</Text>
                  </View>
                  <Ionicons name="play" size={17} color="#171313" />
                </Pressable>
              ))}
            </View>
          </>
        ) : !loading ? <Text style={styles.empty}>Playlist introuvable.</Text> : null}
      </ScrollView>
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 150 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.76)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#171313', fontSize: 28, fontWeight: '900' },
  hero: { alignItems: 'center', borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.82)', padding: 18, borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)' },
  coverWrap: { width: 190, height: 190, borderRadius: 34, backgroundColor: '#E7DDD4', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#171313', fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 14 },
  meta: { color: '#6B5F5A', fontWeight: '800', marginTop: 5 },
  description: { color: '#5A4E49', lineHeight: 20, textAlign: 'center', marginTop: 10 },
  playAll: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: '#171313', paddingHorizontal: 18, paddingVertical: 12 },
  playAllText: { color: '#FFF7ED', fontWeight: '900' },
  list: { marginTop: 14, gap: 10 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.78)', padding: 10 },
  trackCover: { width: 54, height: 54, borderRadius: 16 },
  trackTitle: { color: '#171313', fontWeight: '900', fontSize: 15 },
  trackMeta: { color: '#6B5F5A', fontWeight: '700', marginTop: 3 },
  empty: { textAlign: 'center', color: '#6B5F5A', fontWeight: '800', marginTop: 60 },
});
