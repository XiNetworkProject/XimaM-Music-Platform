import Image, { ImageProps } from 'next/image';
import { cldUrl } from '@/utils/cloudinary';

type Props = Omit<ImageProps, 'src'> & {
  publicId: string;
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'pad';
  cloudName?: string;
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string;

export default function CloudinaryImage({
  publicId,
  width,
  height,
  crop = 'fill',
  cloudName = CLOUD_NAME,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder = 'empty',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: Props) {
  const src = cldUrl({ cloudName, publicId, width, height, crop });
  return (
    <Image
      src={src}
      width={width}
      height={height}
      sizes={sizes}
      loading={loading as any}
      decoding={decoding as any}
      placeholder={placeholder}
      {...rest}
    />
  );
}


