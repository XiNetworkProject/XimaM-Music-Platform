'use client';

import Link from 'next/link';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import EntryFrame from './EntryFrame';
import { recordEntryEvent } from '@/lib/entryAnalytics';

const choices = [
  { href: '/auth/signin', icon: LogIn, eyebrow: 'Je reviens', title: 'Se connecter', text: 'Retrouve ton profil et entre directement dans Live Synaura.' },
  { href: '/auth/signup', icon: UserPlus, eyebrow: 'Je commence', title: 'Créer mon compte', text: 'Quelques informations, puis tes goûts et tes envies.' },
] as const;

export default function EnterSynaura() {
  return <div className="flex min-h-[100svh] items-center justify-center px-3 py-6"><EntryFrame eyebrow="Le seuil" title="Prends ta place." description="Reprends ton écoute, ou commence une nouvelle histoire." compact>
    <div className="divide-y divide-[var(--v2-line)] border-y border-[var(--v2-line)]">
      {choices.map(choice => <Link key={choice.href} href={choice.href} onClick={() => recordEntryEvent(choice.href.includes('signup') ? 'signup_start' : 'enter_click', { source: 'enter' })} className="group flex items-start gap-5 py-8">
        <choice.icon size={20} strokeWidth={1.5} className="mt-1 shrink-0 text-[var(--v2-accent)]" />
        <div className="min-w-0 flex-1"><p className="v2-kicker text-[10px]">{choice.eyebrow}</p><h2 className="mt-2 text-2xl font-medium">{choice.title}</h2><p className="mt-3 text-sm leading-6 text-[var(--v2-muted)]">{choice.text}</p></div><ArrowRight size={19} className="mt-2 shrink-0 text-[var(--v2-muted)] transition-transform group-hover:translate-x-1" />
      </Link>)}
    </div>
    <Link href="/" className="mt-6 inline-flex min-h-11 items-center text-xs text-[var(--v2-muted)]">Revenir à la découverte</Link>
  </EntryFrame></div>;
}
