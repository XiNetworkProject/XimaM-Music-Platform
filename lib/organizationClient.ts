'use client';
import { useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLikeContext } from '@/contexts/LikeContext';
import { getEntitlements } from '@/lib/entitlements';
import { normalizeActionTrack, type ActionTrack } from './trackActions';

export const ORGANIZATION_CACHE_MS = 5 * 60_000;
export async function organizationRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || 'Action indisponible'), { status: response.status });
  return body;
}
export function useOrganizationViewer() { const { data } = useSession(); return data?.user?.id || 'public'; }
export const playlistKey = (viewer: string) => ['organization-playlists', viewer] as const;
const favoriteKey = (viewer: string, id: string) => ['organization-favorite-status', viewer, id] as const;
export function useActionFavoriteStatus(id: string, enabled: boolean) {
  const viewer = useOrganizationViewer();
  const { likeState, syncLikeState } = useLikeContext();
  const query = useQuery({ queryKey: favoriteKey(viewer, id), enabled: enabled && viewer !== 'public' && Boolean(id) && !id.startsWith('radio-'), staleTime: ORGANIZATION_CACHE_MS,
    queryFn: async ({ signal }) => {
      const startedAt = Date.now(); const ai = id.startsWith('ai-');
      const data = await organizationRequest(ai ? `/api/ai/tracks/${encodeURIComponent(id.slice(3))}/favorite` : `/api/tracks/${encodeURIComponent(id)}/like`, ai ? { signal, method: 'POST', body: JSON.stringify({ check_only: true }) } : { signal });
      return { isLiked: Boolean(ai ? data.is_favorite : data.liked), likesCount: Number(data.likesCount) || 0, startedAt };
    } });
  useEffect(() => {
    if (query.data && (!likeState[id] || likeState[id].lastUpdated < query.data.startedAt)) syncLikeState(id, query.data.isLiked, query.data.likesCount);
  }, [id, likeState, query.data, syncLikeState]);
  return query;
}
export function useActionDownloadPermission(enabled: boolean) {
  const viewer = useOrganizationViewer();
  return useQuery({ queryKey: ['organization-download', viewer], enabled: enabled && viewer !== 'public', staleTime: ORGANIZATION_CACHE_MS,
    queryFn: async ({ signal }) => {
      const body = await organizationRequest('/api/subscriptions/my-subscription', { signal });
      return getEntitlements(String(body.subscription?.name || 'free').toLowerCase() as any).features.download;
    } });
}
export function useActionTrack(id: string, enabled = true) {
  const viewer = useOrganizationViewer();
  return useQuery<ActionTrack>({ queryKey: ['organization-track', viewer, id], enabled: enabled && Boolean(id), staleTime: ORGANIZATION_CACHE_MS, gcTime: ORGANIZATION_CACHE_MS,
    queryFn: async ({ signal }) => normalizeActionTrack(await organizationRequest(`/api/tracks/${encodeURIComponent(id)}`, { signal })) });
}
export function useOwnedPlaylists() {
  const viewer = useOrganizationViewer();
  return useQuery<any[]>({ queryKey: playlistKey(viewer), enabled: viewer !== 'public', staleTime: ORGANIZATION_CACHE_MS, gcTime: ORGANIZATION_CACHE_MS,
    queryFn: async ({ signal }) => (await organizationRequest('/api/playlists', { signal })).playlists || [] });
}
// Existing consumers without TanStack subscribe to this targeted invalidation,
// never to another persisted organization store.
export function notifyOrganizationChange(kind: 'playlists' | 'favorites', id?: string) {
  window.dispatchEvent(new CustomEvent('synaura:organization-change', { detail: { kind, id } }));
}
export function useFavoriteActions() {
  const viewer = useOrganizationViewer();
  const client = useQueryClient();
  const { syncLikeState } = useLikeContext();
  const mutation = useMutation({ mutationKey: ['organization-favorite', viewer], mutationFn: async (id: string) => {
    if (viewer === 'public') throw new Error('Connecte-toi pour gérer tes favoris.');
    if (!id || id.startsWith('radio-')) throw new Error('Favori indisponible pour cette source.');
    await client.cancelQueries({ queryKey: favoriteKey(viewer, id) });
    const ai = id.startsWith('ai-');
    const endpoint = ai ? `/api/ai/tracks/${encodeURIComponent(id.slice(3))}/favorite` : `/api/tracks/${encodeURIComponent(id)}/like`;
    const before = await organizationRequest(endpoint, ai ? { method: 'POST', body: JSON.stringify({ check_only: true }) } : {});
    const liked = ai ? Boolean(before.is_favorite) : Boolean(before.liked);
    const after = await organizationRequest(endpoint, ai ? { method: 'POST', body: JSON.stringify({ is_favorite: !liked }) } : { method: liked ? 'DELETE' : 'POST' });
    syncLikeState(id, ai ? Boolean(after.is_favorite) : Boolean(after.isLiked), Number(after.likesCount) || 0);
    client.setQueryData(favoriteKey(viewer, id), { isLiked: ai ? Boolean(after.is_favorite) : Boolean(after.isLiked), likesCount: Number(after.likesCount) || 0, startedAt: Date.now() });
    notifyOrganizationChange('favorites', id);
    return after;
  } });
  const toggle = useCallback(async (id: string) => {
    if (client.isMutating({ mutationKey: ['organization-favorite', viewer] })) return;
    return mutation.mutateAsync(id);
  }, [client, mutation.mutateAsync, viewer]);
  return { toggle, pending: mutation.isPending };
}
