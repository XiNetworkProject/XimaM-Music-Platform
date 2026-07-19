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
  AlertTriangle,
  LifeBuoy,
  Scale,
  Upload,
  LogOut,
  User,
  CreditCard,
  Music2,
  Link2,
  MessageCircle,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useSidebar } from '@/app/providers';
import { fetchCreditsBalance } from '@/lib/credits';
import { SYNAURA_SHUTDOWN_NOTICES_ENABLED } from '@/lib/synauraShutdown';
import { AnimatePresence, motion } from 'framer-motion';
import StarAcademyBanner from '@/components/StarAcademyBanner';

const NAV_ITEMS = [
  { href: '/', label: 'Pour toi', icon: Home },
  { href: '/discover', label: 'Découvrir', icon: Compass },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/library', label: 'Bibliothèque', icon: BookOpen },
  { href: '/publish', label: 'Publier', icon: Music2 },
  { href: '/community', label: 'Clubs', icon: Users },
  { href: '/stats', label: 'Stats', icon: TrendingUp },
  { href: '/boosters', label: 'Boosters', icon: Gift },
  { href: '/meteo', label: 'Météo', icon: Cloud },
];

const BOTTOM_ITEMS = [
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/partnerships', label: 'Partenariats', icon: Link2 },
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
  const [messagesUnread, setMessagesUnread] = useState(0);
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
    if (!session?.user?.id) {
      setMessagesUnread(0);
      return;
    }
    let active = true;
    const loadUnread = async () => {
      try {
        const response = await fetch('/api/messages/unread', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (active && response.ok) setMessagesUnread(Math.max(0, Number(payload?.total || 0)));
      } catch {}
    };
    void loadUnread();
    const timer = window.setInterval(loadUnread, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pathname, session?.user?.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname?.startsWith(href);
  const collapsed = !isSidebarOpen;
  const studioActive = isActive('/ai-generator') || isActive('/studio');
  const uploadActive = isActive('/upload');
  const username = (session?.user as any)?.username;

  const profileActions = [
    { icon: User, label: 'Mon profil', action: () => { if (username) router.push(`/profile/${username}`, { scroll: false }); } },
    { icon: Settings, label: 'Paramètres', action: () => router.push('/settings', { scroll: false }) },
    { icon: CreditCard, label: 'Abonnements', action: () => router.push('/subscriptions', { scroll: false }) },
  ];

  return (
    <aside
      className="group/sidebar fixed inset-y-0 left-0 hidden lg:flex lg:flex-col bg-syn-surface text-syn-textPrimary border-r border-syn-border overflow-hidden z-40 transition-all duration-200"
      data-collapsed={collapsed}
      data-show-content={isSidebarOpen}
      style={{ width: isSidebarOpen ? 220 : 72 } as CSSProperties}
    >
      {/* Toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute top-7 right-3 z-10 w-6 h-6 rounded-md flex items-center justify-center text-black/25 hover:text-black/70 hover:bg-black/[0.05] transition-all group-data-[collapsed=true]/sidebar:left-1/2 group-data-[collapsed=true]/sidebar:-translate-x-1/2 group-data-[collapsed=true]/sidebar:right-auto"
        aria-label="Toggle sidebar"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${!isSidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Logo */}
      <div className="flex h-[68px] items-center px-4 pt-4">
        <Link href="/" className="flex items-center gap-2.5 group-data-[collapsed=true]/sidebar:justify-center group/logo">
          <div className="relative shrink-0">
            <Image
              src="/brand/2026/synaura-symbol-2026.png"
              alt="Synaura"
              width={42}
              height={42}
              className="h-[42px] w-[42px] object-contain transition-transform duration-200 group-hover/logo:scale-110"
              unoptimized
            />
          </div>
          <span className="text-[20px] font-black tracking-tight text-syn-textPrimary group-data-[collapsed=true]/sidebar:hidden">
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
          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${profileMenuOpen ? 'bg-syn-surfaceMuted' : 'hover:bg-black/[0.035]'}`}
        >
          <img
            alt="profil"
            className="rounded-full h-8 w-8 shrink-0 object-cover ring-1 ring-black/[0.08]"
                      src={getSafeAvatar()}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
          />
          <div className="min-w-0 flex-1 text-left group-data-[collapsed=true]/sidebar:hidden">
            <p className="text-[13px] font-semibold text-syn-textPrimary truncate">
              {username || (session?.user as any)?.name || 'Invité'}
            </p>
            <p className="text-[11px] text-syn-textSecondary truncate">{creditsBalance} crédits</p>
                </div>
          <ChevronDown className={`w-3.5 h-3.5 text-syn-textSecondary shrink-0 transition-transform group-data-[collapsed=true]/sidebar:hidden ${profileMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {profileMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-syn-elevatedSurface border border-syn-border shadow-[0_16px_40px_rgba(17,17,17,0.14)] overflow-hidden"
            >
              {profileActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { item.action(); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-syn-textPrimary/80 hover:text-syn-textPrimary hover:bg-black/[0.04] transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                    {item.label}
                  </button>
                );
              })}
              <div className="h-px bg-syn-border" />
              <button
                type="button"
                onClick={() => { setProfileMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-syn-destructive/85 hover:text-syn-destructive hover:bg-syn-destructive/[0.06] transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                Déconnexion
          </button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

      {/* CTA : Studio + Uploader */}
      <div className="px-3 mb-3 space-y-1.5">
        <Link
          href="/ai-generator"
          className={`group/cta relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] ${
            studioActive
              ? 'bg-syn-accent/10 text-syn-accent ring-1 ring-syn-accent/25'
              : 'bg-black/[0.03] text-syn-textPrimary/75 hover:bg-syn-accent/[0.06] hover:text-syn-accent'
          } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
          title={collapsed ? 'Studio' : undefined}
        >
          <Sparkles className="w-[18px] h-[18px] shrink-0" />
          <span className="group-data-[collapsed=true]/sidebar:hidden truncate">Studio</span>
        </Link>

        <Link
          href="/upload"
          className={`group/cta relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] ${
            uploadActive
              ? 'bg-syn-accentGold/15 text-syn-accentGold ring-1 ring-syn-accentGold/30'
              : 'bg-black/[0.03] text-syn-textPrimary/75 hover:bg-syn-accentGold/10 hover:text-syn-accentGold'
          } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
          title={collapsed ? 'Uploader' : undefined}
        >
          <Upload className="w-[18px] h-[18px] shrink-0" />
          <span className="group-data-[collapsed=true]/sidebar:hidden truncate">Uploader</span>
        </Link>

        {SYNAURA_SHUTDOWN_NOTICES_ENABLED ? (
          <Link
            href="/fermeture"
            className="group/ferm relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all active:scale-[0.97] bg-syn-destructive/10 text-syn-destructive ring-1 ring-syn-destructive/25 hover:ring-syn-destructive/40 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0"
            title={collapsed ? 'Fermeture' : undefined}
          >
            <AlertTriangle className="w-[18px] h-[18px] shrink-0" />
            <span className="group-data-[collapsed=true]/sidebar:hidden truncate">Fermeture Synaura</span>
          </Link>
        ) : null}

        {!collapsed && <StarAcademyBanner variant="mini" />}
      </div>

      {/* Separator */}
      <div className="h-px bg-syn-border mx-3" />

      {/* Nav */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] font-medium transition-all active:scale-[0.98] ${
                active
                  ? 'bg-syn-accent/10 text-syn-accent font-semibold'
                  : 'text-syn-textPrimary/55 hover:text-syn-textPrimary hover:bg-black/[0.035]'
              } group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.6} />
              <span className="group-data-[collapsed=true]/sidebar:hidden truncate">{item.label}</span>
              {item.href === '/messages' && messagesUnread > 0 ? (
                <span className="ml-auto min-w-5 rounded-full bg-syn-accent px-1.5 py-0.5 text-center text-[9px] font-black text-white group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:right-0 group-data-[collapsed=true]/sidebar:top-0">
                  {messagesUnread > 99 ? '99+' : messagesUnread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className="shrink-0 border-t border-syn-border px-3 py-2.5 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
          <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                active ? 'text-syn-textPrimary/70' : 'text-syn-textPrimary/35 hover:text-syn-textPrimary/60'
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
