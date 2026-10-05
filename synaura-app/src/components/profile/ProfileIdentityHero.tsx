import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MobileProfile, MobileProfileTrack } from '@/api/client';
import { MobileSocialLinks } from '@/components/mobile/MobileSocialLinks';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { getTrackCoverImage } from '@/components/TrackCover';
import { CollectionReveal, MusicRow, musicCount, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { usePlayer } from '@/player/PlayerProvider';

type HeroAction = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; active?: boolean; loading?: boolean };
type IconAction = { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void };
export function ProfileIdentityHero({ profile, spotlightTrack, own = false, primaryAction, secondaryAction, onShare, onPlaySpotlight }: {
  profile: MobileProfile; spotlightTrack?: MobileProfileTrack | null; own?: boolean;
  primaryAction: HeroAction; secondaryAction?: IconAction; onShare: () => void; onPlaySpotlight?: () => void;
}) {
  const p = useCollectionPalette();
  const layout = useResponsiveLayout();
  const player = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const backdrop = profile.banner || getTrackCoverImage(spotlightTrack);
  const stats = [
    { label: 'abonnés', value: profile.followerCount },
    { label: 'sons', value: profile.tracksCount || profile.tracks.length },
    { label: 'écoutes', value: profile.totalPlays },
    { label: own ? 'abonnements' : 'j’aime', value: own ? profile.followingCount : profile.totalLikes },
  ];
  return <CollectionReveal style={{ gap: 19 }}>
    <View style={[s.portrait, { minHeight: layout.isTablet ? 350 : 284, backgroundColor: p.raised }]}>
      {backdrop ? <SynauraImage source={backdrop} blurRadius={profile.banner ? 0 : 18} style={StyleSheet.absoluteFillObject} /> : <LinearGradient colors={['#14263B', '#3D3268', '#121823']} style={StyleSheet.absoluteFillObject} />}
      <LinearGradient colors={['rgba(7,10,16,.05)', 'rgba(7,10,16,.4)', '#070A10']} locations={[0, .35, 1]} style={StyleSheet.absoluteFillObject} />
      <View style={s.portraitTop}><Text style={s.role}>{profile.isArtist ? 'ARTISTE SYNAURA' : 'MEMBRE SYNAURA'}</Text><EntryPressable accessibilityRole="button" accessibilityLabel="Partager le profil" onPress={onShare} style={s.share}><Ionicons name="share-outline" size={20} color="#FFF" /></EntryPressable></View>
      <View style={s.identity}>
        <View style={s.avatar}>{profile.avatar ? <SynauraImage source={profile.avatar} style={StyleSheet.absoluteFillObject} /> : <Text style={s.initial}>{profile.name.charAt(0).toUpperCase()}</Text>}</View>
        <View style={{ flex: 1, minWidth: 0 }}><View style={s.nameRow}><Text style={[s.name, { fontSize: layout.isNarrow ? 26 : 32 }]}>{profile.name}</Text>{profile.isVerified ? <Ionicons accessibilityLabel="Compte vérifié" name="checkmark-circle" size={21} color="#B9DFFF" /> : null}</View><Text style={s.handle}>@{profile.username}</Text></View>
      </View>
    </View>
    <View style={[s.actions, layout.hasVeryLargeText && { flexDirection: 'column' }]}>
      <EntryPressable accessibilityRole="button" accessibilityState={{ busy: primaryAction.loading }} disabled={primaryAction.loading} onPress={primaryAction.onPress} style={[s.primary, { backgroundColor: primaryAction.active ? p.raised : p.text }]}>
        {primaryAction.loading ? <ActivityIndicator size="small" color={p.bg} /> : <Ionicons name={primaryAction.icon} size={18} color={primaryAction.active ? p.text : p.bg} />}
        <Text style={[s.actionText, { color: primaryAction.active ? p.text : p.bg }]}>{primaryAction.label}</Text>
      </EntryPressable>
      {secondaryAction ? <EntryPressable accessibilityRole="button" onPress={secondaryAction.onPress} style={[s.secondary, { backgroundColor: p.surface }]}><Ionicons name={secondaryAction.icon} size={18} color={p.blue} /><Text style={[s.actionText, { color: p.text }]}>{secondaryAction.label}</Text></EntryPressable> : null}
    </View>
    <View style={s.stats}>{stats.map(stat => <View key={stat.label} style={[s.stat, { width: layout.hasLargeText ? '48%' : '24%' }]}><Text style={[s.statValue, { color: p.text }]}>{musicCount(stat.value)}</Text><Text style={[s.statLabel, { color: p.muted }]}>{stat.label}</Text></View>)}</View>
    {profile.bio ? <View><Text numberOfLines={expanded ? undefined : 3} style={[s.bio, { color: p.muted }]}>{profile.bio}</Text>{profile.bio.length > 150 ? <EntryPressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: p.blue, fontWeight: '700', fontSize: 13 }}>{expanded ? 'Réduire' : 'Lire la suite'}</Text></EntryPressable> : null}</View> : own ? <EntryPressable accessibilityRole="button" onPress={primaryAction.onPress}><Text style={[s.bio, { color: p.blue }]}>Une bio, quelques mots. Fais découvrir qui tu es. ↗</Text></EntryPressable> : null}
    {profile.genre.length || profile.location ? <View style={s.tags}>{profile.genre.slice(0, 3).map(genre => <Text key={genre} style={[s.tag, { color: p.muted, backgroundColor: p.surface }]}>{genre}</Text>)}{profile.location ? <Text style={[s.tag, { color: p.muted }]}>{profile.location}</Text> : null}</View> : null}
    {Object.values(profile.socialLinks || {}).some(Boolean) ? <MobileSocialLinks links={profile.socialLinks} /> : null}
    {spotlightTrack && onPlaySpotlight ? <View style={[s.spotlight, { backgroundColor: p.surface }]}><View style={s.spotlightHeading}><Ionicons name="sparkles-outline" size={14} color={p.blue} /><Text style={[s.spotlightLabel, { color: p.blue }]}>POUR ENTRER DANS SON UNIVERS</Text></View><MusicRow track={spotlightTrack} playing={player.current?._id === spotlightTrack._id && player.isPlaying} onPlay={onPlaySpotlight} subtitle={musicCount(spotlightTrack.plays) + ' écoutes'} /></View> : null}
  </CollectionReveal>;
}
export function ProfileIdentityHeroSkeleton() {
  const p = useCollectionPalette();
  return <View accessibilityLabel="Chargement du profil" style={[s.portrait, { height: 320, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={p.blue} /></View>;
}
const s = StyleSheet.create({
  portrait: { borderRadius: 25, overflow: 'hidden', justifyContent: 'space-between' }, portraitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 17 }, role: { color: '#D9E6FA', fontSize: 9, fontWeight: '800', letterSpacing: 2 }, share: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,10,20,.45)' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 21, paddingTop: 45, paddingBottom: 25 }, avatar: { width: 68, height: 68, borderRadius: 25, overflow: 'hidden', backgroundColor: '#26354A', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#D3E7FF', fontSize: 30, fontWeight: '700' },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 }, name: { color: '#F5F7FC', fontWeight: '800', letterSpacing: 0, flexShrink: 1 }, handle: { color: '#BBCADB', marginTop: 5, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10 }, primary: { flex: 1, minHeight: 48, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, secondary: { flex: 1, minHeight: 48, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, paddingVertical: 8 }, stat: { alignItems: 'center' }, statValue: { fontSize: 21, fontWeight: '800', letterSpacing: 0 }, statLabel: { marginTop: 5, fontSize: 10 },
  bio: { fontSize: 14, lineHeight: 23 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, tag: { fontSize: 11, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12 },
  spotlight: { borderRadius: 20, padding: 15, paddingBottom: 5 }, spotlightHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, spotlightLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1.4 },
});
