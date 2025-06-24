'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

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
          id: 'downloads',
          label: 'Téléchargements',
          description: 'Musique hors ligne',
          type: 'link',
          action: () => {}
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
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60">{item.description}</div>
              )}
            </div>
            <button
              onClick={() => handleToggle(item.id)}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings[item.id as keyof typeof settings] 
                  ? 'bg-primary-500' 
                  : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings[item.id as keyof typeof settings] 
                  ? 'translate-x-6' 
                  : 'translate-x-1'
              }`} />
            </button>
          </div>
        );

      case 'select':
        return (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-sm text-white/60">{item.description}</div>
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
            className="flex items-center justify-between w-full"
          >
            <div className="flex-1 text-left">
              <div className="font-medium">{item.label}</div>
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
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-effect">
        <div className="p-4">
          <h1 className="text-2xl font-bold gradient-text">Paramètres</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Profil utilisateur */}
          <div className="glass-effect rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-4">
              <img
                src={user?.avatar || user?.image || '/default-avatar.png'}
                alt={user?.name || 'Avatar'}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{user?.name}</h2>
                <p className="text-white/60">@{user?.username}</p>
                <p className="text-sm text-white/40">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Sections de paramètres */}
          <div className="space-y-6">
            {settingSections.map((section) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <section.icon size={20} className="text-primary-400" />
                    <h3 className="font-semibold">{section.title}</h3>
                  </div>
                </div>
                
                <div className="divide-y divide-white/10">
                  {section.items.map((item) => (
                    <div key={item.id} className="p-4">
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
              onClick={handleLogout}
              className="w-full glass-effect rounded-xl p-4 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center space-x-3">
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