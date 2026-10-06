import React, { useEffect } from 'react';
import { AppState, DeviceEventEmitter, type AppStateStatus } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import {
  CONVERSATION_BUBBLE_CHANGED,
  configureNativeConversationBubble,
  getPreferredConversationBubble,
  hideConversationBubble,
  setPreferredConversationBubble,
  supportsConversationBubble,
} from '@/messaging/conversationBubble';


export function ConversationBubbleProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    if (!supportsConversationBubble()) return undefined;
    let mounted = true;
    let synchronization = Promise.resolve();


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
      // Leaving the app is not a new message. Never repost cached history here:
      // it resurrected the last sent/read message at every background transition.
      // Incoming messages are delivered by the server push transport instead.
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
