import type { CSSProperties } from 'react';
import { SYNAURA_V2_REFERENCE, SYNAURA_V2_REFERENCE_RATIO } from '@/lib/brandV2';

/** Approved Chambre wordmark; the existing S symbol remains unchanged. */
export default function SynauraLogo({ variant = 'symbol', size = 48, className = '', markClassName = '', wordmarkClassName = '', priority = false, decorative = false }: {
  variant?: 'symbol' | 'wordmark' | 'lockup'; size?: number; className?: string;
  markClassName?: string; wordmarkClassName?: string; priority?: boolean; decorative?: boolean;
}) {
  const symbol = variant === 'symbol';
  const height = symbol ? size : size * .8;
  if (!symbol) return <span data-synaura-logo={variant} data-synaura-logo-safe-zone data-chambre-wordmark
    className={`inline-flex shrink-0 items-center ${className} ${wordmarkClassName}`}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Synaura'} aria-hidden={decorative || undefined}
    style={{ height, fontFamily: 'Arial, Helvetica, sans-serif', fontSize: size * .63, fontWeight: 800, letterSpacing: '-.067em', lineHeight: 1, verticalAlign: 'middle' }}>SYNAURA</span>;
  return <span data-synaura-logo={variant} data-synaura-logo-safe-zone data-v2-reference-logo
    className={`inline-flex shrink-0 items-center ${className}`}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Synaura'} aria-hidden={decorative || undefined}
    style={{ width: symbol ? size : height * SYNAURA_V2_REFERENCE_RATIO, height, verticalAlign: 'middle' }}>
    {symbol ? <span className={markClassName} style={{ display:'block',width:size,height:size,backgroundImage:`url("${SYNAURA_V2_REFERENCE}")`,backgroundRepeat:'no-repeat',backgroundPosition:'left center',backgroundSize:`${size * SYNAURA_V2_REFERENCE_RATIO}px ${size}px`,mixBlendMode:'screen' } as CSSProperties} />
      : <img src={SYNAURA_V2_REFERENCE} width={125} height={35} alt="" loading={priority ? 'eager' : 'lazy'} className={wordmarkClassName} style={{ width:'100%',height:'100%',objectFit:'contain',mixBlendMode:'screen' }} />}
  </span>;
}
