'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { SynauraSurface } from '@/components/ui/SynauraPrimitives';
import { recordEntryEvent } from '@/lib/entryAnalytics';

const choices = [
  { href: '/auth/signin', icon: LogIn, eyebrow: 'Je reviens', title: 'Se connecter', text: 'Retrouve ton profil et entre directement dans Live Synaura.' },
  { href: '/auth/signup', icon: UserPlus, eyebrow: 'Je commence', title: 'Créer mon compte', text: 'Quelques informations, puis deux choix pour façonner ton univers.' },
] as const;

export default function EnterSynaura() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[var(--syn-background)] px-4 py-[max(env(safe-area-inset-top),1rem)] text-[var(--syn-text-primary)] sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_38%_32%,rgba(217,109,99,.4),rgba(115,87,198,.25)_35%,rgba(74,158,170,.16)_55%,transparent_72%)]" />
      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col">
        <nav className="flex items-center justify-between" aria-label="Retour à Discover">
          <Link href="/" className="syn-interactive inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-black text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)]"><ArrowLeft className="h-4 w-4" /> Revenir à Discover</Link>
          <span className="hidden text-xs font-black uppercase tracking-[0.2em] text-[var(--syn-text-secondary)] sm:block">Enter Synaura</span>
        </nav>
        <section className="my-auto py-12 text-center" aria-labelledby="enter-title">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-[1.4rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] shadow-[var(--syn-glow-accent)] backdrop-blur-xl"><Sparkles className="h-6 w-6 text-[var(--syn-accent-coral)]" /></span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[var(--syn-accent-blue)]">Le seuil</p>
          <h1 id="enter-title" className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">Comment veux-tu entrer&nbsp;?</h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-relaxed text-[var(--syn-text-secondary)]">Pas de détour. Reprends là où tu t’étais arrêté, ou commence à construire ton monde musical.</p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-2">
            {choices.map((choice) => <Link key={choice.href} href={choice.href} onClick={() => recordEntryEvent(choice.href.includes('signup') ? 'signup_start' : 'enter_click', { source: 'enter' })} className="syn-interactive group rounded-[var(--syn-radius-xl)]"><SynauraSurface elevated className="h-full p-5 transition group-hover:-translate-y-1 group-hover:border-[var(--syn-accent)] sm:p-6"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--syn-soft)] text-[var(--syn-accent)]"><choice.icon className="h-5 w-5" /></span><p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--syn-text-secondary)]">{choice.eyebrow}</p><h2 className="mt-1 flex items-center justify-between text-2xl font-black tracking-tight">{choice.title}<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></h2><p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--syn-text-secondary)]">{choice.text}</p></SynauraSurface></Link>)}
          </div>
        </section>
      </div>
    </main>
  );
}
