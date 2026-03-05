'use client';

import { useState, useEffect } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, User, Lock, AlertCircle, ArrowLeft, Users } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', username: '', email: '', password: '', confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userCount, setUserCount] = useState<{
    userCount: number; maxUsers: number; canRegister: boolean; remainingSlots: number;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/count-users').then(r => r.json()).then(setUserCount).catch(() => {});
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) { setError('Le nom est requis'); return false; }
    if (!formData.username.trim() || formData.username.length < 3) { setError("Le nom d'utilisateur doit contenir au moins 3 caractères"); return false; }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) { setError("Format d'email invalide"); return false; }
    if (formData.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userCount && !userCount.canRegister) { setError('Inscriptions fermées.'); return; }
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');
    try {
      const referralCode = typeof window !== 'undefined' ? localStorage.getItem('synaura_referral_code') || undefined : undefined;
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(), username: formData.username.trim().toLowerCase(),
          email: formData.email.trim().toLowerCase(), password: formData.password, referralCode,
        }),
      });
      if (response.ok && referralCode) localStorage.removeItem('synaura_referral_code');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors de l'inscription");
      router.push('/auth/signin?message=Inscription réussie ! Connecte-toi maintenant.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full h-11 pl-10 pr-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition";
  const inputClassPw = "w-full h-11 pl-10 pr-11 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[420px]"
    >
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <h1 className="text-3xl font-black tracking-tight text-white">Synaura</h1>
        </Link>
        <p className="text-sm text-white/40 mt-2">Crée ton compte gratuitement</p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">
        <AnimatePresence>
          {userCount && !userCount.canRegister && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl flex items-center gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Inscriptions fermées ({userCount.maxUsers} comptes max atteints)</span>
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl flex items-center gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {userCount && userCount.remainingSlots > 0 && (
          <div className="mb-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] text-[12px] text-white/40">
            <Users className="w-3.5 h-3.5" />
            <span>{userCount.remainingSlots} places restantes sur {userCount.maxUsers}</span>
          </div>
        )}

        {/* Google */}
        <button
          type="button"
          onClick={async () => { const { signIn } = await import('next-auth/react'); signIn('google', { callbackUrl: '/' }); }}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-white font-medium hover:bg-white/[0.1] transition-all active:scale-[0.98]"
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputClass} placeholder="Jean" disabled={isLoading} />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Pseudo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full h-11 pl-8 pr-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition" placeholder="pseudo" disabled={isLoading} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-white/70 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputClass} placeholder="vous@example.com" disabled={isLoading} />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-white/70 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} className={inputClassPw} placeholder="6 caractères min." disabled={isLoading} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-white/70 mb-1.5">Confirmer</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className={inputClassPw} placeholder="••••••••" disabled={isLoading} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={isLoading || userCount?.canRegister === false}
            className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Création...
              </span>
            ) : userCount && !userCount.canRegister ? 'Inscriptions fermées' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-white/40">
          Déjà un compte ?{' '}
          <Link href="/auth/signin" className="text-indigo-400 hover:text-indigo-300 font-medium transition">Se connecter</Link>
        </p>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition">
          <ArrowLeft className="w-3 h-3" />
          Retour à l'accueil
        </Link>
      </div>

      <p className="mt-4 text-center text-[10px] text-white/20 leading-relaxed">
        En créant un compte, vous acceptez nos{' '}
        <Link href="/legal/cgv" className="hover:text-white/40 transition">CGV</Link> et notre{' '}
        <Link href="/legal/confidentialite" className="hover:text-white/40 transition">politique de confidentialité</Link>.
      </p>
    </motion.div>
  );
}
