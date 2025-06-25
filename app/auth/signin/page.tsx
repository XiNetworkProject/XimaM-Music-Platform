'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { Mail, Lock } from 'lucide-react';

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Détecter si on est dans l'app mobile
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isInApp = window.location.href.includes('capacitor://') || 
                   window.location.href.includes('file://') ||
                   window.navigator.userAgent.includes('Capacitor') ||
                   window.navigator.userAgent.includes('wv') || // WebView Android
                   (window as any).Capacitor !== undefined ||
                   (window as any).cordova !== undefined;
    
    setIsMobileApp(isMobile && isInApp);
  }, []);

  // Rediriger si déjà connecté
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/');
    }
  }, [status, session, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      if (isMobileApp) {
        setShowInstructions(true);
        // Attendre un peu puis lancer la connexion
        setTimeout(() => {
          signIn('google', { 
            callbackUrl: '/',
            redirect: true 
          });
        }, 2000);
      } else {
        await signIn('google', { 
          callbackUrl: '/',
          redirect: true 
        });
      }
    } catch (error) {
      console.error('Erreur connexion Google:', error);
      setError('Erreur lors de la connexion');
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });
      
      if (result?.error) {
        setError('Email ou mot de passe incorrect');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Erreur connexion email:', error);
      setError('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">XimaM</h1>
          <p className="text-gray-600">Connectez-vous pour continuer</p>
          {isMobileApp && (
            <p className="text-sm text-blue-600 mt-2">📱 Mode application mobile</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {showInstructions && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            <p className="font-semibold mb-2">📱 Instructions pour l'app mobile :</p>
            <ol className="text-sm space-y-1">
              <li>1. Une fenêtre Google va s'ouvrir</li>
              <li>2. Connectez-vous avec votre compte Google</li>
              <li>3. <strong>Revenez à l'app XimaM</strong></li>
              <li>4. Vous serez automatiquement connecté</li>
            </ol>
            <p className="text-xs mt-2 text-blue-600">
              💡 Utilisez le bouton "Retour" de votre téléphone ou fermez l'onglet Google
            </p>
          </div>
        )}

        {!showEmailForm ? (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              ) : (
                <FcGoogle className="w-5 h-5" />
              )}
              {isLoading ? 'Connexion...' : 'Continuer avec Google'}
            </button>

            {isMobileApp && (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Ou</p>
                <button
                  onClick={() => setShowEmailForm(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Se connecter avec email/mot de passe
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Votre mot de passe"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="w-full text-gray-600 hover:text-gray-700 text-sm"
            >
              Retour à Google
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="text-blue-600 hover:underline">
              conditions d'utilisation
            </a>{' '}
            et notre{' '}
            <a href="#" className="text-blue-600 hover:underline">
              politique de confidentialité
            </a>
            .
          </p>
        </div>

        {isMobileApp && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              💡 Conseil : Si Google ne fonctionne pas, utilisez la connexion par email
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 