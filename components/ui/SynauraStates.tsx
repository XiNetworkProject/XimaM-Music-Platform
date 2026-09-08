'use client';

import { AlertTriangle, CloudOff, FileQuestion, Loader2, LockKeyhole, LogIn, RefreshCw, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { SynauraButton, SynauraSurface } from '@/components/ui/SynauraPrimitives';

export function SynauraSkeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-[var(--syn-radius-sm)] bg-[var(--syn-soft-strong)] ${className}`} />;
}

export function SynauraTrackSkeleton() {
  return <div className="flex items-center gap-3" aria-hidden="true"><SynauraSkeleton className="h-12 w-12 shrink-0" /><div className="min-w-0 flex-1 space-y-2"><SynauraSkeleton className="h-3.5 w-2/3" /><SynauraSkeleton className="h-3 w-2/5" /></div><SynauraSkeleton className="h-9 w-9 rounded-full" /></div>;
}

export function SynauraCardSkeleton() {
  return <div aria-hidden="true"><SynauraSurface className="overflow-hidden p-3"><SynauraSkeleton className="aspect-square w-full" /><SynauraSkeleton className="mt-3 h-4 w-4/5" /><SynauraSkeleton className="mt-2 h-3 w-1/2" /></SynauraSurface></div>;
}

export function SynauraProfileSkeleton() {
  return <div className="flex items-center gap-4" aria-hidden="true"><SynauraSkeleton className="h-20 w-20 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><SynauraSkeleton className="h-5 w-48 max-w-full" /><SynauraSkeleton className="h-3 w-64 max-w-full" /><SynauraSkeleton className="h-3 w-32 max-w-full" /></div></div>;
}

export function SynauraInlineLoading({ label = 'Chargement…' }: { label?: string }) {
  return <span role="status" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--syn-text-secondary)]"><Loader2 data-motion-essential="true" className="h-4 w-4 animate-spin" aria-hidden="true" />{label}</span>;
}

export function SynauraPageLoading({ label = 'Chargement de Synaura…' }: { label?: string }) {
  return <div role="status" className="grid min-h-[45dvh] place-items-center p-6"><div className="text-center"><Loader2 data-motion-essential="true" className="mx-auto h-8 w-8 animate-spin text-[var(--syn-accent)]" aria-hidden="true" /><p className="mt-3 text-sm font-black text-[var(--syn-text-secondary)]">{label}</p></div></div>;
}

type StateKind = 'empty' | 'error' | 'offline' | 'permission' | 'auth' | 'deleted' | 'partial';
const stateMeta = {
  empty: { icon: FileQuestion, title: 'Rien à afficher' },
  error: { icon: AlertTriangle, title: 'Une erreur est survenue' },
  offline: { icon: CloudOff, title: 'Connexion indisponible' },
  permission: { icon: ShieldAlert, title: 'Accès non autorisé' },
  auth: { icon: LogIn, title: 'Connexion requise' },
  deleted: { icon: LockKeyhole, title: 'Contenu indisponible' },
  partial: { icon: RefreshCw, title: 'Une partie du contenu manque' },
} satisfies Record<StateKind, { icon: typeof AlertTriangle; title: string }>;

export function SynauraState({
  kind = 'empty',
  title,
  description,
  action,
  compact = false,
  className = '',
}: {
  kind?: StateKind;
  title?: string;
  description?: ReactNode;
  action?: { label: string; onClick?: () => void; href?: string };
  compact?: boolean;
  className?: string;
}) {
  const meta = stateMeta[kind];
  const Icon = meta.icon;
  const content = <><span className="mx-auto grid h-12 w-12 place-items-center rounded-[var(--syn-radius-md)] bg-[var(--syn-soft)] text-[var(--syn-text-secondary)]"><Icon className="h-5 w-5" aria-hidden="true" /></span><h2 className="mt-3 text-base font-black">{title || meta.title}</h2>{description ? <div className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--syn-text-secondary)]">{description}</div> : null}{action ? action.href ? <a href={action.href} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--syn-contrast-bg)] px-5 text-sm font-black text-[var(--syn-contrast-text)]">{action.label}</a> : <SynauraButton className="mt-4" onClick={action.onClick}>{action.label}</SynauraButton> : null}</>;
  return compact ? <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-[var(--syn-radius-md)] border border-[var(--syn-border)] bg-[var(--syn-soft)] p-4 text-center ${className}`}>{content}</div> : <SynauraSurface className={`p-7 text-center sm:p-10 ${className}`}><div role={kind === 'error' ? 'alert' : 'status'}>{content}</div></SynauraSurface>;
}

export const SynauraEmptyState = (props: Omit<Parameters<typeof SynauraState>[0], 'kind'>) => <SynauraState kind="empty" {...props} />;
export const SynauraErrorState = (props: Omit<Parameters<typeof SynauraState>[0], 'kind'>) => <SynauraState kind="error" {...props} />;
