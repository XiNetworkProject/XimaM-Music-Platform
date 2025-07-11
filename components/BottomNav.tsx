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
  Library, 
  MessageCircle
} from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

const navItems = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/discover', icon: Search, label: 'Découvrir' },
  { href: '/library', icon: Library, label: 'Bibliothèque' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile', icon: User, label: 'Profil' },
];

// Cache pour les pages visitées
const pageCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Navigation optimisée avec cache
  const handleNavigation = useCallback((path: string) => {
    // Vérifier si on est déjà sur cette page
    if (pathname === path) return;

    // Si c'est le profil, rediriger vers le profil de l'utilisateur connecté
    if (path === '/profile' && session?.user?.username) {
      router.push(`/profile/${session.user.username}`);
      return;
    }

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
  }, [router, pathname, session?.user?.username]);

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
        {/* Effet de glassmorphism avec gradient */}
        <div className="relative">
          {/* Fond avec effet de flou et gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent backdrop-blur-xl" />
      
          {/* Ligne de séparation avec effet lumineux */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          
          {/* Conteneur principal */}
          <div className="relative px-4 py-3">
            <div className="flex items-center justify-around max-w-md mx-auto">
              {navItems.map((item, index) => {
                const isActive = isItemActive(item.href);
            
            return (
              <motion.button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                    className="relative flex flex-col items-center space-y-1 px-3 py-2 rounded-2xl transition-all duration-200 group"
                    whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                    {/* Indicateur actif avec animation optimisée */}
                    <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                          key={`active-${item.href}-${pathname}`}
                          className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 25,
                            duration: 0.2
                          }}
                        />
                      )}
                    </AnimatePresence>
                    
                    {/* Effet de particules optimisé pour l'élément actif */}
                    <AnimatePresence>
                      {isActive && (
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={`${item.href}-particle-${i}-${pathname}`}
                              className="absolute w-1 h-1 bg-purple-400 rounded-full"
                              initial={{ x: 0, y: 0, opacity: 0 }}
                              animate={{
                                x: [0, Math.random() * 20 - 10],
                                y: [0, Math.random() * 20 - 10],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.3,
                                ease: "easeInOut"
                              }}
                              style={{
                                left: `${20 + i * 20}%`,
                                top: '50%',
                              }}
                  />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                
                    {/* Icône avec animation optimisée */}
                    <motion.div 
                      className="relative z-10"
                      key={`${item.href}-icon-${pathname}`}
                      initial={isActive ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0 }}
                      animate={isActive ? { 
                        scale: [1, 1.1, 1],
                        rotate: [0, 2, -2, 0]
                      } : {
                        scale: 1,
                        rotate: 0
                      }}
                      transition={{ 
                        duration: 0.6, 
                        repeat: isActive ? Infinity : 0, 
                        repeatDelay: 2,
                        type: "spring",
                        stiffness: 300
                      }}
                    >
                  <item.icon 
                        size={22} 
                        className={`transition-all duration-200 ${
                          isActive 
                            ? 'text-purple-400 drop-shadow-lg' 
                            : 'text-white/60 group-hover:text-white/80'
                    }`} 
                  />
                      
                      {/* Effet de glow optimisé pour l'icône active */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            key={`${item.href}-glow-${pathname}`}
                            className="absolute inset-0 bg-purple-400 rounded-full blur-md opacity-30"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: 0.3 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1.5 }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                
                    {/* Label avec animation optimisée */}
                    <motion.span 
                      key={`${item.href}-label-${pathname}`}
                      className={`text-xs font-medium transition-all duration-200 relative z-10 ${
                        isActive 
                          ? 'text-purple-400 font-semibold' 
                          : 'text-white/60 group-hover:text-white/80'
                  }`}
                      initial={isActive ? { y: 0, scale: 1 } : { y: 0, scale: 1 }}
                      animate={isActive ? { 
                        y: [0, -1, 0],
                        scale: [1, 1.02, 1]
                      } : {
                        y: 0,
                        scale: 1
                      }}
                      transition={{ 
                        duration: 0.6, 
                        repeat: isActive ? Infinity : 0, 
                        repeatDelay: 2,
                        type: "spring",
                        stiffness: 300
                      }}
                >
                  {item.label}
                    </motion.span>
                    
                    {/* Effet de hover avec gradient */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
              </motion.button>
            );
          })}
        </div>
      </div>
          
          {/* Effet de bordure inférieure avec animation optimisée */}
          <div className="absolute bottom-0 left-0 right-0 h-px">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: 'linear' 
              }}
            />
          </div>
    </div>
      </motion.div>
    </>
  );
} 