'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft, Check } from 'lucide-react';

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setSuccessMessage(message);
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated' && session) router.push('/');
  }, [status, session, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      if (result?.error) setError('Email ou mot de passe incorrect');
      else router.push('/');
    } catch {
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-3 text-sm text-white/50">
          {status === 'authenticated' ? 'Redirection...' : 'Chargement...'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[420px]"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <h1 className="text-3xl font-black tracking-tight text-white">Synaura</h1>
        </Link>
        <p className="text-sm text-white/40 mt-2">Connecte-toi pour continuer</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8">
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-center gap-2.5 text-sm"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl flex items-center gap-2.5 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-full bg-white/[0.06] text-sm text-white/70 font-medium hover:bg-white/[0.1] transition-all active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
          <div className="relative flex justify-center"><span className="px-3 text-[11px] text-white/25 bg-[#0a0a14]">ou</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-white/70 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="email" id="email" name="email" value={formData.email} onChange={handleInputChange}
                className="w-full h-11 pl-10 pr-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition"
                placeholder="vous@example.com" disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] font-medium text-white/70 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleInputChange}
                className="w-full h-11 pl-10 pr-11 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition"
                placeholder="••••••••" disabled={isLoading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-xs text-white/40 hover:text-white/60 transition">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full h-11 rounded-full bg-white text-black text-sm font-semibold transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connexion...
              </span>
            ) : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-white/40">
          Pas encore de compte ?{' '}
          <Link href="/auth/signup" className="text-white/60 hover:text-white font-medium transition">
            Créer un compte
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition">
          <ArrowLeft className="w-3 h-3" />
          Retour à l'accueil
        </Link>
      </div>

      <p className="mt-4 text-center text-[10px] text-white/20 leading-relaxed">
        En vous connectant, vous acceptez nos{' '}
        <Link href="/legal/cgv" className="hover:text-white/40 transition">CGV</Link> et notre{' '}
        <Link href="/legal/confidentialite" className="hover:text-white/40 transition">politique de confidentialité</Link>.
      </p>
    </motion.div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
