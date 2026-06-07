import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Track, RadioMeta } from '@/api/types';
import { fmtCount, trackArtistName } from './helpers';
import { InteractiveSeekBar } from './InteractiveSeekBar';
import { TrackCover } from '@/components/TrackCover';

type ActionLabel = 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save';

type Props = {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  isLoading?: boolean;
  duration: number;
  position: number;
  isFavorite: boolean;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isFollowing: boolean;
  followLoading?: boolean;
  radioMeta?: RadioMeta | null;
  height: number;
  topPad: number;
  bottomPad: number;

  onTogglePlay: () => void;
  onDoubleTapLike: () => void;
  onPress: () => void;
  onAction: (action: ActionLabel) => void;
  onSeek: (seconds: number) => void;
  onToggleFollow: () => void;
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
  count?: number | string;
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
          color={active ? highlightColor || '#FF4B7A' : '#FFFAF2'}
        />
      </Animated.View>
      <Text numberOfLines={1} style={styles.actionLabel}>
        {typeof count === 'number' && count > 0 ? fmtCount(count) : typeof count === 'string' && count ? count : label || ''}
      </Text>
    </Pressable>
  );
}

export const SwipeSlide = memo(function SwipeSlide(props: Props) {
  const {
    track,
    isActive,
    isPlaying,
    isLoading,
    duration,
    position,
    isFavorite,
    isLiked,
    likesCount,
    commentsCount,
    sharesCount,
    isFollowing,
    followLoading,
    radioMeta,
    height,
    topPad,
    bottomPad,
    onTogglePlay,
    onDoubleTapLike,
    onPress,
    onAction,
    onSeek,
    onToggleFollow,
  } = props;

  const isRadio = track._id.startsWith('radio-');
  const isAi = !!track.isAI || track._id.startsWith('ai-');
  const genres = (track.genre || []).filter(Boolean).slice(0, 2);
  const lastTapRef = useRef(0);
  const playButtonOpacity = useRef(new Animated.Value(isPlaying ? 0 : 1)).current;
  const coverScale = useRef(new Animated.Value(isPlaying ? 1.04 : 1)).current;

  useEffect(() => {
    Animated.timing(playButtonOpacity, { toValue: isPlaying ? 0 : 1, duration: 220, useNativeDriver: true }).start();
    Animated.timing(coverScale, {
      toValue: isPlaying ? 1.04 : 1,
      duration: 1100,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.quad),
    }).start();
  }, [coverScale, isPlaying, playButtonOpacity]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      lastTapRef.current = 0;
      onDoubleTapLike();
      return;
    }
    lastTapRef.current = now;
    setTimeout(() => {
      if (lastTapRef.current === now) onPress();
    }, 270);
  };

  const displayTitle = isActive && isRadio && radioMeta?.title ? radioMeta.title : track.title;
  const displayArtist = isActive && isRadio && radioMeta?.artist ? radioMeta.artist : trackArtistName(track);

  return (
    <View style={[styles.page, { height }]}>
      <Pressable accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'} onPress={handleTap} style={styles.pressArea}>
        <Animated.View style={[styles.coverShell, { transform: [{ scale: coverScale }] }]}>
          <View style={styles.cover}>
            <TrackCover
              track={track}
              active={isActive && isPlaying}
              style={StyleSheet.absoluteFill}
              imageStyle={styles.coverImage}
            />
            <LinearGradient
              colors={['rgba(10,8,8,0.08)', 'rgba(10,8,8,0.0)', 'rgba(10,8,8,0.56)', 'rgba(10,8,8,0.98)']}
              locations={[0, 0.34, 0.73, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.playOverlay, { opacity: playButtonOpacity }]}
            >
              <View style={styles.playCircle}>
                {isLoading ? (
                  <Ionicons name="ellipsis-horizontal" size={34} color="#FFFAF2" />
                ) : (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#FFFAF2" style={!isPlaying ? { marginLeft: 5 } : null} />
                )}
              </View>
            </Animated.View>

            <View style={[styles.topBadges, { paddingTop: topPad + 4 }]}>
              {isRadio ? (
                <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>LIVE</Text>
                </View>
              ) : null}
              {track.isBoosted ? (
                <View style={[styles.badge, { backgroundColor: '#FFFAF2' }]}>
                  <Ionicons name="flash" size={11} color="#171313" />
                  <Text style={[styles.badgeText, { color: '#171313' }]}>BOOST</Text>
                </View>
              ) : null}
              {isAi ? (
                <View style={[styles.badge, { backgroundColor: 'rgba(124,92,255,0.92)' }]}>
                  <Ionicons name="sparkles" size={11} color="#FFFAF2" />
                  <Text style={styles.badgeText}>IA</Text>
                </View>
              ) : null}
              {genres.map((g) => (
                <View key={g} style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={styles.badgeText}>{g.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <View style={[styles.actionsColumn, { bottom: bottomPad + 92 }]}>
        {!isRadio && track.artist?.username ? (
          <View style={styles.profileCluster}>
            <View style={styles.profileAvatar}>
              {track.artist.avatar ? (
                <ImageBackground source={{ uri: track.artist.avatar }} style={StyleSheet.absoluteFill} />
              ) : (
                <Text style={styles.profileInitial}>
                  {(track.artist.name || track.artist.username || '?').slice(0, 1).toUpperCase()}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityLabel={isFollowing ? "Suivi" : "Suivre l'artiste"}
              disabled={!track.artist._id || followLoading}
              onPress={onToggleFollow}
              style={[styles.followBubble, isFollowing && styles.followBubbleDone]}
            >
              <Ionicons name={isFollowing ? 'checkmark' : 'add'} size={14} color={isFollowing ? '#FFFAF2' : '#171313'} />
            </Pressable>
          </View>
        ) : null}

        <ActionButton
          icon="heart-outline"
          iconActive="heart"
          active={isLiked}
          count={likesCount}
          label="Like"
          disabled={isRadio}
          highlightColor="#FF4B7A"
          onPress={() => onAction('like')}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          count={commentsCount}
          label="Commentaires"
          disabled={isRadio || isAi}
          onPress={() => onAction('comment')}
        />
        <ActionButton
          icon="share-social-outline"
          count={sharesCount}
          label="Partager"
          onPress={() => onAction('share')}
        />
        <ActionButton
          icon="list"
          count="File"
          label="Ajouter a la file"
          disabled={isRadio}
          onPress={() => onAction('queue')}
        />
        {track.lyrics ? (
          <ActionButton
            icon="document-text-outline"
            count="Lyrics"
            label="Voir les paroles"
            onPress={() => onAction('lyrics')}
          />
        ) : null}
        <ActionButton
          icon="bookmark-outline"
          iconActive="bookmark"
          active={isFavorite}
          count="Save"
          label={isFavorite ? 'Retirer des favoris' : 'Sauver dans la bibliotheque'}
          highlightColor="#7C5CFF"
          onPress={() => onAction('save')}
        />
      </View>

      <View style={[styles.metaPanel, { bottom: bottomPad + 14 }]}>
        <View style={styles.metaTopRow}>
          <Text style={styles.eyebrow}>{isRadio ? 'RADIO LIVE SYNAURA' : isAi ? 'CREATION IA SYNAURA' : 'FIL SONORE SYNAURA'}</Text>
          <View style={styles.nowBadge}>
            <View style={[styles.nowDot, isPlaying && styles.nowDotActive]} />
            <Text style={styles.nowText}>{isPlaying ? 'PLAY' : 'PAUSE'}</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.title}>{displayTitle}</Text>
        <View style={styles.artistRow}>
          <Text numberOfLines={1} style={styles.artist}>@{displayArtist}</Text>
          {track.artist?.username && !isRadio ? (
            <Pressable
              accessibilityLabel={isFollowing ? 'Deja suivi' : 'Suivre'}
              disabled={!track.artist._id || followLoading}
              onPress={onToggleFollow}
              style={[styles.inlineFollow, isFollowing && styles.inlineFollowDone]}
            >
              <Text style={[styles.inlineFollowText, isFollowing && styles.inlineFollowTextDone]}>
                {isFollowing ? 'Suivi' : 'Suivre'}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {isRadio && radioMeta?.listeners ? (
          <Text style={styles.listeners}>{fmtCount(radioMeta.listeners)} auditeurs en direct</Text>
        ) : track.plays ? (
          <Text style={styles.plays}>{fmtCount(track.plays)} ecoutes</Text>
        ) : null}
        <View style={styles.seekWrap}>
          {!isRadio ? (
            <InteractiveSeekBar position={isActive ? position : 0} duration={duration} onSeek={onSeek} />
          ) : (
            <View style={styles.liveLine}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN DIRECT</Text>
            </View>
          )}
        </View>
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative' },
  pressArea: { flex: 1 },
  coverShell: { flex: 1, padding: 10, paddingBottom: 6 },
  cover: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#171313',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.1)',
  },
  coverImage: { borderRadius: 30 },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,10,14,0.55)',
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
    left: 22,
    right: 22,
    top: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFAF2' },
  badgeText: { color: '#FFFAF2', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  actionsColumn: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 28,
    backgroundColor: 'rgba(10,8,8,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.12)',
  },
  profileCluster: { alignItems: 'center', justifyContent: 'center', width: 56, height: 66, marginBottom: 6 },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF4B7A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0E0A0D',
  },
  followBubbleDone: { backgroundColor: '#7C5CFF' },
  actionButton: { width: 56, alignItems: 'center', gap: 3 },
  actionButtonDisabled: { opacity: 0.38 },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,250,242,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,242,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  actionLabel: {
    maxWidth: 56,
    color: 'rgba(255,250,242,0.74)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  metaPanel: {
    position: 'absolute',
    left: 22,
    right: 92,
  },
  metaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  eyebrow: { color: 'rgba(255,250,242,0.55)', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,250,242,0.12)',
  },
  nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,250,242,0.36)' },
  nowDotActive: { backgroundColor: '#22C55E' },
  nowText: { color: 'rgba(255,250,242,0.72)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  title: { marginTop: 9, color: '#FFFAF2', fontSize: 27, lineHeight: 31, fontWeight: '900', letterSpacing: -0.35 },
  artistRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  artist: { color: 'rgba(255,250,242,0.86)', fontSize: 13, fontWeight: '900' },
  inlineFollow: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFFAF2',
  },
  inlineFollowDone: { backgroundColor: 'rgba(255,250,242,0.15)' },
  inlineFollowText: { color: '#171313', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  inlineFollowTextDone: { color: '#FFFAF2' },
  listeners: { marginTop: 6, color: 'rgba(255,75,122,0.85)', fontSize: 12, fontWeight: '800' },
  plays: { marginTop: 6, color: 'rgba(255,250,242,0.5)', fontSize: 11, fontWeight: '700' },
  seekWrap: { marginTop: 12 },
  liveLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { color: 'rgba(255,250,242,0.78)', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
});

export default SwipeSlide;
