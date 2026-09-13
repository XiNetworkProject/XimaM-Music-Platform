'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { withCurrentHandoff } from '@/lib/creationHandoffClient';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SynauraOverlay } from '@/components/ui/SynauraOverlay';
import { SynauraImage } from '@/components/ui/SynauraImage';
import {
  Compass,
  Film,
  Library,
  PenSquare,
  Plus,
  Radio,
  Sparkles,
  Upload,
  User,
  Wand2,
  X,
} from 'lucide-react';
import {
  getWebProfileHref,
  isPrimaryWebRouteActive,
  PRIMARY_WEB_NAV_ITEMS,
  type PrimaryWebNavId,
} from '@/lib/primaryNavigation';

type DockAppearance = 'surface' | 'immersive';

type CreateAction = {
  label: string;
  description: string;
  href: string;
  icon: typeof Plus;
  accent: string;
};

const CREATE_ACTIONS: CreateAction[] = [
  {
    label: 'Publier un son',
    description: 'Importe un titre et prépare sa sortie.',
    href: '/upload',
    icon: Upload,
    accent: 'bg-[var(--v2-selected)] text-[var(--v2-accent)]',
  },
  {
    label: 'Créer avec l’IA',
    description: 'Compose, remixe et développe une idée.',
    href: '/ai-generator',
    icon: Sparkles,
    accent: 'bg-[var(--v2-selected)] text-[var(--v2-accent)]',
  },
  {
    label: 'Publier un clip',
    description: 'Transforme un passage en format vertical.',
    href: '/clips/new',
    icon: Film,
    accent: 'bg-[var(--v2-soft)] text-[var(--v2-pink)]',
  },
  {
    label: 'Écrire un post',
    description: 'Partage une actualité avec la communauté.',
    href: '/posts',
    icon: PenSquare,
    accent: 'bg-[var(--v2-soft)] text-[var(--v2-muted)]',
  },
  {
    label: 'Créer une variation',
    description: 'Propose une nouvelle version d’un morceau.',
    href: '/create/variation',
    icon: Wand2,
    accent: 'bg-[var(--syn-soft)] text-[var(--syn-text-secondary)]',
  },
];

const NAV_ICONS: Record<PrimaryWebNavId, typeof Plus> = {
  home: Radio,
  discover: Compass,
  create: Plus,
  library: Library,
  profile: User,
};

function withAuthRedirect(href: string, authenticated: boolean) {
  if (authenticated) return href;
  return `/auth/signin?callbackUrl=${encodeURIComponent(href)}`;
}

export default function SynauraPrimaryDock({
  appearance = 'surface',
  showDesktop = false,
}: {
  appearance?: DockAppearance;
  showDesktop?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const authenticated = Boolean(session?.user);
  const username = (session?.user as any)?.username as string | undefined;
  const profileHref = getWebProfileHref(username, authenticated);
  const immersive = appearance === 'immersive';


  useEffect(() => {
    if (!createOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreateOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [createOpen]);

  useEffect(() => {
    if (!username) {
      setAvatarUrl(null);
      return;
    }

    let active = true;
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        const candidate = payload?.user?.avatar || payload?.user?.image || payload?.avatar || payload?.image;
        if (typeof candidate === 'string' && candidate) setAvatarUrl(candidate);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [username]);

  const resolvedAvatar = useMemo(
    () => avatarUrl || (session?.user as any)?.avatar || session?.user?.image || null,
    [avatarUrl, session?.user],
  );

  const navigateCreate = (href: string) => {
    setCreateOpen(false);
    router.push(withAuthRedirect(withCurrentHandoff(href), authenticated), { scroll: false });
  };

  const renderItem = (item: (typeof PRIMARY_WEB_NAV_ITEMS)[number]) => {
    const Icon = NAV_ICONS[item.id];
    const active = isPrimaryWebRouteActive(item.id, pathname);
    const commonClass = `group relative flex h-[68px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition ${
      active
        ? immersive ? 'text-[var(--v2-accent)]' : 'text-[var(--syn-accent-blue)]'
        : immersive ? 'text-[var(--v2-muted)] hover:text-white' : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
    }`;
    const content = (
      <>
        {item.id === 'create' ? (
          <span className={`grid h-11 w-11 -translate-y-1 place-items-center rounded-full border-[3px] shadow-[0_8px_22px_rgba(0,0,0,0.28)] transition group-active:scale-95 ${
            immersive
              ? 'border-[#0D0D0D] bg-[#F7F6F3] text-[#111111]'
              : 'border-[var(--syn-background)] bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]'
          }`}>
            <Icon className="h-6 w-6" strokeWidth={2.4} />
          </span>
        ) : item.id === 'profile' && resolvedAvatar ? (
          <span className={`grid h-[30px] w-[34px] place-items-center ${active ? '-translate-y-px' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <SynauraImage fallbackSrc="/default-avatar.png"
              src={resolvedAvatar}
              alt=""
              className={`h-6 w-6 rounded-full object-cover ${active ? 'ring-2 ring-[var(--v2-accent)] ring-offset-1 ring-offset-transparent' : 'opacity-75'}`}
            />
          </span>
        ) : (
          <span className={`grid h-[30px] w-[34px] place-items-center ${active ? '-translate-y-px' : ''}`}>
            <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.35 : 1.85} />
          </span>
        )}
        <span className={`max-w-full truncate text-[8px] font-bold min-[360px]:text-[10px] ${item.id === 'create' ? '-mt-1' : ''}`}>
          {item.id === 'home' ? 'Live' : item.label}
        </span>
        {active && item.id !== 'create' ? (
          <span className="absolute top-0 h-0.5 w-[22px] rounded-b-full bg-[var(--v2-accent)]" />
        ) : null}
      </>
    );

    if (item.id === 'create') {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => setCreateOpen(true)}
          className={commonClass}
          aria-label="Ouvrir le menu Créer"
          aria-expanded={createOpen}
        >
          {content}
        </button>
      );
    }

    const href = item.id === 'profile' ? profileHref : item.href!;
    return (
      <Link
        key={item.id}
        href={href}
        className={commonClass}
        aria-current={active ? 'page' : undefined}
        aria-label={status === 'loading' && item.id === 'profile' ? 'Chargement du profil' : item.label}
      >
        {content}
      </Link>
    );
  };

  const renderDesktopItem = (item: (typeof PRIMARY_WEB_NAV_ITEMS)[number]) => {
    const Icon = NAV_ICONS[item.id];
    const active = isPrimaryWebRouteActive(item.id, pathname);
    const commonClass = `group relative flex h-12 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-xs font-black transition ${
      active
        ? immersive
          ? 'bg-white/10 text-white'
          : 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]'
        : immersive
          ? 'text-white/55 hover:bg-white/[0.07] hover:text-white'
          : 'text-[var(--syn-text-secondary)] hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)]'
    }`;
    const content = (
      <>
        {item.id === 'profile' && resolvedAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <SynauraImage fallbackSrc="/default-avatar.png"
            src={resolvedAvatar}
            alt=""
            className={`h-6 w-6 shrink-0 rounded-full object-cover ${active ? 'ring-2 ring-[var(--v2-accent)] ring-offset-1 ring-offset-transparent' : 'opacity-80'}`}
          />
        ) : item.id === 'create' ? (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            immersive ? 'bg-[#F7F6F3] text-[#111111]' : 'bg-[var(--syn-contrast-bg)] text-[var(--syn-contrast-text)]'
          }`}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </span>
        ) : (
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.3 : 1.85} />
        )}
        <span className="truncate">{item.id === 'home' ? 'Live' : item.label}</span>
        {active && item.id !== 'create' ? (
          <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-[var(--v2-accent)]" />
        ) : null}
      </>
    );

    if (item.id === 'create') {
      return (
        <button
          key={`desktop-${item.id}`}
          type="button"
          onClick={() => setCreateOpen(true)}
          className={commonClass}
          aria-label="Ouvrir le menu Créer"
          aria-expanded={createOpen}
        >
          {content}
        </button>
      );
    }

    const href = item.id === 'profile' ? profileHref : item.href!;
    return (
      <Link
        key={`desktop-${item.id}`}
        href={href}
        className={commonClass}
        aria-current={active ? 'page' : undefined}
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      <nav
        className={`v2-primary-dock pointer-events-none fixed inset-x-0 bottom-0 z-[160] border-t backdrop-blur-2xl lg:hidden ${
          immersive
            ? 'border-white/10 bg-[#0D0D0D]/94'
            : 'border-[var(--syn-border)] bg-[var(--syn-surface-translucent)]'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navigation principale"
      >
        <div className="pointer-events-auto mx-auto grid h-[68px] w-full max-w-[640px] grid-cols-5 px-1">
          {PRIMARY_WEB_NAV_ITEMS.map(renderItem)}
        </div>
      </nav>

      {showDesktop ? (
        <nav
          className={`v2-primary-dock-desktop fixed left-1/2 top-3 z-[160] hidden w-[min(640px,calc(100vw-340px))] -translate-x-1/2 rounded-lg border p-1 shadow-[0_16px_44px_rgba(0,0,0,0.24)] backdrop-blur-2xl lg:block ${
            immersive
              ? 'border-white/10 bg-[#0D0D0D]/88'
              : 'border-[var(--syn-border)] bg-[var(--syn-surface-translucent)]'
          }`}
          aria-label="Navigation principale bureau"
        >
          <div className="grid grid-cols-5 gap-1">
            {PRIMARY_WEB_NAV_ITEMS.map(renderDesktopItem)}
          </div>
        </nav>
      ) : null}

      <SynauraOverlay open={createOpen} onClose={() => setCreateOpen(false)} presentation="responsive" showClose={false} labelledBy="synaura-create-title" className="v2-create-menu p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
                    <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-[var(--syn-border)]" />
                    <div className="flex h-12 items-center justify-between">
                      <div>
                        <h2 id="synaura-create-title" className="text-lg font-black">Créer</h2>
                        <p className="text-xs font-semibold text-[var(--syn-text-secondary)]">Choisis ton point de départ.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateOpen(false)}
                        aria-label="Fermer"
                        className="grid h-10 w-10 place-items-center rounded-full text-[var(--syn-text-secondary)] transition hover:bg-[var(--syn-soft)] hover:text-[var(--syn-text-primary)]"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-3 divide-y divide-[var(--syn-border)] border-y border-[var(--syn-border)]">
                      {CREATE_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.href}
                            type="button"
                            onClick={() => navigateCreate(action.href)}
                            className="flex min-h-[66px] w-full items-center gap-3 px-1 py-2 text-left transition hover:bg-[var(--syn-soft)] active:opacity-70"
                          >
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${action.accent}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <strong className="block text-sm font-black">{action.label}</strong>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-[var(--syn-text-secondary)]">
                                {action.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => navigateCreate('/create')} className="mt-2 min-h-10 w-full rounded-lg px-3 text-xs font-bold text-[var(--syn-text-secondary)] focus-visible:outline focus-visible:outline-2">
                      Tous les outils de création
                    </button>
      </SynauraOverlay>

    </>
  );
}
