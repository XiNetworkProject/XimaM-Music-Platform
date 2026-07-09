import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import type { MusicClip } from '@/api/types';
import { canUseSoundClientSide } from '@/api/types';
import { colors } from '@/theme/tokens';
import { fmtCount, trackArtistName } from './helpers';
import { useAuth } from '@/auth/AuthProvider';

type Props = {
  clip: MusicClip;
  isActive: boolean;
  isPlaying: boolean;
  height: number;
  topPad: number;
  bottomPad: number;
  onPressAudio: () => void;
  onOpenTrack: () => void;
  onShare: () => void;
  onUseSound: () => void;
};

export function ClipSlide({ clip, isActive, isPlaying, height, topPad, bottomPad, onPressAudio, onOpenTrack, onShare, onUseSound }: Props) {
  const track = clip.sourceTrack;
  const artist = trackArtistName(track);
  const auth = useAuth();
  const isOwnTrack = Boolean(auth.user?.id) && track.artist?._id === auth.user?.id;
  const canUseSound = canUseSoundClientSide({
    isOwner: isOwnTrack,
    allowClips: Boolean(track.allowClips),
    remixVisibility: track.remixVisibility || 'disabled',
  });
  return (
    <View style={[styles.root, { height, paddingTop: topPad + 14, paddingBottom: bottomPad + 12 }]}>
      {clip.videoUrl ? (
        <Video
          source={{ uri: clip.videoUrl }}
          poster={clip.posterUrl || undefined}
          paused={!isActive}
          repeat
          muted
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={StyleSheet.absoluteFillObject} />
      )}
      <View style={styles.scrimTop} />
      <View style={styles.scrimBottom} />

      <View style={styles.actions}>
        <Action icon="heart-outline" count={clip.likesCount} />
        <Action icon="chatbubble-outline" count={clip.commentsCount} onPress={onOpenTrack} />
        <Action icon="share-social-outline" onPress={onShare} />
      </View>

      <View style={styles.copy}>
        <View style={styles.clipBadge}>
          <Ionicons name="film-outline" size={11} color="#8fd3dc" />
          <Text style={styles.clipBadgeText}>Clip Synaura</Text>
        </View>
        <View style={styles.creatorRow}>
          {clip.creator.avatar ? <Image source={{ uri: clip.creator.avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{(clip.creator.name || 'S').slice(0, 1).toUpperCase()}</Text></View>}
          <Text numberOfLines={1} style={styles.creator}>@{clip.creator.username || clip.creator.name || 'synaura'}</Text>
        </View>
        {clip.caption ? <Text numberOfLines={3} style={styles.caption}>{clip.caption}</Text> : null}
        {clip.tags.length ? (
          <View style={styles.tags}>
            {clip.tags.slice(0, 5).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}
          </View>
        ) : null}
      </View>

      <View style={styles.musicCard}>
        {track.coverUrl ? <Image source={{ uri: track.coverUrl }} style={styles.cover} /> : <View style={styles.cover} />}
        <View style={styles.trackCopy}>
          <Text style={styles.kicker}>Son original</Text>
          <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.trackArtist}>{artist}</Text>
        </View>
        <Pressable accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'} onPress={onPressAudio} style={styles.playButton}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={19} color={colors.paper} />
        </Pressable>
        <Pressable accessibilityLabel="Voir le morceau" onPress={onOpenTrack} style={styles.trackButton}>
          <Text style={styles.trackButtonText}>Voir le morceau</Text>
        </Pressable>
        {canUseSound ? (
          <Pressable accessibilityLabel={isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'} onPress={onUseSound} style={styles.useSoundButton}>
            <Text style={styles.useSoundButtonText}>{isOwnTrack ? 'Clip officiel' : 'Ce son'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Action({ icon, count, onPress }: { icon: keyof typeof Ionicons.glyphMap; count?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <View style={styles.actionCircle}>
        <Ionicons name={icon} size={22} color={colors.paper} />
      </View>
      {typeof count === 'number' && count > 0 ? <Text numberOfLines={1} style={styles.actionLabel}>{fmtCount(count)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: colors.black, justifyContent: 'flex-end' },
  scrimTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 220, backgroundColor: 'rgba(17,17,17,0.32)' },
  scrimBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 360, backgroundColor: 'rgba(17,17,17,0.62)' },
  actions: { position: 'absolute', right: 14, top: '43%', gap: 12 },
  actionButton: { width: 48, alignItems: 'center', gap: 3 },
  actionCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,12,14,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  actionLabel: {
    maxWidth: 50,
    color: 'rgba(255,250,242,0.74)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  copy: { marginHorizontal: 16, marginBottom: 12, paddingRight: 72 },
  clipBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: 'rgba(74,158,170,0.2)' },
  clipBadgeText: { color: '#8fd3dc', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,242,0.18)' },
  avatarInitial: { color: colors.paper, fontWeight: '900' },
  creator: { flex: 1, color: colors.paper, fontSize: 13, fontWeight: '900' },
  caption: { marginTop: 10, color: colors.paper, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  tags: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(255,250,242,0.14)', color: colors.paper, fontSize: 10, fontWeight: '900' },
  musicCard: { marginHorizontal: 12, minHeight: 78, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderRadius: 20, padding: 10, backgroundColor: 'rgba(247,246,243,0.96)', borderWidth: 1, borderColor: 'rgba(17,17,17,0.08)' },
  cover: { width: 58, height: 58, borderRadius: 16, backgroundColor: 'rgba(17,17,17,0.08)' },
  trackCopy: { flex: 1, minWidth: 0 },
  kicker: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  trackTitle: { marginTop: 2, color: colors.text, fontSize: 15, fontWeight: '900' },
  trackArtist: { marginTop: 1, color: colors.textTertiary, fontSize: 11, fontWeight: '800' },
  playButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  trackButton: { height: 42, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12, backgroundColor: 'rgba(17,17,17,0.06)' },
  trackButtonText: { color: colors.text, fontSize: 10, fontWeight: '900' },
  useSoundButton: { height: 42, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12, backgroundColor: colors.violet },
  useSoundButtonText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
});
