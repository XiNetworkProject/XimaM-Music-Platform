import React, { useEffect } from 'react';
import { AppState, DeviceEventEmitter, type AppStateStatus } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { getConversationMessages, reactToConversationMessage, sendConversationMessage, type MessagingMessage } from '@/api/client';
import {
  CONVERSATION_BUBBLE_CHANGED,
  CONVERSATION_BUBBLE_REACTION,
  CONVERSATION_BUBBLE_REPLY,
  configureNativeConversationBubble,
  getPreferredConversationBubble,
  hideConversationBubble,
  showConversationBubble,
  setPreferredConversationBubble,
  supportsConversationBubble,
  updateConversationBubbleContent,
  type ConversationBubbleConfig,
} from '@/messaging/conversationBubble';

function bubbleMessageText(message: MessagingMessage) {
  if (message.deleted) return 'Message supprimé';
  if (message.type === 'text') return message.content;
  if (message.type === 'audio') return 'Message vocal';
  if (message.type === 'image') return 'Photo';
  if (message.type === 'video') return 'Vidéo';
  return message.content || `Contenu ${message.type}`;
}

export function ConversationBubbleProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    if (!supportsConversationBubble()) return undefined;
    let mounted = true;
    let refreshing = false;

    const refreshBubble = async (config: ConversationBubbleConfig) => {
      if (refreshing || !auth.user || config.userId !== auth.user.id) return;
      refreshing = true;
      try {
        const page = await getConversationMessages(config.conversationId);
        if (!mounted) return;
        await updateConversationBubbleContent(config, page.messages.map((message) => ({
          id: message.id,
          senderId: message.sender.id,
          senderName: message.sender.name,
          content: bubbleMessageText(message),
          createdAt: message.createdAt,
          own: message.sender.id === auth.user?.id,
          reaction: message.reactions.find((reaction) => reaction.userId === auth.user?.id)?.reaction || null,
        })));
      } catch {
        // The compact chat keeps the last synchronized messages while offline.
      } finally {
        refreshing = false;
      }
    };

    const synchronize = async (state: AppStateStatus) => {
      if (!mounted) return;
      if (state === 'active' || auth.loading || !auth.user) {
        await hideConversationBubble().catch(() => {});
        return;
      }
      const config = await getPreferredConversationBubble();
      if (!mounted || !config || config.userId !== auth.user.id) return;
      await configureNativeConversationBubble(config);
      await showConversationBubble(config.conversationId, config.title, config.accentColor).catch(() => {});
      await refreshBubble(config);
    };

    if (!auth.loading && !auth.user) {
      void setPreferredConversationBubble(null).then(() => hideConversationBubble()).catch(() => {});
    } else if (auth.user) {
      void getPreferredConversationBubble().then((config) => {
        if (!mounted || !config) return;
        if (config.userId !== auth.user?.id) {
          void setPreferredConversationBubble(null).catch(() => {});
          return;
        }
        void configureNativeConversationBubble(config);
      });
    }

    void synchronize(AppState.currentState);
    const appStateSubscription = AppState.addEventListener('change', (state) => void synchronize(state));
    const configSubscription = DeviceEventEmitter.addListener(
      CONVERSATION_BUBBLE_CHANGED,
      () => void synchronize(AppState.currentState),
    );
    const replySubscription = DeviceEventEmitter.addListener(CONVERSATION_BUBBLE_REPLY, (payload) => {
      void (async () => {
        const config = await getPreferredConversationBubble();
        const content = typeof payload?.content === 'string' ? payload.content.trim().slice(0, 2_000) : '';
        if (!config || !content || payload?.conversationId !== config.conversationId || config.userId !== auth.user?.id) return;
        await sendConversationMessage(config.conversationId, { type: 'text', content }).catch(() => null);
        await refreshBubble(config);
      })();
    });
    const reactionSubscription = DeviceEventEmitter.addListener(CONVERSATION_BUBBLE_REACTION, (payload) => {
      void (async () => {
        const config = await getPreferredConversationBubble();
        const messageId = typeof payload?.messageId === 'string' ? payload.messageId : '';
        if (!config || !messageId || payload?.conversationId !== config.conversationId || config.userId !== auth.user?.id) return;
        await reactToConversationMessage(config.conversationId, messageId, payload?.reaction === 'heart' ? 'heart' : null).catch(() => null);
        await refreshBubble(config);
      })();
    });
    const refreshTimer = setInterval(() => {
      if (AppState.currentState === 'active') return;
      void getPreferredConversationBubble().then((config) => {
        if (config) void refreshBubble(config);
      });
    }, 6_000);

    return () => {
      mounted = false;
      appStateSubscription.remove();
      configSubscription.remove();
      replySubscription.remove();
      reactionSubscription.remove();
      clearInterval(refreshTimer);
      if (AppState.currentState === 'active') void hideConversationBubble().catch(() => {});
    };
  }, [auth.loading, auth.user?.id]);

  return children;
}
