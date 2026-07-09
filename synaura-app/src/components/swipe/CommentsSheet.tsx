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
import type { HomeComment, Track } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { fmtCount, fmtTime } from './helpers';

type Props = {
  visible: boolean;
  track: Track | null;
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

export function CommentsSheet({ visible, track, commentCount, onClose, onCountChange }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { user } = useAuth();
  const [comments, setComments] = useState<HomeComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  const trackIdValue = track?._id || '';
  const isRadio = trackIdValue.startsWith('radio-');
  const isAi = trackIdValue.startsWith('ai-');
  const disabled = !trackIdValue || isRadio || isAi;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [slide, visible]);

  const load = useCallback(async (mode: 'initial' | 'more') => {
    if (!trackIdValue || disabled) {
      setComments([]);
      setHasMore(false);
      setOffset(0);
      return;
    }
    if (mode === 'initial') setLoading(true);
    try {
      const cursor = mode === 'initial' ? 0 : offset;
      const page = await getCommentsPage('track', trackIdValue, cursor);
      setComments((current) => (mode === 'initial' ? page.comments : [...current, ...page.comments]));
      setHasMore(page.hasMore);
      setOffset(typeof page.nextCursor === 'number' ? page.nextCursor : cursor + page.comments.length);
    } catch {
      // silencieux
    } finally {
      if (mode === 'initial') setLoading(false);
    }
  }, [disabled, offset, trackIdValue]);

  useEffect(() => {
    if (!visible) return;
    setText('');
    void load('initial');
  }, [visible, trackIdValue, load]);

  const submit = useCallback(async () => {
    const value = text.trim();
    if (!trackIdValue || disabled || !value) return;
    if (!user) return;
    setSubmitting(true);
    try {
      const next = await createComment('track', trackIdValue, value);
      setComments((current) => [next, ...current]);
      setText('');
      onCountChange?.(trackIdValue, commentCount + 1);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }, [commentCount, disabled, onCountChange, text, trackIdValue, user]);

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
            <Text numberOfLines={1} style={styles.title}>{track?.title || 'Discussion'}</Text>
            <Text style={styles.subtitle}>
              {commentCount > 0 ? `${fmtCount(commentCount)} réactions` : 'Aucune réaction encore — lance la conversation.'}
            </Text>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#171313" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {disabled ? (
            <View style={styles.empty}>
              <Ionicons name="information-circle-outline" size={28} color="rgba(23,19,19,0.45)" />
              <Text style={styles.emptyText}>Les commentaires ne sont pas disponibles sur cette source.</Text>
            </View>
          ) : loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color="#171313" />
              <Text style={styles.emptyText}>Chargement…</Text>
            </View>
          ) : comments.length ? (
            <View style={{ gap: 18 }}>{comments.map((comment) => renderComment(comment))}</View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={28} color="rgba(23,19,19,0.45)" />
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
              placeholderTextColor="rgba(23,19,19,0.36)"
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
    backgroundColor: '#FFFAF2',
    borderTopWidth: 1,
    borderTopColor: 'rgba(23,19,19,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: 'rgba(23,19,19,0.18)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(23,19,19,0.08)',
    gap: 12,
  },
  kicker: { color: 'rgba(23,19,19,0.42)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: '#171313', fontSize: 18, fontWeight: '900', marginTop: 4 },
  subtitle: { color: 'rgba(23,19,19,0.5)', fontSize: 12, marginTop: 4, fontWeight: '700' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,19,0.06)',
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
    backgroundColor: 'rgba(23,19,19,0.06)',
  },
  avatarText: { color: '#171313', fontSize: 13, fontWeight: '900' },
  body: { flex: 1, minWidth: 0 },
  metaLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 2 },
  author: { color: '#171313', fontSize: 13, fontWeight: '900' },
  handle: { color: 'rgba(23,19,19,0.42)', fontSize: 11, fontWeight: '700' },
  time: { color: 'rgba(23,19,19,0.32)', fontSize: 11, fontWeight: '700' },
  timestampPill: { marginTop: 5, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: 'rgba(74,158,170,0.12)', paddingHorizontal: 8, paddingVertical: 4 },
  timestampText: { color: '#4A9EAA', fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
  content: { color: 'rgba(23,19,19,0.82)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  replies: { marginTop: 8, gap: 8 },
  empty: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyText: { textAlign: 'center', color: 'rgba(23,19,19,0.55)', fontSize: 13, lineHeight: 19 },
  moreButton: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.12)',
    backgroundColor: 'rgba(23,19,19,0.04)',
  },
  moreButtonText: { color: 'rgba(23,19,19,0.7)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(23,19,19,0.08)',
    backgroundColor: '#FFFAF2',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    color: '#171313',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(23,19,19,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(23,19,19,0.08)',
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171313',
  },
  submitButtonDisabled: { opacity: 0.36 },
});

export default CommentsSheet;
