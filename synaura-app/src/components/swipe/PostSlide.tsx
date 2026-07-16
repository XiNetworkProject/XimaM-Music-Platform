import React, { memo, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { HomePost, Track } from '@/api/types';
import { togglePostLike } from '@/api/client';
import { MotionPressable } from '@/components/motion/Motion';
import { PostAttachedTrackCard } from '@/components/social/PostAttachedTrackCard';
import { PostShareSheet } from '@/components/social/PostShareSheet';
import { colors } from '@/theme/tokens';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

type Props = {
  post: HomePost;
  active: boolean;
  playing: boolean;
  height: number;
  topPad: number;
  bottomPad: number;
  onOpenPost: () => void;
  onOpenProfile: () => void;
  onOpenTrack: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
};

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k`;
  return String(Math.max(0, value));
}

export const PostSlide = memo(function PostSlide(props: Props) {
  const { post, active, playing, height, topPad, bottomPad, onOpenPost, onOpenProfile, onOpenTrack, onPlayTrack } = props;
  const responsive = useResponsiveLayout();
  const [liked, setLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [liking, setLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const visual = post.imageUrl || post.track?.coverUrl || null;
  const initial = (post.author || post.handle || 'S').slice(0, 1).toUpperCase();

  useEffect(() => {
    setLiked(post.isLiked);
    setLikesCount(post.likesCount);
  }, [post.id, post.isLiked, post.likesCount]);

  const toggleLike = async () => {
    if (liking) return;
    const next = !liked;
    setLiked(next);
    setLikesCount((current) => Math.max(0, current + (next ? 1 : -1)));
    setLiking(true);
    try {
      const result = await togglePostLike(post.id);
      if (typeof result?.liked === 'boolean') setLiked(result.liked);
      if (Number.isFinite(Number(result?.likesCount))) setLikesCount(Number(result.likesCount));
    } catch {
      setLiked(!next);
      setLikesCount((current) => Math.max(0, current + (next ? -1 : 1)));
    } finally {
      setLiking(false);
    }
  };

  return (
    <View style={[styles.page, { height }]}>
      {visual ? (
        <>
          <Image source={{ uri: visual }} blurRadius={34} style={styles.backdropImage} />
          <LinearGradient colors={['rgba(11,11,11,0.70)', 'rgba(18,15,16,0.82)', '#0B0B0B']} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFillObject} />
        </>
      ) : (
        <LinearGradient colors={['#2A203D', '#171313', '#0B0B0B']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFillObject} />
      )}

      <View
        style={[
          styles.content,
          responsive.contentFrame,
          {
            paddingTop: topPad + (responsive.isPhoneLandscape ? 52 : responsive.compactControls ? 74 : 92),
            paddingBottom: bottomPad + (responsive.isPhoneLandscape ? 4 : responsive.compactControls ? 12 : 20),
            paddingHorizontal: responsive.gutter,
            opacity: active ? 1 : 0.72,
          },
        ]}
      >
        <View style={styles.authorRow}>
          <Pressable accessibilityLabel="Ouvrir le profil" onPress={onOpenProfile} style={[styles.avatar, responsive.isVeryShort && styles.avatarCompact]}>
            {post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.avatarText}>{initial}</Text>}
          </Pressable>
          <Pressable accessibilityLabel="Ouvrir le profil" onPress={onOpenProfile} style={styles.authorCopy}>
            <Text numberOfLines={1} style={styles.author}>{post.author}</Text>
            <Text numberOfLines={1} style={styles.authorMeta}>{post.handle}{post.time ? ` · ${post.time}` : ''}</Text>
          </Pressable>
          <View style={styles.flowLabel}>
            <View style={styles.flowRule} />
            <Text style={styles.flowLabelText}>DANS LE FLOW</Text>
          </View>
        </View>

        <View style={[styles.body, responsive.isVeryShort && styles.bodyCompact]}>
          {post.text ? (
            <Pressable accessibilityLabel="Ouvrir la publication" onPress={onOpenPost}>
              <Text numberOfLines={responsive.isVeryShort ? 2 : responsive.isShort ? 4 : 6} style={[styles.postText, responsive.compactControls && styles.postTextCompact]}>{post.text}</Text>
            </Pressable>
          ) : null}

          {post.imageUrl && !(responsive.isVeryShort && post.track) ? (
            <Pressable accessibilityLabel="Ouvrir la publication" onPress={onOpenPost} style={[styles.postImageWrap, responsive.isShort && styles.postImageWrapShort, responsive.isVeryShort && styles.postImageWrapVeryShort]}>
              <Image source={{ uri: post.imageUrl }} resizeMode="cover" style={styles.postImage} />
            </Pressable>
          ) : null}

          {post.track ? (
            <PostAttachedTrackCard
              track={post.track}
              playing={playing}
              compact={responsive.compactControls}
              onPlay={() => onPlayTrack(post.track!)}
              onOpen={() => onOpenTrack(post.track!)}
            />
          ) : null}
        </View>

        <View style={[styles.actions, responsive.isVeryShort && styles.actionsCompact]}>
          <MotionPressable accessibilityLabel={liked ? "Retirer le j'aime" : "J'aime"} disabled={liking} onPress={() => void toggleLike()} style={[styles.action, liked && styles.actionLiked]} scaleTo={0.92}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#FFB7B0' : 'rgba(255,255,255,0.74)'} />
            <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likesCount ? formatCount(likesCount) : "J'aime"}</Text>
          </MotionPressable>
          <MotionPressable accessibilityLabel="Commenter" onPress={onOpenPost} style={styles.action} scaleTo={0.92}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="rgba(255,255,255,0.74)" />
            <Text style={styles.actionText}>{post.commentsCount ? formatCount(post.commentsCount) : 'Commenter'}</Text>
          </MotionPressable>
          <MotionPressable accessibilityLabel="Partager" onPress={() => setShareOpen(true)} style={styles.iconAction} scaleTo={0.9}>
            <Ionicons name="share-social-outline" size={18} color="rgba(255,255,255,0.74)" />
          </MotionPressable>
        </View>
      </View>

      <PostShareSheet visible={shareOpen} post={post} onClose={() => setShareOpen(false)} />
    </View>
  );
});

const styles = StyleSheet.create({
  page: { width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#0B0B0B' },
  backdropImage: { ...StyleSheet.absoluteFillObject, transform: [{ scale: 1.18 }], opacity: 0.42 },
  content: { flex: 1, width: '100%', alignSelf: 'center', justifyContent: 'center' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  avatarCompact: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  authorCopy: { flex: 1, minWidth: 0 },
  author: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  authorMeta: { marginTop: 3, color: 'rgba(255,255,255,0.46)', fontSize: 10, fontWeight: '700' },
  flowLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  flowRule: { width: 2, height: 26, borderRadius: 1, backgroundColor: colors.cyan },
  flowLabelText: { color: 'rgba(255,255,255,0.58)', fontSize: 8, fontWeight: '900' },
  body: { marginTop: 24 },
  bodyCompact: { marginTop: 12 },
  postText: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900' },
  postTextCompact: { fontSize: 21, lineHeight: 26 },
  postImageWrap: { marginTop: 18, height: 220, overflow: 'hidden', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  postImageWrapShort: { height: 130 },
  postImageWrapVeryShort: { height: 76, marginTop: 10 },
  postImage: { width: '100%', height: '100%' },
  actions: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsCompact: { marginTop: 10 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 22, paddingHorizontal: 15, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  actionLiked: { backgroundColor: 'rgba(217,109,99,0.20)', borderColor: 'rgba(217,109,99,0.44)' },
  actionText: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '900' },
  actionTextLiked: { color: '#FFB7B0' },
  iconAction: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
});

export default PostSlide;
