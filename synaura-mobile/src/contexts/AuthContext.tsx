// synaura-mobile/src/contexts/AuthContext.tsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, type MobileUser } from '../services/api';

const AUTH_TOKEN_KEY = 'synaura.auth.token.v1';
const AUTH_USER_KEY = 'synaura.auth.user.v1';

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  loading: boolean;
  user: MobileUser | null;
  token: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (payload: { name: string; username: string; email: string; password: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MobileUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (cancelled) return;

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser) as MobileUser;
          setToken(savedToken);
          setUser(parsedUser);
          api.setToken(savedToken);
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (nextUser: MobileUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    api.setToken(nextToken);
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, nextToken),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const clear = useCallback(async () => {
    setUser(null);
    setToken(null);
    api.setToken(null);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const r = await api.login(email.trim().toLowerCase(), password);
    if (!r.success) return { ok: false, error: r.error };
    await persist(r.data.user, r.data.token);
    return { ok: true };
  }, [persist]);

  const signUp = useCallback(async (payload: { name: string; username: string; email: string; password: string }): Promise<AuthResult> => {
    const r = await api.register({
      name: payload.name.trim(),
      username: payload.username.trim().toLowerCase(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
    if (!r.success) return { ok: false, error: r.error };
    // Comme le web : pas d’auto-login, l’utilisateur va sur la page connexion avec un message de succès
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await clear();
  }, [clear]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    user,
    token,
    signIn,
    signUp,
    signOut,
  }), [loading, user, token, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

