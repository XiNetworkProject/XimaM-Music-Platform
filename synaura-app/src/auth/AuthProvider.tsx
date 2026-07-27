import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { API_BASE_URL, setAuthRefreshHandler, setAuthTokenProvider } from '@/api/client';
import {
  MOBILE_AUTH_EXPIRES_AT_KEY,
  MOBILE_AUTH_REFRESH_TOKEN_KEY,
  MOBILE_AUTH_SESSION_REFRESHED_EVENT,
  MOBILE_AUTH_TOKEN_KEY,
} from '@/auth/storageKeys';
import {
  MOBILE_AUTH_CALLBACK_URL,
  mobileAuthCallbackSignature,
  parseMobileAuthCallback,
} from '@/auth/authCallback';

WebBrowser.maybeCompleteAuthSession();

export type MobileUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  role?: string | null;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileComplete?: boolean;
  providers?: string[];
};

export type MobileMfaFactor = {
  id: string;
  type: string;
  status: string;
  friendlyName?: string | null;
  createdAt?: string | null;
};

export type AuthCapabilities = {
  email: boolean;
  google: boolean;
  phone: boolean;
  phoneMfa: boolean;
};

export type RegisterInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  referralCode?: string;
};

export type AccountUpdateInput = {
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthdayVisibility?: 'private' | 'friends' | 'public';
  discoverableByEmail?: boolean;
  discoverableByPhone?: boolean;
  completeProfile?: boolean;
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
};

export type MobileAccountDetails = {
  user: MobileUser;
  private: {
    firstName: string;
    lastName: string;
    birthDate: string;
    birthdayVisibility: 'private' | 'friends' | 'public';
    discoverableByEmail: boolean;
    discoverableByPhone: boolean;
    profileComplete: boolean;
    termsVersion?: string | null;
    privacyVersion?: string | null;
  };
  identities: Array<{
    id: string;
    provider: string;
    createdAt?: string;
    lastSignInAt?: string;
  }>;
  mfaFactors: MobileMfaFactor[];
  currentTermsVersion: string;
  currentPrivacyVersion: string;
};

export type MfaChallenge = {
  factorId: string;
  challengeId: string;
  expiresAt?: number;
  phone?: string;
};

type AuthContextValue = {
  user: MobileUser | null;
  token: string | null;
  loading: boolean;
  capabilities: AuthCapabilities;
  mfaRequired: boolean;
  mfaFactors: MobileMfaFactor[];
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricLocked: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  requestPhoneCode: (phone: string) => Promise<string>;
  verifyPhoneCode: (phone: string, code: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<string>;
  requestPasswordReset: (email: string) => Promise<string>;
  getAccountDetails: () => Promise<MobileAccountDetails>;
  updateAccount: (input: AccountUpdateInput) => Promise<MobileAccountDetails>;
  completeProfile: (input: AccountUpdateInput) => Promise<void>;
  requestEmailLink: (email: string) => Promise<string>;
  requestPhoneLink: (phone: string) => Promise<string>;
  verifyPhoneLink: (phone: string, code: string) => Promise<string>;
  challengeMfa: (factorId?: string) => Promise<MfaChallenge>;
  verifyMfa: (challenge: MfaChallenge, code: string) => Promise<void>;
  enrollMfaPhone: (phone: string) => Promise<MfaChallenge>;
  removeMfaFactor: (factorId: string) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlockBiometric: () => Promise<boolean>;
  revokeOtherSessions: () => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  requireAuth: () => boolean;
};

type SessionPayload = {
  token: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  user: MobileUser;
  assuranceLevel?: 'aal1' | 'aal2';
  mfaRequired?: boolean;
  mfaFactors?: MobileMfaFactor[];
};

const TOKEN_KEY = MOBILE_AUTH_TOKEN_KEY;
const REFRESH_TOKEN_KEY = MOBILE_AUTH_REFRESH_TOKEN_KEY;
const EXPIRES_AT_KEY = MOBILE_AUTH_EXPIRES_AT_KEY;
const USER_KEY = 'synaura.mobile.auth.user';
const MFA_REQUIRED_KEY = 'synaura.mobile.auth.mfa-required';
const PUSH_TOKEN_KEY = 'synaura.native.push.token.v1';
const BIOMETRIC_KEY_PREFIX = 'synaura.mobile.auth.biometric.v1.';
const AUTH_RESTORE_TIMEOUT_MS = 1800;
const AUTH_REQUEST_TIMEOUT_MS = 15000;
const REFRESH_EARLY_MS = 2 * 60_000;
const BIOMETRIC_RELOCK_MS = 30_000;
const DEFAULT_CAPABILITIES: AuthCapabilities = {
  email: true,
  google: false,
  phone: false,
  phoneMfa: false,
};
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

async function biometricAvailability() {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync().catch(() => false),
    LocalAuthentication.isEnrolledAsync().catch(() => false),
  ]);
  return hardware && enrolled;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<MobileMfaFactor[]>([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);
  const sessionMutationRef = useRef(0);
  const callbackPromisesRef = useRef(new Map<string, Promise<void>>());
  const backgroundAtRef = useRef<number | null>(null);

  const persistSession = useCallback(async (
    nextToken: string | null,
    nextRefreshToken: string | null,
    nextExpiresAt: number,
    nextUser: MobileUser | null,
    nextMfaRequired = false,
  ) => {
    sessionMutationRef.current += 1;
    tokenRef.current = nextToken;
    refreshTokenRef.current = nextRefreshToken;
    expiresAtRef.current = nextExpiresAt;
    setAuthTokenProvider(() => nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setMfaRequired(nextMfaRequired);
    await Promise.all([
      secureSet(TOKEN_KEY, nextToken),
      secureSet(REFRESH_TOKEN_KEY, nextRefreshToken),
      secureSet(EXPIRES_AT_KEY, nextExpiresAt > 0 ? String(nextExpiresAt) : null),
      nextUser ? AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)) : AsyncStorage.removeItem(USER_KEY),
      nextMfaRequired
        ? AsyncStorage.setItem(MFA_REQUIRED_KEY, 'true')
        : AsyncStorage.removeItem(MFA_REQUIRED_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
    ]);
  }, []);

  const applySessionPayload = useCallback(async (
    payload: SessionPayload,
    fallbackRefreshToken: string | null = null,
  ) => {
    const nextFactors = Array.isArray(payload.mfaFactors) ? payload.mfaFactors : [];
    setMfaFactors(nextFactors);
    await persistSession(
      payload.token,
      payload.refreshToken || fallbackRefreshToken,
      Number(payload.expiresAt || 0),
      payload.user,
      Boolean(payload.mfaRequired),
    );
  }, [persistSession]);

  const loadBiometricPreference = useCallback(async (userId: string, lockImmediately: boolean) => {
    const [available, preference] = await Promise.all([
      biometricAvailability(),
      AsyncStorage.getItem(`${BIOMETRIC_KEY_PREFIX}${userId}`),
    ]);
    const enabled = available && preference === 'enabled';
    setBiometricAvailable(available);
    setBiometricEnabledState(enabled);
    setBiometricLocked(enabled && lockImmediately);
  }, []);

  const clearSession = useCallback(async () => {
    setMfaFactors([]);
    setBiometricEnabledState(false);
    setBiometricLocked(false);
    await persistSession(null, null, 0, null, false);
  }, [persistSession]);

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
        await applySessionPayload(payload, refreshToken);
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
  }, [applySessionPayload, clearSession]);

  const finalizeAuthCallback = useCallback((url: string) => {
    const signature = mobileAuthCallbackSignature(url);
    const existing = callbackPromisesRef.current.get(signature);
    if (existing) return existing;
    const operation = (async () => {
      const callback = parseMobileAuthCallback(url);
      if (!callback) return;
      const response = await authFetch('/api/auth/mobile/session', null, {
        method: 'POST',
        body: JSON.stringify(callback),
      });
      const json = await response.json().catch(() => null);
      const payload = json?.data as SessionPayload | undefined;
      if (!response.ok || !payload?.token || !payload?.user) {
        throw new Error(json?.error || 'Connexion externe impossible');
      }
      await applySessionPayload(payload);
      await loadBiometricPreference(payload.user.id, false);
    })();
    callbackPromisesRef.current.set(signature, operation);
    if (callbackPromisesRef.current.size > 8) {
      const oldest = callbackPromisesRef.current.keys().next().value;
      if (oldest && oldest !== signature) callbackPromisesRef.current.delete(oldest);
    }
    return operation;
  }, [applySessionPayload, loadBiometricPreference]);

  useEffect(() => {
    setAuthTokenProvider(() => tokenRef.current);
    setAuthRefreshHandler(refreshSession);
    return () => setAuthRefreshHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    void authFetch('/api/auth/mobile/capabilities')
      .then((response) => response.json())
      .then((json) => {
        if (json?.data) setCapabilities({ ...DEFAULT_CAPABILITIES, ...json.data });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url?.startsWith(MOBILE_AUTH_CALLBACK_URL)) return;
      void finalizeAuthCallback(url).catch(() => {});
    };
    void Linking.getInitialURL().then(handleUrl).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [finalizeAuthCallback]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(MOBILE_AUTH_SESSION_REFRESHED_EVENT, (session) => {
      const nextToken = typeof session?.token === 'string' ? session.token : '';
      if (!nextToken) return;
      sessionMutationRef.current += 1;
      tokenRef.current = nextToken;
      refreshTokenRef.current = typeof session?.refreshToken === 'string'
        ? session.refreshToken
        : refreshTokenRef.current;
      expiresAtRef.current = Number(session?.expiresAt || 0);
      setAuthTokenProvider(() => nextToken);
      setToken(nextToken);
      if (session?.user?.id) {
        setUser((current) => ({ ...current, ...session.user } as MobileUser));
        void AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user)).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let mounted = true;
    let restoreExpired = false;
    const restoreMutation = sessionMutationRef.current;
    const restoreTimeout = setTimeout(() => {
      restoreExpired = true;
      if (mounted) setLoading(false);
    }, AUTH_RESTORE_TIMEOUT_MS);

    void (async () => {
      try {
        const [secureToken, secureRefresh, secureExpiry, storedUserRaw, legacyToken, storedMfa] = await Promise.all([
          secureGet(TOKEN_KEY),
          secureGet(REFRESH_TOKEN_KEY),
          secureGet(EXPIRES_AT_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(MFA_REQUIRED_KEY),
        ]);
        if (!mounted || sessionMutationRef.current !== restoreMutation) return;

        const restoredToken = secureToken || legacyToken || null;
        const restoredUser = parseStoredUser(storedUserRaw);
        const restoredExpiry = parseExpiresAt(secureExpiry);
        tokenRef.current = restoredToken;
        refreshTokenRef.current = secureRefresh;
        expiresAtRef.current = restoredExpiry;
        setAuthTokenProvider(() => restoredToken);
        setToken(restoredToken);
        setUser(restoredUser);
        setMfaRequired(storedMfa === 'true');
        if (restoredUser?.id && restoredToken) {
          await loadBiometricPreference(restoredUser.id, true);
        }
        clearTimeout(restoreTimeout);
        if (!restoreExpired) setLoading(false);

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
          setMfaFactors(Array.isArray(json.mfaFactors) ? json.mfaFactors : []);
          if (typeof json.mfaRequired === 'boolean') setMfaRequired(json.mfaRequired);
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
  }, [clearSession, loadBiometricPreference, refreshSession]);

  useEffect(() => {
    if (!token || !refreshTokenRef.current || !expiresAtRef.current) return;
    const delay = Math.max(1000, expiresAtRef.current * 1000 - Date.now() - REFRESH_EARLY_MS);
    const timer = setTimeout(() => void refreshSession(), delay);
    return () => clearTimeout(timer);
  }, [refreshSession, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundAtRef.current = Date.now();
        return;
      }
      if (state !== 'active') return;
      const backgroundAt = backgroundAtRef.current;
      backgroundAtRef.current = null;
      if (
        biometricEnabled
        && tokenRef.current
        && backgroundAt
        && Date.now() - backgroundAt >= BIOMETRIC_RELOCK_MS
      ) {
        setBiometricLocked(true);
      }
      if (
        refreshTokenRef.current
        && expiresAtRef.current * 1000 <= Date.now() + REFRESH_EARLY_MS
      ) {
        void refreshSession();
      }
    });
    return () => subscription.remove();
  }, [biometricEnabled, refreshSession]);

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
      setMfaFactors(Array.isArray(json.mfaFactors) ? json.mfaFactors : []);
      if (typeof json.mfaRequired === 'boolean') setMfaRequired(json.mfaRequired);
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
    await applySessionPayload(payload);
    await loadBiometricPreference(payload.user.id, false);
  }, [applySessionPayload, loadBiometricPreference]);

  const loginWithGoogle = useCallback(async () => {
    if (!capabilities.google) {
      throw new Error("La connexion Google n'est pas encore activee sur le serveur.");
    }
    const response = await authFetch('/api/auth/mobile/google/start', null, {
      method: 'POST',
      body: JSON.stringify({ redirectTo: MOBILE_AUTH_CALLBACK_URL }),
    });
    const json = await response.json().catch(() => null);
    const authUrl = json?.data?.url;
    if (!response.ok || typeof authUrl !== 'string') {
      throw new Error(json?.error || 'Connexion Google indisponible');
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, MOBILE_AUTH_CALLBACK_URL);
    if (result.type !== 'success' || !result.url) {
      throw new Error('Connexion Google annulee.');
    }
    await finalizeAuthCallback(result.url);
  }, [capabilities.google, finalizeAuthCallback]);

  const requestPhoneCode = useCallback(async (phone: string) => {
    if (!capabilities.phone) {
      throw new Error("La connexion par telephone n'est pas encore activee sur le serveur.");
    }
    const response = await authFetch('/api/auth/mobile/phone/start', null, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.data?.phone) {
      throw new Error(json?.error || 'SMS impossible a envoyer');
    }
    return String(json.data.phone);
  }, [capabilities.phone]);

  const verifyPhoneCode = useCallback(async (phone: string, code: string) => {
    const response = await authFetch('/api/auth/mobile/phone/verify', null, {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
    const json = await response.json().catch(() => null);
    const payload = json?.data as SessionPayload | undefined;
    if (!response.ok || !payload?.token || !payload?.user) {
      throw new Error(json?.error || 'Code SMS invalide');
    }
    await applySessionPayload(payload);
    await loadBiometricPreference(payload.user.id, false);
  }, [applySessionPayload, loadBiometricPreference]);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await authFetch('/api/auth/signup', null, {
      method: 'POST',
      body: JSON.stringify({ ...input, source: 'mobile' }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || "Erreur lors de l'inscription");
    const payload = json?.data as SessionPayload | undefined;
    if (payload?.token && payload?.user) {
      await applySessionPayload(payload);
      await loadBiometricPreference(payload.user.id, false);
    }
    return json?.message || 'Compte cree. Confirme ton adresse email.';
  }, [applySessionPayload, loadBiometricPreference]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await authFetch('/api/auth/forgot-password', null, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || 'Demande impossible');
    return json?.message || 'Si un compte existe avec cet email, un lien sera envoye.';
  }, []);

  const getAccountDetails = useCallback(async () => {
    const activeToken = tokenRef.current;
    if (!activeToken) throw new Error('Connexion requise');
    const response = await authFetch('/api/auth/mobile/account', activeToken);
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.data) throw new Error(json?.error || 'Compte indisponible');
    return json.data as MobileAccountDetails;
  }, []);

  const updateAccount = useCallback(async (input: AccountUpdateInput) => {
    const activeToken = tokenRef.current;
    if (!activeToken) throw new Error('Connexion requise');
    const response = await authFetch('/api/auth/mobile/account', activeToken, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.data) throw new Error(json?.error || 'Mise a jour impossible');
    const details = json.data as MobileAccountDetails;
    setUser(details.user);
    setMfaFactors(details.mfaFactors || []);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(details.user));
    return details;
  }, []);

  const completeProfile = useCallback(async (input: AccountUpdateInput) => {
    await updateAccount({
      ...input,
      completeProfile: true,
      acceptTerms: true,
      acceptPrivacy: true,
    });
  }, [updateAccount]);

  const postContact = useCallback(async (body: Record<string, unknown>) => {
    const activeToken = tokenRef.current;
    const activeRefreshToken = refreshTokenRef.current;
    if (!activeToken || !activeRefreshToken) throw new Error('Connexion requise');
    const response = await authFetch('/api/auth/mobile/contact', activeToken, {
      method: 'POST',
      body: JSON.stringify({ ...body, refreshToken: activeRefreshToken }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.data) {
      throw new Error(json?.error || 'Mise a jour du contact impossible');
    }
    const nestedSession = json.data.session as SessionPayload | undefined;
    if (nestedSession?.token && nestedSession?.user) {
      await applySessionPayload(nestedSession, activeRefreshToken);
    }
    return json.data;
  }, [applySessionPayload]);

  const requestEmailLink = useCallback(async (email: string) => {
    const data = await postContact({ action: 'email-start', email });
    return String(data.message || 'Email de verification envoye.');
  }, [postContact]);

  const requestPhoneLink = useCallback(async (phone: string) => {
    const data = await postContact({ action: 'phone-start', phone });
    return String(data.phone || '');
  }, [postContact]);

  const verifyPhoneLink = useCallback(async (phone: string, code: string) => {
    const data = await postContact({ action: 'phone-verify', phone, code });
    return String(data.message || 'Telephone verifie.');
  }, [postContact]);

  const postMfa = useCallback(async (body: Record<string, unknown>) => {
    const activeToken = tokenRef.current;
    const activeRefreshToken = refreshTokenRef.current;
    if (!activeToken || !activeRefreshToken) throw new Error('Connexion requise');
    const response = await authFetch('/api/auth/mobile/mfa', activeToken, {
      method: 'POST',
      body: JSON.stringify({ ...body, refreshToken: activeRefreshToken }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.data) throw new Error(json?.error || 'Operation 2FA impossible');
    const nestedSession = json.data.session as SessionPayload | undefined;
    if (nestedSession?.token && nestedSession?.user) {
      await applySessionPayload(nestedSession, activeRefreshToken);
    }
    return json.data;
  }, [applySessionPayload]);

  const challengeMfa = useCallback(async (factorId?: string) => {
    const selected = factorId || mfaFactors.find(
      (factor) => factor.type === 'phone' && factor.status === 'verified',
    )?.id;
    if (!selected) throw new Error('Aucun telephone 2FA verifie');
    const data = await postMfa({ action: 'challenge', factorId: selected });
    return {
      factorId: selected,
      challengeId: data.challengeId,
      expiresAt: data.expiresAt,
    } as MfaChallenge;
  }, [mfaFactors, postMfa]);

  const verifyMfa = useCallback(async (challenge: MfaChallenge, code: string) => {
    await postMfa({
      action: 'verify',
      factorId: challenge.factorId,
      challengeId: challenge.challengeId,
      code,
    });
  }, [postMfa]);

  const enrollMfaPhone = useCallback(async (phone: string) => {
    if (!capabilities.phoneMfa) {
      throw new Error("L'authentification SMS n'est pas encore activee sur le serveur.");
    }
    const data = await postMfa({ action: 'enroll', phone });
    const factor: MobileMfaFactor = {
      id: data.factorId,
      type: 'phone',
      status: 'unverified',
      friendlyName: 'Synaura SMS',
    };
    setMfaFactors((current) => [...current.filter((item) => item.id !== factor.id), factor]);
    return {
      factorId: data.factorId,
      challengeId: data.challengeId,
      expiresAt: data.expiresAt,
      phone: data.phone,
    } as MfaChallenge;
  }, [capabilities.phoneMfa, postMfa]);

  const removeMfaFactor = useCallback(async (factorId: string) => {
    const data = await postMfa({ action: 'unenroll', factorId });
    setMfaFactors(
      Array.isArray(data.factors)
        ? data.factors
        : (current) => current.filter((factor) => factor.id !== factorId),
    );
  }, [postMfa]);

  const unlockBiometric = useCallback(async () => {
    if (!biometricEnabled) {
      setBiometricLocked(false);
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Deverrouiller Synaura',
      cancelLabel: 'Annuler',
      fallbackLabel: 'Utiliser le code du telephone',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    }).catch(() => ({ success: false }));
    if (result.success) setBiometricLocked(false);
    return result.success;
  }, [biometricEnabled]);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (!user?.id) throw new Error('Connexion requise');
    const key = `${BIOMETRIC_KEY_PREFIX}${user.id}`;
    if (!enabled) {
      await AsyncStorage.removeItem(key);
      setBiometricEnabledState(false);
      setBiometricLocked(false);
      return;
    }
    const available = await biometricAvailability();
    setBiometricAvailable(available);
    if (!available) throw new Error('Aucune biometrie securisee configuree sur ce telephone');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Activer le deverrouillage Synaura',
      cancelLabel: 'Annuler',
      fallbackLabel: 'Utiliser le code du telephone',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
    if (!result.success) throw new Error('Activation biometrique annulee');
    await AsyncStorage.setItem(key, 'enabled');
    setBiometricEnabledState(true);
    setBiometricLocked(false);
  }, [user?.id]);

  const revokeOtherSessions = useCallback(async () => {
    const activeToken = tokenRef.current;
    if (!activeToken) throw new Error('Connexion requise');
    const response = await authFetch('/api/auth/mobile/logout', activeToken, {
      method: 'POST',
      body: JSON.stringify({ scope: 'others' }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error || 'Revocation impossible');
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
      await authFetch('/api/auth/mobile/logout', activeToken, {
        method: 'POST',
        body: JSON.stringify({ scope: 'local' }),
      }).catch(() => {});
    }
    await clearSession();
  }, [clearSession]);

  const requireAuth = useCallback(() => Boolean(user && token), [token, user]);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    capabilities,
    mfaRequired,
    mfaFactors,
    biometricAvailable,
    biometricEnabled,
    biometricLocked,
    login,
    loginWithGoogle,
    requestPhoneCode,
    verifyPhoneCode,
    register,
    requestPasswordReset,
    getAccountDetails,
    updateAccount,
    completeProfile,
    requestEmailLink,
    requestPhoneLink,
    verifyPhoneLink,
    challengeMfa,
    verifyMfa,
    enrollMfaPhone,
    removeMfaFactor,
    setBiometricEnabled,
    unlockBiometric,
    revokeOtherSessions,
    logout,
    refreshMe,
    requireAuth,
  }), [
    biometricAvailable,
    biometricEnabled,
    biometricLocked,
    capabilities,
    challengeMfa,
    completeProfile,
    enrollMfaPhone,
    getAccountDetails,
    loading,
    login,
    loginWithGoogle,
    logout,
    mfaFactors,
    mfaRequired,
    refreshMe,
    register,
    requestEmailLink,
    requestPhoneLink,
    removeMfaFactor,
    requestPasswordReset,
    requestPhoneCode,
    requireAuth,
    revokeOtherSessions,
    setBiometricEnabled,
    token,
    unlockBiometric,
    updateAccount,
    user,
    verifyMfa,
    verifyPhoneLink,
    verifyPhoneCode,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
