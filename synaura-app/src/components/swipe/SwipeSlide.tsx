import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ArtworkHalo } from './ArtworkHalo';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { EntryMotionScope, useEntryMotion } from '@/components/entry/EntryAtmosphere';
import * as Haptics from 'expo-haptics';
import type { Track, MomentReactionType } from '@/api/types';
import { addMomentReaction } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { fmtCount, trackArtistName } from './helpers';
import { WaveformSeekBar, invalidateTrackMoments } from './WaveformSeekBar';
import { TrackCover, getTrackCoverImage } from '@/components/TrackCover';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { LiveAtmosphere } from './LiveAtmosphere';
import { MOMENT_REACTIONS } from '@/constants/momentReactions';

type Action = 'like' | 'comment' | 'share' | 'queue' | 'lyrics' | 'save' | 'remix' | 'useSound' | 'more';
type Props = {
  track: Track; isActive: boolean; isPlaying: boolean; isLoading?: boolean;
  isFavorite: boolean; isLiked: boolean; likesCount: number; commentsCount: number; sharesCount: number;
  isFollowing: boolean; followLoading?: boolean; height: number; topPad: number; bottomPad: number;
  onDoubleTapLike: () => void; onPress: () => void; onAction: (action: Action) => void;
  onSeek: (seconds: number) => void; onCreateMoment: (seconds: number) => void;
  onToggleFollow: () => void; onOpenArtist: () => void;
};

export function LiveAction({ icon, label, active, count, onPress, disabled }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; count?: number; disabled?: boolean; onPress: () => void;
}) {
  return <EntryPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={onPress} style={styles.action} scaleTo={.88}>
    <Ionicons name={icon} size={25} color={active ? '#C4ADFF' : '#E4E6F0'} />
    {count != null ? <Text style={styles.count}>{fmtCount(count)}</Text> : null}
  </EntryPressable>;
}

const EMOJI: Record<MomentReactionType, string> = { drop: '🔥', emotional: '😭', mindblown: '🤯', favorite: '💜', vocals: '🎤', production: '🎧' };

function ReactionFlight({ emoji, onEnd }: { emoji: string; onEnd: () => void }) {
  const value = useRef(new Animated.Value(0)).current;
  const motion = useEntryMotion();
  useEffect(() => {
    const animation = Animated.timing(value, { toValue: 1, duration: motion ? 1400 : 400, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false });
    animation.start(({ finished }) => { if (finished) onEnd(); });
    return () => animation.stop();
  }, [value, motion]);
  return <>{(motion ? [-1, 0, 1] : [0]).map(side => <Animated.View key={side} pointerEvents="none" style={[styles.flight, { opacity: value.interpolate({ inputRange: [0, .12, .7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: value.interpolate({ inputRange: [0, .55, 1], outputRange: [0, side * 24, side * 12] }) }, { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, motion ? -220 + Math.abs(side) * 60 : 0] }) }, { scale: motion ? value.interpolate({ inputRange: [0, .3, 1], outputRange: [.5, side ? .72 : 1.25, side ? .5 : 1] }) : 1 }] }]}><Text style={{ fontSize: 32 }}>{emoji}</Text></Animated.View>)}</>;
}

function LikeEcho({ liked, active }: { liked: boolean; active: boolean }) {
  const motion = useEntryMotion();
  const before = useRef(liked);
  const phase = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const newlyLiked = liked && !before.current;
    before.current = liked;
    if (!newlyLiked || !active) return;
    phase.setValue(0);
    const animation = Animated.timing(phase, { toValue: 1, duration: motion ? 820 : 400, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start(); return () => animation.stop();
  }, [liked, active, motion, phase]);
  return <Animated.View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: phase.interpolate({ inputRange: [0, .12, .62, 1], outputRange: [0, 1, 1, 0] }), transform: [{ scale: motion ? phase.interpolate({ inputRange: [0, .25, .65, 1], outputRange: [.5, 1.15, 1, .95] }) : 1 }] }]}><Ionicons name="heart" size={86} color="#F0DCFF" style={{ textShadowColor: '#8B53DE', textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } }} /></Animated.View>;
}

function LiveTimeline({ track, onSeek, onCreateMoment }: Pick<Props, 'track' | 'onSeek' | 'onCreateMoment'>) {
  const player = usePlayer();
  const progress = usePlayerProgress(200);
  const auth = useAuth();
  const position = player.current?._id === track._id ? progress.positionSec : 0;
  const duration = player.current?._id === track._id ? progress.durationSec || track.duration || 0 : track.duration || 0;
  const momentsAvailable = !track._id.startsWith('ai-') && !track._id.startsWith('radio-');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [flight, setFlight] = useState<{ type: MomentReactionType; key: number } | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const react = async (type: MomentReactionType) => {
    if (busyRef.current || !momentsAvailable) return;
    if (!auth.requireAuth()) { setError('Connecte-toi pour réagir.'); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      await addMomentReaction(track._id, type, position);
      invalidateTrackMoments(track._id);
      if (!alive.current) return;
      setRevision(value => value + 1);
      setFlight({ type, key: Date.now() });
      void Haptics.selectionAsync().catch(() => {});
    } catch (caught) {
      if (alive.current) setError(caught instanceof Error ? caught.message : 'Réaction non envoyée.');
    } finally { busyRef.current = false; if (alive.current) setBusy(false); }
  };
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><WaveformSeekBar minimal style={{ flex: 1 }} trackId={track._id} position={position} duration={duration} onSeek={onSeek} onCreateMoment={momentsAvailable ? onCreateMoment : undefined} showMoments={momentsAvailable} height={28} refreshKey={revision} />{momentsAvailable ? <LiveAction icon="time-outline" label="Commenter cet instant" onPress={() => onCreateMoment(position)} /> : null}</View>
    {momentsAvailable ? <View style={styles.reactions}>
      {MOMENT_REACTIONS.map(reaction => <EntryPressable key={reaction.type} accessibilityRole="button" accessibilityLabel={reaction.label} disabled={busy} onPress={() => void react(reaction.type)} style={styles.reaction} scaleTo={1.18}>
        <Text style={styles.emoji}>{EMOJI[reaction.type]}</Text>
        {flight?.type === reaction.type ? <ReactionFlight key={flight.key} emoji={EMOJI[reaction.type]} onEnd={() => setFlight(null)} /> : null}
      </EntryPressable>)}
    </View> : null}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
}

export const SwipeSlide = memo(function SwipeSlide(props: Props) {
  const { track, height, topPad, bottomPad, isActive, isPlaying, onPress, onDoubleTapLike, onAction } = props;
  const layout = useResponsiveLayout();
  const { settings } = useMobileSettings();
  const reveal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const landscape = layout.isLandscape;
  const compact = layout.isVeryShort && !landscape;
  const available = Math.max(180, height - topPad - bottomPad - 60);
  const coverSize = compact ? 112 : Math.max(110, Math.min(landscape ? available - 34 : available - 278, layout.safeWidth - 98, landscape ? layout.safeWidth * .4 : 370));
  const gesture = useMemo(() => Gesture.Exclusive(
    Gesture.Tap().enabled(isActive).numberOfTaps(2).maxDelay(240).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onDoubleTapLike(); }),
    Gesture.Tap().enabled(isActive).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onPress(); }),
  ), [isActive, onDoubleTapLike, onPress]);
  useEffect(() => {
    Animated.timing(reveal, { toValue: isActive ? 1 : 0, duration: settings.reducedMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }).start();
  }, [isActive, settings.reducedMotion, reveal]);
  return <EntryMotionScope active={isActive}><View style={[styles.page, { height }]}>
    <LiveAtmosphere cover={getTrackCoverImage(track)} active={isActive && isPlaying} />
    <Animated.View style={[styles.layout, { paddingTop: topPad + 58, paddingBottom: bottomPad + 12, opacity: reveal.interpolate({ inputRange: [0, 1], outputRange: [.6, 1] }), transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }, landscape && styles.landscape, compact && { justifyContent: 'center', paddingHorizontal: 18 }]}>
      <View style={[styles.artZone, landscape && { flex: 1 }, compact && { flex: 0, position: 'absolute', top: topPad + 86, left: 18, width: 112, height: 112, paddingBottom: 0 }]}>
        <View style={{ width: coverSize, height: coverSize }}>
          <ArtworkHalo size={coverSize} active={isActive && isPlaying} />
          <GestureDetector gesture={gesture}>
            <View accessible accessibilityRole="button" accessibilityLabel={`${isPlaying ? 'Mettre en pause' : 'Écouter'} ${track.title}`} onAccessibilityTap={onPress} style={[styles.art, { width: coverSize, height: coverSize, transform: [{ rotate: '-3deg' }] }]}>
              <TrackCover track={track} active={isActive && isPlaying} autoPlayVideo={isActive && isPlaying} style={StyleSheet.absoluteFill} />
              <LikeEcho key={track._id} liked={props.isLiked} active={isActive} />
            </View>
          </GestureDetector>
          <EntryPressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire le morceau'} onPress={onPress} style={[styles.play, compact && { width: 44, height: 44, borderRadius: 22, right: -8, bottom: -8 }]}>
            {props.isLoading ? <ActivityIndicator color="#101424" /> : <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color="#101424" />}
          </EntryPressable>
        </View>
      </View>
      <View style={[styles.content, landscape && { flex: 1, maxWidth: 440 }]}>
        <View style={compact && { paddingLeft: 140, minHeight: 154 }}>
        <Text numberOfLines={1} style={styles.eyebrow}>{track.isBoosted ? 'À DÉCOUVRIR · BOOSTÉ' : track.genre?.slice(0, 2).join(' · ').toUpperCase() || 'SYNAURA / LIVE'}{track.isAI ? ' · IA' : ''}</Text>
        <Text accessibilityRole="header" numberOfLines={2} style={[styles.title, layout.isShort && { fontSize: 26, lineHeight: 29 }, compact && { fontSize: 21, lineHeight: 25, letterSpacing: -.5 }]}>{track.title}</Text>
        <View style={[styles.artistRow, compact && { flexDirection: 'column', alignItems: 'flex-start', gap: 0 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Profil de ${trackArtistName(track)}`} onPress={props.onOpenArtist} style={styles.artistButton}><Text numberOfLines={1} style={styles.artist}>{trackArtistName(track)}</Text><Ionicons name="arrow-up-outline" size={13} color="#A9B0C6" style={{ transform: [{ rotate: '45deg' }] }} /></Pressable>
          {track.artist?.username ? <Pressable accessibilityRole="button" accessibilityLabel={props.isFollowing ? 'Ne plus suivre cet artiste' : 'Suivre cet artiste'} disabled={props.followLoading} onPress={props.onToggleFollow} style={styles.follow}><Text style={styles.followText}>{props.isFollowing ? 'Suivi' : '+ Suivre'}</Text></Pressable> : null}
        </View>
        </View>
        <View style={styles.actions}>
          <LiveAction icon={props.isLiked ? 'heart' : 'heart-outline'} active={props.isLiked} label={props.isLiked ? 'Retirer mon like' : 'Aimer'} count={props.likesCount} onPress={() => onAction('like')} />
          <LiveAction icon="chatbubble-outline" label="Commentaires et moments" count={props.commentsCount} disabled={track._id.startsWith('ai-')} onPress={() => onAction('comment')} />
          <LiveAction icon="share-social-outline" label="Partager" onPress={() => onAction('share')} />
          <LiveAction icon="list-outline" label="File d’attente" onPress={() => onAction('queue')} />
          <LiveAction icon="ellipsis-horizontal" label="Plus d’actions" onPress={() => onAction('more')} />
        </View>
        {isActive ? <LiveTimeline key={track._id} track={track} onSeek={props.onSeek} onCreateMoment={props.onCreateMoment} /> : <View style={{ height: 112 }} />}
        {track.remixAttribution ? <Text numberOfLines={1} style={styles.attribution}>Inspiré de {track.remixAttribution.title}</Text> : null}
      </View>
    </Animated.View>
  </View></EntryMotionScope>;
});

const styles = StyleSheet.create({
  page: { width: '100%', backgroundColor: '#06080E', overflow: 'hidden' }, layout: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  landscape: { flexDirection: 'row', gap: 30 }, artZone: { flex: 1, minHeight: 110, width: '100%', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  art: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#161929', elevation: 12, shadowColor: '#000', shadowOpacity: .4, shadowRadius: 22, shadowOffset: { width: 0, height: 15 } },
  play: { position: 'absolute', bottom: -13, right: -14, width: 58, height: 58, borderRadius: 29, backgroundColor: '#E5E6FF', alignItems: 'center', justifyContent: 'center', elevation: 14 },
  content: { width: '100%', maxWidth: 490 }, eyebrow: { color: '#A9ABC0', fontSize: 9, letterSpacing: 1.8, marginBottom: 8 }, title: { color: '#F5F5FF', fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 35, letterSpacing: -1.2 },
  artistRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 3 }, artistButton: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1, minHeight: 44 }, artist: { color: '#C4C8DA', fontSize: 14, flexShrink: 1 }, follow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 9 }, followText: { color: '#C4ADFF', fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }, action: { minWidth: 44, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, count: { color: '#AEB3C9', fontSize: 11 },
  reactions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 }, reaction: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, emoji: { fontSize: 23 }, flight: { position: 'absolute', bottom: 16 }, error: { color: '#FFABB9', fontSize: 11, paddingTop: 4 }, attribution: { color: '#B9A7DD', fontSize: 10, marginTop: 4 },
});
export default SwipeSlide;
