import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';

export function SynauraQueryProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 45_000,
        gcTime: 12 * 60_000,
        retry: 1,
        refetchOnMount: false,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  }));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    client.clear();
  }, [auth.user?.id, client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
