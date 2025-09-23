'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Moon, 
  Volume2, 
  Download, 
  Globe,
  HelpCircle,
  LogOut,
  ChevronRight,
  Upload,
  Music,
  Heart,
  CreditCard,
  BarChart3,
  Palette,
  Smartphone,
  Wifi,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SubscriptionLimits from '@/components/SubscriptionLimits';

interface SettingSection {
  id: string;
  title: string;
  icon: any;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'button' | 'link';
  value?: boolean | string;
  options?: string[];
  action?: () => void;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState({
    darkMode: true,
    notifications: true,
    autoPlay: false,
    highQuality: true,
    language: 'Français',
    privacy: 'Public'
  });

  // Affichage si non connecté
  if (user === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
          <Settings size={28} className="text-purple-400" /> Paramètres
        </h2>
        <p className="text-gray-300 mb-6 text-center">Vous devez être connecté pour accéder à vos paramètres.</p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow transition-all"
        >
          Se connecter
        </button>
      </div>
    );
  }

  const settingSections: SettingSection[] = [
    {
      id: 'account',
      title: 'Compte',
      icon: User,
      items: [
        {
          id: 'profile',
          label: 'Profil',
          description: '@' + user?.username,
          type: 'link',
          action: () => router.push(`/profile/${user?.username}`)
        },
        {
          id: 'subscriptions',
          label: 'Abonnement',
          description: 'Gérer votre plan',
          type: 'link',
          action: () => router.push('/subscriptions')
        }
      ]
    },
    {
      id: 'content',
      title: 'Contenu',
      icon: Music,
      items: [
        {
          id: 'upload',
          label: 'Upload',
          description: 'Partager vos créations',
          type: 'link',
          action: () => router.push('/upload')
        },
        {
          id: 'library',
          label: 'Bibliothèque',
          description: 'Playlists et favoris',
          type: 'link',
          action: () => router.push('/library')
        },
        {
          id: 'stats',
          label: 'Statistiques',
          description: 'Analyser vos performances',
          type: 'link',
          action: () => router.push('/stats')
        }
      ]
    },
    {
      id: 'preferences',
      title: 'Préférences',
      icon: Settings,
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          description: 'Nouveaux abonnés, likes',
          type: 'toggle',
          value: settings.notifications
        },
        {
          id: 'autoPlay',
          label: 'Lecture auto',
          description: 'Lancer automatiquement',
          type: 'toggle',
          value: settings.autoPlay
        },
        {
          id: 'highQuality',
          label: 'Haute qualité',
          description: 'Streaming HD',
          type: 'toggle',
          value: settings.highQuality
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Confidentialité',
      icon: Shield,
      items: [
        {
          id: 'privacy',
          label: 'Profil public',
          description: 'Rendre visible',
          type: 'toggle',
          value: settings.privacy === 'Public'
        },
        {
          id: 'activity',
          label: 'Activité visible',
          description: 'Afficher l\'activité',
          type: 'toggle',
          value: true
        }
      ]
    },
    {
      id: 'support',
      title: 'Support',
      icon: HelpCircle,
      items: [
        {
          id: 'help',
          label: 'Centre d\'aide',
          description: 'FAQ et tutoriels',
          type: 'link',
          action: () => {}
        },
        {
          id: 'about',
          label: 'À propos',
          description: 'Version 1.0.0',
          type: 'link',
          action: () => {}
        }
      ]
    }
  ];

  const handleToggle = (id: string) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id as keyof typeof prev]
    }));
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/signin');
  };

  const renderSettingItem = (item: SettingItem) => {
    switch (item.type) {
      case 'toggle':
        return (
          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <div className="font-medium text-white">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60">{item.description}</div>
              )}
            </div>
            <button
              onClick={() => handleToggle(item.id)}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                settings[item.id as keyof typeof settings] 
                  ? 'bg-purple-500' 
                  : 'bg-white/20'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
                settings[item.id as keyof typeof settings] 
                  ? 'translate-x-5' 
                  : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        );

      case 'link':
        return (
          <button
            onClick={item.action}
            className="flex items-center justify-between w-full py-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="flex-1 text-left">
              <div className="font-medium text-white">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60">{item.description}</div>
              )}
            </div>
            <ChevronRight size={16} className="text-white/40" />
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <main className="container mx-auto px-4 pt-8 pb-20">
        <div className="max-w-md mx-auto">
          {/* Header moderne */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 bg-purple-500/10 border-purple-500/20 border">
                <Settings className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
            <p className="text-white/60">Personnalisez votre expérience</p>
          </motion.div>

          {/* Profil utilisateur compact */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="panel-suno border border-[var(--border)] rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center space-x-3">
              <img
                src={user?.image || '/default-avatar.png'}
                alt={user?.name || 'Avatar'}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <h2 className="font-semibold text-white">{user?.name}</h2>
                <p className="text-sm text-white/60">@{user?.username}</p>
              </div>
            </div>
          </motion.div>

          {/* Limites d'abonnement compact */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6"
          >
            <SubscriptionLimits />
          </motion.div>

          {/* Sections de paramètres en blocs */}
          <div className="space-y-4">
            {settingSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="panel-suno border border-[var(--border)] rounded-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-[var(--border)]/50">
                  <div className="flex items-center space-x-3">
                    <section.icon size={18} className="text-purple-400" />
                    <h3 className="font-semibold text-white">{section.title}</h3>
                  </div>
                </div>
                
                <div className="divide-y divide-[var(--border)]/30">
                  {section.items.map((item, itemIndex) => (
                    <div key={item.id} className="px-4 py-3">
                      {renderSettingItem(item)}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Bouton de déconnexion */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              onClick={handleLogout}
              className="w-full panel-suno border border-red-500/30 rounded-2xl p-4 text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <div className="flex items-center justify-center space-x-3">
                <LogOut size={18} />
                <span className="font-medium">Se déconnecter</span>
              </div>
            </motion.button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
} 