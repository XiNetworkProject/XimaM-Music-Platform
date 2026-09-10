import Image from 'next/image';
import type { CSSProperties } from 'react';
import { SYNAURA_BRAND, SYNAURA_BRAND_SAFE_ZONE } from '@/lib/brand';

type SynauraLogoVariant = 'symbol' | 'wordmark' | 'lockup';

export default function SynauraLogo({
  variant = 'symbol',
  size = 48,
  className = '',
  markClassName = '',
  wordmarkClassName = '',
  priority = false,
  decorative = false,
}: {
  variant?: SynauraLogoVariant;
  size?: number;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const label = decorative ? undefined : SYNAURA_BRAND.name;
  const mark = (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-visible ${markClassName}`}
      style={{
        width: size,
        height: size,
      } as CSSProperties}
      data-synaura-logo-safe-zone
    >
      <span className="absolute" style={{ inset: `${SYNAURA_BRAND_SAFE_ZONE * 100}%` }}>
        <Image
          src={SYNAURA_BRAND.symbol}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-contain"
          unoptimized
          priority={priority}
        />
      </span>
    </span>
  );

  if (variant === 'symbol') {
    return (
      <span className={`inline-grid place-items-center overflow-visible ${className}`} aria-label={label} role={label ? 'img' : undefined} data-synaura-logo="symbol">
        {mark}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center overflow-visible ${variant === 'lockup' ? 'gap-[0.72em]' : 'gap-[0.56em]'} ${className}`} aria-label={label} role={label ? 'img' : undefined} data-synaura-logo={variant}>
      {mark}
      <span className="inline-flex min-w-0 flex-col text-left">
        <span className={`font-black leading-none tracking-[-0.055em] ${wordmarkClassName}`}>Synaura</span>
        {variant === 'lockup' ? <span className="mt-[0.36em] whitespace-nowrap text-[0.34em] font-black uppercase tracking-[0.16em] opacity-60">Share sound, connect creations.</span> : null}
      </span>
    </span>
  );
}
