'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Music } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Format d\'email invalide');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setSuccess(true);
    } catch (error) {
      console.error('Erreur récupération mot de passe:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'envoi');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <main className="container mx-auto px-4 pt-16 pb-32">
          <div className="max-w-md mx-auto">
            <div className="mb-10 text-center">
            <div className="flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-white mr-2" />
              <h1 className="text-3xl font-bold text-white">XimaM</h1>
              </div>
              <h2 className="text-2xl font-bold gradient-text mb-2">Email envoyé !</h2>
              <p className="text-white/60">
                Si un compte existe avec l'email <strong>{email}</strong>, 
                vous recevrez un lien de réinitialisation.
              </p>
            </div>

            <div className="glass-effect rounded-xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-400" />
            </div>

            <div className="space-y-4">
              <Link
                href="/auth/signin"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 inline-block text-center"
              >
                Retour à la connexion
              </Link>
              
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="w-full bg-white/10 text-white py-3 px-4 rounded-lg font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
              >
                Envoyer un autre email
              </button>
            </div>
          </div>
        </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <main className="container mx-auto px-4 pt-16 pb-32">
        <div className="max-w-md mx-auto">
          <div className="mb-10 text-center">
          <div className="flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-white mr-2" />
            <h1 className="text-3xl font-bold text-white">XimaM</h1>
          </div>
            <h2 className="text-2xl font-bold gradient-text mb-2">Mot de passe oublié</h2>
            <p className="text-white/60">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

          <div className="glass-effect rounded-xl p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400/50 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="votre@email.com"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Envoi en cours...
              </div>
            ) : (
              'Envoyer le lien de réinitialisation'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link 
            href="/auth/signin"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la connexion
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/50">
            Vous vous souvenez de votre mot de passe ?{' '}
            <Link href="/auth/signin" className="text-blue-400 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
        </div>
      </main>
    </div>
  );
} 