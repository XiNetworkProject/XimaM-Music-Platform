'use client';

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
  HelpCircle,
  Cloud,
  Sparkles,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useSidebar } from '@/app/providers';

export default function AppSidebar() {
  const { isSidebarOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  const nav = [
    { icon: Home, label: 'Accueil', desc: 'Nouveautés', href: '/' },
    { icon: Compass, label: 'Découvrir', desc: 'Explorer', href: '/discover' },
    { icon: BookOpen, label: 'Bibliothèque', desc: 'Vos favoris', href: '/library' },
    { icon: Users, label: 'Communauté', desc: 'Forum & FAQ', href: '/community' },
    { icon: TrendingUp, label: 'Stats', desc: 'Vos statistiques', href: '/stats' },
    {
      icon: Settings,
      label: 'Abonnements',
      desc: 'Plans & facturation',
      href: '/subscriptions',
      isNew: true,
    },
    {
      icon: Cloud,
      label: 'Météo',
      desc: 'Alertemps',
      href: '/meteo',
      isPartner: true,
      isNew: true,
    },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const onStudio = pathname.startsWith('/ai-generator');

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 ${
        isSidebarOpen ? 'lg:w-72' : 'lg:w-24'
      } transition-[width] duration-200 ease-in-out z-30 p-3`}
    >
      <div className="h-full flex flex-col overflow-hidden rounded-3xl bg-transparent border border-white/10 backdrop-blur-xl">
        {/* Header logo */}
        <div className="px-3 pt-4 pb-3 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-accent-brand/60 blur-xl opacity-60" />
            <div className="relative w-9 h-9 rounded-2xl bg-black/70 border border-white/15 flex items-center justify-center overflow-hidden">
              <Image
                src="/synaura_symbol.svg"
                alt="Synaura"
                width={24}
                height={24}
                className="w-5 h-5"
              />
            </div>
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-white">
                  Synaura
                </span>
                {onStudio && (
                  <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-accent-brand/15 border border-accent-brand/60 text-[10px] uppercase tracking-[0.18em] text-accent-brand">
                    <Sparkles className="w-3 h-3" />
                    Studio
                  </span>
                )}
              </div>
              <span className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                {onStudio ? 'AI Music Studio' : 'Plateforme musicale'}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="px-2 pb-2 pt-1 space-y-1 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {nav.map((item) => {
            const active = isActive(item.href);
            const isPartner = (item as any).isPartner;
            const isNew = (() => {
              const raw = (item as any).isNew;
              if (!raw) return false;
              try {
                const version =
                  (process.env.NEXT_PUBLIC_WHATSNEW_VERSION as string) || 'v1';
                const ts = Number(
                  window.localStorage.getItem(`whatsnew.${version}.date`) || 0,
                );
                if (!ts) return true;
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                return Date.now() - ts < sevenDays;
              } catch {
                return true;
              }
            })();

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href, { scroll: false })}
                className={`w-full text-left group flex items-center ${
                  isSidebarOpen ? 'justify-between' : 'justify-center'
                } gap-3 px-3 py-2.5 rounded-2xl border transition-all duration-200 ${
                  active
                    ? isPartner
                      ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/10 border-cyan-400/70 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.55)]'
                      : 'bg-gradient-to-r from-violet-500/35 via-fuchsia-500/20 to-transparent border-violet-400/80 text-white shadow-[0_0_30px_rgba(139,92,246,0.7)]'
                    : 'border-white/10 bg-white/0 hover:bg-white/5 text-white/55 hover:text-white'
                }`}
                title={`${item.label} — ${item.desc}`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarOpen ? 'gap-3' : ''
                  }`}
                >
                  <item.icon
                    className={`${
                      isSidebarOpen ? 'w-5 h-5' : 'w-6 h-6'
                    } opacity-90`}
                  />
                  {isSidebarOpen && (
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-4">
                        {item.label}
                      </span>
                      <span className="text-xs text-white/45 leading-3">
                        {item.desc}
                      </span>
                    </div>
                  )}
                </div>
                {isSidebarOpen && isNew && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 h-5 text-[10px] rounded-full bg-gradient-to-r from-emerald-400/20 to-emerald-500/40 text-emerald-100 border border-emerald-300/60 shadow-[0_0_14px_rgba(52,211,153,0.6)]">
                    Nouveau
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-white/5">
          {isSidebarOpen ? (
            <>
              <button
                onClick={() => router.push('/upload', { scroll: false })}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_0_28px_rgba(129,140,248,0.8)] hover:scale-[1.02] active:scale-100 transition-transform"
                title="Uploader — Partager votre musique"
              >
                <Plus className="w-4 h-4" /> Uploader
              </button>

              <button
                onClick={() =>
                  router.push('/settings', { scroll: false })
                }
                className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm ${
                  pathname.startsWith('/settings')
                    ? 'bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 border-violet-400/70 text-white'
                    : 'border-white/10 bg-white/0 hover:bg-white/5 text-white/70 hover:text-white'
                }`}
                title="Paramètres"
              >
                <Settings className="w-4 h-4" /> Paramètres
              </button>

              <button
                onClick={() =>
                  router.push(
                    (session?.user as any)?.username
                      ? `/profile/${(session?.user as any).username}`
                      : '/auth/signin',
                    { scroll: false },
                  )
                }
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/0 hover:bg-white/5 text-white/80 hover:text-white text-sm"
                title="Profil"
              >
                <img
                  src={getSafeAvatar()}
                  alt="Profile"
                  className="w-5 h-5 rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      '/default-avatar.png';
                  }}
                />
                {session?.user?.name ||
                  (session?.user as any)?.username ||
                  'Profil'}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => router.push('/upload', { scroll: false })}
                className="w-12 h-12 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-white shadow-[0_0_22px_rgba(129,140,248,0.9)] hover:scale-105 active:scale-95 transition-transform"
                title="Uploader"
              >
                <Plus className="w-5 h-5" />
              </button>

              <button
                onClick={() =>
                  router.push('/settings', { scroll: false })
                }
                className={`w-12 h-12 inline-flex items-center justify-center rounded-2xl border text-white/80 ${
                  pathname.startsWith('/settings')
                    ? 'bg-gradient-to-r from-violet-500/25 to-fuchsia-500/20 border-violet-400/70'
                    : 'border-white/10 bg-white/0 hover:bg-white/5'
                }`}
                title="Paramètres"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={() =>
                  router.push(
                    (session?.user as any)?.username
                      ? `/profile/${(session?.user as any).username}`
                      : '/auth/signin',
                    { scroll: false },
                  )
                }
                className="w-12 h-12 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/0 hover:bg-white/5"
                title="Profil"
              >
                <img
                  src={getSafeAvatar()}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      '/default-avatar.png';
                  }}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Crédit Partenaire */}
      {isSidebarOpen && (
        <div className="mt-3 px-1.5">
          <div className="rounded-2xl px-3 py-2.5 flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-lg">
            <img
              src="/channels4_profile%20(2).jpg"
              alt="CIEUX INSTABLES"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                Partenaire
              </span>
              <span className="text-sm font-semibold text-white">
                CIEUX INSTABLES
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
