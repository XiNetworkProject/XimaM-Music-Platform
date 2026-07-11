import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFollowingCreators, getHomeData } from '@/api/client';
import type { Creator, Playlist, Track } from '@/api/types';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { TrackList } from '@/components/TrackList';
import { AppHeader } from '@/components/ui/AppHeader';
import { useLibrary } from '@/library/LibraryProvider';
import { usePlayer } from '@/player/PlayerProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MotionPressable } from '@/components/motion/Motion';

type LibraryTab = 'favorites' | 'recent' | 'downloaded' | 'queue';

export function LibraryScreen() {
  const navigation = useNavigation<any>();
  const library = useLibrary();
  const player = usePlayer();
  const [tab, setTab] = React.useState<LibraryTab>('favorites');
  const [query, setQuery] = React.useState('');
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [following, setFollowing] = React.useState<Creator[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([getHomeData(), getFollowingCreators().catch(() => [])])
      .then(([home, artists]) => { setPlaylists(home.playlists); setFollowing(artists); })
      .finally(() => setLoading(false));
  }, []);

  const source: Track[] = tab === 'favorites' ? library.favorites : tab === 'recent' ? library.recent : tab === 'downloaded' ? library.downloaded : player.queue;
  const tracks = query.trim()
    ? source.filter((track) => `${track.title} ${track.artist?.name || ''} ${track.artist?.username || ''} ${(track.genre || []).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
    : source;

  const empty = tab === 'favorites'
    ? ['Aucun favori', 'Les sons aimés apparaîtront ici.']
    : tab === 'recent'
      ? ['Aucun historique', 'Lance un son pour reprendre ton écoute plus tard.']
      : tab === 'downloaded'
        ? ['Aucun téléchargement', 'Télécharge un morceau pour l’écouter sans réseau.']
        : ['File vide', 'Ajoute des sons depuis le lecteur ou le Scroll.'];

  return (
    <SynauraBackground>
      <TrackList
        tracks={tracks}
        emptyTitle={query.trim() ? 'Aucun résultat' : empty[0]}
        emptyText={query.trim() ? 'Essaie un autre titre ou artiste.' : empty[1]}
        emptyActionLabel="Découvrir des sons"
        onEmptyAction={() => navigation.navigate('Discover')}
        topInset={0}
        header={
          <View style={styles.header}>
            <AppHeader flush title="Bibliothèque" subtitle="Tes favoris, écoutes et collections" onBack={() => navigation.goBack()} action={{ icon: 'compass-outline', label: 'Découvrir', onPress: () => navigation.navigate('Discover') }} />
            <View style={styles.search}>
              <Ionicons name="search" size={17} color={colors.textTertiary} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher dans ta bibliothèque" placeholderTextColor={colors.textTertiary} style={styles.searchInput} />
              {query ? <Pressable accessibilityLabel="Effacer" onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></Pressable> : null}
            </View>
            <View style={styles.tabs}>
              <SegmentedControl
                value={tab}
                compact
                options={[
                  { value: 'favorites', label: 'Favoris', icon: 'heart-outline' },
                  { value: 'recent', label: 'Récents', icon: 'time-outline' },
                  { value: 'downloaded', label: 'Hors ligne', icon: 'download-outline' },
                  { value: 'queue', label: 'File', icon: 'list-outline' },
                ]}
                onChange={setTab}
              />
            </View>

            {library.recent[0] ? (
              <MotionPressable onPress={() => void player.playTrack(library.recent[0])} style={styles.resume} scaleTo={0.985}>
                <TrackCover track={library.recent[0]} active={player.current?._id === library.recent[0]._id && player.isPlaying} style={styles.resumeCover} />
                <View style={styles.resumeCopy}>
                  <Text style={styles.resumeKicker}>REPRENDRE L’ÉCOUTE</Text>
                  <Text numberOfLines={1} style={styles.resumeTitle}>{library.recent[0].title}</Text>
                  <Text numberOfLines={1} style={styles.resumeMeta}>{library.recent[0].artist?.name || library.recent[0].artist?.username || 'Artiste Synaura'}</Text>
                </View>
                <View style={styles.resumePlay}><Ionicons name={player.current?._id === library.recent[0]._id && player.isPlaying ? 'pause' : 'play'} size={17} color={colors.white} /></View>
              </MotionPressable>
            ) : null}

            {playlists.length ? <RailTitle title="Playlists" subtitle="Tes collections et sélections" /> : null}
            {playlists.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playlistRail}>
                {playlists.slice(0, 10).map((playlist) => (
                  <MotionPressable key={playlist.id} onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })} style={styles.playlist} scaleTo={0.97}>
                    <View style={styles.playlistCover}>{playlist.covers[0] ? <Image source={{ uri: playlist.covers[0] }} style={StyleSheet.absoluteFillObject} /> : <Ionicons name="albums-outline" size={23} color={colors.textTertiary} />}</View>
                    <Text numberOfLines={1} style={styles.playlistTitle}>{playlist.title}</Text>
                    <Text numberOfLines={1} style={styles.playlistMeta}>{playlist.tracks}</Text>
                  </MotionPressable>
                ))}
              </ScrollView>
            ) : null}

            {following.length ? <RailTitle title="Artistes suivis" subtitle="Retrouve rapidement leurs univers" /> : null}
            {following.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
                {following.map((artist) => (
                  <MotionPressable key={artist.id} onPress={() => navigation.navigate('PublicProfile', { username: artist.handle.replace(/^@/, '') })} style={styles.artist} scaleTo={0.95}>
                    <View style={[styles.artistAvatar, { backgroundColor: artist.tint }]}>{artist.avatar?.startsWith('http') ? <Image source={{ uri: artist.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.artistInitial}>{artist.name.slice(0, 1)}</Text>}</View>
                    <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
                  </MotionPressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{tab === 'favorites' ? 'Sons aimés' : tab === 'recent' ? 'Écoutés récemment' : tab === 'downloaded' ? 'Disponibles hors ligne' : 'File d’attente'}</Text>
              {tab === 'recent' && library.recent.length ? <Pressable onPress={library.clearRecent}><Text style={styles.clearText}>Vider</Text></Pressable> : null}
            </View>
          </View>
        }
      />
    </SynauraBackground>
  );
}

function RailTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={styles.railTitle}><Text style={styles.listTitle}>{title}</Text><Text style={styles.railSubtitle}>{subtitle}</Text></View>;
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  search: { height: 48, marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.84)', paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  tabs: { marginTop: spacing.md, paddingHorizontal: spacing.lg },
  resume: { minHeight: 74, marginHorizontal: spacing.lg, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.black, padding: spacing.sm },
  resumeCover: { width: 58, height: 58, borderRadius: radius.md },
  resumeCopy: { flex: 1, minWidth: 0 },
  resumeKicker: { color: '#BFB3E8', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  resumeTitle: { marginTop: 4, color: colors.white, fontSize: 14, fontWeight: '900' },
  resumeMeta: { marginTop: 2, color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700' },
  resumePlay: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  railTitle: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  railSubtitle: { marginTop: 2, color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  playlistRail: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  playlist: { width: 126 },
  playlistCover: { width: 126, height: 126, overflow: 'hidden', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  playlistTitle: { marginTop: spacing.sm, color: colors.text, fontSize: 11, fontWeight: '900' },
  playlistMeta: { marginTop: 2, color: colors.textTertiary, fontSize: 9, fontWeight: '700' },
  artistRail: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  artist: { width: 76, alignItems: 'center' },
  artistAvatar: { width: 60, height: 60, overflow: 'hidden', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  artistInitial: { color: colors.white, fontSize: 22, fontWeight: '900' },
  artistName: { width: 76, marginTop: spacing.sm, color: colors.text, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  listHeader: { marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  clearText: { color: colors.accent, fontSize: 10, fontWeight: '900' },
});
