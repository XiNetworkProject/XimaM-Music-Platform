'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
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

  return {
    session,
    user: session?.user,
    isAuthenticated,
    isLoading,
    logout,
    requireAuth,
  };
} 