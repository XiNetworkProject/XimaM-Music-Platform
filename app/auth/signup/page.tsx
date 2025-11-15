'use client';

import { useState, useEffect } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  User,
  Lock,
  Music,
  Users,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userCount, setUserCount] = useState<{
    userCount: number;
    maxUsers: number;
    canRegister: boolean;
    remainingSlots: number;
  } | null>(null);

  // Charger le nombre d'utilisateurs
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const response = await fetch('/api/auth/count-users');
        const data = await response.json();
        setUserCount(data);
      } catch (error) {
        console.error(
          "Erreur lors du chargement du nombre d'utilisateurs:",
          error,
        );
      }
    };
    fetchUserCount();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return false;
    }
    if (!formData.username.trim()) {
      setError("Le nom d'utilisateur est requis");
      return false;
    }
    if (formData.username.length < 3) {
      setError(
        "Le nom d'utilisateur doit contenir au moins 3 caractères",
      );
      return false;
    }
    if (!formData.email.trim()) {
      setError("L'email est requis");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Format d'email invalide");
      return false;
    }
    if (formData.password.length < 6) {
      setError(
        'Le mot de passe doit contenir au moins 6 caractères',
      );
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérifier si l'inscription est encore possible
    if (userCount && !userCount.canRegister) {
      setError(
        'Les inscriptions sont fermées. La limite de comptes a été atteinte.',
      );
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Erreur lors de l'inscription",
        );
      }

      // Rediriger vers la page de connexion avec un message de succès
      router.push(
        '/auth/signin?message=Inscription réussie ! Vous pouvez maintenant vous connecter.',
      );
    } catch (error) {
      console.error('Erreur inscription:', error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'inscription",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white">
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
          {/* Colonne gauche : Pitch Synaura / Infos inscription */}
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
                    Crée ton compte<br />
                    et rejoins le studio
                  </h1>
                </div>
              </div>

              <p className="text-sm text-white/70 max-w-md">
                Un compte unique pour accéder au lecteur, au Studio IA, à
                ta bibliothèque, aux stats et à toute la communauté
                Synaura.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-violet-300" />
                    <span className="font-semibold text-white">
                      Créations IA
                    </span>
                  </div>
                  <p className="text-xs text-white/65">
                    Garde une trace de toutes tes générations IA, projets,
                    presets et remixes.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4 text-cyan-300" />
                    <span className="font-semibold text-white">
                      Profil public
                    </span>
                  </div>
                  <p className="text-xs text-white/65">
                    Partage tes morceaux, gagne des abonnés et discute avec
                    d&apos;autres créateurs.
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
                {!userCount.canRegister && (
                  <span className="text-[11px] text-red-300 text-right">
                    Inscriptions temporairement fermées
                  </span>
                )}
              </div>
            )}
          </motion.section>

          {/* Colonne droite : Carte d'inscription */}
          <motion.section
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-transparent backdrop-blur-xl p-6 md:p-7"
          >
            {/* Bouton retour / lien connexion */}
            <div className="mb-4 flex justify-between items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/90 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour à l&apos;accueil</span>
              </Link>
              <p className="text-[11px] text-white/70">
                Déjà un compte ?{' '}
                <Link
                  href="/auth/signin"
                  className="text-violet-300 hover:text-violet-200 font-medium"
                >
                  Se connecter
                </Link>
              </p>
            </div>

            {/* Header form */}
            <div className="mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 border border-white/20">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                  Inscription
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-1">
                Crée ton compte Synaura
              </h2>
              <p className="text-xs md:text-sm text-white/65">
                Choisis ton pseudo, ton email et ton mot de passe pour
                commencer.
              </p>
            </div>

            {/* Bannières & erreurs */}
            <AnimatePresence>
              {userCount && !userCount.canRegister && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="mb-4 p-3.5 bg-red-500/18 border border-red-400/70 text-red-100 rounded-2xl flex items-center gap-3 text-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-300" />
                  <div>
                    <p className="font-medium">Inscriptions fermées</p>
                    <p className="text-xs text-red-100/80">
                      La limite de {userCount.maxUsers} comptes a été atteinte
                      pour le moment.
                    </p>
                  </div>
                </motion.div>
              )}

              {userCount && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/12 text-xs flex items-center justify-between gap-3 text-white/75"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>
                      {userCount.userCount}/{userCount.maxUsers} comptes
                      créés
                    </span>
                    {userCount.remainingSlots > 0 && (
                      <span className="text-emerald-300">
                        ({userCount.remainingSlots} places restantes)
                      </span>
                    )}
                  </div>
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
              {/* Nom complet */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-white/90 mb-1.5"
                >
                  Nom complet
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-violet-300 transition-colors" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="Votre nom complet"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-white/90 mb-1.5"
                >
                  Nom d&apos;utilisateur
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-violet-300 transition-colors" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="nom_utilisateur"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/90 mb-1.5"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="vous@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-white/90 mb-1.5"
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
                    className="w-full pl-10 pr-11 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                    aria-label={
                      showPassword
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-white/90 mb-1.5"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-violet-300 transition-colors" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-11 py-2.5 bg-white/5 border border-white/15 rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/60 focus:border-violet-300/70 transition-all duration-200"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                    aria-label={
                      showConfirmPassword
                        ? 'Masquer la confirmation'
                        : 'Afficher la confirmation'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bouton inscription */}
              <motion.button
                type="submit"
                disabled={isLoading || (userCount?.canRegister === false)}
                whileTap={{
                  scale:
                    isLoading || userCount?.canRegister === false ? 1 : 0.98,
                }}
                className="w-full mt-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-[0_0_24px_rgba(129,140,248,0.9)] hover:shadow-[0_0_32px_rgba(129,140,248,1)] hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Création du compte...</span>
                  </div>
                ) : userCount && !userCount.canRegister ? (
                  'Inscriptions fermées'
                ) : (
                  'Créer mon compte'
                )}
              </motion.button>
            </form>

            {/* Texte legal */}
            <div className="mt-5 text-center">
              <p className="text-[11px] text-white/50 leading-relaxed">
                En créant un compte, vous acceptez nos{' '}
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
