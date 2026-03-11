'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  'AccessDenied': "Accès refusé. Vérifiez que vous avez autorisé l'application à accéder à votre compte.",
  'Configuration': "Erreur de configuration du service d'authentification.",
  'Verification': 'Le token de vérification est invalide ou expiré.',
  'OAuthSignin': "Erreur lors de l'initialisation de la connexion OAuth.",
  'OAuthCallback': "Erreur lors du retour de la connexion OAuth.",
  'Default': "Une erreur inattendue s'est produite.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setErrorMessage(ERROR_MESSAGES[error || ''] || ERROR_MESSAGES['Default']);
  }, [error]);

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
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>

        <h2 className="text-lg font-bold text-white mb-2">Erreur d'authentification</h2>

        {error && (
          <div className="inline-block px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-white/40 mb-3">
            {error}
          </div>
        )}

        <p className="text-sm text-white/50 mb-6 leading-relaxed">{errorMessage}</p>

        <div className="space-y-2.5">
          <button
            onClick={() => window.location.reload()}
            className="w-full h-11 rounded-full bg-white text-black text-sm font-semibold transition-all hover:bg-white/90 inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>

          <Link
            href="/auth/signin"
            className="block w-full h-11 rounded-full bg-white/[0.06] text-sm text-white/70 font-medium hover:bg-white/[0.1] transition text-center leading-[44px]"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition">
          <ArrowLeft className="w-3 h-3" />
          Retour à l'accueil
        </Link>
      </div>
    </motion.div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
