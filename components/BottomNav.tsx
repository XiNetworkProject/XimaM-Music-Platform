'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  Library, 
  User, 
  MessageCircle, 
  Settings,
  Bell,
  Plus
} from 'lucide-react';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { notifications } = useMessageNotifications();
  // Calculer le nombre de notifications pertinentes (messages ou demandes non lues)
  const unreadCount = notifications.filter(n => n.type === 'new_message' || n.type === 'new_request').length;

  const navItems = [
    {
      icon: Home,
      label: 'Accueil',
      path: '/',
      active: pathname === '/'
    },
    {
      icon: Search,
      label: 'Découvrir',
      path: '/discover',
      active: pathname === '/discover'
    },
    {
      icon: Library,
      label: 'Bibliothèque',
      path: '/library',
      active: pathname === '/library'
    },
    {
      icon: MessageCircle,
      label: 'Messages',
      path: '/messages',
      active: pathname.startsWith('/messages'),
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      icon: Settings,
      label: 'Paramètres',
      path: '/settings',
      active: pathname === '/settings'
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
      {/* Notifications Popup */}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-lg border-t border-white/10">
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item) => (
            <motion.button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all relative ${
                item.active 
                  ? 'text-purple-400 bg-purple-500/20' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <item.icon size={20} />
                {item.badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </motion.div>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </motion.button>
          ))}

          {/* Bouton Profil */}
          <motion.button
            onClick={handleProfileClick}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
              pathname.startsWith('/profile') 
                ? 'text-purple-400 bg-purple-500/20' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <User size={20} />
            )}
            <span className="text-xs mt-1">Profil</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
} 