import FennecMark from '@/components/celestial/FennecMark';

/** One vector signature from entry to workspace. Existing sizing and naming API retained. */
export default function SynauraLogo({ variant = 'symbol', size = 48, className = '', markClassName = '', wordmarkClassName = '', priority = false, decorative = false }: {
  variant?: 'symbol' | 'wordmark' | 'lockup'; size?: number; className?: string;
  markClassName?: string; wordmarkClassName?: string; priority?: boolean; decorative?: boolean;
}) {
  const symbol = variant === 'symbol';
  return <span data-synaura-logo={variant} data-synaura-logo-safe-zone data-celestial-brand
    className={`celestial-signature ${className}`}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Synaura'} aria-hidden={decorative || undefined}
    style={{ display:'inline-flex', alignItems:'center', flexShrink:0, gap:size * .2, height:symbol ? size : size * .85, verticalAlign:'middle' }}>
    <span className={markClassName} style={{ display:'inline-flex', width:symbol ? size : size * .72, height:symbol ? size : size * .8, color:'var(--celestial-blue, #a9caff)' }}><FennecMark/></span>
    {!symbol && <span className={wordmarkClassName} style={{ fontFamily:'Georgia, serif', fontStyle:'italic', fontSize:size * .8, letterSpacing:'-.045em', lineHeight:1, color:'var(--celestial-cream, #f6ecdc)' }}>Synaura<span aria-hidden="true" style={{fontSize:'.4em',verticalAlign:'super',marginLeft:4,color:'var(--celestial-gold, #e6c697)'}}>✧</span></span>}
  </span>;
}
