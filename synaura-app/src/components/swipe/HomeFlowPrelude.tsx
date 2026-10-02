import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { HomePost, Track } from '@/api/types';
import { getTrackCoverImage } from '@/components/TrackCover';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntryAtmosphere } from '@/components/entry/EntryAtmosphere';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { entry } from '@/theme/entry';
import { selectEntryTrack } from '@/components/entry/liveEntryModel';

type Props = {
  visible: boolean; loading?: boolean; error?: boolean; tracks: Track[]; posts: HomePost[];
  currentTrack?: Track | null; currentPlaying?: boolean; userName?: string | null;
  topPad: number; bottomPad: number; likedMap?: Record<string, boolean>;
  likesMap?: Record<string, number>; commentsMap?: Record<string, number>;
  onEnterFlow: () => void; onPlayTrack: (track: Track) => void; onOpenTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void; onOpenComments: (track: Track) => void;
  onShareTrack: (track: Track) => void; onOpenPost: (post: HomePost) => void;
  onSearch: () => void; onNotifications: () => void; onDiscover: () => void;
  onRadar: () => void; onStudio: () => void; onEvents: () => void; onRetry?: () => void;
};
function artist(track: Track) { return track.artist?.artistName || track.artist?.name || track.artist?.username || 'Artiste Synaura'; }
function IconButton({ name, label, onPress, active = false }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && { opacity: .55 }]}><Ionicons name={name} size={22} color={active ? entry.violet : entry.text} /></Pressable>;
}

export function HomeFlowPrelude(props: Props) {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const { tracks, currentTrack, currentPlaying, visible, topPad, bottomPad } = props;
  const playable = useMemo(() => tracks.filter(track => Boolean(track.audioUrl)), [tracks]);
  // Only feature a track present in this feed. The same object enters Live.
  const featured = selectEntryTrack(playable, currentTrack?._id);
  const playing = Boolean(featured && currentTrack?._id === featured._id && currentPlaying);
  const discoveries = playable.filter(track => track._id !== featured?._id).slice(0, 8);
  const cover = getTrackCoverImage(featured);
  if (!visible) return null;
  const enter = () => featured ? props.onOpenTrack(featured) : props.onEnterFlow();
  const heroSize = Math.min(layout.availableContentWidth, layout.isTablet ? 440 : 420);
  return <View style={styles.overlay}>
    <EntryAtmosphere active={visible} interactive>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[layout.pageContent, { paddingTop: topPad + 8, paddingBottom: bottomPad + 30 }]}>
        <View style={styles.header}>
          <SynauraMark size={30} wordmark />
          <View style={styles.row}>
            <IconButton name="search-outline" label="Rechercher" onPress={props.onSearch} />
            <IconButton name="notifications-outline" label="Notifications" onPress={props.onNotifications} />
          </View>
        </View>
        <View style={styles.hello}>
          <Text style={styles.eyebrow}>{props.userName ? `BON RETOUR, ${props.userName.split(/\s+/)[0].toUpperCase()}` : 'BIENVENUE CHEZ TOI'}</Text>
          <Text accessibilityRole="header" style={styles.title}>Ta prochaine{'\n'}<Text style={{ color: entry.violet }}>vibration.</Text></Text>
        </View>
        <View style={[styles.hero, layout.isTablet && styles.heroWide]}>
          <View style={[styles.artwork, { width: layout.isTablet ? '48%' : '100%', height: Math.min(heroSize * .78, layout.height * .34), minHeight: 180 }]}>
            {cover ? <Image source={{ uri: cover }} contentFit="cover" style={StyleSheet.absoluteFill} transition={180} /> : <View style={styles.placeholder}><SynauraMark size={86} color={entry.violet} /></View>}
            <LinearGradient colors={['rgba(6,8,16,0)', 'rgba(6,8,16,.08)', 'rgba(6,8,16,.82)']} style={StyleSheet.absoluteFill} />
            <View style={styles.heroBadge}><View style={[styles.dot, { backgroundColor: playing ? entry.cyan : entry.violet }]} /><Text style={styles.heroBadgeText}>{playing ? 'EN ÉCOUTE' : 'TON POINT DE DÉPART'}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={featured ? `${playing ? 'Mettre en pause' : 'Écouter'} ${featured.title}` : 'Chargement du premier morceau'} disabled={!featured} onPress={() => featured && props.onPlayTrack(featured)} style={styles.play}>
              {props.loading && !featured ? <ActivityIndicator color={entry.background} /> : <Ionicons name={playing ? 'pause' : 'play'} size={25} color={entry.background} />}
            </Pressable>
          </View>
          <View style={[styles.heroCopy, layout.isTablet && { flex: 1, justifyContent: 'center' }]}>
            <Text numberOfLines={2} style={styles.trackTitle}>{featured?.title || (props.error ? 'Une petite pause réseau.' : props.loading ? 'À la recherche de ton prochain son…' : 'Les prochaines découvertes arrivent.')}</Text>
            <Text numberOfLines={1} style={styles.artist}>{featured ? artist(featured) : props.error ? 'Réessaie dans un instant.' : 'Explore les artistes et leurs univers.'}</Text>
            {featured ? <View style={styles.actions}>
              <IconButton name={props.likedMap?.[featured._id] ? 'heart' : 'heart-outline'} active={props.likedMap?.[featured._id]} label={props.likedMap?.[featured._id] ? 'Retirer mon like' : 'Aimer ce morceau'} onPress={() => props.onToggleLike(featured)} />
              <IconButton name="chatbubble-outline" label="Ouvrir les commentaires" onPress={() => props.onOpenComments(featured)} />
              <IconButton name="share-outline" label="Partager ce morceau" onPress={() => props.onShareTrack(featured)} />
              <Text style={styles.continuity}>Le même son, au premier swipe.</Text>
            </View> : null}
            <Pressable accessibilityRole="button" disabled={props.loading && !featured} onPress={props.error && !featured ? props.onRetry : featured ? enter : props.onDiscover} style={({ pressed }) => [styles.enter, pressed && { opacity: .8 }]}>
              <LinearGradient colors={['#8067EC', '#536EE0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.enterText}>{props.error && !featured ? 'Réessayer' : featured ? 'Entrer dans Live' : 'Explorer Synaura'}</Text><Ionicons name="arrow-up" size={19} color={entry.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.shortcutRow}>
          {([
            ['compass-outline', 'Découvrir', props.onDiscover], ['sparkles-outline', 'Studio IA', props.onStudio],
            ['chatbubbles-outline', 'Messages', () => navigation.navigate('Messages')], ['radio-outline', 'Radar', props.onRadar],
          ] as const).map(([icon, label, onPress]) => <Pressable accessibilityRole="button" key={label} onPress={onPress} style={({ pressed }) => [styles.shortcut, pressed && { opacity: .6 }]}><Ionicons name={icon} size={22} color={entry.violet} /><Text style={styles.shortcutText}>{label}</Text></Pressable>)}
        </View>
        {discoveries.length ? <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Un peu plus loin</Text><Pressable accessibilityRole="button" onPress={props.onDiscover} style={styles.seeAll}><Text style={styles.link}>Tout explorer</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {discoveries.map(track => <Pressable accessibilityRole="button" accessibilityLabel={`Écouter ${track.title} de ${artist(track)}`} key={track._id} onPress={() => props.onOpenTrack(track)} style={styles.discovery}>
              <Image source={{ uri: getTrackCoverImage(track) || undefined }} contentFit="cover" style={styles.discoveryCover} />
              <Text numberOfLines={1} style={styles.discoveryTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.discoveryArtist}>{artist(track)}</Text>
            </Pressable>)}
          </ScrollView>
        </> : null}
        {props.posts[0] ? <Pressable accessibilityRole="button" onPress={() => props.onOpenPost(props.posts[0])} style={styles.post}>
          <Ionicons name="people-outline" size={20} color={entry.cyan} /><View style={{ flex: 1 }}><Text style={styles.postAuthor}>{props.posts[0].author}</Text><Text numberOfLines={2} style={styles.postText}>{props.posts[0].text || 'Une nouvelle publication à découvrir.'}</Text></View><Ionicons name="arrow-forward" size={17} color={entry.muted} />
        </Pressable> : null}
        <View style={styles.bottomLinks}>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Welcome')} style={styles.seeAll}><Text style={styles.link}>C’est quoi Synaura ?</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={props.onEvents} style={styles.seeAll}><Text style={styles.link}>La communauté</Text></Pressable>
        </View>
      </ScrollView>
    </EntryAtmosphere>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, backgroundColor: entry.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, row: { flexDirection: 'row' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hello: { paddingTop: 26, paddingBottom: 24 }, eyebrow: { color: entry.muted, fontSize: 9, letterSpacing: 2, fontWeight: '700' }, title: { fontFamily: 'Inter_800ExtraBold', fontSize: 39, lineHeight: 45, color: entry.text, marginTop: 12 },
  hero: { borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(16,21,36,.78)' }, heroWide: { flexDirection: 'row' }, artwork: { alignSelf: 'center', backgroundColor: entry.surface }, placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', left: 18, top: 18, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(6,8,16,.72)' }, dot: { width: 5, height: 5, borderRadius: 3 }, heroBadgeText: { fontSize: 8, letterSpacing: 1.2, color: entry.text, fontWeight: '700' }, play: { position: 'absolute', bottom: 18, right: 18, width: 58, height: 58, borderRadius: 29, backgroundColor: entry.text, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { padding: 18, paddingTop: 12 }, trackTitle: { color: entry.text, fontSize: 22, fontWeight: '800', lineHeight: 28 }, artist: { color: entry.muted, fontSize: 13, marginTop: 5 }, actions: { flexDirection: 'row', alignItems: 'center', marginLeft: -10, marginTop: 8 }, continuity: { flex: 1, color: entry.faint, fontSize: 10, lineHeight: 15, paddingLeft: 6 },
  enter: { marginTop: 12, borderRadius: 16, minHeight: 52, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 10 }, enterText: { color: entry.text, fontSize: 14, fontWeight: '700' },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, marginBottom: 12 }, shortcut: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 9 }, shortcutText: { color: entry.muted, fontSize: 10, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: entry.text, fontSize: 18, fontWeight: '700', flexShrink: 1 }, seeAll: { minHeight: 44, justifyContent: 'center' }, link: { color: entry.violet, fontSize: 11 }, rail: { gap: 14, paddingBottom: 12 }, discovery: { width: 128 }, discoveryCover: { width: 128, height: 138, borderRadius: 16, backgroundColor: entry.raised }, discoveryTitle: { color: entry.text, fontSize: 12, fontWeight: '700', marginTop: 10 }, discoveryArtist: { color: entry.muted, fontSize: 10, marginTop: 4 },
  post: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 22, marginTop: 4 }, postAuthor: { color: entry.text, fontWeight: '700', fontSize: 12 }, postText: { color: entry.muted, marginTop: 5, lineHeight: 18, fontSize: 12 }, bottomLinks: { flexDirection: 'row', justifyContent: 'space-between' },
});
