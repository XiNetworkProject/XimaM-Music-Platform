'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { discoveryNextPage, discoveryPageUrl, postsNextCursor, type DiscoveryPage, type DiscoverySort, type PostsPage } from '@/lib/discoverLibrary';

export const DISCOVERY_CACHE = { staleTime: 5 * 60_000, gcTime: 15 * 60_000, refetchOnWindowFocus: false, retry: 1 } as const;
export async function fetchDiscovery<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error('Impossible de charger cette sélection. Réessayez dans un instant.');
  return response.json();
}
export function useDiscoveryQuery<T>(path: string, enabled = true) {
  const { data: session, status } = useSession();
  return useQuery<T>({
    ...DISCOVERY_CACHE, queryKey: ['discovery-library', session?.user?.id || 'guest', path],
    enabled: enabled && status !== 'loading', queryFn: ({ signal }) => fetchDiscovery<T>(path, signal),
  });
}
export function useDiscoveryCatalogue(sort: DiscoverySort, genre: string, artists: boolean, enabled: boolean) {
  const { data: session, status } = useSession();
  return useInfiniteQuery({
    ...DISCOVERY_CACHE, queryKey: ['discovery-library', session?.user?.id || 'guest', 'catalogue', sort, genre, artists],
    enabled: enabled && status !== 'loading', initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => fetchDiscovery<DiscoveryPage>(discoveryPageUrl(pageParam, sort, genre, artists), signal),
    getNextPageParam: page => discoveryNextPage(page, artists),
  });
}
export function useDiscoveryPosts(enabled: boolean) {
  const { data: session, status } = useSession();
  return useInfiniteQuery({
    ...DISCOVERY_CACHE, queryKey: ['discovery-library', session?.user?.id || 'guest', 'posts'],
    enabled: enabled && status !== 'loading', initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => fetchDiscovery<PostsPage>(`/api/posts?limit=12${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`, signal),
    getNextPageParam: (page, _pages, previous) => postsNextCursor(page, previous),
  });
}
