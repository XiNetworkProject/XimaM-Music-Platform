import React, { useMemo } from 'react';
import { Image, type ImageContentFit, type ImageProps, type ImageSource } from 'expo-image';
import { toPublicMediaUrl } from '@/media/mediaUrls';

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
  const activeSource = useMemo(() => {
    if (!primaryUri) return source;
    if (typeof source === 'string') return primaryUri;
    if (source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source) {
      return { ...source, uri: primaryUri };
    }
    return source;
  }, [primaryUri, source]);

  return (
    <Image
      {...props}
      source={activeSource || undefined}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      priority={lowPriority ? 'low' : 'normal'}
      transition={transition ?? 140}
      onError={onError}
    />
  );
});
