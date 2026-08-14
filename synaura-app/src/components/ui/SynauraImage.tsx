import React, { useEffect, useMemo, useState } from 'react';
import { Image, type ImageContentFit, type ImageProps, type ImageSource } from 'expo-image';
import { toLegacyMediaFallback, toPublicMediaUrl } from '@/media/mediaUrls';

type Props = Omit<ImageProps, 'source' | 'contentFit'> & {
  source: ImageSource | string | number | null | undefined;
  contentFit?: ImageContentFit;
  lowPriority?: boolean;
};

export const SynauraImage = React.memo(function SynauraImage({
  source,
  contentFit = 'cover',
  lowPriority = false,
  transition,
  onError,
  ...props
}: Props) {
  const originalUri = typeof source === 'string'
    ? source
    : source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
      ? String(source.uri || '')
      : '';
  const primaryUri = toPublicMediaUrl(originalUri);
  const fallbackUri = toLegacyMediaFallback(originalUri || primaryUri);
  const [useFallback, setUseFallback] = useState(false);
  useEffect(() => setUseFallback(false), [primaryUri]);
  const activeSource = useMemo(() => {
    const uri = useFallback && fallbackUri ? fallbackUri : primaryUri;
    if (!uri) return source;
    if (typeof source === 'string') return uri;
    if (source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source) return { ...source, uri };
    return source;
  }, [fallbackUri, primaryUri, source, useFallback]);

  return (
    <Image
      {...props}
      source={activeSource || undefined}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      priority={lowPriority ? 'low' : 'normal'}
      transition={transition ?? 140}
      onError={(event) => {
        if (!useFallback && fallbackUri && fallbackUri !== primaryUri) {
          setUseFallback(true);
          return;
        }
        onError?.(event);
      }}
    />
  );
});
