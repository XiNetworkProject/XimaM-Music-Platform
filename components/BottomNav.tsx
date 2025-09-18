'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Search, 
  Library, 
  User, 
  MessageCircle, 
  Settings,
  Plus,
  Music,
  Sparkles,
  Heart,
  TrendingUp,
  Compass,
  BookOpen,
  UserPlus
} from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { useAudioPlayer } from '@/app/providers';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { notifications } = useMessageNotifications();
  const { audioState, setShowPlayer } = useAudioPlayer();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems = [
    {
      icon: Home,
      label: 'Accueil',
      path: '/',
      active: pathname === '/',
      color: 'from-purple-500 to-pink-500',
      description: 'Découvrez les nouveautés'
    },
    {
      icon: Compass,
      label: 'Découvrir',
      path: '/discover',
      active: pathname === '/discover',
      color: 'from-green-500 to-emerald-500',
      description: 'Explorez la musique'
    },
    {
      icon: BookOpen,
      label: 'Bibliothèque',
      path: '/library',
      active: pathname === '/library',
      color: 'from-blue-500 to-cyan-500',
      description: 'Vos favoris'
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      path: '/messages',
      active: pathname.startsWith('/messages'),
      color: 'from-orange-500 to-red-500',
      description: 'Communiquez'
    }
  ];

  const handleProfileClick = () => {
    if (session?.user?.username) {
      router.push(`/profile/${session.user.username}`, { scroll: false });
    } else {
      router.push('/auth/signin', { scroll: false });
    }
  };

  const handleNavClick = (path: string) => {
    // Navigation immédiate sans blocage ni transition
    router.push(path, { scroll: false });
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

  return (
    <>
      {/* Bottom Navigation - Mobile optimisé */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="panel-suno bg-[var(--surface)]/90 backdrop-blur-xl border-t border-[var(--border)]">
          <div className="px-2 py-2">
            <div className="flex items-center justify-between">
              {/* Navigation principale - 4 icônes compactes */}
              <div className="flex items-center justify-center flex-1 gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-all ${
                      item.active 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/40' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Actions rapides - Upload, Profil */}
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => router.push('/upload', { scroll: false })}
                  className="w-10 h-10 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg flex items-center justify-center text-white"
                  aria-label="Upload"
                >
                  <Plus size={16} />
                </button>
                
                <button
                  onClick={handleProfileClick}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                    pathname.startsWith('/profile') 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40' 
                      : 'border-[var(--border)] hover:bg-[var(--surface-2)]'
                  }`}
                  aria-label="Profil"
                >
                  <img
                    src={avatarUrl || (session?.user as any)?.avatar || (session?.user as any)?.image || (session?.user as any)?.picture || '/default-avatar.png'}
                    alt="Profile"
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
} 