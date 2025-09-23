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
  Edit3,
  CreditCard,
  BarChart3,
  MessageCircle,
  Users,
  Lock,
  Eye,
  EyeOff,
  Check,
  Plus,
  MoreHorizontal
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
      <div className="min-h-screen bg-transparent text-white">
        <main className="container mx-auto px-4 pt-8 pb-20">
          <div className="max-w-md mx-auto">
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
              <p className="text-white/60">Vous devez être connecté pour accéder à vos paramètres</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="panel-suno border border-[var(--border)] rounded-2xl p-6 text-center"
            >
              <button
                onClick={() => router.push('/auth/signin')}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:via-pink-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
              >
                Se connecter
              </button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  const settingSections: SettingSection[] = [
    {
      id: 'account',
      title: 'Profil',
      icon: User,
      items: [
        {
          id: 'profile',
          label: 'Modifier le profil',
          description: 'Nom, photo, bio',
          type: 'link',
          action: () => router.push(`/profile/${user?.username}`)
        },
        {
          id: 'username',
          label: 'Nom d\'utilisateur',
          description: '@' + user?.username,
          type: 'link',
          action: () => {}
        },
        {
          id: 'email',
          label: 'Email',
          description: user?.email || 'Non défini',
          type: 'link',
          action: () => {}
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
          label: 'Upload de musique',
          description: 'Partager vos créations',
          type: 'link',
          action: () => router.push('/upload')
        },
        {
          id: 'library',
          label: 'Ma bibliothèque',
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
      id: 'subscription',
      title: 'Abonnement',
      icon: CreditCard,
      items: [
        {
          id: 'subscriptions',
          label: 'Gérer l\'abonnement',
          description: 'Plan actuel et facturation',
          type: 'link',
          action: () => router.push('/subscriptions')
        },
        {
          id: 'usage',
          label: 'Utilisation',
          description: 'Limites et quotas',
          type: 'link',
          action: () => {}
        }
      ]
    },
    {
      id: 'preferences',
      title: 'Préférences',
      icon: Settings,
      items: [
        {
          id: 'darkMode',
          label: 'Mode sombre',
          description: 'Interface sombre',
          type: 'toggle',
          value: settings.darkMode
        },
        {
          id: 'notifications',
          label: 'Notifications',
          description: 'Nouveaux abonnés, likes',
          type: 'toggle',
          value: settings.notifications
        },
        {
          id: 'autoPlay',
          label: 'Lecture automatique',
          description: 'Lancer la musique automatiquement',
          type: 'toggle',
          value: settings.autoPlay
        },
        {
          id: 'highQuality',
          label: 'Haute qualité',
          description: 'Streaming en haute qualité',
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
          description: 'Rendre le profil visible',
          type: 'select',
          value: settings.privacy,
          options: ['Public', 'Privé', 'Amis uniquement']
        },
        {
          id: 'activity',
          label: 'Activité visible',
          description: 'Afficher l\'activité récente',
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
          id: 'contact',
          label: 'Nous contacter',
          description: 'Support technique',
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
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <div className="font-medium text-white/90">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60 mt-1">{item.description}</div>
              )}
            </div>
            <button
              onClick={() => handleToggle(item.id)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
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

      case 'select':
        return (
          <div className="flex items-center justify-between py-3">
            <div className="flex-1">
              <div className="font-medium text-white/90">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60 mt-1">{item.description}</div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white/60">{item.value}</span>
              <ChevronRight size={16} className="text-white/40" />
            </div>
          </div>
        );

      case 'link':
        return (
          <button
            onClick={item.action}
            className="flex items-center justify-between w-full py-3 hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="flex-1 text-left">
              <div className="font-medium text-white/90">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60 mt-1">{item.description}</div>
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

          {/* Profil utilisateur */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="panel-suno border border-[var(--border)] rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={user?.image || '/default-avatar.png'}
                  alt={user?.name || 'Avatar'}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/20"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
                <p className="text-white/60">@{user?.username}</p>
                <p className="text-sm text-white/40">{user?.email}</p>
              </div>
              <button
                onClick={() => router.push(`/profile/${user?.username}`)}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
              >
                Modifier
              </button>
            </div>
          </motion.div>

          {/* Limites d'abonnement */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-6"
          >
            <SubscriptionLimits />
          </motion.div>

          {/* Sections de paramètres */}
          <div className="space-y-4">
            {settingSections.map((section, sectionIndex) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + sectionIndex * 0.1 }}
                className="panel-suno border border-[var(--border)] rounded-2xl overflow-hidden"
              >
                {/* En-tête de section */}
                <div className="px-6 py-4 border-b border-[var(--border)]/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <section.icon size={18} className="text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white/90">{section.title}</h3>
                  </div>
                </div>
                
                {/* Items de la section */}
                <div className="px-6">
                  {section.items.map((item, itemIndex) => (
                    <div key={item.id} className={itemIndex !== section.items.length - 1 ? "border-b border-[var(--border)]/30" : ""}>
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
              transition={{ duration: 0.6, delay: 0.8 }}
              onClick={handleLogout}
              className="w-full panel-suno border border-red-500/20 rounded-2xl p-4 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center justify-center space-x-3">
                <LogOut size={20} />
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