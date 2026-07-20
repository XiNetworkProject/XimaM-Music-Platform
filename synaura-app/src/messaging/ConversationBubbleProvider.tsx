import React, { useEffect } from 'react';
import { AppState, DeviceEventEmitter, type AppStateStatus } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import {
  CONVERSATION_BUBBLE_CHANGED,
  configureNativeConversationBubble,
  getPreferredConversationBubble,
  hideConversationBubble,
  showConversationBubble,
  setPreferredConversationBubble,
  supportsConversationBubble,
} from '@/messaging/conversationBubble';

export function ConversationBubbleProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    if (!supportsConversationBubble()) return undefined;
    let mounted = true;

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

    return () => {
      mounted = false;
      appStateSubscription.remove();
      configSubscription.remove();
      if (AppState.currentState === 'active') void hideConversationBubble().catch(() => {});
    };
  }, [auth.loading, auth.user?.id]);

  return children;
}
