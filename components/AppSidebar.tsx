'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Compass,
  BookOpen,
  Settings,
  Plus,
  TrendingUp,
  Users,
  Cloud,
  Sparkles,
  Gift,
  Tv,
  ChevronDown,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useSidebar } from '@/app/providers';
import { ChevronRight } from 'lucide-react';
import { fetchCreditsBalance } from '@/lib/credits';

export default function AppSidebar() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);

  const getSafeAvatar = () => {
    const candidate =
      avatarUrl ||
      (session?.user as any)?.avatar ||
      (session?.user as any)?.image ||
      (session?.user as any)?.picture;
    if (!candidate || candidate === '' || candidate === 'null' || candidate === 'undefined') {
      return '/default-avatar.png';
    }
    return candidate as string;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const username = (session?.user as any)?.username;
        if (!username) return;
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (!res.ok) return;
        const data = await res.json();
        const candidate =
          data?.user?.avatar ||
          data?.user?.image ||
          data?.avatar ||
          data?.image;
        if (candidate && typeof candidate === 'string') {
          setAvatarUrl(candidate);
        }
      } catch {
        // silent
      }
    };
    load();
  }, [session?.user]);

  useEffect(() => {
    const loadCredits = async () => {
      if (!session?.user?.id) return;
      const res = await fetchCreditsBalance();
      if (res && typeof res.balance === 'number') {
        setCreditsBalance(res.balance);
      }
    };
    loadCredits();
  }, [session?.user?.id]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside
      className="group/sidebar fixed inset-y-0 left-0 hidden lg:flex lg:flex-col bg-background-primary text-foreground-primary border-r border-border-secondary overflow-hidden z-40"
      data-collapsed={!isSidebarOpen}
      data-show-content={isSidebarOpen}
      style={
        {
          ['--sidebar-width' as any]: `${isSidebarOpen ? 200 : 88}px`,
          minWidth: 'var(--sidebar-width)',
          maxWidth: 'var(--sidebar-width)',
        } as CSSProperties
      }
    >
      {/* Toggle (copie style snippet) */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer text-[15px] leading-[24px] rounded-md aspect-square bg-transparent enabled:hover:before:bg-overlay-on-primary text-foreground-inactive disabled:after:bg-background-primary disabled:after:opacity-50 absolute top-[35px] right-4 z-10 h-8 w-8 p-1 transition-none group-data-[collapsed=true]/sidebar:left-1/2 group-data-[collapsed=true]/sidebar:-translate-x-1/2"
      >
        <span className="relative flex flex-row items-center justify-center gap-2">
          <ChevronRight
            className={`text-current shrink-0 m-1 w-[18px] h-[18px] transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Logo zone (adapté Synaura) */}
      <div className="flex h-[88px] flex-row justify-start p-4 pt-8">
        <Link
          className="relative inline-block h-auto w-full max-w-28 p-2 group-data-[show-content=false]/sidebar:invisible"
          href="/"
        >
          <div className="flex items-center gap-2">
            <Image
              src="/synaura_symbol.svg"
              alt="Synaura"
              width={36}
              height={36}
              className="h-9 w-9 object-contain drop-shadow-logo"
            />
            <span className="text-[16px] font-semibold tracking-tight title-suno">Synaura</span>
          </div>
        </Link>
      </div>

      {/* Profile (copie structure snippet, adapté données) */}
      <div className="flex min-h-14 flex-col items-stretch justify-center gap-1 px-4">
        <div className="mt-2">
          <button
            type="button"
            onClick={() => {
              const username = (session?.user as any)?.username;
              if (username) router.push(`/profile/${username}`, { scroll: false });
              else router.push('/auth/signin', { scroll: false });
            }}
            aria-label="Profile menu button"
            className="group w-full"
          >
            <div className="relative font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none rounded-md bg-transparent enabled:hover:before:bg-transparent hover:before:bg-transparent hover:text-foreground-primary focus-visible:text-foreground-primary text-[16px] leading-[16px] block w-full px-0.5 py-0 cursor-pointer text-foreground-secondary">
              <span className="relative flex flex-row items-center gap-2 justify-start">
                <div className="w-max shrink-0">
                  <div className="relative before:absolute before:-inset-[6px] before:rounded-full before:border-2 before:border-transparent before:transition-all before:duration-150 group-hover:before:border-white/70 group-focus-within:before:border-white/70 group-hover:before:shadow-[0_0_22px_rgba(255,255,255,0.25)] group-focus-within:before:shadow-[0_0_22px_rgba(255,255,255,0.25)]">
                    <img
                      alt={(session?.user as any)?.username || (session?.user as any)?.name || 'profil'}
                      className="rounded-full h-9 w-9"
                      src={getSafeAvatar()}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                      }}
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 group-data-[show-content=false]/sidebar:invisible">
                  <p className="max-w-full text-left text-[14px] leading-[16px] font-medium group-hover:text-foreground-primary group-focus:text-foreground-primary line-clamp-1">
                    {(session?.user as any)?.username || (session?.user as any)?.name || 'Invité'}
                  </p>
                  <p className="max-w-full line-clamp-1 text-left text-[13px] leading-[16px] text-foreground-inactive group-hover:text-foreground-tertiary group-focus:text-foreground-tertiary">
                    {creditsBalance} credits
                  </p>
                </div>
                <ChevronDown className="shrink-0 m-0 my-1 w-2 h-2 text-foreground-inactive group-data-[show-content=false]/sidebar:invisible" />
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Zone scrollable (liens) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-1 px-4">
          {([
          { href: '/', label: 'Accueil', icon: Home },
          { href: '/discover', label: 'Découvrir', icon: Compass },
          { href: '/library', label: 'Bibliothèque', icon: BookOpen },
          { href: '/boosters', label: 'Boosters', icon: Gift },
          { href: '/tv', label: 'SYNAURA TV', icon: Tv },
          { href: '/community', label: 'Communauté', icon: Users },
          { href: '/stats', label: 'Stats', icon: TrendingUp },
          { href: '/meteo', label: 'Météo', icon: Cloud },
          // CTA mis en valeur (comme sur @example: "Create" est plus visible)
          { href: '/ai-generator', label: 'Studio IA', icon: Sparkles, emphasis: true, emphasisClass: 'btn-cta-studio' },
          { href: '/upload', label: 'Uploader', icon: Plus, emphasis: true, emphasisClass: 'btn-cta-upload' },
        ] as Array<{ href: string; label: string; icon: any; emphasis?: boolean }>).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const emphasis = !!(item as any).emphasis;
          const emphasisClass = (item as any).emphasisClass as string | undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer rounded-md bg-transparent ${
                emphasis
                  ? 'text-foreground-primary'
                  : active
                  ? 'text-foreground-primary'
                  : 'text-foreground-inactive'
              } ${emphasis ? `${emphasisClass || 'bg-background-tertiary'} shadow-[0_10px_24px_rgba(0,0,0,0.28)]` : ''} enabled:hover:before:bg-overlay-on-primary enabled:hover:before:border-border-primary hover:text-foreground-primary focus-visible:text-foreground-primary w-full px-2 py-1 text-[16px] leading-[16px] transition-colors hover:scale-[1.01] active:scale-[0.99]`}
            >
              <span className="relative flex flex-row items-center gap-2 justify-start">
                <Icon className="text-current shrink-0 m-0 my-1 w-[18px] h-[18px] transition-colors" />
                <span className="group-data-[show-content=false]/sidebar:hidden">{item.label}</span>
              </span>
            </Link>
          );
        })}
        </div>
      </div>

      {/* Zone bottom (toujours visible, pas dans le scroll) */}
      <div className="shrink-0 border-t border-border-secondary/60 bg-background-primary">
        {/* Abonnements (bottom) */}
        <div className="h-[156px] px-4 pt-4">
          <Link
            className="btn-cta-subscriptions relative inline-block font-sans font-semibold text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 py-2 text-[15px] leading-[24px] rounded-full text-foreground-primary hover:before:bg-overlay-on-primary w-full group-data-[show-content=false]/sidebar:invisible hover:scale-[1.01] active:scale-[0.99] shadow-[0_10px_28px_rgba(0,0,0,0.35)]"
            href="/subscriptions"
          >
            <span className="relative flex flex-row items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              Abonnements
            </span>
          </Link>
        </div>

        {/* Links bas */}
        <div className="flex flex-col gap-1 px-4 pb-4">
          <Link
            href="/settings"
            className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer rounded-md bg-transparent text-foreground-inactive enabled:hover:before:bg-transparent hover:before:bg-transparent hover:text-foreground-primary focus-visible:text-foreground-primary w-full px-2 py-1 text-[16px] leading-[16px]"
          >
            <span className="relative flex flex-row items-center gap-2 justify-start">
              <Settings className="text-current shrink-0 m-0 my-1 w-[18px] h-[18px]" />
              <span className="group-data-[show-content=false]/sidebar:hidden">Settings</span>
            </span>
          </Link>
          <Link
            href="/meteo"
            className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer rounded-md bg-transparent text-foreground-inactive enabled:hover:before:bg-transparent hover:before:bg-transparent hover:text-foreground-primary focus-visible:text-foreground-primary w-full px-2 py-1 text-[16px] leading-[16px]"
          >
            <span className="relative flex flex-row items-center gap-2 justify-start">
              <Cloud className="text-current shrink-0 m-0 my-1 w-[18px] h-[18px]" />
              <span className="group-data-[show-content=false]/sidebar:hidden">Météo</span>
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
