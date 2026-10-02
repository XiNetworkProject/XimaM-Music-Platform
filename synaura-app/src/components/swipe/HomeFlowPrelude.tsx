import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { HomePost, Track } from '@/api/types';
import { getTrackCoverImage, TrackCover } from '@/components/TrackCover';
import { LiveAtmosphere } from './LiveAtmosphere';
import { fmtCount, fmtTime } from './helpers';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { EntryAtmosphere } from '@/components/entry/EntryAtmosphere';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { entry } from '@/theme/entry';
import { selectEntryTrack } from '@/components/entry/liveEntryModel';
import { resolveLiveEntryLayout } from './liveLayout';
import { ArtworkHalo } from './ArtworkHalo';

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
  return <EntryPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}><Ionicons name={name} size={22} color={active ? entry.violet : entry.text} /></EntryPressable>;
}

export function HomeFlowPrelude(props: Props) {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const { tracks, currentTrack, currentPlaying, visible, topPad, bottomPad } = props;
  const playable = useMemo(() => tracks.filter(track => Boolean(track.audioUrl)), [tracks]);
  const featured = selectEntryTrack(playable, currentTrack?._id);
  const playing = Boolean(featured && currentTrack?._id === featured._id && currentPlaying);
  const discoveries = playable.filter(track => track._id !== featured?._id).slice(0, 8);
  const metrics = resolveLiveEntryLayout(layout.height, topPad, bottomPad, layout.availableContentWidth);
  const split = layout.isLandscape || layout.isTablet || metrics.compact;
  const heroSize = metrics.compact ? Math.min(128, layout.availableContentWidth * .4) : split ? Math.min(270, layout.availableContentWidth * .42) : metrics.coverSize;
  if (!visible) return null;
  const enter = () => featured ? props.onOpenTrack(featured) : props.onEnterFlow();
  return <View style={styles.overlay}>
    <LiveAtmosphere cover={getTrackCoverImage(featured)} active={playing} />
    <EntryAtmosphere transparent active={visible} interactive>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[layout.pageContent, { paddingTop: topPad + 4, paddingBottom: metrics.scrollBottom }]}>
        <View style={styles.header}>
          <SynauraMark size={27} wordmark />
          <View style={styles.row}><IconButton name="search-outline" label="Rechercher" onPress={props.onSearch} /><IconButton name="notifications-outline" label="Notifications" onPress={props.onNotifications} /></View>
        </View>
        <View style={styles.hello}>
          <Text style={styles.eyebrow}>{props.userName ? 'POUR TOI, ' + props.userName.split(/\s+/)[0].toUpperCase() : 'LAISSE-TOI SURPRENDRE'}</Text>
          <Text accessibilityRole="header" style={[styles.title, metrics.compact && { fontSize: 27, lineHeight: 33 }]}>Ta prochaine <Text style={{ color: entry.violet }}>vibration.</Text></Text>
        </View>
        <View style={[styles.hero, split && styles.heroWide, metrics.compact && { gap: 18 }]}>
          <View style={[styles.artwork, { width: heroSize, height: heroSize }]}>
            <ArtworkHalo size={heroSize} active={playing} />
            <View style={styles.cover}>
              {featured ? <TrackCover track={featured} active={playing} autoPlayVideo={playing} style={StyleSheet.absoluteFill} /> : <View style={styles.placeholder}><SynauraMark size={76} color={entry.violet} /></View>}
              <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(6,8,16,.6)']} style={StyleSheet.absoluteFill} />
              {!metrics.compact ? <View style={styles.heroBadge}><View style={[styles.dot, { backgroundColor: playing ? entry.cyan : entry.violet }]} /><Text style={styles.heroBadgeText}>{playing ? 'EN ÉCOUTE' : 'TON POINT DE DÉPART'}</Text></View> : null}
            </View>
            <EntryPressable accessibilityRole="button" accessibilityLabel={featured ? (playing ? 'Mettre en pause ' : 'Écouter ') + featured.title : 'Chargement du premier morceau'} disabled={!featured} onPress={() => featured && props.onPlayTrack(featured)} style={[styles.play, metrics.compact && { width: 44, height: 44, borderRadius: 22, right: -6 }]}>
              {props.loading && !featured ? <ActivityIndicator color={entry.background} /> : <Ionicons name={playing ? 'pause' : 'play'} size={26} color={entry.background} />}
            </EntryPressable>
          </View>
          <View style={[styles.heroCopy, split && { flex: 1, justifyContent: 'center' }]}>
            <Text numberOfLines={2} style={[styles.trackTitle, metrics.compact && { fontSize: 18, lineHeight: 23 }]}>{featured?.title || (props.error ? 'Une petite pause réseau.' : props.loading ? 'Ton prochain son arrive…' : 'Les découvertes arrivent.')}</Text>
            <Text numberOfLines={1} style={styles.artist}>{featured ? artist(featured) : props.error ? 'Réessaie dans un instant.' : 'Explore les artistes et leurs univers.'}</Text>
            {featured ? <Text numberOfLines={1} style={styles.meta}>{fmtCount(featured.plays || 0)} écoutes · {fmtTime(featured.duration)}{featured.genre?.length ? ' · ' + featured.genre.slice(0, 2).join(' / ') : ''}</Text> : null}
            {featured ? <View style={styles.actions}>
              <IconButton name={props.likedMap?.[featured._id] ? 'heart' : 'heart-outline'} active={props.likedMap?.[featured._id]} label={props.likedMap?.[featured._id] ? 'Retirer mon like' : 'Aimer ce morceau'} onPress={() => props.onToggleLike(featured)} />
              <EntryPressable accessibilityRole="button" accessibilityLabel="Ouvrir les commentaires" onPress={() => props.onOpenComments(featured)} style={styles.comments}><Ionicons name="chatbubble-outline" size={21} color={entry.text} /><Text style={styles.commentCount}>{fmtCount(props.commentsMap?.[featured._id] || 0)}</Text></EntryPressable>
              <IconButton name="share-outline" label="Partager ce morceau" onPress={() => props.onShareTrack(featured)} />
            </View> : null}
          </View>
        </View>
        <View style={styles.shortcutRow}>
          {([
            ['compass-outline', 'Découvrir', props.onDiscover], ['sparkles-outline', 'Studio IA', props.onStudio],
            ['chatbubbles-outline', 'Messages', () => navigation.navigate('Messages')], ['radio-outline', 'Radar', props.onRadar],
          ] as const).map(([icon, label, onPress]) => <EntryPressable accessibilityRole="button" key={label} onPress={onPress} style={styles.shortcut}><Ionicons name={icon} size={21} color={entry.violet} /><Text style={styles.shortcutText}>{label}</Text></EntryPressable>)}
        </View>
        {discoveries.length ? <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>La suite s’écoute ici</Text><EntryPressable accessibilityRole="button" onPress={props.onDiscover} style={styles.seeAll}><Text style={styles.link}>Tout voir ↗</Text></EntryPressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {discoveries.map(track => <EntryPressable accessibilityRole="button" accessibilityLabel={'Écouter ' + track.title + ' de ' + artist(track)} key={track._id} onPress={() => props.onOpenTrack(track)} style={styles.discovery}>
              <TrackCover track={track} active={false} style={styles.discoveryCover} />
              <Text numberOfLines={1} style={styles.discoveryTitle}>{track.title}</Text><Text numberOfLines={1} style={styles.discoveryArtist}>{artist(track)}</Text>
            </EntryPressable>)}
          </ScrollView>
        </> : null}
        {props.posts[0] ? <EntryPressable accessibilityRole="button" onPress={() => props.onOpenPost(props.posts[0])} style={styles.post}>
          <Ionicons name="people-outline" size={20} color={entry.cyan} /><View style={{ flex: 1 }}><Text style={styles.postAuthor}>{props.posts[0].author}</Text><Text numberOfLines={2} style={styles.postText}>{props.posts[0].text || 'Une nouvelle publication à découvrir.'}</Text></View><Ionicons name="arrow-forward" size={17} color={entry.muted} />
        </EntryPressable> : null}
        <View style={styles.bottomLinks}><EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('Welcome')} style={styles.seeAll}><Text style={styles.link}>C’est quoi Synaura ?</Text></EntryPressable><EntryPressable accessibilityRole="button" onPress={props.onEvents} style={styles.seeAll}><Text style={styles.link}>La communauté</Text></EntryPressable></View>
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: layout.insets.top, backgroundColor: entry.background }} />
      <LinearGradient pointerEvents="none" colors={[entry.background, 'rgba(6,8,16,0)']} style={{ position: 'absolute', left: 0, right: 0, top: layout.insets.top, height: 12 }} />
      <View pointerEvents="box-none" style={[styles.entryDock, { bottom: bottomPad, paddingHorizontal: layout.gutter }]}>
        <LinearGradient pointerEvents="none" colors={['rgba(6,8,16,0)', 'rgba(6,8,16,.97)']} style={[StyleSheet.absoluteFill, { top: -20 }]} />
        <EntryPressable accessibilityRole="button" disabled={props.loading && !featured} onPress={props.error && !featured ? props.onRetry : featured ? enter : props.onDiscover} style={styles.enter}>
          <LinearGradient colors={['#C5B5FF', '#A4BBFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Ionicons name="radio-outline" size={21} color="#17142E" /><Text style={styles.enterText}>{props.error && !featured ? 'Réessayer' : featured ? playing ? 'Continuer dans Live' : 'Entrer dans Live' : 'Explorer Synaura'}</Text><Ionicons name="arrow-up" size={20} color="#17142E" />
        </EntryPressable>
      </View>
    </EntryAtmosphere>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, backgroundColor: entry.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, row: { flexDirection: 'row' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hello: { paddingTop: 18, paddingBottom: 20 }, eyebrow: { color: entry.muted, fontSize: 9, letterSpacing: 1.7, fontWeight: '600' }, title: { fontFamily: 'Inter_600SemiBold', fontSize: 33, lineHeight: 39, letterSpacing: -1.3, color: entry.text, marginTop: 8, maxWidth: 330 },
  hero: { alignItems: 'center' }, heroWide: { flexDirection: 'row', gap: 30 }, artwork: { alignSelf: 'center', marginVertical: 10 }, cover: { ...StyleSheet.absoluteFillObject, backgroundColor: entry.surface, borderRadius: 24, overflow: 'hidden', transform: [{ rotate: '-2deg' }] }, placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', left: 14, bottom: 15, flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 5, height: 5, borderRadius: 3 }, heroBadgeText: { fontSize: 8, letterSpacing: 1.4, color: entry.text, fontWeight: '700' }, play: { position: 'absolute', bottom: -9, right: -12, width: 56, height: 56, borderRadius: 28, backgroundColor: entry.text, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  heroCopy: { width: '100%', paddingTop: 16 }, trackTitle: { color: entry.text, fontSize: 23, fontWeight: '700', lineHeight: 28, letterSpacing: -.6 }, artist: { color: '#D5D9EB', fontSize: 13, marginTop: 5 }, meta: { color: entry.muted, fontSize: 11, marginTop: 5 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: -8, marginTop: 4 }, comments: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, minWidth: 52 }, commentCount: { color: entry.muted, fontSize: 11 },
  entryDock: { position: 'absolute', left: 0, right: 0, height: 72, alignItems: 'center', justifyContent: 'center' }, enter: { width: '100%', maxWidth: 520, borderRadius: 20, minHeight: 54, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 12 }, enterText: { color: '#17142E', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, marginBottom: 18, backgroundColor: 'rgba(182,162,255,.055)', borderRadius: 22 }, shortcut: { flex: 1, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 8 }, shortcutText: { color: entry.muted, fontSize: 10, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: entry.text, fontSize: 19, fontWeight: '600', flexShrink: 1 }, seeAll: { minHeight: 44, justifyContent: 'center' }, link: { color: entry.violet, fontSize: 11 }, rail: { gap: 14, paddingBottom: 12 }, discovery: { width: 132 }, discoveryCover: { flex: 0, width: 132, height: 132, borderRadius: 18, overflow: 'hidden', backgroundColor: entry.raised }, discoveryTitle: { color: entry.text, fontSize: 12, fontWeight: '700', marginTop: 10 }, discoveryArtist: { color: entry.muted, fontSize: 10, marginTop: 4 },
  post: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 22, marginTop: 4 }, postAuthor: { color: entry.text, fontWeight: '700', fontSize: 12 }, postText: { color: entry.muted, marginTop: 5, lineHeight: 18, fontSize: 12 }, bottomLinks: { flexDirection: 'row', justifyContent: 'space-between' },
});
