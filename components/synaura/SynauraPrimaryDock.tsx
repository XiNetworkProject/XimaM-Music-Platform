'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
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
    accent: 'bg-[#7357C6]/12 text-[#7357C6]',
  },
  {
    label: 'Créer avec l’IA',
    description: 'Compose, remixe et développe une idée.',
    href: '/ai-generator',
    icon: Sparkles,
    accent: 'bg-[#4A9EAA]/14 text-[#347E88]',
  },
  {
    label: 'Publier un clip',
    description: 'Transforme un passage en format vertical.',
    href: '/clips/new',
    icon: Film,
    accent: 'bg-[#D96D63]/13 text-[#C45C53]',
  },
  {
    label: 'Écrire un post',
    description: 'Partage une actualité avec la communauté.',
    href: '/posts',
    icon: PenSquare,
    accent: 'bg-[#C99B48]/15 text-[#9A732D]',
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
  const [mounted, setMounted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const authenticated = Boolean(session?.user);
  const username = (session?.user as any)?.username as string | undefined;
  const profileHref = getWebProfileHref(username, authenticated);
  const immersive = appearance === 'immersive';

  useEffect(() => setMounted(true), []);

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
    router.push(withAuthRedirect(href, authenticated), { scroll: false });
  };

  const renderItem = (item: (typeof PRIMARY_WEB_NAV_ITEMS)[number]) => {
    const Icon = NAV_ICONS[item.id];
    const active = isPrimaryWebRouteActive(item.id, pathname);
    const commonClass = `group relative flex h-[68px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 transition ${
      active
        ? immersive ? 'text-[#4A9EAA]' : 'text-[var(--syn-accent-blue)]'
        : immersive ? 'text-white/48 hover:text-white' : 'text-[var(--syn-text-secondary)] hover:text-[var(--syn-text-primary)]'
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
            <img
              src={resolvedAvatar}
              alt=""
              className={`h-6 w-6 rounded-full object-cover ${active ? 'ring-2 ring-[#4A9EAA] ring-offset-1 ring-offset-transparent' : 'opacity-75'}`}
            />
          </span>
        ) : (
          <span className={`grid h-[30px] w-[34px] place-items-center ${active ? '-translate-y-px' : ''}`}>
            <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.35 : 1.85} />
          </span>
        )}
        <span className={`max-w-full truncate text-[8px] font-bold min-[360px]:text-[10px] ${item.id === 'create' ? '-mt-1' : ''}`}>
          {item.label}
        </span>
        {active && item.id !== 'create' ? (
          <span className="absolute top-0 h-0.5 w-[22px] rounded-b-full bg-[#4A9EAA]" />
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
          <img
            src={resolvedAvatar}
            alt=""
            className={`h-6 w-6 shrink-0 rounded-full object-cover ${active ? 'ring-2 ring-[#4A9EAA] ring-offset-1 ring-offset-transparent' : 'opacity-80'}`}
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
        <span className="truncate">{item.label}</span>
        {active && item.id !== 'create' ? (
          <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-[#4A9EAA]" />
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
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-[160] border-t backdrop-blur-2xl lg:hidden ${
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
          className={`fixed left-1/2 top-3 z-[160] hidden w-[min(640px,calc(100vw-340px))] -translate-x-1/2 rounded-lg border p-1 shadow-[0_16px_44px_rgba(0,0,0,0.24)] backdrop-blur-2xl lg:block ${
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

      {mounted
        ? createPortal(
            <AnimatePresence>
              {createOpen ? (
                <div className="fixed inset-0 z-[220]">
                  <motion.button
                    type="button"
                    aria-label="Fermer le menu Créer"
                    className="absolute inset-0 h-full w-full bg-black/58 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    onClick={() => setCreateOpen(false)}
                  />
                  <motion.section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="synaura-create-title"
                    className="absolute inset-x-0 bottom-0 mx-auto max-w-xl rounded-t-[1.5rem] border-t border-[var(--syn-border)] bg-[var(--syn-surface)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 text-[var(--syn-text-primary)] shadow-[0_-24px_70px_rgba(0,0,0,0.28)]"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 390 }}
                  >
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
                  </motion.section>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
