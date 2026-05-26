'use client';

import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Compass, Home, Library, Search, Sparkles, Upload, Users } from 'lucide-react';
import { isPastShutdownEnd, isShutdownAnnounced, SHUTDOWN_END_DATE_LABEL } from '@/lib/synauraShutdown';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const SYNAURA_SHELL_BRAND = {
  appLogo: '/brand/2026/app-logo.png',
  logotype: '/brand/2026/synaura-logotype.png',
} as const;

const SYNAURA_ROUTE_ITEMS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/discover', label: 'Decouvrir', icon: Compass },
  { href: '/library', label: 'Bibliotheque', icon: Library },
  { href: '/community', label: 'Communaute', icon: Users },
  { href: '/ai-generator', label: 'Studio', icon: Sparkles },
  { href: '/upload', label: 'Publier', icon: Upload },
] as const;

function routeIsActive(pathname: string | null, href: string) {
  if (!pathname) return href === '/';
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SynauraAppShell({
  children,
  className = '',
  contentClassName = '',
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cx('relative z-20 min-h-screen bg-[#F4EFE6] text-[#171313]', className)}>
      <style>{`
        .synaura-no-scrollbar::-webkit-scrollbar { display: none; }
        .synaura-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,111,97,0.22),transparent_28%),radial-gradient(circle_at_94%_4%,rgba(124,92,255,0.20),transparent_30%),radial-gradient(circle_at_60%_100%,rgba(0,194,203,0.14),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(#ded4c7_1px,transparent_1px),linear-gradient(90deg,#ded4c7_1px,transparent_1px)] [background-size:34px_34px]" />
        <motion.div
          className="absolute -left-28 top-36 h-72 w-72 rounded-full bg-[#ff6f61]/18 blur-3xl"
          animate={{ y: [0, -24, 0], x: [0, 18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 top-24 h-80 w-80 rounded-full bg-[#7c5cff]/18 blur-3xl"
          animate={{ y: [0, 28, 0], x: [0, -24, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className={cx('relative mx-auto max-w-[1480px] px-3 py-3 sm:px-5 lg:px-8 lg:py-5', contentClassName)}>{children}</div>
    </div>
  );
}

export function SynauraPanel({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-[2rem] border border-black/[0.08] bg-[#fffaf2]/88 shadow-[0_18px_60px_rgba(30,25,20,0.10)] backdrop-blur-xl',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function SynauraInkPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'relative overflow-hidden rounded-[2rem] bg-[#171313] text-[#fffaf2] shadow-[0_20px_70px_rgba(20,15,10,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SynauraTopBar({
  searchHref = '/discover',
  searchLabel = 'Rechercher un son, post, playlist, créateur...',
  secondaryHref = '/ai-generator',
  secondaryLabel = 'Studio',
  primaryHref = '/upload',
  primaryLabel = 'Publier',
}: {
  searchHref?: string;
  searchLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <header className="sticky top-3 z-40 mb-4 flex items-center justify-between gap-3 rounded-[2rem] border border-black/[0.08] bg-[#fffaf2]/90 px-3 py-3 shadow-[0_16px_50px_rgba(30,25,20,0.12)] backdrop-blur-2xl sm:px-4">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#171313] p-1.5">
          <Image
            src={SYNAURA_SHELL_BRAND.appLogo}
            alt="Synaura"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            unoptimized
            priority
          />
        </div>
        <div className="hidden min-w-0 sm:block">
          <Image
            src={SYNAURA_SHELL_BRAND.logotype}
            alt="Synaura"
            width={200}
            height={48}
            className="h-9 w-auto max-w-[200px] object-contain object-left"
            unoptimized
            priority
          />
        </div>
        <p className="text-xl font-black tracking-tight sm:hidden">Synaura</p>
      </Link>

      <Link
        href={searchHref}
        className="hidden h-11 max-w-2xl flex-1 items-center gap-3 rounded-full bg-black/[0.055] px-4 lg:flex"
      >
        <Search className="h-4 w-4 text-black/35" />
        <span className="truncate text-sm font-semibold text-black/35">{searchLabel}</span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="grid h-11 w-11 place-items-center rounded-full bg-black/[0.06] text-black/60 transition hover:bg-black hover:text-white"
        >
          <Bell className="h-5 w-5" />
        </Link>
        <Link
          href={secondaryHref}
          className="hidden h-11 items-center gap-2 rounded-full bg-black/[0.06] px-4 text-sm font-black text-black/60 transition hover:bg-black hover:text-white sm:flex"
        >
          <Sparkles className="h-4 w-4" /> {secondaryLabel}
        </Link>
        <Link
          href={primaryHref}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.02]"
        >
          {primaryLabel}
        </Link>
      </div>
    </header>
  );
}

export function SynauraRouteNav({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cx('mb-4', className)} aria-label="Navigation Synaura">
      <div className="synaura-no-scrollbar flex gap-2 overflow-x-auto rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/84 p-2 shadow-[0_14px_36px_rgba(30,25,20,0.08)] backdrop-blur-xl">
        {SYNAURA_ROUTE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = routeIsActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition',
                isActive ? 'bg-[#171313] text-white' : 'bg-black/[0.045] text-black/56 hover:bg-black/[0.08] hover:text-[#171313]',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SynauraAnnouncementStrip({ className = '' }: { className?: string }) {
  if (!isShutdownAnnounced() || isPastShutdownEnd()) return null;

  return (
    <Link
      href="/fermeture"
      className={cx(
        'mb-4 flex items-center justify-center gap-2 rounded-[1.35rem] border border-red-300/45 bg-red-50/92 px-4 py-3 text-center text-xs font-black text-red-900/78 shadow-[0_14px_30px_rgba(120,35,20,0.08)] transition hover:bg-red-50',
        className,
      )}
    >
      Synaura ferme le {SHUTDOWN_END_DATE_LABEL} - lire l'annonce officielle
    </Link>
  );
}

export function SynauraHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <SynauraPanel
      className={cx('p-5 sm:p-6', className)}
      style={{ background: 'linear-gradient(135deg, #fffaf2 0%, #eee7ff 52%, #e2fbff 100%)' }}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div className="min-w-0">
          {eyebrow ? (
            <span className="inline-flex rounded-full bg-black/[0.055] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black/52">
              {eyebrow}
            </span>
          ) : null}
          <div className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.05em] text-[#171313] sm:text-4xl">{title}</div>
          {description ? <div className="mt-3 max-w-2xl text-sm leading-6 text-black/58 sm:text-[15px]">{description}</div> : null}
          {actions ? <div className="mt-5 flex flex-wrap gap-2.5">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
    </SynauraPanel>
  );
}

export function SynauraFilterTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: T[];
  active: T;
  onChange: (item: T) => void;
}) {
  return (
    <div className="synaura-no-scrollbar flex gap-2 overflow-x-auto">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          aria-pressed={active === item}
          className={cx(
            'h-10 shrink-0 rounded-full px-4 text-sm font-black transition',
            active === item ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/55 hover:bg-black/[0.09]',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
