import React from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createComment, deleteComment, getCommentsPage } from '@/api/client';
import type { HomeComment } from '@/api/types';

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
  const [items, setItems] = React.useState<HomeComment[]>([]);
  const [text, setText] = React.useState('');
  const [cursor, setCursor] = React.useState<string | number | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async (nextCursor: string | number | null = null) => {
    if (!targetId || loading) return;
    setLoading(true);
    try {
      const page = await getCommentsPage(kind, targetId, nextCursor);
      setItems((current) => nextCursor ? [...current, ...page.comments] : page.comments);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [kind, loading, targetId]);

  React.useEffect(() => {
    if (visible) load(null);
  }, [visible, load]);

  const submit = async () => {
    const content = text.trim();
    if (!content || submitting) return;
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
    await deleteComment(kind, targetId, commentId);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Commentaires</Text>
              <Text numberOfLines={1} style={styles.title}>{title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconBtn}><Ionicons name="close" size={20} color="#171313" /></Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={!loading ? <Text style={styles.empty}>Sois le premier à commenter.</Text> : null}
            ListFooterComponent={loading ? <ActivityIndicator color="#8B5CF6" /> : hasMore ? <Pressable onPress={() => load(cursor)} style={styles.more}><Text style={styles.moreText}>Charger plus</Text></Pressable> : null}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.user.name || item.user.username || '?').slice(0, 1).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.author}>{item.user.name || item.user.username}</Text>
                  <Text style={styles.body}>{item.content}</Text>
                </View>
                <Pressable onPress={() => remove(item.id)} style={styles.delete}><Ionicons name="trash-outline" size={15} color="#B91C1C" /></Pressable>
              </View>
            )}
          />
          <View style={styles.inputRow}>
            <TextInput value={text} onChangeText={setText} placeholder="Ajouter un commentaire..." placeholderTextColor="#9B8F89" style={styles.input} />
            <Pressable onPress={submit} disabled={submitting || !text.trim()} style={[styles.send, (!text.trim() || submitting) && { opacity: 0.45 }]}>
              <Ionicons name="send" size={17} color="#FFF7ED" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,19,19,0.34)' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FFF7ED', padding: 16, paddingBottom: 18 },
  handle: { width: 46, height: 5, borderRadius: 999, backgroundColor: 'rgba(23,19,19,0.18)', alignSelf: 'center', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  eyebrow: { color: '#8B5CF6', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#171313', fontSize: 20, fontWeight: '900' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(23,19,19,0.07)', alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10, paddingVertical: 8, minHeight: 180 },
  comment: { flexDirection: 'row', gap: 10, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#171313', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF7ED', fontWeight: '900' },
  author: { color: '#171313', fontWeight: '900', fontSize: 13 },
  body: { color: '#5A4E49', marginTop: 3, lineHeight: 19 },
  delete: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#6B5F5A', fontWeight: '800', marginTop: 24 },
  more: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.10)' },
  moreText: { color: '#6D28D9', fontWeight: '900' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 },
  input: { flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: '#171313', fontWeight: '700' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
});
