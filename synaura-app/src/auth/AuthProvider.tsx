import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, setAuthTokenProvider } from '@/api/client';

export type MobileUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  isVerified?: boolean;
};

type AuthContextValue = {
  user: MobileUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  requireAuth: () => boolean;
};

const TOKEN_KEY = 'synaura.mobile.auth.token';
const USER_KEY = 'synaura.mobile.auth.user';
const AuthContext = createContext<AuthContextValue | null>(null);

async function readStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.id ? (parsed as MobileUser) : null;
  } catch {
    return null;
  }
}

async function authFetch(path: string, token?: string | null, init?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthTokenProvider(() => token);
  }, [token]);

  useEffect(() => {
    let mounted = true;
    Promise.all([AsyncStorage.getItem(TOKEN_KEY), readStoredUser()])
      .then(([storedToken, storedUser]) => {
        if (!mounted) return;
        setToken(storedToken);
        setUser(storedUser);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persistSession = useCallback(async (nextToken: string | null, nextUser: MobileUser | null) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    else await AsyncStorage.removeItem(TOKEN_KEY);
    if (nextUser) await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else await AsyncStorage.removeItem(USER_KEY);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    const res = await authFetch('/api/auth/mobile/me', token);
    if (!res.ok) {
      await persistSession(null, null);
      return;
    }
    const json = await res.json().catch(() => null);
    if (json?.user?.id) {
      await persistSession(token, { ...user, ...json.user });
    }
  }, [persistSession, token, user]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authFetch('/api/auth/mobile/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data?.token || !json?.data?.user) {
      throw new Error(json?.error || 'Connexion impossible');
    }
    await persistSession(json.data.token, json.data.user);
  }, [persistSession]);

  const logout = useCallback(async () => {
    if (token) {
      await authFetch('/api/auth/mobile/logout', token, { method: 'POST' }).catch(() => {});
    }
    await persistSession(null, null);
  }, [persistSession, token]);

  const requireAuth = useCallback(() => Boolean(user && token), [token, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login,
    logout,
    refreshMe,
    requireAuth,
  }), [loading, login, logout, refreshMe, requireAuth, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
