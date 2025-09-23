
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, BookOpen, MessageCircle, Settings, Plus, Music, TrendingUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useEffect, useState } from 'react';

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { notifications } = useMessageNotifications();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const getSafeAvatar = () => {
    const candidate = avatarUrl || (session?.user as any)?.avatar || (session?.user as any)?.image || (session?.user as any)?.picture;
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
        const candidate = data?.user?.avatar || data?.user?.image || data?.avatar || data?.image;
        if (candidate && typeof candidate === 'string') {
          setAvatarUrl(candidate);
        }
      } catch {}
    };
    load();
  }, [session?.user]);

  const nav = [
    { icon: Home, label: 'Accueil', desc: 'Nouveautés', href: '/' },
    { icon: Compass, label: 'Découvrir', desc: 'Explorer', href: '/discover' },
    { icon: BookOpen, label: 'Bibliothèque', desc: 'Vos favoris', href: '/library' },
    { icon: MessageCircle, label: 'Messages', desc: 'Discuter', href: '/messages' },
    { icon: TrendingUp, label: 'Stats', desc: 'Vos statistiques', href: '/stats' },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 z-30 p-4">
      <div className="panel-suno border border-[var(--border)] rounded-2xl h-full flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Image src="/synaura_symbol.svg" alt="Synaura" width={28} height={28} />
          <div className="font-extrabold tracking-tight text-lg">Synaura</div>
        </div>

        <nav className="px-2 py-2 space-y-1 flex-1 overflow-y-auto">
          {nav.map(item => {
            const active = isActive(item.href);
            const isMessages = item.label === 'Messages';
            const unread = Array.isArray(notifications)
              ? notifications.filter((n: any) => !n.read || n.unread === true || n.status === 'unread').length
              : 0;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href, { scroll: false })}
                className={`w-full text-left group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  active
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40 text-[var(--text)]'
                    : 'border-[var(--border)] hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
                title={`${item.label} — ${item.desc}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-4">{item.label}</span>
                    <span className="text-xs text-[var(--text-muted)] leading-3">{item.desc}</span>
                  </div>
                </div>
                {isMessages && unread > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 h-5 text-[11px] rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-3 pt-1 space-y-2">
          <button
            onClick={() => router.push('/upload', { scroll: false })}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow"
            title="Uploader — Partager votre musique"
          >
            <Plus className="w-4 h-4" /> Uploader
          </button>

          <button
            onClick={() => router.push('/ai-generator', { scroll: false })}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-semibold btn-suno"
            title="IA — Générateur de musique"
          >
            <Music className="w-4 h-4" /> IA
          </button>

          <button
            onClick={() => router.push('/settings', { scroll: false })}
            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border ${
              pathname.startsWith('/settings')
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40'
                : 'border-[var(--border)] hover:bg-white/5'
            }`}
            title="Paramètres"
          >
            <Settings className="w-4 h-4" /> Paramètres
          </button>

          <button
            onClick={() => router.push(session?.user?.username ? `/profile/${session.user.username}` : '/auth/signin', { scroll: false })}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] hover:bg-white/5"
            title="Profil"
          >
            <img
              src={getSafeAvatar()}
              alt="Profile"
              className="w-5 h-5 rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
              }}
            />
            {session?.user?.name || session?.user?.username || 'Profil'}
          </button>
        </div>
      </div>
    </aside>
  );
}


