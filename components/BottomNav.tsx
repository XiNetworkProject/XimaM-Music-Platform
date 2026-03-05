'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Home,
  Search,
  BookOpen,
  Sparkles,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Cloud,
  Gift,
  LifeBuoy,
  Scale,
  X,
  User,
} from 'lucide-react';
import { useAudioPlayer } from '@/app/providers';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { audioState } = useAudioPlayer();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const isStudioPage = pathname?.startsWith('/ai-generator');

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    (async () => {
      try {
        const username = (session?.user as any)?.username;
        if (!username) return;
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (!res.ok) return;
        const data = await res.json();
        const c = data?.user?.avatar || data?.user?.image || data?.avatar || data?.image;
        if (c && typeof c === 'string') setAvatarUrl(c);
      } catch {}
    })();
  }, [session?.user]);

  const isActive = (p: string) => p === '/' ? pathname === '/' : pathname?.startsWith(p);

  const go = useCallback((path: string, needsAuth = false) => {
    if (needsAuth && !session) { router.push('/auth/signin', { scroll: false }); return; }
    router.push(path, { scroll: false });
    setShowMore(false);
  }, [router, session]);

  // On studio page, global mini player is hidden on mobile, so don't shift the nav up
  const playerVisible = !isStudioPage && audioState.showPlayer && audioState.tracks.length > 0;

  const tabs = [
    { icon: Home, label: 'Accueil', path: '/' },
    { icon: Search, label: 'Explorer', path: '/discover' },
    { icon: Sparkles, label: 'Studio', path: '/ai-generator' },
    { icon: BookOpen, label: 'Biblio', path: '/library', auth: true },
  ];

  const drawerItems = [
    { icon: Plus, label: 'Uploader', path: '/upload', auth: true },
    { icon: Gift, label: 'Boosters', path: '/boosters', auth: true },
    { icon: TrendingUp, label: 'Stats', path: '/stats', auth: true },
    { icon: Users, label: 'Communauté', path: '/community' },
    { icon: Cloud, label: 'Météo', path: '/meteo' },
    { icon: Settings, label: 'Paramètres', path: '/settings', auth: true },
    { icon: LifeBuoy, label: 'Support', path: '/support' },
    { icon: Scale, label: 'Légal', path: '/legal' },
  ];

  return (
    <>
      <nav
        className="fixed left-0 right-0 bottom-0 z-40 lg:hidden"
        style={{ marginBottom: playerVisible ? 56 : 0, transition: 'margin-bottom 200ms ease' }}
      >
        <div
          className="bg-[#0a0a0e] border-t border-white/[0.06]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-14">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.path}
                  type="button"
                  onClick={() => go(tab.path, tab.auth)}
                  className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:opacity-70 transition-opacity"
                  aria-label={tab.label}
                >
                  <Icon
                    className={`w-6 h-6 ${active ? 'text-white' : 'text-neutral-500'}`}
                    strokeWidth={active ? 2.2 : 1.6}
                  />
                  <span className={`text-[10px] ${active ? 'text-white font-semibold' : 'text-neutral-500 font-medium'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => session ? setShowMore(v => !v) : go('/auth/signin')}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full active:opacity-70 transition-opacity"
              aria-label="Profil"
            >
              {session && avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className={`w-6 h-6 rounded-full object-cover ${showMore ? 'ring-2 ring-white' : ''}`}
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                />
              ) : (
                <User className={`w-6 h-6 ${showMore ? 'text-white' : 'text-neutral-500'}`} strokeWidth={1.6} />
              )}
              <span className={`text-[10px] ${showMore ? 'text-white font-semibold' : 'text-neutral-500 font-medium'}`}>
                {session ? 'Profil' : 'Connexion'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {isClient && createPortal(
        <AnimatePresence>
          {showMore && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[9998] lg:hidden bg-black/60"
                onClick={() => setShowMore(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                className="fixed inset-x-0 bottom-0 z-[9999] lg:hidden"
              >
                <div
                  className="rounded-t-2xl bg-neutral-900 border-t border-neutral-800"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-neutral-700" />
                  </div>

                  <div className="flex items-center justify-between px-5 py-3">
                    <button
                      type="button"
                      onClick={() => go(`/profile/${(session?.user as any)?.username || ''}`, true)}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <img
                        src={avatarUrl || (session?.user as any)?.image || '/default-avatar.png'}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                      />
                      <div className="text-left min-w-0">
                        <div className="text-[15px] font-bold text-white truncate">
                          {(session?.user as any)?.username || (session?.user as any)?.name || 'Profil'}
                        </div>
                        <div className="text-[12px] text-neutral-400">Voir le profil</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMore(false)}
                      className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-px bg-neutral-800 mx-4 my-1" />

                  <div className="px-4 py-3">
                    <div className="grid grid-cols-4 gap-2">
                      {drawerItems.map((item) => {
                        const active = isActive(item.path);
                        const Icon = item.icon;
                        const disabled = item.auth && !session;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            disabled={disabled}
                            onClick={() => go(item.path, item.auth)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl py-3 transition-all active:scale-95 ${
                              active
                                ? 'bg-neutral-800 text-white'
                                : disabled
                                  ? 'opacity-25 text-neutral-500'
                                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-semibold">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
