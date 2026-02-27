'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  Home, 
  Search, 
  Library, 
  Settings,
  Plus,
  Music,
  Sparkles,
  Heart,
  TrendingUp,
  Compass,
  BookOpen,
  Users,
  MoreHorizontal,
  Cloud,
  LifeBuoy,
  Scale
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Navigation principale - max 5 boutons (Accueil, Découvrir, Upload, Bibliothèque, Plus)
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
    }
  ];

  // Répartition dynamique pour avoir l'upload centré
  const splitIndex = Math.ceil(mainNavItems.length / 2);
  const leftNavItems = mainNavItems.slice(0, splitIndex);
  const rightNavItems = mainNavItems.slice(splitIndex);

  // Types nav items (badge optionnel)
  type BottomNavItem = {
    icon: any;
    label: string;
    path: string;
    active: boolean;
    public: boolean;
    badge?: number;
  };

  // Navigation secondaire - dans le menu plus
  const secondaryNavItems: BottomNavItem[] = [
    {
      icon: TrendingUp,
      label: 'Stats',
      path: '/stats',
      active: pathname === '/stats',
      public: false
    },
    {
      icon: Settings,
      label: 'Abonnements',
      path: '/subscriptions',
      active: pathname === '/subscriptions',
      public: true
    },
    {
      icon: Cloud,
      label: 'Météo',
      path: '/meteo',
      active: pathname === '/meteo',
      public: true
    },
    {
      icon: Sparkles,
      label: 'Boosters',
      path: '/boosters',
      active: pathname === '/boosters',
      public: false
    },
    {
      icon: Users,
      label: 'Communauté',
      path: '/community',
      active: pathname.startsWith('/community'),
      public: true
    },
    {
      icon: Settings,
      label: 'Paramètres',
      path: '/settings',
      active: pathname === '/settings',
      public: false
    },
    {
      icon: LifeBuoy,
      label: 'Support',
      path: '/support',
      active: pathname === '/support',
      public: true
    },
    {
      icon: Scale,
      label: 'Légal',
      path: '/legal',
      active: pathname.startsWith('/legal'),
      public: true
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
      {/* Bottom Navigation - Design Suno épuré */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {/* Crédit partenaire discret */}
        <div className="px-3 pb-1">
          <div className="mx-auto max-w-md">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-md px-2.5 py-1 text-[11px] text-white/80">
              <img src="/channels4_profile%20(2).jpg" alt="CIEUX INSTABLES" className="w-4 h-4 rounded-full object-cover" />
              <span className="uppercase tracking-wide text-[var(--text-muted)]">Partenaire</span>
              <span className="font-semibold">CIEUX INSTABLES</span>
            </div>
          </div>
        </div>
        <div className="bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)]">
          <div className="@container flex w-full flex-row items-center justify-between gap-0 px-2 py-2.5">
            {/* Groupe gauche */}
            <div className="flex flex-1 items-center justify-evenly">
              {leftNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path, item.public)}
                  className={`rounded-full py-2 px-3 text-center transition-all duration-200 ${
                    item.active 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300' 
                      : 'bg-transparent text-white/70 hover:text-white/90'
                  } ${!item.public && !session ? 'opacity-50' : ''}`}
                  disabled={!item.public && !session}
                  aria-label={item.label}
                >
                  <item.icon className="w-6 h-6" />
                </button>
              ))}
            </div>

            {/* Upload centré */}
            {session && (
              <button
                onClick={() => router.push('/upload', { scroll: false })}
                className="rounded-full py-2 px-3 text-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg transition-all duration-200"
                aria-label="Upload"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}

            {/* Groupe droit */}
            <div className="flex flex-1 items-center justify-evenly">
              {rightNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path, item.public)}
                  className={`rounded-full py-2 px-3 text-center transition-all duration-200 ${
                    item.active 
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300' 
                      : 'bg-transparent text-white/70 hover:text-white/90'
                  } ${!item.public && !session ? 'opacity-50' : ''}`}
                  disabled={!item.public && !session}
                  aria-label={item.label}
                >
                  <item.icon className="w-6 h-6" />
                </button>
              ))}
              {/* Menu Plus (intégré au groupe droit pour espacement égal) */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`rounded-full py-2 px-3 text-center transition-all duration-200 ${
                  showMoreMenu ? 'bg-purple-500/20 text-purple-300' : 'bg-transparent text-white/70 hover:text-white/90'
                }`}
                aria-label="Plus d'options"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>

        {/* Tiroir secondaire rendu via Portal (au-dessus de tout) */}
      </nav>

      {/* Overlay + Drawer (Portal) */}
      {isClient && createPortal(
        (
          <AnimatePresence>
            {showMoreMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[2147483646] lg:hidden bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowMoreMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  className="fixed inset-x-0 bottom-0 z-[2147483647]"
                >
                  <div className="bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] rounded-t-2xl p-4">
                    <div className="mx-auto max-w-md">
                      <div className="h-1.5 w-12 rounded-full bg-white/15 mx-auto mb-4" />
                      {/* Studio IA en avant — accès rapide sans prendre une place dans la barre */}
                      <button
                        onClick={() => {
                          router.push('/ai-generator', { scroll: false });
                          setShowMoreMenu(false);
                        }}
                        className={`w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 mb-4 transition-all ${
                          pathname?.startsWith('/ai-generator')
                            ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 ring-1 ring-purple-500/50'
                            : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-white ring-1 ring-white/10'
                        }`}
                      >
                        <Sparkles className="w-5 h-5 shrink-0" />
                        <span className="font-semibold text-sm">Studio IA</span>
                      </button>
                      <div className="grid grid-cols-3 gap-3">
                        {secondaryNavItems.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              handleNavClick(item.path, item.public);
                              setShowMoreMenu(false);
                            }}
                            className={`flex flex-col items-center justify-center rounded-xl px-3 py-4 transition-all duration-200 ${
                              item.active 
                                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 ring-1 ring-purple-500/40' 
                                : 'bg-white/5 text-white/90 ring-1 ring-[var(--border)] hover:bg-white/10'
                            } ${!item.public && !session ? 'opacity-50' : ''}`}
                            disabled={!item.public && !session}
                          >
                            <item.icon size={20} />
                            <span className="text-xs mt-2 font-medium text-center">{item.label}</span>
                            {item.badge && item.badge > 0 && (
                              <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowMoreMenu(false)}
                        className="w-full mt-4 py-2 rounded-lg text-sm font-medium bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 transition-colors"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        ),
        document.body
      )}
    </>
  );
} 