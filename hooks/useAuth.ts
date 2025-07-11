'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Toujours initialiser les valeurs dans le même ordre
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const isUnauthenticated = status === 'unauthenticated';

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  }, [router]);

  const refreshSession = useCallback(async () => {
    await update();
  }, [update]);

  const requireAuth = useCallback((callback?: () => void) => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
      return false;
    }
    if (callback && isAuthenticated) {
      callback();
    }
    return true;
  }, [isLoading, isAuthenticated, router]);

  // Debug: log les changements de session (seulement en développement)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 useAuth - Status changé:', { 
        status, 
        isAuthenticated, 
        hasUser: !!session?.user,
        userEmail: session?.user?.email 
      });
    }
  }, [status, session, isAuthenticated]);

  return {
    session,
    user: session?.user,
    isAuthenticated,
    isLoading,
    isUnauthenticated,
    logout,
    refreshSession,
    requireAuth,
  };
} 