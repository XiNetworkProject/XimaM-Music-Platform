'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { toPublicMediaUrl } from './mediaUrls.ts';

export const PROFILE_PEEK_CACHE_TTL_MS = 5 * 60 * 1000;

export type ProfilePeekTrack = {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string | null;
  duration: number;
  plays: number;
  createdAt: string | null;
};

export type ProfilePeekData = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  isArtist: boolean;
  isVerified: boolean;
  role: string | null;
  followerCount: number;
  tracksCount: number;
  totalPlays: number;
  isFollowing: boolean;
  tracks: ProfilePeekTrack[];
};

export type ProfilePeekLoadState =
  | { status: 'loading'; data: null; error: null; cache: 'miss' }
  | { status: 'loaded'; data: ProfilePeekData; error: null; cache: 'miss' | 'warm' }
  | { status: 'missing' | 'inaccessible' | 'error'; data: null; error: string; cache: 'miss' };

type CachedProfile = { data: ProfilePeekData; expiresAt: number };
type FollowSnapshot = { isFollowing: boolean | null; followerCount: number | null; loading: boolean; mutating: boolean; error: string | null };

const profileCache = new Map<string, CachedProfile>();
const profileInflight = new Map<string, Promise<ProfilePeekData>>();
const followStates = new Map<string, FollowSnapshot>();
const followListeners = new Map<string, Set<() => void>>();
const EMPTY_FOLLOW: FollowSnapshot = { isFollowing: null, followerCount: null, loading: false, mutating: false, error: null };

function keyOf(username: string | null | undefined) {
  return String(username || '').trim().toLocaleLowerCase('fr-FR');
}

function finiteCount(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeTrack(raw: any): ProfilePeekTrack | null {
  const id = String(raw?.id || raw?._id || '');
  const audioUrl = String(raw?.audioUrl || raw?.audio_url || '');
  if (!id || !audioUrl || raw?.is_public === false) return null;
  return {
    id,
    title: String(raw?.title || 'Sans titre'),
    audioUrl: toPublicMediaUrl(audioUrl) || audioUrl,
    coverUrl: toPublicMediaUrl(raw?.coverUrl || raw?.cover_url) || null,
    duration: finiteCount(raw?.duration),
    plays: finiteCount(raw?.plays),
    createdAt: raw?.createdAt || raw?.created_at || null,
  };
}

export function normalizeProfilePeek(raw: any): ProfilePeekData {
  const id = String(raw?.id || raw?._id || '');
  const username = String(raw?.username || '').trim();
  if (!id || !username) throw new Error('Profil incomplet');
  const tracks = (Array.isArray(raw?.tracks) ? raw.tracks : [])
    .map((track: any) => normalizeTrack(track))
    .filter((track: ProfilePeekTrack | null): track is ProfilePeekTrack => Boolean(track))
    .sort((left: ProfilePeekTrack, right: ProfilePeekTrack) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .slice(0, 3);
  const rawRole = String(raw?.role || '').trim();
  const isArtist = Boolean(raw?.isArtist || raw?.is_artist);
  return {
    id,
    username,
    displayName: String(raw?.artistName || raw?.artist_name || raw?.name || username),
    avatar: toPublicMediaUrl(raw?.avatar) || null,
    bio: String(raw?.bio || '').trim(),
    isArtist,
    isVerified: Boolean(raw?.isVerified || raw?.is_verified),
    role: isArtist ? 'Artiste' : rawRole && rawRole !== 'user' ? rawRole : null,
    followerCount: finiteCount(raw?.followerCount ?? raw?.follower_count),
    tracksCount: finiteCount(raw?.tracksCount ?? raw?.tracks_count ?? tracks.length),
    totalPlays: finiteCount(raw?.totalPlays ?? raw?.total_plays),
    isFollowing: Boolean(raw?.isFollowing),
    tracks,
  };
}

function cacheProfile(data: ProfilePeekData) {
  const cached = { data, expiresAt: Date.now() + PROFILE_PEEK_CACHE_TTL_MS };
  profileCache.set(keyOf(data.username), cached);
  profileCache.set(keyOf(data.id), cached);
  seedFollowState(data.username, data.isFollowing, data.followerCount);
}

export function getCachedProfilePeek(usernameOrId: string): ProfilePeekData | null {
  const key = keyOf(usernameOrId);
  const cached = profileCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    profileCache.delete(key);
    return null;
  }
  return cached.data;
}

export async function fetchProfilePeek(username: string): Promise<ProfilePeekData> {
  const key = keyOf(username);
  const warm = getCachedProfilePeek(key);
  if (warm) return warm;
  const existing = profileInflight.get(key);
  if (existing) return existing;
  const request = fetch(`/api/users/${encodeURIComponent(username)}`, { cache: 'no-store' })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (response.status === 404 || response.status === 410) throw Object.assign(new Error(payload?.error || 'Profil introuvable'), { profileStatus: 'missing' });
      if (response.status === 401 || response.status === 403) throw Object.assign(new Error(payload?.error || 'Profil inaccessible'), { profileStatus: 'inaccessible' });
      if (!response.ok) throw Object.assign(new Error(payload?.error || 'Profil indisponible'), { profileStatus: 'error' });
      const data = normalizeProfilePeek(payload);
      cacheProfile(data);
      return data;
    })
    .finally(() => profileInflight.delete(key));
  profileInflight.set(key, request);
  return request;
}

export function useProfilePeekData(username: string): ProfilePeekLoadState {
  const warm = getCachedProfilePeek(username);
  const [state, setState] = useState<ProfilePeekLoadState>(() => warm
    ? { status: 'loaded', data: warm, error: null, cache: 'warm' }
    : { status: 'loading', data: null, error: null, cache: 'miss' });

  useEffect(() => {
    const cached = getCachedProfilePeek(username);
    if (cached) {
      setState({ status: 'loaded', data: cached, error: null, cache: 'warm' });
      return;
    }
    let active = true;
    setState({ status: 'loading', data: null, error: null, cache: 'miss' });
    fetchProfilePeek(username)
      .then((data) => {
        if (active) setState({ status: 'loaded', data, error: null, cache: 'miss' });
      })
      .catch((error: any) => {
        if (!active) return;
        const status = ['missing', 'inaccessible'].includes(error?.profileStatus) ? error.profileStatus : 'error';
        setState({ status, data: null, error: error?.message || 'Profil indisponible', cache: 'miss' });
      });
    return () => { active = false; };
  }, [username]);

  return state;
}

function emitFollow(key: string, snapshot: FollowSnapshot) {
  followStates.set(key, snapshot);
  followListeners.get(key)?.forEach((listener) => listener());
}

export function seedFollowState(username: string, isFollowing: boolean, followerCount?: number | null) {
  const key = keyOf(username);
  if (!key) return;
  const current = followStates.get(key) || EMPTY_FOLLOW;
  emitFollow(key, {
    ...current,
    isFollowing,
    followerCount: followerCount === null || followerCount === undefined ? current.followerCount : finiteCount(followerCount),
    loading: false,
    error: null,
  });
}

export function getSharedFollowState(username: string): FollowSnapshot {
  return followStates.get(keyOf(username)) || EMPTY_FOLLOW;
}

async function ensureFollowState(username: string) {
  const key = keyOf(username);
  const current = followStates.get(key) || EMPTY_FOLLOW;
  if (!key || current.isFollowing !== null || current.loading) return;
  emitFollow(key, { ...current, loading: true, error: null });
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, { cache: 'no-store' });
    if (!response.ok) throw new Error('État de suivi indisponible');
    const payload = await response.json();
    const latest = followStates.get(key) || EMPTY_FOLLOW;
    emitFollow(key, { ...latest, isFollowing: Boolean(payload?.isFollowing), loading: false, error: null });
  } catch (error: any) {
    const latest = followStates.get(key) || EMPTY_FOLLOW;
    emitFollow(key, { ...latest, loading: false, error: error?.message || 'État de suivi indisponible' });
  }
}

export async function toggleSharedFollow(username: string) {
  const key = keyOf(username);
  const current = followStates.get(key) || EMPTY_FOLLOW;
  if (!key || current.mutating) return current;
  emitFollow(key, { ...current, mutating: true, error: null });
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'POST' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || 'Action impossible');
    const latest = followStates.get(key) || current;
    const isFollowing = payload?.action === 'followed';
    const followerCount = latest.followerCount === null
      ? null
      : Math.max(0, latest.followerCount + (isFollowing ? 1 : -1));
    const next = { ...latest, isFollowing, followerCount, loading: false, mutating: false, error: null };
    emitFollow(key, next);
    const cached = profileCache.get(key);
    if (cached) cacheProfile({ ...cached.data, isFollowing, followerCount: followerCount ?? cached.data.followerCount });
    return next;
  } catch (error: any) {
    const latest = followStates.get(key) || current;
    const next = { ...latest, mutating: false, error: error?.message || 'Action impossible' };
    emitFollow(key, next);
    throw error;
  }
}

export function useSharedFollowState(username: string | null | undefined, enabled = true) {
  const key = keyOf(username);
  const subscribe = useCallback((listener: () => void) => {
    if (!key) return () => {};
    const listeners = followListeners.get(key) || new Set<() => void>();
    listeners.add(listener);
    followListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) followListeners.delete(key);
    };
  }, [key]);
  const getSnapshot = useCallback(() => followStates.get(key) || EMPTY_FOLLOW, [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_FOLLOW);

  useEffect(() => {
    if (enabled && username) void ensureFollowState(username);
  }, [enabled, username]);

  return {
    ...snapshot,
    toggle: useCallback(() => username ? toggleSharedFollow(username) : Promise.resolve(EMPTY_FOLLOW), [username]),
  };
}

export function clearProfilePeekClientCache() {
  profileCache.clear();
  profileInflight.clear();
  followStates.clear();
}
