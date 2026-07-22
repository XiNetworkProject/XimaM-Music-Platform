import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMessageUnreadSummary } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { subscribeToMessagingInboxRealtime } from '@/messaging/realtime';

export const messagingKeys = {
  all: ['messaging'] as const,
  inbox: () => [...messagingKeys.all, 'inbox'] as const,
  unread: () => [...messagingKeys.all, 'unread'] as const,
  conversation: (conversationId: string) => [...messagingKeys.all, 'conversation', conversationId] as const,
};

export function useMessagingUnread() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: messagingKeys.unread(),
    queryFn: getMessageUnreadSummary,
    enabled: Boolean(auth.user && auth.token),
    staleTime: 12_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  useEffect(() => {
    if (!auth.token || !auth.user?.id) return undefined;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void subscribeToMessagingInboxRealtime(auth.token, auth.user.id, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void queryClient.invalidateQueries({ queryKey: messagingKeys.unread(), exact: true }), 100);
    }).then((dispose) => { unsubscribe = dispose; }).catch(() => {});
    return () => {
      unsubscribe?.();
      if (timer) clearTimeout(timer);
    };
  }, [auth.token, auth.user?.id, queryClient]);

  return {
    total: query.data?.total || 0,
    messages: query.data?.messages || 0,
    requests: query.data?.requests || 0,
    refresh: query.refetch,
  };
}
