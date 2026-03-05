'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Check, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Veuillez entrer votre email'); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError("Format d'email invalide"); return; }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur lors de l'envoi");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsLoading(false);
    }
  };

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
        <p className="text-sm text-white/40 mt-2">
          {success ? 'Email envoyé !' : 'Réinitialise ton mot de passe'}
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">
        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm text-white/60 mb-6">
              Si un compte existe avec <span className="text-white font-medium">{email}</span>, un lien de réinitialisation a été envoyé.
            </p>
            <div className="space-y-2.5">
              <Link
                href="/auth/signin"
                className="block w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition-all text-center leading-[44px]"
              >
                Retour à la connexion
              </Link>
              <button
                onClick={() => { setSuccess(false); setEmail(''); }}
                className="w-full h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/60 hover:text-white hover:bg-white/[0.1] transition"
              >
                Envoyer un autre email
              </button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl flex items-center gap-2.5 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-sm text-white/40 mb-5">
              Entre ton adresse email et nous t'enverrons un lien pour réinitialiser ton mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-white/70 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    type="email" id="email" value={email}
                    onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                    className="w-full h-11 pl-10 pr-4 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition"
                    placeholder="vous@example.com" disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full h-11 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold transition-all hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi...
                  </span>
                ) : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link href="/auth/signin" className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition">
          <ArrowLeft className="w-3 h-3" />
          Retour à la connexion
        </Link>
      </div>
    </motion.div>
  );
}
