'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const isUnauthenticated = status === 'unauthenticated';

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  const refreshSession = async () => {
    await update();
  };

  const requireAuth = (callback?: () => void) => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
      return false;
    }
    if (callback && isAuthenticated) {
      callback();
    }
    return true;
  };

  // Debug: log les changements de session
  useEffect(() => {
    console.log('🔄 useAuth - Status changé:', { 
      status, 
      isAuthenticated, 
      hasUser: !!session?.user,
      userEmail: session?.user?.email 
    });
  }, [status, session]);

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