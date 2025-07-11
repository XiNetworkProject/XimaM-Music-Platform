'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Search, 
  Music, 
  Users, 
  User,
  Settings,
  Heart,
  Radio
} from 'lucide-react';
import { useCallback, useMemo } from 'react';

const navItems = [
  {
    id: 'home',
    label: 'Accueil',
    icon: Home,
    path: '/',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'discover',
    label: 'Découvrir',
    icon: Search,
    path: '/discover',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'library',
    label: 'Bibliothèque',
    icon: Music,
    path: '/library',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'community',
    label: 'Communauté',
    icon: Users,
    path: '/community',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: User,
    path: '/settings',
    color: 'from-indigo-500 to-purple-500'
  },
];

// Cache pour les pages visitées
const pageCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  // Navigation optimisée avec cache
  const handleNavigation = useCallback((path: string) => {
    // Vérifier si on est déjà sur cette page
    if (pathname === path) return;

    // Précharger la page si elle n'est pas en cache
    if (!pageCache.has(path)) {
      // Préchargement intelligent
      const prefetchPage = async () => {
        try {
          const response = await fetch(path, {
            method: 'HEAD', // Juste vérifier que la page existe
          });
          if (response.ok) {
            pageCache.set(path, {
              timestamp: Date.now(),
              data: { exists: true }
            });
          }
        } catch (error) {
          // Erreur silencieuse
        }
      };
      prefetchPage();
    }

    // Navigation fluide avec transition
    router.push(path, { scroll: false });
  }, [router, pathname]);

  // Fonction optimisée pour déterminer si un élément est actif
  const isItemActive = useCallback((itemPath: string) => {
    if (itemPath === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(itemPath);
  }, [pathname]);

  // Nettoyer le cache périodiquement
  useMemo(() => {
    const now = Date.now();
    const entries = Array.from(pageCache.entries());
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        pageCache.delete(key);
      }
    });
  }, [pathname]);

  return (
    <>
      {/* Espace réservé pour éviter le chevauchement */}
      <div className="h-24 md:h-20" />
      
      {/* Barre de navigation moderne et optimisée */}
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-50"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Effet de glassmorphism avec gradient amélioré */}
        <div className="relative">
          {/* Fond avec effet de flou et gradient moderne */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-2xl" />
      
          {/* Ligne de séparation avec effet lumineux animé */}
          <div className="absolute top-0 left-0 right-0 h-px">
            <div className="h-full bg-gradient-to-r from-transparent via-purple-500/60 to-transparent animate-pulse" />
          </div>
          
          {/* Conteneur principal */}
          <div className="relative px-4 py-4">
            <div className="flex items-center justify-around max-w-md mx-auto">
              {navItems.map((item, index) => {
                const isActive = isItemActive(item.path);
                const IconComponent = item.icon;
            
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className="relative flex flex-col items-center space-y-2 px-4 py-3 rounded-3xl transition-all duration-300 group"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.4 }}
                  >
                    {/* Indicateur actif avec animation améliorée */}
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.div
                          key={`active-${item.id}-${pathname}`}
                          className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-3xl border border-white/20 shadow-lg`}
                          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 25,
                            duration: 0.3
                          }}
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Effet de particules optimisé pour l'élément actif */}
                    <AnimatePresence>
                      {isActive && (
                        <div className="absolute inset-0 overflow-hidden rounded-3xl">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={`${item.id}-particle-${i}-${pathname}`}
                              className="absolute w-1 h-1 bg-white/60 rounded-full"
                              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                              animate={{
                                x: [0, Math.random() * 30 - 15],
                                y: [0, Math.random() * 30 - 15],
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0],
                              }}
                              transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                              }}
                              style={{
                                left: `${20 + i * 15}%`,
                                top: '50%',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                
                    {/* Icône avec animation améliorée */}
                    <motion.div 
                      className="relative z-10"
                      key={`${item.id}-icon-${pathname}`}
                      initial={isActive ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0 }}
                      animate={isActive ? { 
                        scale: [1, 1.15, 1],
                        rotate: [0, 5, -5, 0]
                      } : {
                        scale: 1,
                        rotate: 0
                      }}
                      transition={{
                        duration: 0.6,
                        ease: "easeInOut"
                      }}
                    >
                      <IconComponent 
                        size={24} 
                        className={`transition-all duration-300 ${
                          isActive 
                            ? 'text-white drop-shadow-lg' 
                            : 'text-gray-400 group-hover:text-white'
                        }`}
                      />
                    </motion.div>
                    
                    {/* Label avec animation */}
                    <motion.span 
                      className={`text-xs font-medium transition-all duration-300 ${
                        isActive 
                          ? 'text-white font-semibold' 
                          : 'text-gray-400 group-hover:text-white'
                      }`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                    
                    {/* Indicateur de notification (optionnel) */}
                    {item.id === 'community' && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
} 