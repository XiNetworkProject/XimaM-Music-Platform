'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Music, User } from 'lucide-react';
import { useRegistrationStatus } from '@/hooks/useRegistrationStatus';
import { SynauraSpinner } from '@/components/SynauraSpinner';

function SignUpContent() {
  const router = useRouter();
  const { status, isLoading: statusLoading } = useRegistrationStatus();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la création du compte');
        return;
      }

      setSuccessMessage(data.message);
      
      // Rediriger vers la connexion après 2 secondes
      setTimeout(() => {
        router.push(`/auth/signin?message=${encodeURIComponent(data.message)}`);
      }, 2000);

    } catch (error) {
      console.error('Erreur inscription:', error);
      setError('Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <SynauraSpinner size="lg" />
          <p className="mt-4 text-white/70">Vérification du statut d'inscription...</p>
        </div>
      </div>
    );
  }

  if (status && !status.isRegistrationOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Inscription Fermée
            </h1>
            <p className="text-white/70 text-lg mb-6">
              La limite de 50 utilisateurs a été atteinte.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">
                🎵 Explorez Synaura
              </h2>
              <p className="text-white/70 mb-6">
                Vous pouvez toujours découvrir de la musique sur l'accueil et la page de découverte !
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-white rounded-lg transition-colors duration-200"
                >
                  🏠 Accueil
                </button>
                <button 
                  onClick={() => router.push('/discover')}
                  className="w-full px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-white rounded-lg transition-colors duration-200"
                >
                  🔍 Découvrir
                </button>
              </div>
            </div>
          </div>
        </div>
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
              <h1 className="text-3xl font-bold text-white">Synaura</h1>
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-2">Créer un compte</h2>
            <p className="text-white/60">Rejoignez la communauté Synaura</p>
            
            {status && (
              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-400/50 text-blue-200 rounded-lg text-sm">
                {status.remainingSlots > 0 ? (
                  <>🎵 {status.remainingSlots} places restantes pour l'accès complet</>
                ) : (
                  <>⚠️ Accès limité - Explorez l'accueil et la découverte</>
                )}
              </div>
            )}
          </div>

          <div className="glass-effect rounded-xl p-8">
            {successMessage && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-400/50 text-green-200 rounded-lg">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-400/50 text-red-200 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white/90 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Votre nom"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Nom d'utilisateur */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="@nomutilisateur"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="votre@email.com"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirmation mot de passe */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Bouton d'inscription */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Création du compte...
                  </div>
                ) : (
                  'Créer mon compte'
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/70">
                Déjà un compte ?{' '}
                <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 font-medium">
                  Se connecter
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-white/50">
                En créant un compte, vous acceptez nos{' '}
                <a href="#" className="text-blue-400 hover:underline">
                  conditions d'utilisation
                </a>{' '}
                et notre{' '}
                <a href="#" className="text-blue-400 hover:underline">
                  politique de confidentialité
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Chargement...</div>}>
      <SignUpContent />
    </Suspense>
  );
}