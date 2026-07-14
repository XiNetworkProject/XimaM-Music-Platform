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
  register: (input: RegisterInput) => Promise<string>;
  requestPasswordReset: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  requireAuth: () => boolean;
};

export type RegisterInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  referralCode?: string;
};

const TOKEN_KEY = 'synaura.mobile.auth.token';
const USER_KEY = 'synaura.mobile.auth.user';
const PUSH_TOKEN_KEY = 'synaura.native.push.token.v1';
const AUTH_RESTORE_TIMEOUT_MS = 1200;
const AUTH_REQUEST_TIMEOUT_MS = 15000;
const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.id ? (parsed as MobileUser) : null;
  } catch {
    return null;
  }
}

async function authFetch(path: string, token?: string | null, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init?.signal || controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
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
    const restoreTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, AUTH_RESTORE_TIMEOUT_MS);

    AsyncStorage.multiGet([TOKEN_KEY, USER_KEY])
      .then((entries) => {
        if (!mounted) return;
        clearTimeout(restoreTimeout);
        const stored = new Map(entries);
        const storedToken = stored.get(TOKEN_KEY) || null;
        const storedUser = parseStoredUser(stored.get(USER_KEY));
        // La session locale suffit pour monter l'app immédiatement. La validation
        // serveur se fait ensuite sans garder l'utilisateur devant un ecran vide.
        setAuthTokenProvider(() => storedToken);
        setToken(storedToken);
        setUser(storedUser);
        setLoading(false);

        if (storedToken) {
          void authFetch('/api/auth/mobile/me', storedToken)
            .then(async (response) => {
              if (!mounted) return;
              if (response.status === 401 || response.status === 403) {
                await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
                if (!mounted) return;
                setAuthTokenProvider(() => null);
                setToken(null);
                setUser(null);
                return;
              }
              if (!response.ok) return;
              const json = await response.json().catch(() => null);
              if (json?.user?.id && mounted) {
                const nextUser = { ...storedUser, ...json.user };
                setUser(nextUser);
                await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
              }
            })
            .catch(() => {
              // La session locale reste utilisable hors-ligne.
            });
        }
      })
      .catch(() => {
        clearTimeout(restoreTimeout);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      clearTimeout(restoreTimeout);
    };
  }, []);

  const persistSession = useCallback(async (nextToken: string | null, nextUser: MobileUser | null) => {
    setAuthTokenProvider(() => nextToken);
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
    if (res.status === 401 || res.status === 403) {
      await persistSession(null, null);
      return;
    }
    if (!res.ok) return;
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

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authFetch('/api/auth/signup', null, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Erreur lors de l'inscription");
    return json?.message || 'Compte créé. Connecte-toi pour continuer.';
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const res = await authFetch('/api/auth/forgot-password', null, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || 'Demande impossible');
    return json?.message || 'Si un compte existe avec cet email, un lien sera envoyé.';
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (pushToken) {
        await authFetch('/api/notifications/push/native', token, {
          method: 'DELETE',
          body: JSON.stringify({ token: pushToken }),
        }).catch(() => {});
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      }
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
    register,
    requestPasswordReset,
    logout,
    refreshMe,
    requireAuth,
  }), [loading, login, logout, refreshMe, register, requestPasswordReset, requireAuth, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
