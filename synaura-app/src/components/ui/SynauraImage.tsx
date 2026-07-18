import React from 'react';
import { Image, type ImageContentFit, type ImageProps, type ImageSource } from 'expo-image';

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
  ...props
}: Props) {
  return (
    <Image
      {...props}
      source={source || undefined}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      priority={lowPriority ? 'low' : 'normal'}
      transition={transition ?? 140}
    />
  );
});
