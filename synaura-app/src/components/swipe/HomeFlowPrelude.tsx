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
import { EntryMotionScope } from '@/components/entry/EntryAtmosphere';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraMark } from '@/components/brand/SynauraMark';
import { mobile } from '@/components/mobile/SoundRoom';
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
  return <EntryPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.icon}><Ionicons name={name} size={23} color={active ? '#FF91B7' : mobile.text} /></EntryPressable>;
}

export function HomeFlowPrelude(props: Props) {
  const layout = useResponsiveLayout();
  const navigation = useNavigation<any>();
  const { tracks, currentTrack, currentPlaying, visible, topPad, bottomPad } = props;
  const playable = useMemo(() => tracks.filter(track => Boolean(track.audioUrl)), [tracks]);
  // The entry and the feed have one identity, not two independent recommendations.
  const featured = selectEntryTrack(playable, currentTrack?._id);
  const playing = Boolean(featured && currentTrack?._id === featured._id && currentPlaying);
  const discoveries = playable.filter(track => track._id !== featured?._id).slice(0, 8);
  const heroHeight = Math.min(layout.isLandscape ? 300 : 400, Math.max(260, layout.availableContentWidth * 1.04));
  if (!visible) return null;
  const enter = () => featured ? props.onOpenTrack(featured) : props.onEnterFlow();
  return <EntryMotionScope active={visible}><View style={s.overlay}>
    <LiveAtmosphere cover={getTrackCoverImage(featured)} active={playing} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[layout.pageContent, { paddingTop: topPad + 4, paddingBottom: bottomPad + 28, maxWidth: 720 }]}>
      <View style={s.header}><SynauraMark size={28} wordmark /><View style={s.row}><IconButton name="search-outline" label="Rechercher" onPress={props.onSearch} /><IconButton name="notifications-outline" label="Notifications" onPress={props.onNotifications} /></View></View>
      <View style={s.heading}>
        <Text style={s.kicker}>{props.userName ? 'BONJOUR, ' + props.userName.split(/\s+/)[0].toUpperCase() : 'BIENVENUE DANS TON UNIVERS'}</Text>
        <Text accessibilityRole="header" style={[s.title, layout.isNarrow && { fontSize: 32, lineHeight: 38 }]}>Laisse le son{ '\n' }<Text style={{ color: mobile.blue }}>te trouver.</Text></Text>
      </View>
      <View style={[s.hero, { height: heroHeight }]}>
        {featured ? <TrackCover track={featured} active={playing} autoPlayVideo={playing} style={StyleSheet.absoluteFill} /> : <View style={s.emptyArt}><SynauraMark size={90} /></View>}
        <LinearGradient pointerEvents="none" colors={['rgba(7,10,16,.08)', 'transparent', 'rgba(7,10,16,.96)']} locations={[0, .38, 1]} style={StyleSheet.absoluteFill} />
        <View style={s.badge}><View style={[s.dot, playing && { backgroundColor: '#91F4D5' }]} /><Text style={s.badgeText}>{playing ? 'EN ÉCOUTE' : 'TON LIVE COMMENCE ICI'}</Text></View>
        <View style={s.heroBottom}>
          <Text numberOfLines={2} style={s.trackTitle}>{featured?.title || (props.error ? 'On a perdu le signal.' : props.loading ? 'À la recherche du prochain son…' : 'Un univers à découvrir.')}</Text>
          <View style={s.trackRow}>
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={s.artist}>{featured ? artist(featured) : props.error ? 'Vérifie ta connexion et réessaie.' : 'De nouveaux sons t’attendent.'}</Text>
              {featured ? <Text numberOfLines={1} style={s.metadata}>{fmtTime(featured.duration)} · {fmtCount(featured.plays || 0)} écoutes{featured.isAI ? ' · IA' : ''}</Text> : null}</View>
            <EntryPressable accessibilityRole="button" accessibilityLabel={featured ? (playing ? 'Mettre en pause ' : 'Écouter ') + featured.title : 'Chargement du morceau'} disabled={!featured} onPress={() => featured && props.onPlayTrack(featured)} style={s.play}>
              {props.loading && !featured ? <ActivityIndicator color={mobile.bg} /> : <Ionicons name={playing ? 'pause' : 'play'} size={23} color={mobile.bg} />}
            </EntryPressable>
          </View>
        </View>
      </View>
      <View style={s.belowHero}>
        <EntryPressable accessibilityRole="button" onPress={props.error && !featured ? props.onRetry || props.onEnterFlow : enter} style={s.enter}><Text style={s.enterText}>{props.error && !featured ? 'Réessayer' : playing ? 'Continuer dans Live' : 'Ouvrir Live'}</Text><Ionicons name="arrow-up" size={19} color={mobile.blue} /></EntryPressable>
        {featured ? <View style={s.row}><IconButton name={props.likedMap?.[featured._id] ? 'heart' : 'heart-outline'} active={props.likedMap?.[featured._id]} label={props.likedMap?.[featured._id] ? 'Retirer mon like' : 'Aimer ce morceau'} onPress={() => props.onToggleLike(featured)} /><IconButton name="chatbubble-outline" label="Commentaires du morceau" onPress={() => props.onOpenComments(featured)} /><IconButton name="share-outline" label="Partager ce morceau" onPress={() => props.onShareTrack(featured)} /></View> : null}
      </View>
      <View style={s.destinations}>
        {([
          ['compass-outline', 'Explorer', 'Des sons à découvrir', props.onDiscover],
          ['sparkles-outline', 'Créer', 'Ton studio IA', props.onStudio],
          ['chatbubbles-outline', 'Discuter', 'Ta messagerie', () => navigation.navigate('Messages')],
          ['radio-outline', 'Radar', 'De nouvelles pépites', props.onRadar],
        ] as const).map(([icon, label, detail, onPress]) => <EntryPressable accessibilityRole="button" key={label} onPress={onPress} style={s.destination}><Ionicons name={icon} size={22} color={mobile.blue} /><View style={{ flex: 1 }}><Text style={s.destinationTitle}>{label}</Text><Text numberOfLines={1} style={s.destinationText}>{detail}</Text></View></EntryPressable>)}
      </View>
      {discoveries.length ? <>
        <View style={s.sectionHeader}><Text accessibilityRole="header" style={s.sectionTitle}>À portée d’oreille</Text><EntryPressable accessibilityRole="button" onPress={props.onDiscover} style={s.seeAll}><Text style={s.link}>Tout voir</Text><Ionicons name="arrow-forward" size={16} color={mobile.blue} /></EntryPressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
          {discoveries.map(track => <EntryPressable accessibilityRole="button" accessibilityLabel={'Écouter ' + track.title + ' de ' + artist(track)} key={track._id} onPress={() => props.onOpenTrack(track)} style={s.discovery}>
            <TrackCover track={track} active={false} style={s.discoveryCover} />
            <Text numberOfLines={1} style={s.discoveryTitle}>{track.title}</Text><Text numberOfLines={1} style={s.discoveryArtist}>{artist(track)}</Text>
          </EntryPressable>)}
        </ScrollView>
      </> : null}
      {props.posts[0] ? <EntryPressable accessibilityRole="button" onPress={() => props.onOpenPost(props.posts[0])} style={s.post}><Ionicons name="people-outline" size={22} color={mobile.blue} /><View style={{ flex: 1 }}><Text style={s.discoveryTitle}>{props.posts[0].author}</Text><Text numberOfLines={2} style={s.postText}>{props.posts[0].text || 'Une nouvelle publication à découvrir.'}</Text></View><Ionicons name="arrow-forward" size={18} color={mobile.muted} /></EntryPressable> : null}
      <View style={s.bottomLinks}><EntryPressable accessibilityRole="button" onPress={() => navigation.navigate('Welcome')} style={s.seeAll}><Text style={s.link}>L’univers Synaura</Text></EntryPressable><EntryPressable accessibilityRole="button" onPress={props.onEvents} style={s.seeAll}><Text style={s.link}>La communauté</Text></EntryPressable></View>
    </ScrollView>
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: layout.insets.top, backgroundColor: mobile.bg }} />
  </View></EntryMotionScope>;
}
const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, backgroundColor: mobile.bg }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, row: { flexDirection: 'row', alignItems: 'center' }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingTop: 27, paddingBottom: 25 }, kicker: { color: mobile.muted, fontSize: 9, letterSpacing: 1.6 }, title: { color: mobile.text, fontFamily: 'Inter_600SemiBold', fontSize: 38, lineHeight: 43, marginTop: 11 },
  hero: { borderRadius: 24, overflow: 'hidden', backgroundColor: mobile.surface }, emptyArt: { flex: 1, alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(7,10,16,.65)', borderRadius: 20, paddingHorizontal: 11, height: 29, flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: mobile.blue }, badgeText: { fontSize: 8, letterSpacing: 1, color: mobile.text }, heroBottom: { position: 'absolute', bottom: 20, left: 20, right: 20 }, trackTitle: { color: mobile.text, fontFamily: 'Inter_600SemiBold', fontSize: 26, lineHeight: 31, marginBottom: 7 }, trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, artist: { color: '#D2DCEC', fontSize: 14 }, metadata: { color: mobile.muted, fontSize: 10, marginTop: 6 }, play: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E6F1FF', alignItems: 'center', justifyContent: 'center' },
  belowHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 7, marginBottom: 24 }, enter: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }, enterText: { color: mobile.blue, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  destinations: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }, destination: { width: '48%', flexGrow: 1, minHeight: 78, borderRadius: 18, paddingHorizontal: 13, gap: 11, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(125,151,201,.07)' }, destinationTitle: { color: mobile.text, fontSize: 13, fontWeight: '600' }, destinationText: { color: mobile.faint, fontSize: 10, marginTop: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, sectionTitle: { color: mobile.text, fontSize: 20, fontFamily: 'Inter_600SemiBold', flexShrink: 1 }, seeAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, link: { color: mobile.blue, fontSize: 11 }, rail: { gap: 13, paddingTop: 12, paddingBottom: 22 }, discovery: { width: 144 }, discoveryCover: { width: 144, height: 144, borderRadius: 16, overflow: 'hidden', backgroundColor: mobile.raised }, discoveryTitle: { color: mobile.text, fontSize: 13, fontWeight: '600', marginTop: 10 }, discoveryArtist: { color: mobile.muted, fontSize: 11, marginTop: 5 },
  post: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 17 }, postText: { color: mobile.muted, fontSize: 12, lineHeight: 18, marginTop: 5 }, bottomLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },
});
