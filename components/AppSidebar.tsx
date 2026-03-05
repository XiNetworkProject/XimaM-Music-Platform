'use client';

import type { CSSProperties } from 'react';
import { useRef, useEffect, useState } from 'react';
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
  ChevronDown,
  ChevronLeft,
  LifeBuoy,
  Scale,
  Upload,
  LogOut,
  User,
  CreditCard,
  Music2,
  Handshake,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useSidebar } from '@/app/providers';
import { fetchCreditsBalance } from '@/lib/credits';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/discover', label: 'Découvrir', icon: Compass },
  { href: '/library', label: 'Bibliothèque', icon: BookOpen },
  { href: '/publish', label: 'Publier', icon: Music2 },
  { href: '/community', label: 'Communauté', icon: Users },
  { href: '/stats', label: 'Stats', icon: TrendingUp },
  { href: '/boosters', label: 'Boosters', icon: Gift },
  { href: '/meteo', label: 'Météo', icon: Cloud },
];

const BOTTOM_ITEMS = [
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/partnerships', label: 'Partenariats', icon: Handshake },
  { href: '/legal', label: 'Légal', icon: Scale },
];

export default function AppSidebar() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const getSafeAvatar = () => {
    const c = avatarUrl || (session?.user as any)?.avatar || (session?.user as any)?.image || (session?.user as any)?.picture;
    if (!c || c === '' || c === 'null' || c === 'undefined') return '/default-avatar.png';
    return c as string;
  };

  useEffect(() => {
    (async () => {
      try {
        const username = (session?.user as any)?.username;
        if (!username) return;
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (!res.ok) return;
        const data = await res.json();
        const c = data?.user?.avatar || data?.user?.image || data?.avatar || data?.image;
        if (c && typeof c === 'string') setAvatarUrl(c);
      } catch {}
    })();
  }, [session?.user]);

  useEffect(() => {
    (async () => {
      if (!session?.user?.id) return;
      const res = await fetchCreditsBalance();
      if (res && typeof res.balance === 'number') setCreditsBalance(res.balance);
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname?.startsWith(href);
  const collapsed = !isSidebarOpen;
  const studioActive = isActive('/ai-generator');
  const uploadActive = isActive('/upload');
  const username = (session?.user as any)?.username;

  const profileActions = [
    { icon: User, label: 'Mon profil', action: () => { if (username) router.push(`/profile/${username}`, { scroll: false }); } },
    { icon: Settings, label: 'Paramètres', action: () => router.push('/settings', { scroll: false }) },
    { icon: CreditCard, label: 'Abonnements', action: () => router.push('/subscriptions', { scroll: false }) },
  ];

  return (
    <aside
      className="group/sidebar fixed inset-y-0 left-0 hidden lg:flex lg:flex-col bg-[#0a0a0e] text-white border-r border-white/[0.06] overflow-hidden z-40 transition-all duration-200"
      data-collapsed={collapsed}
      data-show-content={isSidebarOpen}
      style={{ width: isSidebarOpen ? 220 : 72 } as CSSProperties}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute top-7 right-3 z-10 w-6 h-6 rounded-md flex items-center justify-center text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all group-data-[collapsed=true]/sidebar:left-1/2 group-data-[collapsed=true]/sidebar:-translate-x-1/2 group-data-[collapsed=true]/sidebar:right-auto"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Logo */}
      <div className="flex h-[68px] items-center px-4 pt-4">
        <Link href="/" className="flex items-center gap-2.5 group-data-[collapsed=true]/sidebar:justify-center group/logo">
          <div className="relative shrink-0">
            <Image
              src="/synaura_symbol.svg"
              alt="Synaura"
              width={30}
              height={30}
              className="h-[30px] w-[30px] object-contain transition-transform duration-200 group-hover/logo:scale-110"
            />
            <div className="absolute -inset-1.5 rounded-xl bg-indigo-500/20 blur-lg opacity-0 group-hover/logo:opacity-100 transition-opacity -z-10" />
          </div>
          <span className="text-[20px] font-black tracking-tight text-white group-data-[collapsed=true]/sidebar:hidden">
            Synaura
          </span>
        </Link>
      </div>

      {/* Profile with dropdown */}
      <div className="px-3 mb-2 relative" ref={profileMenuRef}>
        <button
          type="button"
          onClick={() => {
            if (!session) { router.push('/auth/signin', { scroll: false }); return; }
            if (collapsed) { if (username) router.push(`/profile/${username}`, { scroll: false }); return; }
            setProfileMenuOpen(v => !v);
          }}
          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${profileMenuOpen ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}`}
        >
          <img
            alt="profil"
            className="rounded-full h-8 w-8 shrink-0 object-cover ring-1 ring-white/10"
            src={getSafeAvatar()}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
          />
          <div className="min-w-0 flex-1 text-left group-data-[collapsed=true]/sidebar:hidden">
            <p className="text-[13px] font-semibold text-white/90 truncate">
              {username || (session?.user as any)?.name || 'Invité'}
            </p>
            <p className="text-[11px] text-white/30 truncate">{creditsBalance} crédits</p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform group-data-[collapsed=true]/sidebar:hidden ${profileMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {profileMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-neutral-900 border border-white/[0.08] shadow-xl overflow-hidden"
            >
              {profileActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { item.action(); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                    {item.label}
                  </button>
                );
              })}
              <div className="h-px bg-white/[0.06]" />
              <button
                type="button"
                onClick={() => { setProfileMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                Déconnexion
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA : Studio IA + Uploader */}
      <div className="px-3 mb-3 space-y-1.5">
        <Link
          href="/ai-generator"
          className={`group/cta relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] overflow-hidden ${
            studioActive
              ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
              : 'bg-white/[0.04] text-white/80 hover:bg-indigo-500/10 hover:text-indigo-300'
          } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
          title={collapsed ? 'Studio IA' : undefined}
        >
          <div className={`absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-violet-600/10 opacity-0 transition-opacity ${studioActive ? 'opacity-100' : 'group-hover/cta:opacity-100'}`} />
          <Sparkles className="w-[18px] h-[18px] shrink-0 relative z-[1]" />
          <span className="group-data-[collapsed=true]/sidebar:hidden truncate relative z-[1]">Studio IA</span>
        </Link>

        <Link
          href="/upload"
          className={`group/cta relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] overflow-hidden ${
            uploadActive
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
              : 'bg-white/[0.04] text-white/80 hover:bg-emerald-500/10 hover:text-emerald-300'
          } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
          title={collapsed ? 'Uploader' : undefined}
        >
          <div className={`absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 opacity-0 transition-opacity ${uploadActive ? 'opacity-100' : 'group-hover/cta:opacity-100'}`} />
          <Upload className="w-[18px] h-[18px] shrink-0 relative z-[1]" />
          <span className="group-data-[collapsed=true]/sidebar:hidden truncate relative z-[1]">Uploader</span>
        </Link>
      </div>

      {/* Separator */}
      <div className="h-px bg-white/[0.06] mx-3" />

      {/* Nav */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium transition-all active:scale-[0.98] ${
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
              } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.6} />
              <span className="group-data-[collapsed=true]/sidebar:hidden truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-white/[0.06] px-3 py-2.5 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                active ? 'text-white/70' : 'text-white/25 hover:text-white/50'
              } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="group-data-[collapsed=true]/sidebar:hidden truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
