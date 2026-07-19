import { useQuery } from '@tanstack/react-query';
import { getMessageUnreadSummary } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';

export const messagingKeys = {
  all: ['messaging'] as const,
  inbox: () => [...messagingKeys.all, 'inbox'] as const,
  unread: () => [...messagingKeys.all, 'unread'] as const,
  conversation: (conversationId: string) => [...messagingKeys.all, 'conversation', conversationId] as const,
};

export function useMessagingUnread() {
  const auth = useAuth();
  const query = useQuery({
    queryKey: messagingKeys.unread(),
    queryFn: getMessageUnreadSummary,
    enabled: Boolean(auth.user && auth.token),
    staleTime: 12_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  return {
    total: query.data?.total || 0,
    messages: query.data?.messages || 0,
    requests: query.data?.requests || 0,
    refresh: query.refetch,
  };
}
