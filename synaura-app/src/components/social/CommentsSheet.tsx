import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createComment, deleteComment, getCommentsPage } from '@/api/client';
import type { HomeComment } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radius, spacing } from '@/theme/tokens';

export function CommentsSheet({
  visible,
  kind,
  targetId,
  title,
  onClose,
  onCountChange,
}: {
  visible: boolean;
  kind: 'post' | 'track';
  targetId: string;
  title: string;
  onClose: () => void;
  onCountChange?: (delta: number) => void;
}) {
  const auth = useAuth();
  const [items, setItems] = React.useState<HomeComment[]>([]);
  const [text, setText] = React.useState('');
  const [cursor, setCursor] = React.useState<string | number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const loadingRef = React.useRef(false);

  const load = React.useCallback(async (nextCursor: string | number | null = null) => {
    if (!targetId || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const page = await getCommentsPage(kind, targetId, nextCursor);
      setItems((current) => nextCursor ? [...current, ...page.comments] : page.comments);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [kind, targetId]);

  React.useEffect(() => {
    if (visible) void load(null);
  }, [visible, load]);

  const submit = async () => {
    const content = text.trim();
    if (!content || submitting || !auth.user) return;
    setSubmitting(true);
    try {
      const comment = await createComment(kind, targetId, content);
      setItems((current) => [comment, ...current]);
      setText('');
      onCountChange?.(1);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (commentId: string) => {
    setItems((current) => current.filter((comment) => comment.id !== commentId));
    onCountChange?.(-1);
    await deleteComment(kind, targetId, commentId).catch(() => void load(null));
  };

  return (
    <BottomSheet visible={visible} title="Commentaires" subtitle={title} onClose={onClose} keyboard maxHeight="88%">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <EmptyState icon="chatbubble-ellipses-outline" title="Aucun commentaire" text="Sois la première personne à lancer la conversation." /> : null}
        ListFooterComponent={loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : hasMore ? <Pressable onPress={() => void load(cursor)} style={styles.more}><Text style={styles.moreText}>Charger plus</Text></Pressable> : null}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.user.name || item.user.username || '?').slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.copy}>
              <View style={styles.meta}><Text style={styles.author}>{item.user.name || item.user.username}</Text><Text style={styles.handle}>@{item.user.username}</Text></View>
              <Text style={styles.body}>{item.content}</Text>
            </View>
            {auth.user?.id === item.user.id ? <Pressable accessibilityLabel="Supprimer le commentaire" onPress={() => void remove(item.id)} style={styles.delete}><Ionicons name="trash-outline" size={15} color={colors.danger} /></Pressable> : null}
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          editable={Boolean(auth.user)}
          multiline
          placeholder={auth.user ? 'Ajouter un commentaire…' : 'Connecte-toi pour commenter'}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        <Pressable accessibilityLabel="Publier" onPress={() => void submit()} disabled={submitting || !text.trim() || !auth.user} style={[styles.send, (submitting || !text.trim() || !auth.user) && styles.sendDisabled]}>
          {submitting ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={17} color={colors.white} />}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.md },
  comment: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  avatarText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  author: { color: colors.text, fontSize: 12, fontWeight: '900' },
  handle: { color: colors.textTertiary, fontSize: 10, fontWeight: '700' },
  body: { marginTop: 4, color: colors.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  delete: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  loader: { paddingVertical: spacing.lg },
  more: { alignSelf: 'center', borderRadius: radius.pill, backgroundColor: 'rgba(17,17,17,0.05)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  moreText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.backgroundAlt, padding: spacing.md },
  input: { flex: 1, minHeight: 44, maxHeight: 110, borderRadius: 22, backgroundColor: 'rgba(17,17,17,0.045)', paddingHorizontal: spacing.md, paddingVertical: 11, color: colors.text, fontSize: 13, fontWeight: '600' },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  sendDisabled: { opacity: 0.35 },
});
