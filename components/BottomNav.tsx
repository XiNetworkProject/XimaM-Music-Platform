'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
    path: '/settings',
  },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/80 to-transparent h-8" />
      
      {/* Navigation bar */}
      <div className="relative glass-effect border-t border-white/10">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className="flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-colors relative"
                whileTap={{ scale: 0.95 }}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary-500/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Icon */}
                <div className="relative z-10">
                  <item.icon 
                    size={20} 
                    className={`transition-colors ${
                      isActive ? 'text-primary-400' : 'text-white/60'
                    }`} 
                  />
                </div>
                
                {/* Label */}
                <span 
                  className={`text-xs font-medium transition-colors relative z-10 ${
                    isActive ? 'text-primary-400' : 'text-white/60'
                  }`}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
} 