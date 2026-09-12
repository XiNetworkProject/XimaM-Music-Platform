'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { currentHandoffReturn } from '@/lib/creationHandoffClient';

type ReturnProps = { className?: string; fallbackHref?: string; fallbackLabel?: string; omitPaths?: string[]; iconOnly?: boolean };

function ReturnControl({ className = '', fallbackHref = '', fallbackLabel = 'Retour', omitPaths, iconOnly }: ReturnProps) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [href, setHref] = useState('');
  useEffect(() => { setHref(currentHandoffReturn('')); }, [pathname, search]);
  if ((!href && !fallbackHref) || omitPaths?.includes(pathname)) return null;
  const label = href ? href.startsWith('/profile/') ? 'Retour au profil' : 'Retour au Live' : fallbackLabel;
  return <button type="button" data-handoff-return className={`inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    onClick={() => router.replace(currentHandoffReturn(fallbackHref || '/live'), { scroll: false })}>
    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" /><span className={iconOnly ? 'sr-only' : undefined}>{label}</span>
  </button>;
}

export default function HandoffReturn(props: ReturnProps) {
  return <Suspense fallback={null}><ReturnControl {...props} /></Suspense>;
}
