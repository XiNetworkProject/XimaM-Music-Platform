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
  ArrowLeft,
  Check,
  Crown,
  Star,
  Zap
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
      title: 'Compte',
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
        },
        {
          id: 'language',
          label: 'Langue',
          description: settings.language,
          type: 'select',
          value: settings.language,
          options: ['Français', 'English', 'Español']
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
          id: 'subscriptions',
          label: 'Abonnements',
          description: 'Gérer votre plan',
          type: 'link',
          action: () => router.push('/subscriptions')
        },
        {
          id: 'stats',
          label: 'Statistiques',
          description: 'Voir vos performances',
          type: 'link',
          action: () => router.push('/stats')
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
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium text-white/90 text-base">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60 mt-1">{item.description}</div>
              )}
            </div>
            <button
              onClick={() => handleToggle(item.id)}
              className={`w-14 h-7 rounded-full transition-all duration-300 shadow-lg ${
                settings[item.id as keyof typeof settings] 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/30' 
                  : 'bg-white/20 shadow-white/10'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${
                settings[item.id as keyof typeof settings] 
                  ? 'translate-x-7' 
                  : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        );

      case 'select':
        return (
          <div className="flex items-center justify-between group">
            <div className="flex-1">
              <div className="font-medium text-white/90 text-base">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60 mt-1">{item.description}</div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white/60 font-medium">{item.value}</span>
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/60 transition-colors group-hover:translate-x-1" />
            </div>
          </div>
        );

      case 'link':
        return (
          <button
            onClick={item.action}
            className="flex items-center justify-between w-full group hover:bg-white/5 rounded-xl p-3 -m-3 transition-all duration-200"
          >
            <div className="flex-1 text-left">
              <div className="font-medium text-white/90 text-base">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60 mt-1">{item.description}</div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <ChevronRight size={18} className="text-white/40 group-hover:text-white/60 transition-colors group-hover:translate-x-1" />
            </div>
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white">
      <main className="container mx-auto px-4 pt-8 pb-20">
        {/* Carte principale style fourni */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white/[0.02] backdrop-blur-xl max-w-4xl mx-auto"
        >
          {/* Header de carte */}
          <div className="flex h-fit w-full flex-row items-center justify-between p-4 text-[var(--text)] max-md:p-2 border-b border-[var(--border)]">
            <h1 className="text-2xl max-md:text-base">Paramètres</h1>
            <div className="flex flex-row gap-2"></div>
          </div>

          {/* Corps de carte */}
          <div className="flex flex-col">
            <div className="flex w-full flex-col items-stretch justify-start gap-3 p-3 sm:p-4">
              {/* Profil utilisateur */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={user?.image || '/default-avatar.png'}
                        alt={user?.name || 'Avatar'}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-white/20 flex items-center justify-center">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-white/90">{user?.name}</h2>
                      <p className="text-white/60">@{user?.username}</p>
                      <p className="text-sm text-white/40">{user?.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-xs font-medium text-purple-300">
                        Premium
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Limites d'abonnement */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <SubscriptionLimits />
              </motion.div>

              {/* Sections paramétrables */}
              <div className="space-y-4">
                {settingSections.map((section, sectionIndex) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.12 + sectionIndex * 0.06 }}
                    className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
                    <div className="relative p-5 border-b border-[var(--border)]/30 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-sm">
                        <section.icon size={18} className="text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-white/90 text-lg">{section.title}</h3>
                    </div>

                    <div className="relative divide-y divide-[var(--border)]/20">
                      {section.items.map((item, itemIndex) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0.14 + sectionIndex * 0.06 + itemIndex * 0.03 }}
                          className="p-5 hover:bg-white/5 transition-colors duration-200"
                        >
                          {renderSettingItem(item)}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer de carte */}
          <div className="flex h-fit flex-col justify-end gap-2 p-3 sm:p-4 border-t border-[var(--border)]">
            <div className="flex flex-row justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="flex gap-2">
                <button type="button" className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full text-[var(--text)] bg-[var(--bg-tertiary)] enabled:hover:before:bg-white/10">
                  <span className="relative flex flex-row items-center justify-center gap-2">Annuler</span>
                </button>
                <button type="button" className="relative inline-block font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full text-black bg-white enabled:hover:before:bg-white/90">
                  <span className="relative flex flex-row items-center justify-center gap-2">Enregistrer</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
} 