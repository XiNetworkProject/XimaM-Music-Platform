'use client';

import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Compass, Home, Library, LogIn, Sparkles, Upload, UserPlus, Users } from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import { isPastShutdownEnd, isShutdownAnnounced, SHUTDOWN_END_DATE_LABEL } from '@/lib/synauraShutdown';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const SYNAURA_SHELL_BRAND = {
  appLogo: '/brand/2026/synaura-symbol-2026.png',
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

const SYNAURA_MOBILE_ROUTE_ITEMS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/discover', label: 'Explorer', icon: Compass },
  { href: '/library', label: 'Biblio', icon: Library },
  { href: '/community', label: 'Communa', icon: Users },
  { href: '/ai-generator', label: 'Studio', icon: Sparkles },
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
    <div className={cx('relative z-20 min-h-screen overflow-x-hidden bg-[#F4EFE6] text-[#171313]', className)}>
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

      <div
        className={cx(
          'relative mx-auto max-w-[1480px] px-2 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] sm:px-5 sm:py-3 sm:pb-5 lg:px-8 lg:py-5',
          contentClassName,
        )}
      >
        {children}
      </div>
      <SynauraMobileDock />
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
        'relative w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-black/[0.08] bg-[#fffaf2]/88 shadow-[0_18px_60px_rgba(30,25,20,0.10)] backdrop-blur-xl sm:rounded-[2rem]',
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
        'relative w-full min-w-0 overflow-hidden rounded-[1.5rem] bg-[#171313] text-[#fffaf2] shadow-[0_20px_70px_rgba(20,15,10,0.25)] sm:rounded-[2rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SynauraTopBar({
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
  const { data: session, status } = useSession();
  const isGuest = status !== 'loading' && !session?.user;

  return (
    <header className="sticky top-2 z-40 mb-4 rounded-[1.6rem] border border-black/[0.08] bg-[#fffaf2]/90 px-3 py-3 shadow-[0_16px_50px_rgba(30,25,20,0.12)] backdrop-blur-2xl sm:top-3 sm:rounded-[2rem] sm:px-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_10px_26px_rgba(30,25,20,0.10)]">
            <Image
              src={SYNAURA_SHELL_BRAND.appLogo}
              alt="Synaura"
              width={52}
              height={52}
              className="h-12 w-12 object-contain"
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
          <div className="min-w-0 sm:hidden">
            <p className="text-xl font-black tracking-tight">Synaura</p>
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-black/36">mobile social music</p>
          </div>
        </Link>

        <SynauraUniversalSearch placeholder={searchLabel} />

        <div className="flex items-center gap-2">
          {isGuest ? (
            <Link
              href="/auth/signin"
              className="hidden h-11 items-center gap-2 rounded-full bg-black/[0.06] px-4 text-sm font-black text-black/60 transition hover:bg-black hover:text-white sm:flex"
            >
              <LogIn className="h-4 w-4" /> Connexion
            </Link>
          ) : (
            <>
              <NotificationCenter className="bg-black/[0.06] text-black/60 hover:bg-black hover:text-white sm:h-11 sm:w-11" />
              <Link
                href={secondaryHref}
                className="hidden h-11 items-center gap-2 rounded-full bg-black/[0.06] px-4 text-sm font-black text-black/60 transition hover:bg-black hover:text-white sm:flex"
              >
                <Sparkles className="h-4 w-4" /> {secondaryLabel}
              </Link>
            </>
          )}
          <Link
            href={isGuest ? '/auth/signup' : primaryHref}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#171313] px-3 text-xs font-black text-white shadow-[0_12px_28px_rgba(23,19,19,0.18)] transition hover:scale-[1.02] sm:h-11 sm:px-5 sm:text-sm"
          >
            {isGuest ? <UserPlus className="h-4 w-4" /> : null}
            {isGuest ? 'Créer un compte' : primaryLabel}
          </Link>
        </div>
      </div>

      <div className="mt-2.5 flex gap-2 lg:hidden">
        <SynauraUniversalSearch compact placeholder={searchLabel} />
        <Link
          href={isGuest ? '/auth/signin' : secondaryHref}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black/[0.06] px-3 text-xs font-black text-black/60 transition hover:bg-black hover:text-white sm:hidden"
        >
          {isGuest ? <LogIn className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {isGuest ? 'Connexion' : secondaryLabel}
        </Link>
      </div>

      {isGuest ? (
        <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-[#ff6f61]/18 bg-[#ff6f61]/10 px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff6f61]">Tu visites Synaura</p>
              <p className="mt-1 text-sm font-bold text-[#171313]">
                Crée ton compte pour publier, suivre des artistes, commenter et recevoir tes notifications.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/auth/signup" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171313] px-4 text-xs font-black text-white transition hover:scale-[1.02]">
                <UserPlus className="h-4 w-4" />
                S'inscrire
              </Link>
              <Link href="/auth/signin" className="inline-flex h-10 items-center rounded-full bg-white px-4 text-xs font-black text-black/60 transition hover:bg-black hover:text-white">
                Connexion
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SynauraRouteNav({ className = '' }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cx('mb-4 hidden sm:block', className)} aria-label="Navigation Synaura">
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

export function SynauraMobileDock() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.7rem)] pt-2 sm:hidden"
      aria-label="Navigation mobile Synaura"
    >
      <div className="mx-auto max-w-xl rounded-[1.8rem] border border-black/[0.08] bg-[#fffaf2]/96 p-2 shadow-[0_18px_50px_rgba(30,25,20,0.16)] backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1">
          {SYNAURA_MOBILE_ROUTE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = routeIsActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex min-w-0 flex-col items-center gap-1 rounded-[1.1rem] px-2 py-2 text-center transition',
                  isActive ? 'bg-[#171313] text-white' : 'text-black/52 hover:bg-black/[0.05] hover:text-[#171313]',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-[10px] font-black tracking-[0.02em]">{item.label}</span>
              </Link>
            );
          })}
        </div>
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div className="min-w-0">
          {eyebrow ? (
            <span className="inline-flex rounded-full bg-black/[0.055] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black/52">
              {eyebrow}
            </span>
          ) : null}
          <div className="mt-3 text-[2rem] font-black leading-[0.95] tracking-[-0.05em] text-[#171313] sm:text-4xl">{title}</div>
          {description ? <div className="mt-3 max-w-2xl text-sm leading-6 text-black/58 sm:text-[15px]">{description}</div> : null}
          {actions ? <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:gap-2.5">{actions}</div> : null}
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
            'h-9 shrink-0 rounded-full px-3 text-xs font-black transition sm:h-10 sm:px-4 sm:text-sm',
            active === item ? 'bg-[#171313] text-white' : 'bg-black/[0.055] text-black/55 hover:bg-black/[0.09]',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
