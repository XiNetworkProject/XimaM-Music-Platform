import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SynauraSectionHeader({
  eyebrow,
  title,
  description,
  href,
  actionLabel = 'Tout voir',
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7c5cff] sm:text-xs">{eyebrow}</p> : null}
        <div className="mt-1 flex items-center gap-2">
          {icon}
          <h2 className="text-2xl font-black tracking-tight text-[#171313] sm:text-3xl">{title}</h2>
        </div>
        {description ? <p className="mt-1 max-w-2xl text-sm font-bold text-black/48">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black/[0.055] px-4 text-xs font-black text-black/58 transition hover:bg-[#171313] hover:text-white">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
