import React, { useEffect } from 'react';
import { AppState, DeviceEventEmitter, type AppStateStatus } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { getConversationMessages, type MessagingMessage } from '@/api/client';
import {
  CONVERSATION_BUBBLE_CHANGED,
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
    let synchronization = Promise.resolve();

    const refreshBubble = async (config: ConversationBubbleConfig) => {
      if (!auth.user || config.userId !== auth.user.id) return false;
      try {
        const page = await getConversationMessages(config.conversationId);
        if (!mounted) return false;
        return await updateConversationBubbleContent(config, page.messages.map((message) => ({
          id: message.id,
          senderId: message.sender.id,
          senderName: message.sender.name,
          content: bubbleMessageText(message),
          createdAt: message.createdAt,
          own: message.sender.id === auth.user?.id,
          reaction: message.reactions.find((reaction) => reaction.userId === auth.user?.id)?.reaction || null,
        })));
      } catch {
        return false;
      }
    };

    const synchronize = async (state: AppStateStatus) => {
      if (!mounted) return;
      if (auth.loading || !auth.user) {
        await hideConversationBubble().catch(() => {});
        return;
      }
      const config = await getPreferredConversationBubble();
      if (!mounted || !config || config.userId !== auth.user.id) return;
      await configureNativeConversationBubble(config);
      if (state === 'active') {
        await hideConversationBubble().catch(() => {});
        return;
      }
      if (state !== 'background') return;
      const refreshed = await refreshBubble(config);
      if (!refreshed) {
        await showConversationBubble(config.conversationId, config.title, config.accentColor).catch(() => {});
      }
    };

    const scheduleSynchronization = (state: AppStateStatus) => {
      synchronization = synchronization
        .catch(() => {})
        .then(() => synchronize(state));
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

    scheduleSynchronization(AppState.currentState);
    const appStateSubscription = AppState.addEventListener('change', scheduleSynchronization);
    const configSubscription = DeviceEventEmitter.addListener(
      CONVERSATION_BUBBLE_CHANGED,
      () => scheduleSynchronization(AppState.currentState),
    );

    return () => {
      mounted = false;
      appStateSubscription.remove();
      configSubscription.remove();
    };
  }, [auth.loading, auth.user?.id]);

  return children;
}
