import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { api, type Message, type Conversation } from '../services/api';

type RouteParams = { Conversation: { id: string } };

const BG = '#020017';
const CARD = 'rgba(15,23,42,0.9)';
const ACCENT = '#7B61FF';
const SENT_BG = 'rgba(123,97,255,0.25)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.55)';
const BORDER = 'rgba(255,255,255,0.08)';
const ONLINE_GREEN = '#22C55E';

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Hier ${time}`;
  if (diffDays < 7) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${days[d.getDay()]} ${time}`;
  }
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${time}`;
}

const ConversationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'Conversation'>>();
  const conversationId = route.params.id;
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(
    async (before?: string) => {
      const res = await api.getMessages(conversationId, 50, before);
      if (res.success) {
        const fetched = res.data.messages;
        if (before) {
          setMessages((prev) => [...prev, ...fetched]);
        } else {
          setMessages(fetched);
        }
        if (fetched.length < 50) setHasMore(false);
      }
    },
    [conversationId],
  );

  const fetchConversation = useCallback(async () => {
    const res = await api.getConversations();
    if (res.success) {
      const found = res.data.conversations.find((c) => c._id === conversationId);
      if (found) setConversation(found);
    }
  }, [conversationId]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchMessages(), fetchConversation()]);
      setLoading(false);
    };
    init();
  }, [fetchMessages, fetchConversation]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[messages.length - 1];
    await fetchMessages(oldest._id);
    setLoadingMore(false);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      content: text,
      sender: {
        _id: user?.id ?? '',
        username: user?.name ?? '',
        name: user?.name,
        avatar: user?.avatar,
      },
      conversationId,
      createdAt: new Date().toISOString(),
      readBy: [],
    };
    setMessages((prev) => [optimistic, ...prev]);

    const res = await api.sendMessage(conversationId, text);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? res.data.message : m)),
      );
    }
    setSending(false);
  }, [input, sending, user, conversationId]);

  const otherUser = conversation?.participants.find((p) => p._id !== user?.id) ??
    conversation?.participants[0];

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.sender._id === user?.id;
      const isRead =
        isMine && item.readBy && item.readBy.some((id) => id !== user?.id);

      return (
        <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
          {!isMine && (
            <View style={styles.msgAvatarWrap}>
              {item.sender.avatar ? (
                <Image source={{ uri: item.sender.avatar }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarPlaceholder]}>
                  <Text style={styles.msgAvatarLetter}>
                    {(item.sender.name ?? item.sender.username)?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleSent : styles.bubbleReceived,
            ]}
          >
            <Text style={styles.bubbleText}>{item.content}</Text>
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
              {isMine && (
                <Ionicons
                  name={isRead ? 'checkmark-done' : 'checkmark'}
                  size={14}
                  color={isRead ? ACCENT : TEXT_SECONDARY}
                  style={styles.checkIcon}
                />
              )}
            </View>
          </View>
        </View>
      );
    },
    [user?.id],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>

        {otherUser && (
          <Pressable
            style={styles.headerUser}
            onPress={() =>
              navigation.navigate('PublicProfile', { username: otherUser.username })
            }
          >
            <View style={styles.headerAvatarWrap}>
              {otherUser.avatar ? (
                <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Text style={styles.headerAvatarLetter}>
                    {(otherUser.name ?? otherUser.username)?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.headerName} numberOfLines={1}>
                {otherUser.name ?? otherUser.username}
              </Text>
              <Text style={styles.headerStatus}>En ligne</Text>
            </View>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.messagesList}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={ACCENT} style={styles.loaderMore} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color={TEXT_SECONDARY} />
            <Text style={styles.emptyChatText}>Aucun message pour l'instant</Text>
            <Text style={styles.emptyChatSub}>Envoyez le premier message !</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <Pressable style={styles.attachBtn} hitSlop={8}>
          <Ionicons name="image-outline" size={22} color={TEXT_SECONDARY} />
        </Pressable>

        <TextInput
          style={styles.textInput}
          placeholder="Écrire un message…"
          placeholderTextColor={TEXT_SECONDARY}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />

        <Pressable
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
          hitSlop={8}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={input.trim() ? TEXT_PRIMARY : TEXT_SECONDARY}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  headerUser: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
  headerAvatarWrap: { position: 'relative', marginRight: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarPlaceholder: {
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarLetter: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  headerName: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  headerStatus: { color: ONLINE_GREEN, fontSize: 12, marginTop: 1 },

  messagesList: { paddingHorizontal: 12, paddingVertical: 8 },

  bubbleRow: { flexDirection: 'row', marginVertical: 3, maxWidth: '85%' },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubbleRowLeft: { alignSelf: 'flex-start' },

  msgAvatarWrap: { marginRight: 8, alignSelf: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14 },
  msgAvatarPlaceholder: {
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgAvatarLetter: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '600' },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleSent: {
    backgroundColor: SENT_BG,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: CARD,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: TEXT_PRIMARY, fontSize: 15, lineHeight: 21 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-end' },
  bubbleTime: { color: TEXT_SECONDARY, fontSize: 11 },
  checkIcon: { marginLeft: 4 },

  loaderMore: { paddingVertical: 16 },

  emptyChat: {
    alignItems: 'center',
    paddingVertical: 40,
    transform: [{ scaleY: -1 }],
  },
  emptyChatText: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyChatSub: { color: TEXT_SECONDARY, fontSize: 13, marginTop: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },
  attachBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { backgroundColor: 'rgba(123,97,255,0.3)' },
});

export default ConversationScreen;
