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


  return (
    <div className="min-h-screen bg-transparent text-white">
      <main className="container mx-auto px-4 pt-8 pb-20">
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
            className="w-full rounded-2xl p-3 sm:p-4 backdrop-blur-lg border border-[var(--border)] bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
          >
            <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
              {/* Informations du profil */}
              <div className="space-between flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                {/* Nom */}
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Nom</span>
                  <span className="text-sm text-[var(--text)]">
                    <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                      {user?.name || '—'}
                    </span>
                  </span>
                </div>

                {/* Nom d'utilisateur */}
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Nom d'utilisateur</span>
                  <span className="text-sm text-[var(--text)]">
                    <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                      @{user?.username || '—'}
                    </span>
                  </span>
                </div>

                {/* Email */}
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Email</span>
                  <span className="text-sm text-[var(--text)]">
                    <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                      {user?.email || '—'}
                    </span>
                  </span>
                </div>

                {/* Avatar */}
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-[var(--text-muted)]/90">Avatar</span>
                  <span className="text-sm text-[var(--text)]">
                    <div className="flex items-center gap-2">
                      <img
                        src={user?.image || '/default-avatar.png'}
                        alt={user?.name || 'Avatar'}
                        className="w-8 h-8 rounded-full object-cover border border-[var(--border)]/60"
                      />
                      <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                        Modifier
                      </span>
                    </div>
                  </span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-row flex-wrap justify-center gap-2">
                <button 
                  type="button" 
                  className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-[var(--text)] bg-white/5 ring-1 ring-[var(--border)] hover:bg-white/10 hover:ring-purple-400/30 transition"
                >
                  <span className="relative flex flex-row items-center justify-center gap-2">Modifier le profil</span>
                </button>
                
                <div className="flex">
                  <button 
                    type="button" 
                    className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-white bg-gradient-to-r from-purple-500 to-cyan-400 hover:opacity-95 shadow-[0_4px_24px_rgba(124,58,237,0.25)]"
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">Voir le profil</span>
                  </button>
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
                className="w-full rounded-2xl p-3 sm:p-4 backdrop-blur-lg border border-[var(--border)] bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(124,58,237,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(34,211,238,0.08),transparent)]"
              >
                <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
                  {/* Titre de la section */}
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                      <section.icon size={18} className="text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white/90 text-lg">{section.title}</h3>
                  </div>

                  {/* Items de la section */}
                  <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-white/10 gap-2">
                    {section.items.map((item, itemIndex) => (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.5 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                        className="flex flex-col gap-1 px-4 first:pl-0 last:pr-0"
                      >
                        <span className="text-xs text-[var(--text-muted)]/90">{item.label}</span>
                        <div className="text-sm text-[var(--text)]">
                          {item.type === 'toggle' ? (
                            <button
                              onClick={() => handleToggle(item.id)}
                              className={`w-12 h-6 rounded-full transition-all duration-300 ${
                                settings[item.id as keyof typeof settings] 
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                                  : 'bg-white/20'
                              }`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 ${
                                settings[item.id as keyof typeof settings] 
                                  ? 'translate-x-6' 
                                  : 'translate-x-1'
                              }`} />
                            </button>
                          ) : item.type === 'select' ? (
                            <span className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5">
                              {item.value}
                            </span>
                          ) : (
                            <button
                              onClick={item.action}
                              className="rounded-md border border-[var(--border)]/60 bg-white/5 px-2 py-0.5 hover:bg-white/10 transition-colors"
                            >
                              {item.description || 'Modifier'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Bouton de déconnexion */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              onClick={handleLogout}
              className="w-full rounded-2xl p-3 sm:p-4 backdrop-blur-lg border border-red-500/30 bg-transparent [background:radial-gradient(120%_60%_at_20%_0%,rgba(239,68,68,0.10),transparent),_radial-gradient(120%_60%_at_80%_100%,rgba(220,38,38,0.08),transparent)]"
            >
              <div className="flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
                {/* Informations */}
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                    <LogOut size={18} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-400 text-lg">Déconnexion</h3>
                    <p className="text-sm text-red-300/70">Se déconnecter de votre compte</p>
                  </div>
                </div>

                {/* Bouton d'action */}
                <div className="flex flex-row flex-wrap justify-center gap-2">
                  <button 
                    type="button" 
                    className="relative inline-block font-sans font-medium text-center select-none cursor-pointer px-3 sm:px-4 py-2 text-[14px] sm:text-[15px] leading-[22px] sm:leading-[24px] rounded-full text-red-400 bg-red-500/10 ring-1 ring-red-500/30 hover:bg-red-500/20 hover:ring-red-400/50 transition"
                  >
                    <span className="relative flex flex-row items-center justify-center gap-2">Se déconnecter</span>
                  </button>
                </div>
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