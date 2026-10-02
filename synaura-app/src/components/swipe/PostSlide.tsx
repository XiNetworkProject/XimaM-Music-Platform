import React, { memo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HomePost, Track } from '@/api/types';
import { togglePostLike } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { PostShareSheet } from '@/components/social/PostShareSheet';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { SynauraImage } from '@/components/ui/SynauraImage';
import { getTrackCoverImage, TrackCover } from '@/components/TrackCover';
import { LiveAtmosphere } from './LiveAtmosphere';
import { LiveAction } from './SwipeSlide';
import { CommentsSheet } from './CommentsSheet';

type Props = { post: HomePost; active: boolean; playing: boolean; height: number; topPad: number; bottomPad: number; onOpenPost: () => void; onOpenProfile: () => void; onOpenTrack: (track: Track) => void; onPlayTrack: (track: Track) => void; onLikeChange?: (liked: boolean) => void };
export const PostSlide = memo(function PostSlide({ post, active, playing, height, topPad, bottomPad, onOpenPost, onOpenProfile, onOpenTrack, onPlayTrack, onLikeChange }: Props) {
  const auth = useAuth();
  const layout = useResponsiveLayout();
  const [liked, setLiked] = useState(post.isLiked);
  const [count, setCount] = useState(post.likesCount);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const visual = post.imageUrl || getTrackCoverImage(post.track);
  const toggle = async () => {
    if (busy.current || !auth.requireAuth()) return;
    busy.current = true; setError('');
    try {
      const result = await togglePostLike(post.id);
      const next = typeof result?.liked === 'boolean' ? result.liked : !liked;
      setLiked(next); setCount(Number.isFinite(Number(result?.likesCount)) ? Number(result.likesCount) : Math.max(0, count + (next ? 1 : -1))); onLikeChange?.(next);
    } catch { setError('Le like n’a pas été enregistré. Réessaie.'); }
    finally { busy.current = false; }
  };
  return <View style={[styles.page, { height }]}>
    <LiveAtmosphere cover={visual} active={active && playing} />
    <View style={[styles.content, { paddingTop: topPad + 68, paddingBottom: bottomPad + 18 }]}>
      <View style={styles.authorRow}><Pressable accessibilityRole="button" accessibilityLabel={`Profil de ${post.author}`} onPress={onOpenProfile} style={styles.avatar}><SynauraImage source={post.avatar} style={StyleSheet.absoluteFill} /></Pressable><Pressable accessibilityRole="button" onPress={onOpenProfile} style={{ flex: 1 }}><Text style={styles.author}>{post.author}</Text><Text style={styles.muted}>{post.handle} · {post.time}</Text></Pressable><Ionicons name="people-outline" size={18} color="#BEACEB" /></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir la publication" onPress={onOpenPost} style={{ flexShrink: 1 }}><Text numberOfLines={layout.isShort ? 3 : 6} style={styles.text}>{post.text}</Text></Pressable>
      {visual ? <Pressable accessibilityRole="button" accessibilityLabel="Voir la publication et son image" onPress={onOpenPost} style={[styles.image, { height: Math.max(100, Math.min(350, height - topPad - bottomPad - 360)) }]}><SynauraImage source={visual} contentFit="contain" style={StyleSheet.absoluteFill} /></Pressable> : null}
      {post.track ? <View style={styles.track}><TrackCover track={post.track} active={active && playing} autoPlayVideo={active && playing} style={styles.cover} /><Pressable accessibilityRole="button" onPress={() => onOpenTrack(post.track!)} style={{ flex: 1 }}><Text numberOfLines={1} style={styles.author}>{post.track.title}</Text><Text numberOfLines={1} style={styles.muted}>{post.track.artist?.name}</Text></Pressable><LiveAction icon={playing ? 'pause' : 'play'} label={playing ? 'Mettre en pause le son joint' : 'Écouter le son joint'} onPress={() => onPlayTrack(post.track!)} /></View> : null}
      <View style={styles.actions}><LiveAction icon={liked ? 'heart' : 'heart-outline'} active={liked} count={count} label={liked ? 'Retirer le like' : 'Aimer la publication'} onPress={() => void toggle()} /><LiveAction icon="chatbubble-outline" count={commentCount} label="Commentaires de la publication" onPress={() => setCommentsOpen(true)} /><LiveAction icon="share-social-outline" label="Partager la publication" onPress={() => setShareOpen(true)} /><LiveAction icon="open-outline" label="Ouvrir la publication" onPress={onOpenPost} /></View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
    <PostShareSheet visible={shareOpen} post={post} onClose={() => setShareOpen(false)} />
    <CommentsSheet visible={commentsOpen && active} track={null} post={post} commentCount={commentCount} onCountChange={(_id, next) => setCommentCount(next)} onClose={() => setCommentsOpen(false)} />
  </View>;
});
const styles = StyleSheet.create({
  page: { width: '100%', overflow: 'hidden', backgroundColor: '#06080E' }, content: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24 }, authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#292438', overflow: 'hidden' }, author: { color: '#F3EEFF', fontSize: 14, fontWeight: '700' }, muted: { color: '#AAA9C0', fontSize: 12, marginTop: 4 }, text: { color: '#EEEAF7', fontFamily: 'Inter_600SemiBold', fontSize: 22, lineHeight: 30, letterSpacing: -.5 }, image: { width: '100%', marginTop: 24, borderRadius: 20, overflow: 'hidden' }, track: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 20 }, cover: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' }, actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }, error: { color: '#FFB3BB', fontSize: 12 },
});
export default PostSlide;
