import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getPostDetail, togglePostLike } from '@/api/client';
import type { HomePost } from '@/api/types';
import { CommentsSheet } from '@/components/social/CommentsSheet';
import { PostShareSheet } from '@/components/social/PostShareSheet';
import { CollectionEmpty, CollectionHeader, CollectionIconButton, CollectionSurface, MusicRow, useCollectionPalette } from '@/components/mobile/CollectionUI';
import { EntryPressable } from '@/components/entry/EntryPressable';
import { usePlayer } from '@/player/PlayerProvider';
import { useAuth } from '@/auth/AuthProvider';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useMobileSettings } from '@/settings/MobileSettingsProvider';

export function PostDetailScreen() {
  const layout = useResponsiveLayout(); const p = useCollectionPalette(); const { settings } = useMobileSettings();
  const navigation = useNavigation<any>(); const route = useRoute<any>(); const player = usePlayer(); const auth = useAuth();
  const postId = String(route.params?.postId || '');
  const [post, setPost] = useState<HomePost | null>(null); const [loading, setLoading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false); const [shareOpen, setShareOpen] = useState(false); const [imageOpen, setImageOpen] = useState(false);
  const [imageRatio, setImageRatio] = useState(1); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const epoch = useRef(0); const liking = useRef(false);
  useEffect(() => {
    const request = ++epoch.current; setLoading(true); setPost(null); setError(''); setCommentsOpen(false); setShareOpen(false); setImageOpen(false); setImageRatio(1);
    getPostDetail(postId).then(value => { if (request === epoch.current) setPost(value); })
      .catch(() => { if (request === epoch.current) setError('Cette publication ne peut pas charger pour le moment.'); })
      .finally(() => { if (request === epoch.current) setLoading(false); });
    return () => { epoch.current++; };
  }, [postId, retry, auth.token]);
  const like = async () => {
    if (!auth.requireAuth()) { navigation.navigate('Login'); return; } if (!post || liking.current) return;
    liking.current = true; const snapshot = post; const request = epoch.current;
    setPost({ ...post, isLiked: !post.isLiked, likesCount: Math.max(0, post.likesCount + (post.isLiked ? -1 : 1)) });
    try { await togglePostLike(post.id); }
    catch { if (request === epoch.current) { setPost(snapshot); setError('Le like n’a pas pu être enregistré.'); } }
    finally { liking.current = false; }
  };
  const username = post?.handle.replace(/^@/, '');
  return <CollectionSurface>
    <View style={[layout.pageContent, { paddingTop: layout.insets.top }]}><CollectionHeader title="Publication" onBack={() => navigation.goBack()} actions={post ? <CollectionIconButton icon="share-outline" label="Partager la publication" onPress={() => setShareOpen(true)} /> : undefined} /></View>
    <ScrollView contentContainerStyle={[layout.pageContent, { paddingBottom: layout.miniPlayerClearance, gap: 20 }]} showsVerticalScrollIndicator={false}>
      {loading ? <CollectionEmpty loading title="La publication arrive…" /> : post ? <>
        <EntryPressable accessibilityRole="button" accessibilityLabel={"Profil de " + post.author} onPress={() => username && navigation.navigate('PublicProfile', { username })} style={s.authorRow}>
          <View style={[s.avatar, { backgroundColor: p.raised }]}>{post.avatar?.startsWith('http') ? <Image source={{ uri: post.avatar }} style={StyleSheet.absoluteFillObject} /> : <Text style={[s.initial, { color: p.blue }]}>{post.author.slice(0, 1)}</Text>}</View>
          <View style={{ flex: 1 }}><Text style={[s.author, { color: p.text }]}>{post.author}</Text><Text style={[s.meta, { color: p.muted }]}>{post.handle} · {post.time}</Text></View>
        </EntryPressable>
        <Text selectable style={[s.body, { color: p.text }]}>{post.text}</Text>
        {post.imageUrl ? <EntryPressable accessibilityRole="button" accessibilityLabel="Agrandir l’image de la publication" onPress={() => setImageOpen(true)}><Image source={{ uri: post.imageUrl }} resizeMode="contain" onLoad={({ nativeEvent }) => { const { width, height } = nativeEvent.source; if (width > 0 && height > 0) setImageRatio(Math.max(.5, Math.min(2, width / height))); }} style={{ width: '100%', aspectRatio: imageRatio, borderRadius: 24, backgroundColor: p.surface }} /></EntryPressable> : null}
        {post.track ? <View style={[s.track, { backgroundColor: p.surface }]}><MusicRow track={post.track} playing={player.current?._id === post.track._id && player.isPlaying} onPlay={() => void (player.current?._id === post.track!._id ? player.togglePlayPause() : player.playTrack(post.track!))} onOpen={() => navigation.navigate('TrackDetail', { trackId: post.track!._id, track: post.track })} /></View> : null}
        <View style={s.actions}><EntryPressable accessibilityRole="button" accessibilityLabel={post.isLiked ? 'Retirer le like' : 'Aimer la publication'} accessibilityState={{ selected: post.isLiked }} onPress={() => void like()} style={s.action}><Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={25} color={post.isLiked ? '#E57B94' : p.text} /><Text style={{ color: p.text }}>{post.likesCount}</Text></EntryPressable>
          <EntryPressable accessibilityRole="button" accessibilityLabel={"Commentaires, " + post.commentsCount} onPress={() => setCommentsOpen(true)} style={s.action}><Ionicons name="chatbubble-outline" size={23} color={p.text} /><Text style={{ color: p.text }}>{post.commentsCount}</Text></EntryPressable></View>
        <EntryPressable accessibilityRole="button" onPress={() => setCommentsOpen(true)} style={[s.comment, { backgroundColor: p.surface }]}><Ionicons name="chatbubbles-outline" size={24} color={p.blue} /><View style={{ flex: 1 }}><Text style={[s.author, { color: p.text }]}>La conversation continue</Text><Text style={[s.meta, { color: p.muted }]}>Lire et laisser un commentaire</Text></View><Ionicons name="arrow-forward" size={20} color={p.blue} /></EntryPressable>
      </> : <CollectionEmpty icon="document-text-outline" title={error ? 'Connexion indisponible' : 'Publication introuvable'} text={error || 'Ce contenu a peut-être été retiré.'} action={error ? 'Réessayer' : 'Revenir'} onPress={error ? () => setRetry(value => value + 1) : () => navigation.goBack()} />}
      {post && error ? <Text accessibilityRole="alert" style={{ color: p.violet }}>{error}</Text> : null}
    </ScrollView>
    {post ? <CommentsSheet visible={commentsOpen} kind="post" targetId={post.id} title={post.author} onClose={() => setCommentsOpen(false)} onCountChange={delta => setPost(current => current?.id === postId ? { ...current, commentsCount: Math.max(0, current.commentsCount + delta) } : current)} /> : null}
    <PostShareSheet visible={shareOpen} post={post} onClose={() => setShareOpen(false)} />
    <Modal visible={imageOpen} animationType={settings.reducedMotion ? 'none' : 'fade'} onRequestClose={() => setImageOpen(false)}>
      <View style={{ flex: 1, backgroundColor: p.bg, paddingTop: layout.insets.top, paddingBottom: layout.insets.bottom }}>
        <View style={{ alignSelf: 'flex-end', marginRight: 15 }}><CollectionIconButton icon="close" label="Fermer l’image" onPress={() => setImageOpen(false)} /></View>
        {post?.imageUrl ? <Image accessibilityLabel="Image de la publication" source={{ uri: post.imageUrl }} resizeMode="contain" style={{ flex: 1, width: '100%' }} /> : null}
      </View>
    </Modal>
  </CollectionSurface>;
}
const s = StyleSheet.create({
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 }, avatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 22, fontWeight: '700' }, author: { fontSize: 16, fontWeight: '700' }, meta: { fontSize: 12, lineHeight: 19, marginTop: 4 }, body: { fontSize: 18, lineHeight: 29 }, actions: { flexDirection: 'row', gap: 20 }, action: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5 }, comment: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 20, borderRadius: 25 }, track: { paddingHorizontal: 12, borderRadius: 22 },
});
