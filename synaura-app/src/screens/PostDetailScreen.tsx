import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPostDetail, togglePostLike } from '@/api/client';
import type { HomePost } from '@/api/types';
import { CommentsSheet } from '@/components/social/CommentsSheet';
import { SynauraBackground } from '@/components/SynauraBackground';
import { TrackCover } from '@/components/TrackCover';
import { usePlayer } from '@/player/PlayerProvider';

export function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const player = usePlayer();
  const postId = String(route.params?.postId || '');
  const [post, setPost] = React.useState<HomePost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [commentsOpen, setCommentsOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPostDetail(postId)
      .then((next) => { if (mounted) setPost(next); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [postId]);

  const like = async () => {
    if (!post) return;
    setPost({ ...post, isLiked: !post.isLiked, likesCount: Math.max(0, post.likesCount + (post.isLiked ? -1 : 1)) });
    await togglePostLike(post.id);
  };

  const username = post?.handle.replace(/^@/, '');

  return (
    <SynauraBackground variant="warm">
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 128 }]}>
        <View style={styles.topbar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color="#171313" /></Pressable>
          <Text style={styles.title}>Post</Text>
        </View>
        {loading ? <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} /> : null}
        {post ? (
          <View style={styles.card}>
            <Pressable onPress={() => username && navigation.navigate('PublicProfile', { username })} style={styles.authorRow}>
              <View style={styles.avatar}>{post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={styles.avatarText}>{post.avatar}</Text>}</View>
              <View>
                <Text style={styles.author}>{post.author}</Text>
                <Text style={styles.handle}>{post.handle} · {post.time}</Text>
              </View>
            </Pressable>
            <Text style={styles.text}>{post.text}</Text>
            {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} /> : null}
            {post.track ? (
              <Pressable onPress={() => player.playTrack(post.track!)} style={styles.track}>
                <TrackCover track={post.track} style={styles.cover} active={player.current?._id === post.track._id} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.trackTitle}>{post.track.title}</Text>
                  <Text numberOfLines={1} style={styles.trackMeta}>{post.track.artist?.name || post.track.artist?.username || 'Synaura'}</Text>
                </View>
                <Ionicons name="play" size={18} color="#171313" />
              </Pressable>
            ) : null}
            <View style={styles.actions}>
              <Pressable onPress={like} style={styles.action}><Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={19} color={post.isLiked ? '#EF4444' : '#171313'} /><Text style={styles.actionText}>{post.likesCount}</Text></Pressable>
              <Pressable onPress={() => setCommentsOpen(true)} style={styles.action}><Ionicons name="chatbubble-outline" size={18} color="#171313" /><Text style={styles.actionText}>{post.commentsCount}</Text></Pressable>
            </View>
            <Pressable onPress={() => setCommentsOpen(true)} style={styles.commentPreview}>
              <Ionicons name="chatbubbles-outline" size={18} color="#8B5CF6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.commentPreviewTitle}>Commentaires</Text>
                <Text style={styles.commentPreviewText}>Lire, ajouter ou supprimer un commentaire sans quitter la page.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(23,19,19,0.42)" />
            </Pressable>
          </View>
        ) : !loading ? <Text style={styles.empty}>Post introuvable.</Text> : null}
      </ScrollView>
      {post ? <CommentsSheet visible={commentsOpen} kind="post" targetId={post.id} title={post.author} onClose={() => setCommentsOpen(false)} onCountChange={(delta) => setPost((current) => current ? { ...current, commentsCount: Math.max(0, current.commentsCount + delta) } : current)} /> : null}
    </SynauraBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 150 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.76)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#171313', fontSize: 28, fontWeight: '900' },
  card: { borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(23,19,19,0.08)', padding: 16 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#171313', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#FFF7ED', fontWeight: '900', fontSize: 16 },
  author: { color: '#171313', fontWeight: '900', fontSize: 16 },
  handle: { color: '#7C6F68', fontWeight: '700', marginTop: 2 },
  text: { color: '#2B2420', fontSize: 16, lineHeight: 24, fontWeight: '600' },
  image: { width: '100%', height: 260, borderRadius: 22, marginTop: 14, backgroundColor: '#E7DDD4' },
  track: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: '#FFF7ED', padding: 10 },
  cover: { width: 58, height: 58, borderRadius: 16 },
  trackTitle: { color: '#171313', fontWeight: '900', fontSize: 15 },
  trackMeta: { color: '#6B5F5A', fontWeight: '700', marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.06)', paddingHorizontal: 12, paddingVertical: 9 },
  actionText: { color: '#171313', fontWeight: '900' },
  commentPreview: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.09)', padding: 12 },
  commentPreviewTitle: { color: '#171313', fontSize: 13, fontWeight: '900' },
  commentPreviewText: { color: '#6B5F5A', fontSize: 12, fontWeight: '700', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B5F5A', fontWeight: '800', marginTop: 60 },
});
