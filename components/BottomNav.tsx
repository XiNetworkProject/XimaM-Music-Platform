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
  UserPlus,
  Users
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Navigation principale - 4 éléments essentiels
  const mainNavItems = [
    {
      icon: Home,
      label: 'Accueil',
      path: '/',
      active: pathname === '/',
      public: true
    },
    {
      icon: Compass,
      label: 'Découvrir',
      path: '/discover',
      active: pathname === '/discover',
      public: true
    },
    {
      icon: BookOpen,
      label: 'Bibliothèque',
      path: '/library',
      active: pathname === '/library',
      public: false
    },
    {
      icon: Users,
      label: 'Communauté',
      path: '/community',
      active: pathname.startsWith('/community'),
      public: true
    }
  ];

  // Navigation secondaire - dans le menu plus
  const secondaryNavItems = [
    {
      icon: TrendingUp,
      label: 'Stats',
      path: '/stats',
      active: pathname === '/stats',
      public: false
    },
    {
      icon: Sparkles,
      label: 'Boosters',
      path: '/boosters',
      active: pathname === '/boosters',
      public: false
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      path: '/messages',
      active: pathname.startsWith('/messages'),
      public: false,
      badge: notifications.length
    },
    {
      icon: Settings,
      label: 'Paramètres',
      path: '/settings',
      active: pathname === '/settings',
      public: false
    }
  ];

  const handleProfileClick = () => {
    if (session?.user?.username) {
      router.push(`/profile/${session.user.username}`, { scroll: false });
    } else {
      router.push('/auth/signin', { scroll: false });
    }
  };

  const handleNavClick = (path: string, isPublic: boolean) => {
    // Si c'est une page privée et que l'utilisateur n'est pas connecté, rediriger vers la connexion
    if (!isPublic && !session) {
      router.push('/auth/signin', { scroll: false });
      return;
    }
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
        <div className="panel-suno bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)]">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              {/* Navigation principale - 4 éléments essentiels */}
              <div className="flex items-center justify-center flex-1 gap-2">
                {mainNavItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path, item.public)}
                    className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-200 ${
                      item.active 
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/40' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                    } ${!item.public && !session ? 'opacity-50' : ''}`}
                    disabled={!item.public && !session}
                  >
                    <item.icon size={20} />
                    <span className="text-[10px] mt-1 font-medium leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Actions rapides - Plus, Upload, Profil */}
              <div className="flex items-center gap-2 ml-3">
                {/* Menu Plus */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      showMoreMenu
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                    aria-label="Plus d'options"
                  >
                    <Plus size={20} className={showMoreMenu ? 'rotate-45' : ''} />
                  </button>

                  {/* Menu déroulant Plus */}
                  <AnimatePresence>
                    {showMoreMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-14 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-2 min-w-[160px]"
                      >
                        {secondaryNavItems.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              handleNavClick(item.path, item.public);
                              setShowMoreMenu(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                              item.active
                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300'
                                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                            } ${!item.public && !session ? 'opacity-50' : ''}`}
                            disabled={!item.public && !session}
                          >
                            <item.icon size={16} />
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.badge && item.badge > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Upload */}
                {session && (
                  <button
                    onClick={() => router.push('/upload', { scroll: false })}
                    className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl flex items-center justify-center text-white transition-all duration-200"
                    aria-label="Upload"
                  >
                    <Plus size={20} />
                  </button>
                )}

                {/* Profil */}
                <button
                  onClick={handleProfileClick}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                    pathname.startsWith('/profile') 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40' 
                      : 'border-[var(--border)] hover:bg-[var(--surface-2)]'
                  }`}
                  aria-label="Profil"
                >
                  {session ? (
                    <img
                      src={avatarUrl || (session?.user as any)?.avatar || (session?.user as any)?.image || (session?.user as any)?.picture || '/default-avatar.png'}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/default-avatar.png'; }}
                    />
                  ) : (
                    <UserPlus size={20} className="text-[var(--text-muted)]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay pour fermer le menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 lg:hidden"
            onClick={() => setShowMoreMenu(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
} 