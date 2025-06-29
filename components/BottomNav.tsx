'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Search, 
  Music, 
  Users, 
  User,
  Settings
} from 'lucide-react';

const navItems = [
  {
    id: 'home',
    label: 'Accueil',
    icon: Home,
    path: '/',
  },
  {
    id: 'discover',
    label: 'Découvrir',
    icon: Search,
    path: '/discover',
  },
  {
    id: 'library',
    label: 'Bibliothèque',
    icon: Music,
    path: '/library',
  },
  {
    id: 'community',
    label: 'Communauté',
    icon: Users,
    path: '/community',
  },
  {
    id: 'profile',
    label: 'Profil',
    icon: User,
    path: '/profile',
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // Fonction pour déterminer si un élément est actif
  const isItemActive = (itemPath: string) => {
    if (itemPath === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(itemPath);
  };

  return (
    <>
      {/* Espace réservé pour éviter le chevauchement */}
      <div className="h-24 md:h-20" />
      
      {/* Barre de navigation moderne */}
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
                const isActive = isItemActive(item.path);
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                    className="relative flex flex-col items-center space-y-1 px-3 py-2 rounded-2xl transition-all duration-200 group"
                    whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                    {/* Indicateur actif avec animation */}
                    <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                          key={`active-${item.id}-${pathname}`}
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
                    
                    {/* Effet de particules pour l'élément actif */}
                    <AnimatePresence>
                      {isActive && (
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={`${item.id}-particle-${i}-${pathname}`}
                              className="absolute w-1 h-1 bg-purple-400 rounded-full"
                              initial={{ x: 0, y: 0, opacity: 0 }}
                              animate={{
                                x: [0, Math.random() * 30 - 15],
                                y: [0, Math.random() * 30 - 15],
                                opacity: [0, 1, 0],
                              }}
                              transition={{
                                duration: 1.5,
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
                
                    {/* Icône avec animation */}
                    <motion.div 
                      className="relative z-10"
                      key={`${item.id}-icon-${pathname}`}
                      initial={isActive ? { scale: 1, rotate: 0 } : { scale: 1, rotate: 0 }}
                      animate={isActive ? { 
                        scale: [1, 1.1, 1],
                        rotate: [0, 3, -3, 0]
                      } : {
                        scale: 1,
                        rotate: 0
                      }}
                      transition={{ 
                        duration: 0.4, 
                        repeat: isActive ? Infinity : 0, 
                        repeatDelay: 1.5,
                        type: "spring",
                        stiffness: 400
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
                      
                      {/* Effet de glow pour l'icône active */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            key={`${item.id}-glow-${pathname}`}
                            className="absolute inset-0 bg-purple-400 rounded-full blur-md opacity-50"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [1, 1.3, 1], opacity: 0.5 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 1 }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                
                    {/* Label avec animation */}
                    <motion.span 
                      key={`${item.id}-label-${pathname}`}
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
                        duration: 0.4, 
                        repeat: isActive ? Infinity : 0, 
                        repeatDelay: 1.5,
                        type: "spring",
                        stiffness: 400
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
          
          {/* Effet de bordure inférieure avec animation */}
          <div className="absolute bottom-0 left-0 right-0 h-px">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
              }}
              transition={{ 
                duration: 3, 
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