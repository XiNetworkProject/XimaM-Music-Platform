'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gift, Music, Sparkles, ArrowRight, Users } from 'lucide-react';

export default function JoinReferralPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          setReferrerName(data.referrerName || null);
          setValid(true);
        }
      } catch { /* invalid code */ }
      setLoading(false);
    })();

    if (typeof window !== 'undefined') {
      localStorage.setItem('synaura_referral_code', code);
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-6">
            <Gift className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            {valid ? 'Tu as été invité sur Synaura !' : 'Lien d\'invitation'}
          </h1>

          {valid && referrerName && (
            <p className="text-white/60 text-sm mb-4">
              <span className="text-violet-300 font-medium">{referrerName}</span> t'invite
              a rejoindre Synaura
            </p>
          )}

          <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-lg">+50 credits offerts</span>
            </div>
            <p className="text-sm text-white/60">
              Cree ton compte et recois 50 credits bonus pour creer de la musique avec l'IA
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <Music className="w-5 h-5 text-violet-300 mx-auto mb-1.5" />
              <span className="text-white/70">Studio IA</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <Users className="w-5 h-5 text-cyan-300 mx-auto mb-1.5" />
              <span className="text-white/70">Communaute</span>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/8 p-3">
              <Gift className="w-5 h-5 text-fuchsia-300 mx-auto mb-1.5" />
              <span className="text-white/70">Gratuit</span>
            </div>
          </div>

          <Link
            href="/auth/signup"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-white text-sm font-semibold shadow-[0_0_24px_rgba(129,140,248,0.5)] hover:shadow-[0_0_32px_rgba(129,140,248,0.7)] hover:brightness-110 transition-all"
          >
            Creer mon compte
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="mt-4 text-xs text-white/40">
            Deja un compte ?{' '}
            <Link href="/auth/signin" className="text-violet-300 hover:text-violet-200">
              Se connecter
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
