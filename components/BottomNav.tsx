'use client';

import { useState } from 'react';
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
      router.push(`/profile/${session.user.username}`);
    } else {
      router.push('/auth/signin');
    }
  };

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  return (
    <>
      {/* Bottom Navigation - Design futuriste */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        {/* Effet de fond avec blur et gradient */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl border-t border-white/20">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        </div>

        {/* Contenu de la navigation */}
        <div className="relative px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between">
            
            {/* Section supérieure - Bouton lecteur et upload (visible sur mobile) */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              {/* Bouton lecteur principal */}
              {!audioState.showPlayer && (
                <motion.button
                  onClick={() => setShowPlayer(true)}
                  className="group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl sm:rounded-2xl text-white font-medium shadow-lg hover:shadow-purple-500/40 transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl sm:rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                  <Music size={16} className="relative sm:w-20 sm:h-20" />
                  <span className="relative text-xs sm:text-sm font-semibold">Lecteur</span>
                </motion.button>
              )}

              {/* Bouton upload rapide */}
              <motion.button
                onClick={() => router.push('/upload')}
                className="group relative w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/20 transition-all duration-300 border border-white/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Partager ma musique"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus size={16} className="relative text-green-400 sm:w-20 sm:h-20" />
              </motion.button>
            </div>

            {/* Section centrale - Navigation principale (simplifiée pour mobile) */}
            <div className="flex items-center gap-1 w-full sm:w-auto justify-center">
              {navItems.map((item) => (
                <motion.div
                  key={item.path}
                  className="relative"
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <motion.button
                    onClick={() => handleNavClick(item.path)}
                    className={`group relative flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                      item.active 
                        ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 border border-purple-500/50' 
                        : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20'
                    }`}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Effet de lueur au hover */}
                    {item.active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl sm:rounded-2xl blur-xl"></div>
                    )}
                    
                    <div className="relative flex flex-col items-center">
                      <div className="relative">
                        <item.icon size={18} className="sm:w-22 sm:h-22" />
                      </div>
                      <span className="text-xs mt-1 font-medium">{item.label}</span>
                    </div>
                  </motion.button>

                  {/* Tooltip au hover (seulement sur desktop) */}
                  <AnimatePresence>
                    {hoveredItem === item.path && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 hidden sm:block"
                      >
                        <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-2xl">
                          <p className="text-white text-sm font-medium whitespace-nowrap">{item.description}</p>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Section inférieure - Profil et paramètres (visible sur mobile) */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
              {/* Bouton paramètres */}
              <motion.button
                onClick={() => router.push('/settings')}
                className={`group relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                  pathname.startsWith('/settings') 
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50' 
                    : 'bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Paramètres"
              >
                {pathname.startsWith('/settings') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Settings size={16} className="relative text-blue-400 sm:w-20 sm:h-20" />
              </motion.button>

              {/* Bouton profil */}
              <motion.button
                onClick={handleProfileClick}
                className={`group relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                  pathname.startsWith('/profile') 
                    ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50' 
                    : 'bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Profil"
              >
                {pathname.startsWith('/profile') && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl"></div>
                )}
                
                <div className="relative">
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-white/30"
                    />
                  ) : (
                    <UserPlus size={16} className="text-white sm:w-20 sm:h-20" />
                  )}
                </div>
              </motion.button>
            </div>
          </div>

          {/* Espace réservé pour éventuelles fonctionnalités futures */}
        </div>
      </nav>
    </>
  );
} 