import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Video, { type VideoRef } from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import type { MusicClip } from '@/api/types';
import { canUseSoundClientSide } from '@/api/types';
import { trackArtistName } from './helpers';
import { useAuth } from '@/auth/AuthProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { toPublicMediaUrl } from '@/media/mediaUrls';
import { LiveAtmosphere } from './LiveAtmosphere';
import { LiveAction } from './SwipeSlide';
import { InteractiveSeekBar } from './InteractiveSeekBar';

type Props = {
  clip: MusicClip; isActive: boolean; isPlaying: boolean; shouldLoadMedia: boolean;
  isLiked: boolean; likesCount: number; commentsCount: number; isFollowingCreator: boolean; followLoading?: boolean;
  height: number; topPad: number; bottomPad: number;
  onPressAudio: () => void; onPlaybackEnd: () => void; onDoubleTapLike: () => void;
  onToggleLike: () => void; onOpenComments: () => void; onOpenTrack: () => void;
  onOpenCreator: () => void; onToggleFollowCreator: () => void; onShare: () => void; onUseSound: () => void;
};
export function ClipSlide(props: Props) {
  const { clip, isActive, isPlaying, shouldLoadMedia, height, topPad, bottomPad } = props;
  const auth = useAuth();
  const layout = useResponsiveLayout();
  const videoRef = useRef<VideoRef>(null);
  const audioRef = useRef<VideoRef>(null);
  const videoTime = useRef(0);
  const audioTime = useRef(0);
  const videoDuration = useRef(0);
  const videoBuffering = useRef(true);
  const lastSyncAt = useRef(0);
  const ended = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [position, setPosition] = useState(0);
  const [aspect, setAspect] = useState(9 / 16);
  const [duration, setDuration] = useState(clip.sourceTrackDurationSeconds || 30);
  const videoUrl = toPublicMediaUrl(clip.videoUrl);
  const audioUrl = toPublicMediaUrl(clip.sourceTrack.audioUrl);
  const videoSource = useMemo(() => ({ uri: videoUrl || '' }), [videoUrl]);
  const audioSource = useMemo(() => ({ uri: audioUrl || '' }), [audioUrl]);
  const poster = toPublicMediaUrl(clip.posterUrl || clip.sourceTrack.coverUrl);
  const offset = Math.max(0, clip.sourceTrackOffsetSeconds || 0);
  const usesSourceAudio = Boolean(audioUrl && !audioFailed);
  const canUseSound = canUseSoundClientSide({ isOwner: auth.user?.id === clip.sourceTrack.artist?._id, allowClips: Boolean(clip.sourceTrack.allowClips), remixVisibility: clip.sourceTrack.remixVisibility || 'disabled' });
  const playing = isActive && isPlaying;
  const mediaHeight = Math.max(100, height - topPad - bottomPad - 147);
  const mediaWidth = Math.min(layout.safeWidth, mediaHeight * aspect);

  useEffect(() => {
    setVideoFailed(false); setAudioFailed(false); setVideoReady(false); setBuffering(true); setPosition(0);
    ended.current = false; videoTime.current = 0; videoDuration.current = 0; audioTime.current = offset; videoBuffering.current = true; lastSyncAt.current = 0;
  }, [clip.id, videoUrl, audioUrl, offset]);
  const seek = (seconds: number) => {
    const next = Math.max(0, Math.min(duration, seconds));
    audioTime.current = offset + next; videoTime.current = next; ended.current = false;
    videoRef.current?.seek(next); if (usesSourceAudio) audioRef.current?.seek(offset + next); setPosition(next);
  };
  useEffect(() => { if (!isActive) seek(0); }, [isActive]);
  useEffect(() => { if (playing && ended.current) seek(0); }, [playing]);
  const finish = () => {
    if (!playing || ended.current) return;
    ended.current = true; props.onPlaybackEnd();
  };
  const gesture = useMemo(() => Gesture.Exclusive(
    Gesture.Tap().enabled(isActive).numberOfTaps(2).maxDelay(240).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) props.onDoubleTapLike(); }),
    Gesture.Tap().enabled(isActive).maxDistance(12).runOnJS(true).onEnd((_event, success) => { if (success) props.onPressAudio(); }),
  ), [isActive, props.onDoubleTapLike, props.onPressAudio]);

  return <View style={[styles.page, { height }]}>
    <LiveAtmosphere cover={poster} active={false} />
    <GestureDetector gesture={gesture}>
      <View accessible accessibilityRole="button" accessibilityLabel={playing ? 'Mettre le clip en pause' : 'Lire le clip'} onAccessibilityTap={props.onPressAudio} style={{ position: 'absolute', left: layout.insets.left, right: layout.insets.right, top: topPad + 52, bottom: bottomPad + 95, alignItems: 'center', justifyContent: 'center' }}>
        {shouldLoadMedia && videoUrl && !videoFailed ? <Video ref={videoRef} source={videoSource} poster={poster || undefined} paused={!playing} repeat={false} muted={usesSourceAudio} disableFocus={usesSourceAudio} resizeMode="contain" playInBackground={false} playWhenInactive={false} style={{ width: mediaWidth, height: mediaWidth / aspect }} progressUpdateInterval={250}
          onLoad={event => { const length = Number(event.duration || 0); videoDuration.current = length; if (event.naturalSize.width > 0 && event.naturalSize.height > 0) setAspect(event.naturalSize.width / event.naturalSize.height); if (length > 0) setDuration(Math.min(length, clip.sourceTrackDurationSeconds || length)); setVideoReady(true); setBuffering(false); videoBuffering.current = false; videoRef.current?.seek(Math.max(0, audioTime.current - offset)); }}
          onProgress={event => { videoTime.current = event.currentTime; if (!usesSourceAudio) { setPosition(event.currentTime); if (event.currentTime >= duration - .1) finish(); } }}
          onEnd={finish} onBuffer={event => { videoBuffering.current = event.isBuffering; setBuffering(event.isBuffering); }} onError={() => { setVideoFailed(true); setBuffering(false); }} />
          : <SynauraImage source={poster} contentFit="contain" style={StyleSheet.absoluteFill} />}
        {!playing || buffering || videoFailed ? <View pointerEvents="none" style={styles.playOverlay}>{buffering && playing ? <ActivityIndicator size="large" color="#E9E2FF" /> : <View style={styles.play}><Ionicons name={videoFailed ? 'cloud-offline-outline' : 'play'} size={30} color="#F5F2FF" /></View>}</View> : null}
      </View>
    </GestureDetector>
    {shouldLoadMedia && audioUrl ? <Video ref={audioRef} source={audioSource} paused={!playing || audioFailed || (!videoReady && !videoFailed)} muted={false} repeat={false} playInBackground={false} playWhenInactive={false} style={styles.hiddenAudio} progressUpdateInterval={250}
      onLoad={() => { audioTime.current = offset; audioRef.current?.seek(offset); }}
      onProgress={event => {
        audioTime.current = event.currentTime;
        const relative = Math.max(0, event.currentTime - offset); setPosition(relative);
        // Never chase beyond the video duration or reset a paused player.
        if (playing && videoReady && !videoBuffering.current && Date.now() - lastSyncAt.current > 1500 && relative < videoDuration.current - .15 && Math.abs(videoTime.current - relative) > .65) { lastSyncAt.current = Date.now(); videoRef.current?.seek(relative); }
        if (relative >= duration - .1) finish();
      }} onEnd={finish} onError={() => setAudioFailed(true)} /> : null}
    <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(6,8,14,.9)', '#06080E']} style={[styles.shade, { bottom: bottomPad }]} />
    <View style={[styles.social, { right: Math.max(layout.insets.right + 12, layout.isTablet ? 30 : 12), bottom: bottomPad + 155 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Profil du créateur" onPress={props.onOpenCreator} style={styles.avatar}><SynauraImage source={clip.creator.avatar} style={StyleSheet.absoluteFill} /></Pressable>
      <LiveAction icon={props.isLiked ? 'heart' : 'heart-outline'} active={props.isLiked} count={props.likesCount} label={props.isLiked ? 'Retirer le like' : 'Aimer le clip'} onPress={props.onToggleLike} />
      <LiveAction icon="chatbubble-outline" count={props.commentsCount} label="Commentaires du clip" onPress={props.onOpenComments} />
      <LiveAction icon="share-social-outline" label="Partager le clip" onPress={props.onShare} />
      {canUseSound ? <LiveAction icon="musical-notes-outline" label="Utiliser ce son" onPress={props.onUseSound} /> : null}
    </View>
    <View style={[styles.meta, { bottom: bottomPad + 9, left: layout.insets.left + 22, right: layout.insets.right + 22 }]}>
      <View style={styles.authorRow}><Pressable accessibilityRole="button" onPress={props.onOpenCreator}><Text style={styles.creator}>@{clip.creator.username || clip.creator.name}</Text></Pressable><Pressable accessibilityRole="button" disabled={props.followLoading} onPress={props.onToggleFollowCreator} style={styles.follow}><Text style={styles.accent}>{props.isFollowingCreator ? 'Suivi' : '+ Suivre'}</Text></Pressable></View>
      {clip.caption ? <Text numberOfLines={2} style={styles.caption}>{clip.caption}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le morceau original" onPress={props.onOpenTrack} style={styles.source}><Ionicons name="musical-note" size={14} color="#C9B5FF" /><Text numberOfLines={1} style={styles.sourceText}>{clip.sourceTrack.title} · {trackArtistName(clip.sourceTrack)}</Text></Pressable>
      <InteractiveSeekBar position={position} duration={duration} onSeek={seek} />
      {videoFailed ? <Text style={styles.accent}>Vidéo indisponible · touche pour réécouter le son</Text> : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  page: { width: '100%', overflow: 'hidden', backgroundColor: '#06080E' }, hiddenAudio: { position: 'absolute', width: 1, height: 1, opacity: 0 }, playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }, play: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(7,9,18,.5)', alignItems: 'center', justifyContent: 'center' }, shade: { position: 'absolute', left: 0, right: 0, height: 270 }, social: { position: 'absolute', gap: 8, alignItems: 'center' }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2A253C', overflow: 'hidden', marginBottom: 6 }, meta: { position: 'absolute' }, authorRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 48 }, creator: { color: '#F4EFFF', fontSize: 16, fontWeight: '700' }, follow: { minHeight: 44, justifyContent: 'center' }, accent: { color: '#C9B5FF', fontSize: 11 }, caption: { color: '#E2DDEC', fontSize: 14, lineHeight: 20, paddingRight: 48 }, source: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 40 }, sourceText: { color: '#C0B8D2', fontSize: 12, flex: 1 },
});
export default ClipSlide;
