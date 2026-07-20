import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { API_BASE_URL, setAuthRefreshHandler, setAuthTokenProvider } from '@/api/client';
import {
  MOBILE_AUTH_EXPIRES_AT_KEY,
  MOBILE_AUTH_REFRESH_TOKEN_KEY,
  MOBILE_AUTH_TOKEN_KEY,
} from '@/auth/storageKeys';

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

type SessionPayload = {
  token: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  user: MobileUser;
};

const TOKEN_KEY = MOBILE_AUTH_TOKEN_KEY;
const REFRESH_TOKEN_KEY = MOBILE_AUTH_REFRESH_TOKEN_KEY;
const EXPIRES_AT_KEY = MOBILE_AUTH_EXPIRES_AT_KEY;
const USER_KEY = 'synaura.mobile.auth.user';
const PUSH_TOKEN_KEY = 'synaura.native.push.token.v1';
const AUTH_RESTORE_TIMEOUT_MS = 1800;
const AUTH_REQUEST_TIMEOUT_MS = 15000;
const REFRESH_EARLY_MS = 2 * 60_000;
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

function parseExpiresAt(raw: string | null | undefined) {
  const value = Number(raw || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function secureGet(key: string) {
  return SecureStore.getItemAsync(key).catch(() => null);
}

async function secureSet(key: string, value: string | null | undefined) {
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key).catch(() => {});
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
  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const persistSession = useCallback(async (
    nextToken: string | null,
    nextRefreshToken: string | null,
    nextExpiresAt: number,
    nextUser: MobileUser | null,
  ) => {
    tokenRef.current = nextToken;
    refreshTokenRef.current = nextRefreshToken;
    expiresAtRef.current = nextExpiresAt;
    setAuthTokenProvider(() => nextToken);
    setToken(nextToken);
    setUser(nextUser);
    await Promise.all([
      secureSet(TOKEN_KEY, nextToken),
      secureSet(REFRESH_TOKEN_KEY, nextRefreshToken),
      secureSet(EXPIRES_AT_KEY, nextExpiresAt > 0 ? String(nextExpiresAt) : null),
      nextUser ? AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)) : AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
    ]);
  }, []);

  const clearSession = useCallback(
    () => persistSession(null, null, 0, null),
    [persistSession],
  );

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) return false;

    const operation = (async () => {
      try {
        const response = await authFetch('/api/auth/mobile/refresh', null, {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
        const json = await response.json().catch(() => null);
        const payload = json?.data as SessionPayload | undefined;
        if (!response.ok || !payload?.token || !payload?.user) {
          if (response.status === 401 || response.status === 403) await clearSession();
          return false;
        }
        await persistSession(
          payload.token,
          payload.refreshToken || refreshToken,
          Number(payload.expiresAt || 0),
          payload.user,
        );
        return true;
      } catch {
        return false;
      }
    })();

    refreshPromiseRef.current = operation;
    try {
      return await operation;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [clearSession, persistSession]);

  useEffect(() => {
    setAuthTokenProvider(() => tokenRef.current);
    setAuthRefreshHandler(refreshSession);
    return () => setAuthRefreshHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    let mounted = true;
    let restoreExpired = false;
    const restoreTimeout = setTimeout(() => {
      restoreExpired = true;
      if (mounted) setLoading(false);
    }, AUTH_RESTORE_TIMEOUT_MS);

    void (async () => {
      try {
        const [secureToken, secureRefresh, secureExpiry, storedUserRaw, legacyToken] = await Promise.all([
          secureGet(TOKEN_KEY),
          secureGet(REFRESH_TOKEN_KEY),
          secureGet(EXPIRES_AT_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
        ]);
        if (!mounted || restoreExpired) return;

        const restoredToken = secureToken || legacyToken || null;
        const restoredUser = parseStoredUser(storedUserRaw);
        const restoredExpiry = parseExpiresAt(secureExpiry);
        tokenRef.current = restoredToken;
        refreshTokenRef.current = secureRefresh;
        expiresAtRef.current = restoredExpiry;
        setAuthTokenProvider(() => restoredToken);
        setToken(restoredToken);
        setUser(restoredUser);
        clearTimeout(restoreTimeout);
        setLoading(false);

        if (legacyToken && !secureToken) {
          await secureSet(TOKEN_KEY, legacyToken);
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
        if (!restoredToken) return;

        if (secureRefresh && restoredExpiry * 1000 <= Date.now() + REFRESH_EARLY_MS) {
          await refreshSession();
          return;
        }

        const response = await authFetch('/api/auth/mobile/me', restoredToken);
        if (!mounted) return;
        if (response.status === 401 || response.status === 403) {
          const renewed = await refreshSession();
          if (!renewed) await clearSession();
          return;
        }
        if (!response.ok) return;
        const json = await response.json().catch(() => null);
        if (json?.user?.id && mounted) {
          const nextUser = { ...restoredUser, ...json.user } as MobileUser;
          setUser(nextUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        }
      } catch {
        clearTimeout(restoreTimeout);
        if (mounted && !restoreExpired) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(restoreTimeout);
    };
  }, [clearSession, refreshSession]);

  useEffect(() => {
    if (!token || !refreshTokenRef.current || !expiresAtRef.current) return;
    const delay = Math.max(1000, expiresAtRef.current * 1000 - Date.now() - REFRESH_EARLY_MS);
    const timer = setTimeout(() => void refreshSession(), delay);
    return () => clearTimeout(timer);
  }, [refreshSession, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !refreshTokenRef.current) return;
      if (expiresAtRef.current * 1000 <= Date.now() + REFRESH_EARLY_MS) void refreshSession();
    });
    return () => subscription.remove();
  }, [refreshSession]);

  const refreshMe = useCallback(async () => {
    let activeToken = tokenRef.current;
    if (!activeToken) return;
    let response = await authFetch('/api/auth/mobile/me', activeToken);
    if (response.status === 401 || response.status === 403) {
      const renewed = await refreshSession();
      activeToken = tokenRef.current;
      if (!renewed || !activeToken) return;
      response = await authFetch('/api/auth/mobile/me', activeToken);
    }
    if (!response.ok) return;
    const json = await response.json().catch(() => null);
    if (json?.user?.id) {
      const nextUser = { ...user, ...json.user } as MobileUser;
      setUser(nextUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }
  }, [refreshSession, user]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authFetch('/api/auth/mobile/login', null, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const json = await response.json().catch(() => null);
    const payload = json?.data as SessionPayload | undefined;
    if (!response.ok || !payload?.token || !payload?.user) {
      throw new Error(json?.error || 'Connexion impossible');
    }
    await persistSession(
      payload.token,
      payload.refreshToken || null,
      Number(payload.expiresAt || 0),
      payload.user,
    );
  }, [persistSession]);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await authFetch('/api/auth/signup', null, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || "Erreur lors de l'inscription");
    return json?.message || 'Compte créé. Connecte-toi pour continuer.';
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await authFetch('/api/auth/forgot-password', null, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || 'Demande impossible');
    return json?.message || 'Si un compte existe avec cet email, un lien sera envoyé.';
  }, []);

  const logout = useCallback(async () => {
    const activeToken = tokenRef.current;
    if (activeToken) {
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (pushToken) {
        await authFetch('/api/notifications/push/native', activeToken, {
          method: 'DELETE',
          body: JSON.stringify({ token: pushToken }),
        }).catch(() => {});
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      }
      await authFetch('/api/auth/mobile/logout', activeToken, { method: 'POST' }).catch(() => {});
    }
    await clearSession();
  }, [clearSession]);

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
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
