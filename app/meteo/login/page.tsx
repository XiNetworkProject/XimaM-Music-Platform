'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Lock, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { notify } from '@/components/NotificationCenter';

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

      await getSession();

      const teamRes = await fetch('/api/meteo/team', { method: 'GET' });

      if (!teamRes.ok) {
        const msg = 'Accès réservé à l\'équipe Alertemps';
        setFormError(msg);
        notify.error(msg);
        return;
      }

      const teamData = await teamRes.json();

      if (!teamData?.isMember) {
        const msg = 'Accès réservé à l\'équipe Alertemps';
        setFormError(msg);
        notify.error(msg);
        return;
      }

      notify.success('Connexion réussie !');
      router.push('/meteo/dashboard');
    } catch {
      const msg = 'Erreur de connexion';
      setFormError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white bg-[#0f0a1a]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a1a] via-[#110c20] to-[#0d0816]" />
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-violet-600/[0.06] rounded-full blur-[200px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/[0.04] rounded-full blur-[200px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-[440px]">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between text-sm text-white/40">
            <Link
              href="/"
              className="inline-flex items-center gap-2 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Synaura
            </Link>
          </div>

          {/* Logo section */}
          <div className="text-center mb-10">
            <img src="/images/alertemps-logo.png" alt="Alertemps" className="h-12 w-auto mx-auto mb-6" />
            <p className="text-[15px] text-white/40">
              Connectez-vous a votre espace meteo
            </p>
          </div>

          {/* Login card */}
          <div className="rounded-3xl bg-white/[0.04] p-8">
            {/* Error display */}
            {formError && (
              <div className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="meteo-email" className="block text-sm text-white/50">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="meteo-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/[0.05] text-[15px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 transition-all"
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label htmlFor="meteo-password" className="block text-sm text-white/50">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="meteo-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-12 rounded-2xl bg-white/[0.05] text-[15px] text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white text-[15px] font-semibold h-12 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion…</span>
                  </>
                ) : (
                  <span>Se connecter</span>
                )}
              </button>
            </form>

            {/* Info box */}
            <div className="mt-6 rounded-2xl bg-white/[0.03] px-4 py-3.5">
              <p className="text-sm text-white/35 leading-relaxed">
                Acces reserve a l&apos;equipe Alertemps. Contactez un administrateur pour obtenir un acces.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-white/25">
            Alertemps · Synaura
          </div>
        </div>
      </div>
    </div>
  );
}
