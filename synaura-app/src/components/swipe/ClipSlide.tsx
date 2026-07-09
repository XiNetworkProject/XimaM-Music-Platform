import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { MusicClip } from '@/api/types';
import { canUseSoundClientSide } from '@/api/types';
import { colors } from '@/theme/tokens';
import { fmtCount, trackArtistName } from './helpers';
import { useAuth } from '@/auth/AuthProvider';

// Slide Clip alignée sur SwipeSlide (même colonne d'actions à droite, même
// panneau méta sombre en bas à gauche, mêmes gestes tap/double-tap) : un clip
// EST une slide du Scroll, pas un écran à part. Le like/commentaires portent
// sur le morceau source (comme le reste du Scroll) — il n'existe pas d'API de
// like par clip.
type Props = {
  clip: MusicClip;
  isActive: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  isFollowingCreator: boolean;
  followLoading?: boolean;
  height: number;
  topPad: number;
  bottomPad: number;
  onPressAudio: () => void;
  onDoubleTapLike: () => void;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenTrack: () => void;
  onOpenCreator: () => void;
  onToggleFollowCreator: () => void;
  onShare: () => void;
  onUseSound: () => void;
};

function ActionButton({
  icon,
  iconActive,
  active,
  count,
  label,
  disabled,
  highlightColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  count?: number;
  label?: string;
  disabled?: boolean;
  highlightColor?: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.84, duration: 70, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 200 }),
    ]).start();
    onPress();
  };
  return (
    <Pressable accessibilityLabel={label || String(icon)} disabled={disabled} onPress={handlePress} style={[styles.actionButton, disabled && styles.actionButtonDisabled]}>
      <Animated.View
        style={[
          styles.actionCircle,
          active && {
            backgroundColor: highlightColor ? `${highlightColor}28` : 'rgba(255,75,122,0.26)',
            borderColor: highlightColor ? `${highlightColor}66` : 'rgba(255,75,122,0.5)',
          },
          { transform: [{ scale }] },
        ]}
      >
        <Ionicons
          name={(active && iconActive ? iconActive : icon) as any}
          size={22}
          color={active ? highlightColor || '#D96D63' : '#FFFAF2'}
        />
      </Animated.View>
      {typeof count === 'number' && count > 0 ? (
        <Text numberOfLines={1} style={styles.actionLabel}>{fmtCount(count)}</Text>
      ) : null}
    </Pressable>
  );
}

export function ClipSlide({
  clip,
  isActive,
  isPlaying,
  isLiked,
  likesCount,
  commentsCount,
  isFollowingCreator,
  followLoading,
  height,
  topPad,
  bottomPad,
  onPressAudio,
  onDoubleTapLike,
  onToggleLike,
  onOpenComments,
  onOpenTrack,
  onOpenCreator,
  onToggleFollowCreator,
  onShare,
  onUseSound,
}: Props) {
  const track = clip.sourceTrack;
  const artist = trackArtistName(track);
  const auth = useAuth();
  const isOwnTrack = Boolean(auth.user?.id) && track.artist?._id === auth.user?.id;
  const canUseSound = canUseSoundClientSide({
    isOwner: isOwnTrack,
    allowClips: Boolean(track.allowClips),
    remixVisibility: track.remixVisibility || 'disabled',
  });

  const lastTapRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playButtonOpacity = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(playButtonOpacity, { toValue: isPlaying ? 0 : 1, duration: 220, useNativeDriver: true }).start();
  }, [isPlaying, playButtonOpacity]);

  useEffect(() => () => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
  }, []);

  // Mêmes gestes que SwipeSlide : tap = lecture/pause, double-tap = like.
  const handleTap = () => {
    if (!isActive) return;
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      lastTapRef.current = 0;
      onDoubleTapLike();
      return;
    }
    lastTapRef.current = now;
    tapTimerRef.current = setTimeout(() => {
      if (lastTapRef.current === now) onPressAudio();
      tapTimerRef.current = null;
    }, 270);
  };

  return (
    <View style={[styles.page, { height }]}>
      <Pressable accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'} onPress={handleTap} style={styles.pressArea}>
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
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#171313' }]} />
        )}
        <LinearGradient
          colors={['rgba(10,8,8,0.32)', 'rgba(10,8,8,0.0)', 'rgba(10,8,8,0.56)', 'rgba(10,8,8,0.98)']}
          locations={[0, 0.34, 0.73, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View pointerEvents="none" style={[styles.playOverlay, { opacity: playButtonOpacity }]}>
          <View style={styles.playCircle}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#FFFAF2" style={!isPlaying ? { marginLeft: 5 } : null} />
          </View>
        </Animated.View>

        <View style={[styles.topBadges, { top: topPad + 58 }]}>
          <View style={styles.clipBadge}>
            <Ionicons name="film-outline" size={11} color="#8fd3dc" />
            <Text style={styles.clipBadgeText}>CLIP SYNAURA</Text>
          </View>
        </View>
      </Pressable>

      <View style={[styles.actionsColumn, { bottom: bottomPad + 92 }]}>
        {clip.creator?.username ? (
          <View style={styles.profileCluster}>
            <Pressable accessibilityLabel="Ouvrir le profil du créateur" onPress={onOpenCreator} style={styles.profileAvatar}>
              {clip.creator.avatar ? (
                <ImageBackground source={{ uri: clip.creator.avatar }} style={StyleSheet.absoluteFill} />
              ) : (
                <Text style={styles.profileInitial}>
                  {(clip.creator.name || clip.creator.username || '?').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityLabel={isFollowingCreator ? 'Suivi' : 'Suivre le créateur'}
              disabled={followLoading}
              onPress={onToggleFollowCreator}
              style={[styles.followBubble, isFollowingCreator && styles.followBubbleDone]}
            >
              <Ionicons
                name={followLoading ? 'ellipsis-horizontal' : isFollowingCreator ? 'checkmark' : 'add'}
                size={14}
                color="#FFFAF2"
              />
            </Pressable>
          </View>
        ) : null}

        <ActionButton
          icon="heart-outline"
          iconActive="heart"
          active={isLiked}
          count={likesCount}
          label="Like"
          highlightColor="#D96D63"
          onPress={onToggleLike}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          count={commentsCount}
          label="Commentaires"
          onPress={onOpenComments}
        />
        <ActionButton
          icon="share-social-outline"
          label="Partager"
          onPress={onShare}
        />
        {canUseSound ? (
          <ActionButton
            icon="film-outline"
            label={isOwnTrack ? 'Créer un clip officiel' : 'Utiliser ce son'}
            onPress={onUseSound}
          />
        ) : null}
      </View>

      <View style={[styles.metaPanel, { bottom: bottomPad + 14 }]}>
        <Pressable accessibilityLabel="Ouvrir le profil du créateur" onPress={onOpenCreator} style={styles.creatorRow}>
          <Text numberOfLines={1} style={styles.creator}>@{clip.creator.username || clip.creator.name || 'synaura'}</Text>
        </Pressable>
        {clip.caption ? <Text numberOfLines={2} style={styles.caption}>{clip.caption}</Text> : null}
        {clip.tags.length ? (
          <View style={styles.tags}>
            {clip.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}
          </View>
        ) : null}

        {/* Son original : bandeau sombre compact, cohérent avec le reste du Scroll */}
        <View style={styles.musicCard}>
          {track.coverUrl ? <Image source={{ uri: track.coverUrl }} style={styles.cover} /> : <View style={styles.cover} />}
          <Pressable accessibilityLabel="Voir le morceau" onPress={onOpenTrack} style={styles.trackCopy}>
            <Text style={styles.kicker}>SON ORIGINAL</Text>
            <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
            <Text numberOfLines={1} style={styles.trackArtist}>{artist}</Text>
          </Pressable>
          <Pressable accessibilityLabel={isPlaying ? 'Pause' : 'Lecture'} onPress={onPressAudio} style={styles.playButton}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color="#171313" style={!isPlaying ? { marginLeft: 2 } : null} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative', backgroundColor: colors.black },
  pressArea: { flex: 1 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,10,14,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  topBadges: {
    position: 'absolute',
    left: 16,
    right: 82,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  clipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(74,158,170,0.28)',
  },
  clipBadgeText: { color: '#8fd3dc', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  actionsColumn: {
    position: 'absolute',
    right: 9,
    alignItems: 'center',
    gap: 10,
  },
  profileCluster: { alignItems: 'center', justifyContent: 'center', width: 50, height: 60, marginBottom: 4 },
  profileAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileInitial: { color: '#FFFAF2', fontSize: 16, fontWeight: '900' },
  followBubble: {
    position: 'absolute',
    bottom: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D96D63',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0E0A0D',
  },
  followBubbleDone: { backgroundColor: '#7357C6' },
  actionButton: { width: 48, alignItems: 'center', gap: 3 },
  actionButtonDisabled: { opacity: 0.38 },
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
  metaPanel: {
    position: 'absolute',
    left: 18,
    right: 76,
  },
  creatorRow: { flexDirection: 'row', alignItems: 'center' },
  creator: { color: '#FFFAF2', fontSize: 14, fontWeight: '900' },
  caption: { marginTop: 7, color: 'rgba(255,250,242,0.92)', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  tags: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,250,242,0.14)',
    color: '#FFFAF2',
    fontSize: 10,
    fontWeight: '900',
  },
  musicCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 8,
    backgroundColor: 'rgba(15,12,14,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.14)',
  },
  cover: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,250,242,0.1)' },
  trackCopy: { flex: 1, minWidth: 0 },
  kicker: { color: '#8fd3dc', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  trackTitle: { marginTop: 2, color: '#FFFAF2', fontSize: 13, fontWeight: '900' },
  trackArtist: { marginTop: 1, color: 'rgba(255,250,242,0.6)', fontSize: 10, fontWeight: '800' },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFAF2',
  },
});
