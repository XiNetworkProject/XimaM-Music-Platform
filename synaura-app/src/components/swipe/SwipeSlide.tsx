import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { mobile } from '@/components/mobile/SoundRoom';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { EntryMotionScope, useEntryMotion } from '@/components/entry/EntryAtmosphere';
import * as Haptics from 'expo-haptics';
import type { Track, MomentReactionType } from '@/api/types';
import { addMomentReaction } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { fmtCount, fmtTime, trackArtistName } from './helpers';
import { WaveformSeekBar, invalidateTrackMoments } from './WaveformSeekBar';
import { TrackCover, getTrackCoverImage } from '@/components/TrackCover';
import { usePlayer, usePlayerProgress } from '@/player/PlayerProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { LiveAtmosphere } from './LiveAtmosphere';
import { ArtworkHalo } from './ArtworkHalo';
import { LiveCoverMotion } from './LiveMotion';
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
    <Ionicons name={icon} size={25} color={active ? '#FF91B7' : mobile.text} />
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
  const [reactionsOpen, setReactionsOpen] = useState(false);
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
  return <View style={styles.timeline}>
    <WaveformSeekBar minimal showTimes={false} trackId={track._id} position={position} duration={duration} onSeek={onSeek} onCreateMoment={momentsAvailable ? onCreateMoment : undefined} showMoments={momentsAvailable} height={32} refreshKey={revision} />
    <View style={styles.timelineMeta}>
      <Text style={styles.time}>{fmtTime(position)} <Text style={{ color: mobile.faint }}> / {fmtTime(duration)}</Text></Text>
      {momentsAvailable ? <View style={{ flexDirection: 'row', gap: 8 }}>
        <EntryPressable accessibilityRole="button" accessibilityLabel="Commenter cet instant" onPress={() => onCreateMoment(position)} style={styles.moment}><Ionicons name="time-outline" size={16} color={mobile.blue} /><Text style={styles.momentText}>Cet instant</Text></EntryPressable>
        <EntryPressable accessibilityRole="button" accessibilityLabel={reactionsOpen ? 'Fermer les réactions' : 'Réagir à cet instant'} accessibilityState={{ expanded: reactionsOpen }} onPress={() => setReactionsOpen(value => !value)} style={styles.reactionToggle}><Ionicons name={reactionsOpen ? 'close' : 'happy-outline'} size={23} color={mobile.text} /></EntryPressable>
      </View> : null}
    </View>
    {momentsAvailable && reactionsOpen ? <View style={styles.reactions}>
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
  const landscape = layout.isLandscape;
  const bodyHeight = height - topPad - bottomPad - 66;
  const compact = bodyHeight < 480;
  const coverSize = Math.max(88, Math.min(
    layout.safeWidth - (compact || landscape ? 44 : 102),
    landscape ? bodyHeight - 90 : bodyHeight - (compact ? 275 : 240),
    landscape ? layout.safeWidth * .42 : 410,
  ));
  const gesture = useMemo(() => Gesture.Exclusive(
    Gesture.Tap().enabled(isActive).numberOfTaps(2).maxDelay(240).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onDoubleTapLike(); }),
    Gesture.Tap().enabled(isActive).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) onPress(); }),
  ), [isActive, onDoubleTapLike, onPress]);
  const actions = <>
    <LiveAction icon={props.isLiked ? 'heart' : 'heart-outline'} active={props.isLiked} label={props.isLiked ? 'Retirer mon like' : 'Aimer'} count={props.likesCount} onPress={() => onAction('like')} />
    <LiveAction icon="chatbubble-outline" label="Commentaires et moments" count={props.commentsCount} disabled={track._id.startsWith('ai-')} onPress={() => onAction('comment')} />
    <LiveAction icon="share-outline" label="Partager" onPress={() => onAction('share')} />
    <LiveAction icon={props.isFavorite ? 'bookmark' : 'bookmark-outline'} active={props.isFavorite} label={props.isFavorite ? 'Retirer des favoris' : 'Enregistrer'} onPress={() => onAction('save')} />
    <LiveAction icon="ellipsis-horizontal" label="Plus d’actions" onPress={() => onAction('more')} />
  </>;
  const identity = <>
    <Text accessibilityRole="header" numberOfLines={landscape ? 1 : 2} style={[styles.title, compact && { fontSize: 25, lineHeight: 30 }, landscape && { fontSize: 19, lineHeight: 24 }]}>{track.title}</Text>
    <View style={styles.artistRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Profil de ' + trackArtistName(track)} onPress={props.onOpenArtist} style={styles.artistButton}><Text numberOfLines={1} style={styles.artist}>{trackArtistName(track)}</Text><Ionicons name="chevron-forward" size={13} color={mobile.muted} /></Pressable>
      {track.artist?.username ? <EntryPressable accessibilityRole="button" accessibilityLabel={props.isFollowing ? 'Ne plus suivre cet artiste' : 'Suivre cet artiste'} disabled={props.followLoading} onPress={props.onToggleFollow} style={styles.follow}><Text style={styles.followText}>{props.isFollowing ? 'Suivi' : 'Suivre'}</Text></EntryPressable> : null}
    </View>
  </>;
  return <EntryMotionScope active={isActive}><View style={[styles.page, { height }]}>
    <LiveAtmosphere cover={getTrackCoverImage(track)} active={isActive && isPlaying} />
    <View style={[styles.layout, { paddingTop: topPad + 58, paddingBottom: bottomPad + 8 }, landscape && styles.landscape]}>
      <View style={[styles.artZone, landscape && { flex: 1, flexDirection: 'column', paddingBottom: 0 }]}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <LiveCoverMotion size={coverSize} active={isActive && isPlaying}>
          {isActive ? <ArtworkHalo size={coverSize} active={isPlaying} /> : null}
          <GestureDetector gesture={gesture}>
            <View accessible accessibilityRole="button" accessibilityLabel={(isPlaying ? 'Mettre en pause ' : 'Écouter ') + track.title} onAccessibilityTap={onPress} style={[styles.art, { width: coverSize, height: coverSize }]}>
              <TrackCover track={track} animatedSurface active={isActive && isPlaying} autoPlayVideo={isActive && isPlaying} style={StyleSheet.absoluteFill} />
              {!isPlaying || props.isLoading ? <View pointerEvents="none" style={styles.playOverlay}><View style={styles.play}>
                {props.isLoading ? <ActivityIndicator color={mobile.text} /> : <Ionicons name="play" size={29} color={mobile.text} />}
              </View></View> : null}
              <LikeEcho key={track._id} liked={props.isLiked} active={isActive} />
            </View>
          </GestureDetector>
          </LiveCoverMotion>
        </View>
        {landscape ? <View style={{ width: '100%', marginTop: 8 }}>{identity}</View> : !compact ? <View style={styles.sideActions}>{actions}</View> : null}
      </View>
      <View style={[styles.content, landscape && { flex: 1, maxWidth: 440 }]}>
        <View style={styles.labelRow}><View style={styles.labelDot} /><Text numberOfLines={1} style={styles.eyebrow}>{track.isBoosted ? 'À DÉCOUVRIR · BOOSTÉ' : track.genre?.slice(0, 2).join(' / ') || 'Synaura Live'}{track.isAI ? ' · IA' : ''}</Text><EntryPressable accessibilityRole="button" accessibilityLabel="File d’attente" onPress={() => onAction('queue')} style={styles.queue}><Ionicons name="list-outline" size={21} color={mobile.muted} /></EntryPressable></View>
        {!landscape ? identity : null}
        {compact || landscape ? <View style={styles.actions}>{actions}</View> : null}
        {isActive ? <LiveTimeline key={track._id} track={track} onSeek={props.onSeek} onCreateMoment={props.onCreateMoment} /> : <View style={{ height: 76 }} />}
        {track.remixAttribution ? <Text numberOfLines={1} style={styles.attribution}>Inspiré de {track.remixAttribution.title}</Text> : null}
      </View>
    </View>
  </View></EntryMotionScope>;
});

const styles = StyleSheet.create({
  page: { width: '100%', backgroundColor: mobile.bg, overflow: 'hidden' }, layout: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  landscape: { flexDirection: 'row', gap: 26 }, artZone: { flex: 1, minHeight: 88, width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  art: { borderRadius: 18, overflow: 'hidden', backgroundColor: mobile.surface, elevation: 8, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.08)' }, play: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(7,10,16,.62)', alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 490 }, labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36 }, labelDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: mobile.blue }, eyebrow: { color: mobile.muted, fontSize: 10, flex: 1 }, queue: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }, title: { color: mobile.text, fontFamily: 'Inter_600SemiBold', fontSize: 30, lineHeight: 35 },
  artistRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, artistButton: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1, minHeight: 44 }, artist: { color: mobile.muted, fontSize: 14, flexShrink: 1 }, follow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 9 }, followText: { color: mobile.blue, fontSize: 12, fontWeight: '600' },
  sideActions: { width: 52, marginLeft: 13, gap: 8 }, actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, action: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3 }, count: { color: '#D3DBE9', fontSize: 10 },
  timeline: { paddingTop: 5, zIndex: 2 }, timelineMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }, time: { color: mobile.muted, fontSize: 11, fontVariant: ['tabular-nums'] }, moment: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, momentText: { color: mobile.blue, fontSize: 11 }, reactionToggle: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  reactions: { position: 'absolute', bottom: 52, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#172233', borderRadius: 22, paddingHorizontal: 5, paddingVertical: 8, elevation: 16 }, reaction: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }, emoji: { fontSize: 23 }, flight: { position: 'absolute', bottom: 16 }, error: { color: '#FFABB9', fontSize: 11, paddingTop: 4 }, attribution: { color: mobile.muted, fontSize: 10, marginTop: 4 },
});
export default SwipeSlide;
