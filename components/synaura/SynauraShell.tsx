'use client';
import { SynauraImage } from '@/components/ui/SynauraImage';

import type { CSSProperties, ReactNode } from 'react';
import Link from '@/components/navigation/HandoffLink';
import HandoffReturn from '@/components/navigation/HandoffReturn';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Compass,
  BarChart3,
  MapPin,
  Gift,
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
  Users,
} from 'lucide-react';
import NotificationCenter from '@/components/NotificationCenter';
import SynauraLogo from '@/components/brand/SynauraLogo';
import MessageInboxButton from '@/components/messaging/MessageInboxButton';
import SynauraUniversalSearch from '@/components/synaura/SynauraUniversalSearch';
import SynauraPrimaryDock from '@/components/synaura/SynauraPrimaryDock';
import ChambreSpacesMenu from '@/components/synaura/ChambreSpacesMenu';
import {
  getWebProfileHref,
  isPrimaryWebRouteActive,
  ACCOUNT_WEB_NAV_ITEMS,
  PRIMARY_WEB_NAV_ITEMS,
  shouldShowPrimaryWebDock,
  type PrimaryWebNavId,
} from '@/lib/primaryNavigation';
import { getRouteChrome, shouldRenderGlobalMiniPlayer } from '@/lib/routeChrome';
import { usesUnifiedNavigation } from '@/lib/unifiedNavigation';
import { isPastShutdownEnd, isShutdownAnnounced, SHUTDOWN_END_DATE_LABEL } from '@/lib/synauraShutdown';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const SYNAURA_ROUTE_ICONS: Record<PrimaryWebNavId, typeof Home> = {
  home: Home,
  discover: Compass,
  create: Plus,
  library: Library,
  profile: User,
};

export function SynauraAccountMenu({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const user = session?.user;
  if (!user) return null;

  const username = user.username || '';
  const avatar = (user as any).avatar || user.image || '';
  const profileHref = username ? `/profile/${username}` : '/profile';
  const accountIcons = { profile: User, clip: Film, studio: Sparkles, library: Library, settings: Settings, subscription: CreditCard, help: HelpCircle } as const;
  const links: Array<{ href: string; label: string; icon: typeof User }> = ACCOUNT_WEB_NAV_ITEMS.map((item) => ({
    href: item.href || profileHref,
    label: item.label,
    icon: accountIcons[item.id],
  }));
  links.splice(1, 0, { href: '/community', label: 'Communauté', icon: Users });
  links.push(
    { href: '/ai-library', label: 'Mes créations IA', icon: Sparkles },
    { href: '/stats', label: 'Statistiques', icon: BarChart3 },
    { href: '/boosters', label: 'Boosters & récompenses', icon: Gift },
    { href: '/city', label: 'Synaura City', icon: MapPin },
  );

  return (
    <details className="experience-account-menu group relative">
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
            <SynauraImage fallbackSrc="/default-avatar.png" src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (user.name || username || 'S').slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="hidden max-w-[110px] truncate text-xs font-black text-[var(--syn-text-primary)] xl:block">
          {user.name || username}
        </span>
      </summary>

      <div className="v2-account-panel absolute right-0 top-[calc(100%+0.55rem)] z-[80] w-64 max-w-none overflow-hidden rounded-[1.4rem] border border-[var(--syn-border)] bg-[var(--syn-surface-translucent)] p-2 shadow-[0_24px_70px_var(--syn-shadow)] backdrop-blur-2xl">
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
  const routeKind = getRouteChrome(pathname).kind;
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
    <div data-synaura-route={routeKind} className={cx('synaura-shell-root relative z-20 min-h-screen overflow-x-hidden bg-[var(--syn-background)] text-[var(--syn-text-primary)]', className)}>
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
          'v2-shell-content relative mx-auto min-w-0',
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
        'v2-shell-panel relative w-full min-w-0 overflow-hidden border border-[var(--syn-border)]',
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
  searchLabel = 'Rechercher un morceau, un créateur…',
  secondaryHref = '/ai-generator', secondaryLabel = 'AI Generator',
  primaryHref = '/upload', primaryLabel = 'Publier', compact = false,
}: { searchHref?: string; searchLabel?: string; secondaryHref?: string; secondaryLabel?: string; primaryHref?: string; primaryLabel?: string; compact?: boolean }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  if (usesUnifiedNavigation(pathname)) return null;
  return <header className="v2-topbar experience-topbar">
    <HandoffReturn omitPaths={['/create', '/upload']} />
    <div className="v2-topbar-row">
      <Link href="/live" className="v2-topbar-brand" aria-label="Synaura, accueil"><SynauraLogo variant="wordmark" size={38} priority decorative /><span className="experience-brand-caption" aria-hidden="true">L'écoute nous rapproche.</span></Link>
      <div className="v2-topbar-search"><SynauraUniversalSearch compact={compact} placeholder={searchLabel} /></div>
      <div className="v2-topbar-tools">
        <ChambreSpacesMenu username={session?.user?.username} authenticated={Boolean(session?.user)} />
        {status === 'loading' ? <span className="h-10 w-10 rounded-full bg-[var(--syn-soft)]" role="status" aria-label="Chargement du compte" /> : session?.user ? <>
          <MessageInboxButton className="h-11 w-11 text-[var(--syn-text-secondary)]" />
          <NotificationCenter className="h-11 w-11 text-[var(--syn-text-secondary)]" />
          <SynauraAccountMenu compact />
        </> : <Link href="/auth/signin" className="v2-action">Connexion</Link>}
        <details className="experience-create-shortcuts relative hidden xl:block">
          <summary className="v2-action cursor-pointer list-none" aria-label="Accès rapides de création"><Plus className="h-4 w-4" /> Créer</summary>
          <div className="v2-account-panel absolute right-0 top-full z-50 mt-2 grid w-60 gap-1 border border-[var(--syn-border)] p-2">
            <Link className="v2-action" href="/create">Tous les outils de création</Link>
            <Link className="v2-action" href={secondaryHref}>{secondaryLabel}</Link>
            <Link className="v2-action" href={primaryHref}>{primaryLabel}</Link>
            <Link className="v2-action" href="/studio">Studio IDE</Link>
          </div>
        </details>
      </div>
    </div>
  </header>;
}

export function SynauraRouteNav({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const username = (session?.user as any)?.username as string | undefined;
  const profileHref = getWebProfileHref(username, Boolean(session?.user));
  if (usesUnifiedNavigation(pathname)) return null;
  return <nav className={cx('v2-desktop-nav experience-route-nav', className)} aria-label="Navigation Synaura">
    {PRIMARY_WEB_NAV_ITEMS.map((item, index) => {
      const Icon = SYNAURA_ROUTE_ICONS[item.id];
      const active = isPrimaryWebRouteActive(item.id, pathname);
      const href = item.id === 'create' ? '/create' : item.id === 'profile' ? profileHref : item.href!;
      return <Link key={item.id} href={href} prefetch={item.id === 'library' && !session?.user ? false : undefined} aria-current={active ? 'page' : undefined}>
        <span className="v2-nav-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><Icon className="h-4 w-4" strokeWidth={1.6} />{item.id === 'home' ? 'Live' : item.label}
      </Link>;
    })}
    <Link href="/community" aria-current={pathname?.startsWith('/community') ? 'page' : undefined}><span className="v2-nav-index" aria-hidden="true">06</span><Users size={16} strokeWidth={1.6} />Communauté</Link>
  </nav>;
}

export function SynauraMobileDock({
  appearance = 'surface',
  showDesktop = false,
}: {
  appearance?: 'surface' | 'immersive';
  showDesktop?: boolean;
}) {
  const pathname = usePathname();
  if (usesUnifiedNavigation(pathname)) return null;
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
    <SynauraPanel className={cx('v2-shell-hero p-5 sm:p-6', className)}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div className="min-w-0">
          {eyebrow ? (
            <span className="inline-flex rounded-full bg-[var(--syn-soft)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--syn-text-secondary)]">
              {eyebrow}
            </span>
          ) : null}
          <div className="v2-heading mt-3">{title}</div>
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
