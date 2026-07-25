'use client';

import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Compass,
  CreditCard,
  Film,
  HelpCircle,
  Home,
  Library,
  LogIn,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
  UserPlus,
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import MessageInboxButton from '@/components/messaging/MessageInboxButton';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import SynauraPrimaryDock from '@/components/synaura/SynauraPrimaryDock';
import {
  getWebProfileHref,
  isPrimaryWebRouteActive,
  PRIMARY_WEB_NAV_ITEMS,
  shouldShowPrimaryWebDock,
  type PrimaryWebNavId,
} from '@/lib/primaryNavigation';
import { shouldRenderGlobalMiniPlayer } from '@/lib/routeChrome';
import { isPastShutdownEnd, isShutdownAnnounced, SHUTDOWN_END_DATE_LABEL } from '@/lib/synauraShutdown';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const SYNAURA_SHELL_BRAND = {
  appLogo: '/brand/2026/synaura-symbol-2026.png',
  logotype: '/brand/2026/synaura-logotype.png',
} as const;

const SYNAURA_ROUTE_ICONS: Record<PrimaryWebNavId, typeof Home> = {
  home: Home,
  discover: Compass,
  create: Plus,
  library: Library,
  profile: User,
};

function SynauraAccountMenu({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const user = session?.user;
  if (!user) return null;

  const username = user.username || '';
  const avatar = (user as any).avatar || user.image || '';
  const profileHref = username ? `/profile/${username}` : '/profile';
  const links = [
    { href: profileHref, label: 'Mon profil', icon: User },
    { href: '/clips/new', label: 'Publier un clip', icon: Film },
    { href: '/ai-generator', label: 'Studio', icon: Sparkles },
    { href: '/library', label: 'Bibliothèque', icon: Library },
    { href: '/settings', label: 'Paramètres', icon: Settings },
    { href: '/subscriptions', label: 'Abonnement', icon: CreditCard },
    { href: '/legal', label: 'Aide et centre légal', icon: HelpCircle },
  ];

  return (
    <details className="group relative">
      <summary
        className={cx(
          'flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--syn-border)] bg-[var(--syn-surface)] p-1 pr-2.5 shadow-[0_8px_24px_var(--syn-shadow)] transition hover:bg-[var(--syn-soft)]',
          compact && 'p-0.5 pr-1.5',
        )}
        aria-label="Ouvrir le menu du compte"
      >
        <span className={cx('grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#171313] text-xs font-black text-white', compact && 'h-7 w-7')}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (user.name || username || 'S').slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="hidden max-w-[110px] truncate text-xs font-black text-[var(--syn-text-primary)] xl:block">
          {user.name || username}
        </span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.55rem)] z-[80] w-64 max-w-none overflow-hidden rounded-[1.4rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-2 shadow-[0_24px_70px_var(--syn-shadow)] backdrop-blur-2xl">
        <div className="mb-1 rounded-[1rem] bg-[var(--syn-soft)] px-3 py-2.5">
          <p className="truncate text-sm font-black text-[var(--syn-text-primary)]">{user.name || username || 'Compte Synaura'}</p>
          {username ? <p className="truncate text-xs font-bold text-[var(--syn-text-secondary)]">@{username}</p> : null}
        </div>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-sm font-black text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)]">
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="mt-1 flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-2.5 text-left text-sm font-black text-[#d92d20] transition hover:bg-[#d92d20] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </details>
  );
}

export function SynauraAppShell({
  children,
  className = '',
  contentClassName = '',
  showDock,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showDock?: boolean;
}) {
  const pathname = usePathname();
  const { data: shellSession } = useSession();
  const shellUsername = (shellSession?.user as any)?.username as string | undefined;
  const renderDock = showDock ?? shouldShowPrimaryWebDock(pathname, shellUsername);
  const renderPlayer = shouldRenderGlobalMiniPlayer(pathname);
  const mobileBottomPadding = renderDock
    ? renderPlayer
      ? 'pb-[var(--synaura-mobile-player-space)]'
      : 'pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]'
    : renderPlayer
      ? 'pb-[calc(env(safe-area-inset-bottom,0px)+6.75rem)]'
      : 'pb-6';

  return (
    <div className={cx('synaura-shell-root relative z-20 min-h-screen overflow-x-hidden bg-[var(--syn-background)] text-[var(--syn-text-primary)]', className)}>
      <style>{`
        .synaura-no-scrollbar::-webkit-scrollbar { display: none; }
        .synaura-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        :root {
          --synaura-mobile-dock-space: var(--synaura-primary-dock-space);
          --synaura-mobile-player-space: calc(env(safe-area-inset-bottom, 0px) + 9.8rem);
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="synaura-shell-atmosphere absolute inset-0" />
      </div>

      <div
        className={cx(
          'relative mx-auto max-w-[1480px] min-w-0 px-2 py-2 sm:px-[18px] sm:py-3 sm:pb-5 lg:px-8 lg:py-5',
          mobileBottomPadding,
          contentClassName,
        )}
      >
        {children}
      </div>
      {renderDock ? <SynauraMobileDock /> : null}
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
        'relative w-full min-w-0 overflow-hidden rounded-[14px] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] shadow-[0_18px_60px_var(--syn-shadow)] backdrop-blur-xl sm:rounded-[20px]',
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
        'relative w-full min-w-0 overflow-hidden rounded-[14px] bg-[#171313] text-[#fffaf2] shadow-[0_20px_70px_rgba(20,15,10,0.25)] sm:rounded-[20px]',
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
  compact = false,
}: {
  searchHref?: string;
  searchLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  primaryHref?: string;
  primaryLabel?: string;
  compact?: boolean;
}) {
  const { data: session, status } = useSession();
  const isSessionLoading = status === 'loading';
  const isGuest = status !== 'loading' && !session?.user;

  return (
    <header className={cx(
      'sticky top-2 z-40 rounded-[14px] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] px-2.5 py-2 shadow-[0_16px_50px_var(--syn-shadow)] backdrop-blur-2xl sm:top-3 sm:rounded-[20px] sm:px-4 sm:py-3',
      compact ? 'top-1 mb-1.5 rounded-[12px] px-2 py-1.5 sm:top-2 sm:rounded-[14px] sm:px-3 sm:py-1.5' : 'mb-4',
    )}>
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
          <div className={cx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[var(--syn-border)] bg-[var(--syn-surface)] shadow-[0_10px_26px_var(--syn-shadow)] sm:h-12 sm:w-12 sm:rounded-[12px]',
            compact && 'h-8 w-8 rounded-[8px] sm:h-9 sm:w-9 sm:rounded-[9px]',
          )}>
            <Image
              src={SYNAURA_SHELL_BRAND.appLogo}
              alt="Synaura"
              width={52}
              height={52}
              className={cx('h-9 w-9 object-contain sm:h-11 sm:w-11', compact && 'h-7 w-7 sm:h-8 sm:w-8')}
              unoptimized
              priority
            />
          </div>
          <div className="hidden min-w-0 md:block">
            <Image
              src={SYNAURA_SHELL_BRAND.logotype}
              alt="Synaura"
              width={200}
              height={48}
              className={cx('h-9 w-auto max-w-[200px] object-contain object-left', compact && 'h-6 max-w-[150px]')}
              unoptimized
              priority
            />
          </div>
          <div className={cx('min-w-0 md:hidden', compact && 'hidden')}>
            <p className="truncate text-base font-black text-[var(--syn-text-primary)] sm:text-lg">Synaura</p>
            <p className="hidden truncate text-[9px] font-black uppercase text-[var(--syn-text-secondary)] min-[370px]:block">
              Ecoute · crée · remix
            </p>
          </div>
        </Link>

        <SynauraUniversalSearch compact={compact} placeholder={searchLabel} />

        <div className="flex items-center gap-2">
          {isSessionLoading ? (
            <div
              className={cx(
                'h-10 w-10 animate-pulse rounded-full bg-[var(--syn-soft)] sm:h-11 sm:w-11',
                compact && 'h-8 w-8 sm:h-8 sm:w-8',
              )}
              aria-label="Chargement du compte"
            />
          ) : isGuest ? (
            <>
              <Link
                href="/auth/signin"
                aria-label="Connexion"
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-full bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)] sm:hidden',
                  compact && 'h-8 w-8',
                )}
              >
                <LogIn className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/signin"
                className={cx(
                  'hidden h-11 items-center gap-2 rounded-full bg-[var(--syn-soft)] px-4 text-sm font-black text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)] sm:flex',
                  compact && 'h-8 px-3 text-xs',
                )}
              >
                <LogIn className="h-4 w-4" /> Connexion
              </Link>
            </>
          ) : (
            <>
              <MessageInboxButton className={cx('bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)] sm:h-11 sm:w-11', compact && 'h-8 w-8 sm:h-8 sm:w-8')} />
              <NotificationCenter className={cx('bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)] sm:h-11 sm:w-11', compact && 'h-8 w-8 sm:h-8 sm:w-8')} />
              <Link
                href={secondaryHref}
                className={cx(
                  'hidden h-11 items-center gap-2 rounded-full bg-[var(--syn-soft)] px-4 text-sm font-black text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-contrast-bg)] hover:text-[var(--syn-contrast-text)] lg:flex',
                  compact && 'h-8 px-3 text-xs',
                )}
              >
                <Sparkles className="h-4 w-4" /> {secondaryLabel}
              </Link>
              <SynauraAccountMenu compact={compact} />
            </>
          )}
          {!isSessionLoading ? (
            <Link
              href={isGuest ? '/auth/signup' : primaryHref}
              className={cx(
                'hidden h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--syn-contrast-bg)] px-5 text-sm font-black text-[var(--syn-contrast-text)] shadow-[0_12px_28px_var(--syn-shadow)] transition hover:scale-[1.02] md:inline-flex',
                compact && 'h-8 px-3 text-xs',
              )}
            >
              {isGuest ? <UserPlus className="h-4 w-4" /> : null}
              {isGuest ? 'Créer un compte' : primaryLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div className={cx('mt-2 flex lg:hidden', compact && 'hidden')}>
        <SynauraUniversalSearch compact placeholder={searchLabel} />
      </div>
    </header>
  );
}

export function SynauraRouteNav({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const username = (session?.user as any)?.username as string | undefined;
  const profileHref = getWebProfileHref(username, Boolean(session?.user));

  return (
    <nav className={cx(compact ? 'mb-1 block' : 'mb-4 hidden lg:block', className)} aria-label="Navigation Synaura">
      <div className={cx(
        'synaura-no-scrollbar flex gap-2 overflow-x-auto rounded-[14px] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-2 shadow-[0_14px_36px_var(--syn-shadow)] backdrop-blur-xl',
        compact && 'gap-1.5 rounded-[10px] p-1',
      )}>
        {PRIMARY_WEB_NAV_ITEMS.map((item) => {
          const Icon = SYNAURA_ROUTE_ICONS[item.id];
          const isActive = isPrimaryWebRouteActive(item.id, pathname);
          const href = item.id === 'create'
            ? '/create'
            : item.id === 'profile'
              ? profileHref
              : item.href!;

          return (
            <Link
              key={item.id}
              href={href}
              className={cx(
                'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-black transition',
                compact && 'h-7 gap-1.5 px-2.5 text-[10px]',
                isActive ? 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]' : 'bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft-strong)] hover:text-[var(--syn-text-primary)]',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cx('h-4 w-4', compact && 'h-3 w-3')} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SynauraMobileDock({
  appearance = 'surface',
  showDesktop = false,
}: {
  appearance?: 'surface' | 'immersive';
  showDesktop?: boolean;
}) {
  return <SynauraPrimaryDock appearance={appearance} showDesktop={showDesktop} />;
}

export function SynauraAnnouncementStrip({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  if (!isShutdownAnnounced() || isPastShutdownEnd()) return null;

  return (
    <Link
      href="/fermeture"
      className={cx(
        'mb-4 flex items-center justify-center gap-2 rounded-[1.35rem] border border-red-300/45 bg-red-50/92 px-4 py-3 text-center text-xs font-black text-red-900/78 shadow-[0_14px_30px_rgba(120,35,20,0.08)] transition hover:bg-red-50',
        compact && 'lg:mb-2 lg:rounded-[1rem] lg:px-3 lg:py-1.5 lg:text-[11px]',
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
    <SynauraPanel className={cx('synaura-theme-hero p-5 sm:p-6', className)}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div className="min-w-0">
          {eyebrow ? (
            <span className="inline-flex rounded-full bg-[var(--syn-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--syn-text-secondary)]">
              {eyebrow}
            </span>
          ) : null}
          <div className="mt-3 text-[2rem] font-black leading-[0.95] text-[var(--syn-text-primary)] sm:text-4xl">{title}</div>
          {description ? <div className="mt-3 max-w-2xl text-sm leading-6 text-[var(--syn-text-secondary)] sm:text-[15px]">{description}</div> : null}
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
            active === item ? 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]' : 'bg-[var(--syn-soft)] text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft-strong)]',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
