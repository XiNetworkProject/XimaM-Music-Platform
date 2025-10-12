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
      id: 'legal',
      title: 'Légal',
      icon: Globe,
      items: [
        {
          id: 'legal-center',
          label: 'Centre légal',
          description: 'Tous les documents légaux',
          type: 'link',
          action: () => router.push('/legal')
        },
        {
          id: 'mentions',
          label: 'Mentions légales',
          type: 'link',
          action: () => router.push('/legal/mentions-legales')
        },
        {
          id: 'confidentialite',
          label: 'Confidentialité',
          type: 'link',
          action: () => router.push('/legal/confidentialite')
        },
        {
          id: 'cgu',
          label: 'CGU',
          type: 'link',
          action: () => router.push('/legal/cgu')
        },
        {
          id: 'cgv',
          label: 'CGV',
          type: 'link',
          action: () => router.push('/legal/cgv')
        },
        {
          id: 'cookies',
          label: 'Cookies',
          type: 'link',
          action: () => router.push('/legal/cookies')
        },
        {
          id: 'rgpd',
          label: 'RGPD',
          type: 'link',
          action: () => router.push('/legal/rgpd')
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
    <div className="min-h-screen w-full px-2 sm:px-4 md:px-6 pt-6 sm:pt-10 pb-24 text-[var(--text)]">
      <div className="relative z-10 w-full p-0 sm:p-2">
        <div className="max-w-2xl mx-auto">
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
            <p className="text-white/60">Personnalisez votre expérience musicale</p>
          </motion.div>

          {/* Profil utilisateur */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative overflow-hidden panel-suno border border-[var(--border)] rounded-2xl p-6 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
          >
            {/* Background gradient */}
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
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-xs font-medium text-purple-300">
                    Premium
                  </div>
                </div>
            </div>
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
          <div className="space-y-6">
            {settingSections.map((section, sectionIndex) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + sectionIndex * 0.1 }}
                className="relative overflow-hidden panel-suno border border-[var(--border)] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
              >
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
                
                {/* Header */}
                <div className="relative p-5 border-b border-[var(--border)]/30">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-sm">
                      <section.icon size={18} className="text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white/90 text-lg">{section.title}</h3>
                  </div>
                </div>
                
                {/* Items */}
                <div className="relative divide-y divide-[var(--border)]/20">
                  {section.items.map((item, itemIndex) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                      className="p-5 hover:bg-white/5 transition-colors duration-200"
                    >
                      {renderSettingItem(item)}
                    </motion.div>
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
              className="w-full relative overflow-hidden panel-suno rounded-2xl p-5 text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-400/50 transition-all duration-300 group shadow-lg hover:shadow-red-500/20 [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-600/5 pointer-events-none" />
              
              <div className="relative flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30 shadow-sm group-hover:bg-red-500/30 transition-colors">
                  <LogOut size={18} className="text-red-400" />
                </div>
                <span className="font-medium text-lg">Se déconnecter</span>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
} 