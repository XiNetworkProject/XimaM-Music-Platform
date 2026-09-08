import Image from 'next/image';
import Link from 'next/link';
import { Music2, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { SynauraBadge, SynauraIconButton, SynauraSurface } from '@/components/ui/SynauraPrimitives';

export type SynauraContentKind = 'track' | 'playlist' | 'creator' | 'album' | 'post' | 'clip' | 'recommendation' | 'statistic';

export function SynauraMediaFrame({ src, alt, ratio = 'square', fallback, className = '' }: { src?: string | null; alt: string; ratio?: 'square' | 'video' | 'portrait'; fallback?: ReactNode; className?: string }) {
  const ratios = { square: 'aspect-square', video: 'aspect-video', portrait: 'aspect-[4/5]' };
  return <div className={`relative overflow-hidden rounded-[var(--syn-radius-md)] bg-[var(--syn-surface-muted)] ${ratios[ratio]} ${className}`}>{src ? <Image src={src} alt={alt} fill sizes="(max-width: 640px) 50vw, 260px" className="object-cover" /> : <div className="grid h-full place-items-center text-[var(--syn-text-secondary)]">{fallback || <Music2 aria-hidden="true" />}</div>}</div>;
}

export function SynauraContentCard({
  kind,
  title,
  subtitle,
  href,
  image,
  imageAlt = '',
  badge,
  metadata,
  onPlay,
  className = '',
}: {
  kind: SynauraContentKind;
  title: string;
  subtitle?: string;
  href?: string;
  image?: string | null;
  imageAlt?: string;
  badge?: string;
  metadata?: ReactNode;
  onPlay?: () => void;
  className?: string;
}) {
  const content = <SynauraSurface className={`group h-full overflow-hidden p-3 ${className}`}><div className="relative"><SynauraMediaFrame src={image} alt={imageAlt || title} ratio={kind === 'clip' || kind === 'post' ? 'portrait' : 'square'} />{onPlay ? <SynauraIconButton label={`Lire ${title}`} onClick={(event) => { event.preventDefault(); onPlay(); }} variant="primary" className="absolute bottom-2 right-2 opacity-100 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"><Play className="h-4 w-4 fill-current" /></SynauraIconButton> : null}</div><div className="mt-3 min-w-0"><div className="flex items-start justify-between gap-2"><h3 className="truncate text-sm font-black">{title}</h3>{badge ? <SynauraBadge tone="accent">{badge}</SynauraBadge> : null}</div>{subtitle ? <p className="mt-1 truncate text-xs font-bold text-[var(--syn-text-secondary)]">{subtitle}</p> : null}{metadata ? <div className="mt-2 text-xs text-[var(--syn-text-secondary)]">{metadata}</div> : null}</div></SynauraSurface>;
  return href ? <Link href={href} className="block h-full rounded-[var(--syn-radius-lg)] focus-visible:outline-none">{content}</Link> : content;
}
