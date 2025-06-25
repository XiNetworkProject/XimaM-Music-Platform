'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      location: window.location.href,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isInApp: window.location.href.includes('capacitor://') || 
               window.location.href.includes('file://') ||
               window.navigator.userAgent.includes('Capacitor') ||
               window.navigator.userAgent.includes('wv') || // WebView Android
               (window as any).Capacitor !== undefined ||
               (window as any).cordova !== undefined,
      timestamp: new Date().toISOString(),
      sessionStatus: status,
      hasSession: !!session,
      sessionData: session ? {
        user: session.user?.email,
        username: session.user?.username,
        role: session.user?.role
      } : null,
      // Informations supplémentaires pour le debug
      windowLocation: {
        href: window.location.href,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        pathname: window.location.pathname
      },
      capacitorAvailable: (window as any).Capacitor !== undefined,
      cordovaAvailable: (window as any).cordova !== undefined
    };
    
    setDebugInfo(info);
  }, [session, status]);

  const testConnection = async () => {
    try {
      const response = await fetch('/api/tracks');
      const data = await response.json();
      alert(`Connexion réussie! ${data.length || 0} pistes trouvées.`);
    } catch (error) {
      alert(`Erreur de connexion: ${error}`);
    }
  };

  const testAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      alert(`Session: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      alert(`Erreur session: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Page de Debug</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations de session */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Session</h2>
            <div className="space-y-2">
              <p><strong>Statut:</strong> {status}</p>
              <p><strong>Connecté:</strong> {debugInfo.hasSession ? 'Oui' : 'Non'}</p>
              {debugInfo.sessionData && (
                <div>
                  <p><strong>Email:</strong> {debugInfo.sessionData.user}</p>
                  <p><strong>Username:</strong> {debugInfo.sessionData.username}</p>
                  <p><strong>Rôle:</strong> {debugInfo.sessionData.role}</p>
                </div>
              )}
            </div>
          </div>

          {/* Informations de l'environnement */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Environnement</h2>
            <div className="space-y-2">
              <p><strong>Mobile:</strong> {debugInfo.isMobile ? 'Oui' : 'Non'}</p>
              <p><strong>Dans l'app:</strong> {debugInfo.isInApp ? 'Oui' : 'Non'}</p>
              <p><strong>Platform:</strong> {debugInfo.platform}</p>
              <p><strong>URL:</strong> {debugInfo.location}</p>
            </div>
          </div>

          {/* Test de connexion */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Test de Connexion</h2>
            <div className="space-y-2">
              <button
                onClick={testConnection}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tester l'API
              </button>
              <button
                onClick={testAuth}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Tester l'Auth
              </button>
            </div>
          </div>

          {/* User Agent */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">User Agent</h2>
            <p className="text-sm text-gray-600 break-all">{debugInfo.userAgent}</p>
          </div>
        </div>

        {/* Informations complètes */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Informations Complètes</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Instructions pour l'authentification mobile */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">📱 Instructions pour l'App Mobile</h2>
          <div className="space-y-2 text-blue-800">
            <p>• Si vous êtes dans l'app mobile, l'authentification Google ouvrira un navigateur externe</p>
            <p>• Après la connexion Google, revenez à l'app XimaM</p>
            <p>• Utilisez le bouton "Retour" de votre téléphone ou fermez l'onglet Google</p>
            <p>• Vous devriez être automatiquement connecté dans l'app</p>
          </div>
        </div>
      </div>
    </div>
  );
} 