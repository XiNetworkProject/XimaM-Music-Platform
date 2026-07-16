import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createComment, getCommentsPage } from '@/api/client';
import type { HomeComment, MusicClip, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { colors } from '@/theme/tokens';
import { fmtCount, fmtTime } from './helpers';

type Props = {
  visible: boolean;
  track: Track | null;
  clip?: MusicClip | null;
  commentCount: number;
  onClose: () => void;
  onCountChange?: (trackId: string, nextCount: number) => void;
};

function relativeTime(value: string) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const hrs = Math.floor(diffMin / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(value).toLocaleDateString('fr-FR');
}

export function CommentsSheet({ visible, track, clip = null, commentCount, onClose, onCountChange }: Props) {
  const insets = useSafeAreaInsets();
  const responsive = useResponsiveLayout();
  const keyboardHeight = useKeyboardHeight();
  const { user } = useAuth();
  const [comments, setComments] = useState<HomeComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const slide = useRef(new Animated.Value(0)).current;

  const targetKind = clip ? 'clip' as const : 'track' as const;
  const targetId = clip?.id || track?._id || '';
  const isRadio = targetKind === 'track' && targetId.startsWith('radio-');
  const isAi = targetKind === 'track' && targetId.startsWith('ai-');
  const disabled = !targetId || isRadio || isAi;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  const load = useCallback(async (mode: 'initial' | 'more') => {
    if (!targetId || disabled) {
      setComments([]);
      setHasMore(false);
      offsetRef.current = 0;
      return;
    }
    if (mode === 'initial') {
      setLoading(true);
      setError(null);
    }
    try {
      const cursor = mode === 'initial' ? 0 : offsetRef.current;
      const page = await getCommentsPage(targetKind, targetId, cursor);
      setComments((current) => (mode === 'initial' ? page.comments : [...current, ...page.comments]));
      setHasMore(page.hasMore);
      offsetRef.current = typeof page.nextCursor === 'number' ? page.nextCursor : cursor + page.comments.length;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger les commentaires.');
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, [disabled, targetId, targetKind]);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setError(null);
    void load('initial');
  }, [visible, targetId, load]);

  const submit = useCallback(async () => {
    const value = text.trim();
    if (!targetId || disabled || !value) return;
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const next = await createComment(targetKind, targetId, value);
      setComments((current) => [next, ...current]);
      setText('');
      onCountChange?.(targetId, commentCount + 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Impossible de publier le commentaire.');
    } finally {
      setSubmitting(false);
    }
  }, [commentCount, disabled, onCountChange, targetId, targetKind, text, user]);

  const renderComment = (comment: HomeComment, nested = false) => {
    const initial = (comment.user.name || comment.user.username || '?').slice(0, 1).toUpperCase();
    const avatar = comment.user.avatar;
    return (
      <View key={`${nested ? 'reply' : 'comment'}-${comment.id}`} style={[styles.row, nested && styles.replyRow]}>
        <View style={styles.avatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={StyleSheet.absoluteFillObject} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.metaLine}>
            <Text style={styles.author}>{comment.user.name}</Text>
            <Text style={styles.handle}>@{comment.user.username}</Text>
            <Text style={styles.time}>· {relativeTime(comment.createdAt)}</Text>
          </View>
          {comment.timestampSeconds != null ? (
            <View style={styles.timestampPill}>
              <Ionicons name="time-outline" size={11} color="#4A9EAA" />
              <Text style={styles.timestampText}>{fmtTime(comment.timestampSeconds)}</Text>
            </View>
          ) : null}
          <Text style={styles.content}>{comment.content}</Text>
          {comment.replies?.length ? (
            <View style={styles.replies}>{comment.replies.map((reply) => renderComment(reply, true))}</View>
          ) : null}
        </View>
      </View>
    );
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const opacity = slide;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity, backgroundColor: 'rgba(13,10,14,0.55)' }]}>
        <Pressable accessibilityLabel="Fermer les commentaires" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            left: responsive.overlayLeftInset,
            right: responsive.overlayRightInset,
            transform: [{ translateY }],
            paddingBottom: keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 14),
          },
        ]}
      >
        <View style={styles.handleArea}>
          <View style={styles.handleBar} />
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>Commentaires</Text>
            <Text numberOfLines={1} style={styles.title}>{clip?.sourceTrack?.title || track?.title || 'Discussion'}</Text>
            <Text style={styles.subtitle}>
              {commentCount > 0 ? `${fmtCount(commentCount)} réactions` : 'Aucune réaction encore — lance la conversation.'}
            </Text>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={22} color="#B8463C" />
              <Text style={styles.errorText}>{error}</Text>
              {!disabled ? <Pressable onPress={() => void load('initial')} style={styles.retryButton}><Text style={styles.retryText}>Reessayer</Text></Pressable> : null}
            </View>
          ) : disabled ? (
            <View style={styles.empty}>
              <Ionicons name="information-circle-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Les commentaires ne sont pas disponibles sur cette source.</Text>
            </View>
          ) : loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.cyan} />
              <Text style={styles.emptyText}>Chargement…</Text>
            </View>
          ) : comments.length ? (
            <View style={{ gap: 18 }}>{comments.map((comment) => renderComment(comment))}</View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.emptyText}>Aucun commentaire pour le moment.</Text>
            </View>
          )}

          {!disabled && hasMore ? (
            <Pressable accessibilityLabel="Charger plus de commentaires" onPress={() => void load('more')} style={styles.moreButton}>
              <Text style={styles.moreButtonText}>Charger plus</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {!disabled ? (
          <View style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={user ? 'Écris ton commentaire…' : 'Connecte-toi pour commenter'}
              placeholderTextColor={colors.textTertiary}
              editable={!!user}
              multiline
              style={styles.input}
            />
            <Pressable
              accessibilityLabel="Publier le commentaire"
              disabled={!user || !text.trim() || submitting}
              onPress={() => void submit()}
              style={[styles.submitButton, (!user || !text.trim() || submitting) && styles.submitButtonDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFAF2" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFAF2" />
              )}
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    minHeight: '60%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.textTertiary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontWeight: '700' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  scroll: { paddingHorizontal: 18, paddingVertical: 14, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 12 },
  replyRow: { marginLeft: 38, marginTop: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  avatarText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  body: { flex: 1, minWidth: 0 },
  metaLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 2 },
  author: { color: colors.text, fontSize: 13, fontWeight: '900' },
  handle: { color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  time: { color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  timestampPill: { marginTop: 5, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: 'rgba(74,158,170,0.12)', paddingHorizontal: 8, paddingVertical: 4 },
  timestampText: { color: '#4A9EAA', fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
  content: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  replies: { marginTop: 8, gap: 8 },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  errorBox: { marginVertical: 12, alignItems: 'center', gap: 8, borderRadius: 12, padding: 18, backgroundColor: 'rgba(217,109,99,0.1)' },
  errorText: { color: '#8F352E', fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  retryButton: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.violet },
  retryText: { color: '#FFFAF2', fontSize: 11, fontWeight: '900' },
  moreButton: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moreButtonText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.violet,
  },
  submitButtonDisabled: { opacity: 0.36 },
});

export default CommentsSheet;
