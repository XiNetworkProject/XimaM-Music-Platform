'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Music,
  Users,
  AlertCircle,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [userCount, setUserCount] = useState<{
    userCount: number;
    maxUsers: number;
    canRegister: boolean;
    remainingSlots: number;
  } | null>(null);

  // Message de succès via l’URL (ex: après signup / reset password)
  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

  // Charger le nombre d'utilisateurs
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const response = await fetch('/api/auth/count-users');
        const data = await response.json();
        setUserCount(data);
      } catch (error) {
        console.error("Erreur lors du chargement du nombre d'utilisateurs:", error);
      }
    };
    fetchUserCount();
  }, []);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/');
    }
  }, [status, session, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou mot de passe incorrect');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  // États de chargement / redirection avec le même fond
  if (status === 'loading') {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-white">
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-400 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-white/75">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="relative min-h-screen flex items-center justify-center text-white">
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-400 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-white/75">Connexion réussie, redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white">
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
          {/* Colonne gauche : Branding / pitch Synaura */}
          <motion.section
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            className="hidden md:flex flex-col justify-between rounded-3xl border border-white/10 bg-transparent backdrop-blur-xl p-6 md:p-7"
          >
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-accent-brand/70 blur-xl opacity-70" />
                  <div className="relative w-11 h-11 rounded-2xl bg-black/30 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">
                    Synaura
                  </p>
                  <h1 className="text-2xl font-semibold text-white leading-tight">
                    Plateforme musicale &<br />studio IA connecté
                  </h1>
                </div>
              </div>

              <p className="text-sm text-white/70 max-w-md">
                Connectez-vous pour retrouver vos playlists, vos créations IA,
                vos artistes favoris et toute la communauté Synaura.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-violet-300" />
                    <span className="font-semibold text-white">
                      Studio IA
                    </span>
                  </div>
                  <p className="text-xs text-white/65">
                    Génération musicale IA, projets, remixes, presets & exports
                    prêts à publier.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4 text-cyan-300" />
                    <span className="font-semibold text-white">
                      Communauté
                    </span>
                  </div>
                  <p className="text-xs text-white/65">
                    Forum d&apos;entraide, FAQ, retours sur les fonctionnalités et
                    partage de projets.
                  </p>
                </div>
              </div>
            </div>

            {userCount && (
              <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-white/70">
                  <Users className="w-4 h-4 text-emerald-300" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {userCount.userCount}/{userCount.maxUsers} comptes créés
                    </span>
                    {userCount.remainingSlots > 0 && (
                      <span className="text-emerald-300">
                        {userCount.remainingSlots} places restantes
                      </span>
                    )}
                  </div>
                </div>
                {userCount.canRegister ? (
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-semibold hover:scale-[1.03] active:scale-100 transition-transform"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rejoindre Synaura</span>
                  </Link>
                ) : (
                  <span className="text-[11px] text-red-300">
                    Inscriptions temporairement fermées
                  </span>
                )}
              </div>
            )}
          </motion.section>

          {/* Colonne droite : carte de connexion */}
          <motion.section
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-transparent backdrop-blur-xl p-6 md:p-7"
          >
            {/* Bouton retour accueil */}
            <div className="mb-4 flex justify-between items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/90 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à l&apos;accueil</span>
              </Link>
            </div>

            {/* Header form */}
            <div className="mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 border border-white/20">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                  Connexion
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-1">
                Bienvenue sur Synaura
              </h2>
              <p className="text-xs md:text-sm text-white/65">
                Entrez vos identifiants pour accéder à votre espace.
              </p>
            </div>

            {/* Messages succès / erreur */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="mb-4 p-3.5 bg-emerald-500/18 border border-emerald-400/70 text-emerald-100 rounded-2xl flex items-center gap-3 text-sm"
                >
                  <Check className="w-5 h-5 text-emerald-300" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="mb-4 p-3.5 bg-red-500/18 border border-red-400/70 text-red-100 rounded-2xl flex items-center gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-300" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/85 mb-1.5"
                >
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-violet-300 transition-colors" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/45 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="vous@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/85 mb-1.5"
                >
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-violet-300 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-11 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/45 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mot de passe oublié */}
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-violet-300 hover:text-violet-200 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              {/* Bouton connexion */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full mt-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-[0_0_24px_rgba(129,140,248,0.9)] hover:shadow-[0_0_32px_rgba(129,140,248,1)] hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Connexion...</span>
                  </div>
                ) : (
                  'Se connecter'
                )}
              </motion.button>
            </form>

            {/* Lien inscription + infos légales */}
            <div className="mt-5 space-y-3 text-center">
              <p className="text-xs text-white/70">
                Pas encore de compte ?{' '}
                {userCount?.canRegister ? (
                  <Link
                    href="/auth/signup"
                    className="text-violet-300 hover:text-violet-200 font-medium transition-colors"
                  >
                    Créer un compte
                  </Link>
                ) : (
                  <span className="text-red-300 font-medium">
                    Inscriptions fermées (limite atteinte)
                  </span>
                )}
              </p>

              {userCount && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/12 text-[11px] text-white/70">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {userCount.userCount}/{userCount.maxUsers} comptes créés
                  </span>
                  {userCount.remainingSlots > 0 && (
                    <span className="text-emerald-300">
                      ({userCount.remainingSlots} places restantes)
                    </span>
                  )}
                </div>
              )}

              <p className="text-[11px] text-white/50 leading-relaxed mt-2">
                En vous connectant, vous acceptez nos{' '}
                <a
                  href="#"
                  className="text-violet-300 hover:underline transition-colors"
                >
                  conditions d&apos;utilisation
                </a>{' '}
                et notre{' '}
                <a
                  href="#"
                  className="text-violet-300 hover:underline transition-colors"
                >
                  politique de confidentialité
                </a>
                .
              </p>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center text-white">
          <div className="relative z-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-400 border-t-transparent mx-auto" />
            <p className="mt-4 text-sm text-white/75">Chargement...</p>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
