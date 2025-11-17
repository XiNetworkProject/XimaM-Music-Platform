'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Cloud, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { notify } from '@/components/NotificationCenter';

function MeteoLoginBackground() {
  return null;
}

export default function MeteoLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setFormError(null);
    setLoading(true);

    try {
      if (!email || !password) {
        const msg = 'Merci de remplir tous les champs';
        setFormError(msg);
        notify.error(msg);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const msg = 'Email ou mot de passe incorrect';
        setFormError(msg);
        notify.error(msg);
        return;
      }

      // Vérifier que c'est bien le compte Alertemps
      const session = await getSession();

      if (session?.user?.email !== 'alertempsfrance@gmail.com') {
        const msg = 'Accès non autorisé à Alertemps';
        setFormError(msg);
        notify.error(msg);
        return;
      }

      notify.success('Connexion réussie !');
      router.push('/meteo/dashboard');
    } catch (error) {
      const msg = 'Erreur de connexion';
      setFormError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      <MeteoLoginBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Top bar / retour */}
          <div className="mb-4 flex items-center justify-between text-xs text-white/70">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-white/100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à Synaura
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-white/60">
              <Lock className="w-3.5 h-3.5" />
              Accès sécurisé Alertemps
            </span>
          </div>

          {/* Header Alertemps */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/10 border border-white/20 shadow-[0_0_30px_rgba(59,130,246,0.5)] mb-4">
              <Cloud className="w-9 h-9 text-sky-400" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mb-1">
              Alertemps
            </h1>
            <p className="text-sm text-white/65">
              Espace professionnel météo intégré à Synaura
            </p>
          </div>

          {/* Carte de login */}
          <div className="rounded-2xl border border-white/12 bg-black/55 backdrop-blur-2xl shadow-[0_18px_70px_rgba(0,0,0,0.7)] p-6 sm:p-7">
            <h2 className="text-lg font-medium text-white mb-4 text-center">
              Connexion à l’espace météo
            </h2>

            {/* Message d’erreur inline */}
            {formError && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-[2px] flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-white/75"
                >
                  Email Alertemps
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-400/70 focus:border-sky-400/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  placeholder="alertempsfrance@gmail.com"
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-white/75"
                >
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-sky-400/70 focus:border-sky-400/60 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/90 transition-colors"
                    aria-label={
                      showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:opacity-95 text-sm font-semibold text-white py-2.5 px-4 shadow-[0_0_24px_rgba(56,189,248,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Connexion…</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Se connecter à Alertemps</span>
                  </>
                )}
              </button>
            </form>

            {/* Note de sécurité */}
            <div className="mt-5 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-100/90">
                  <p className="font-semibold mb-1">Accès restreint</p>
                  <p>
                    Cet espace est réservé aux comptes professionnels d&apos;Alertemps. 
                    Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez l&apos;administrateur Synaura.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-[11px] text-white/45">
            © {new Date().getFullYear()} Alertemps France · Intégré à Synaura
          </div>
        </div>
      </div>
    </div>
  );
}
