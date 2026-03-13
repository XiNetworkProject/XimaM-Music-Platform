import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './suno.css';
import Providers from './providers';
import { ConditionalNav, ConditionalNavbar, ConditionalBottomNav } from '@/components/ConditionalNav';
import LayoutContent from '@/components/LayoutContent';
import FullScreenPlayer from '@/components/FullScreenPlayer';
import StudioBackground from '@/components/StudioBackground';
import GlobalQueueBubble from '@/components/GlobalQueueBubble';
import { Analytics } from '@vercel/analytics/next';
import AdSenseScript from '@/components/AdSenseScript';

// Déclaration des types pour les fonctions globales
declare global {
  interface Window {
    forceUpdateServiceWorker?: () => void;
    checkAndFixServiceWorker?: () => void;
  }
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Synaura',
  description: 'Découvrez et partagez de la musique avec la communauté Synaura',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Synaura',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

// Service Worker temporairement désactivé pour résoudre les problèmes de navigation
// if (typeof window !== 'undefined') {
//   if ('serviceWorker' in navigator) {
//     // Charger le script de correction en premier
//     const script = document.createElement('script');
//     script.src = '/force-update.js';
//     script.async = true;
//     document.head.appendChild(script);
//     
//     // Attendre un peu avant d'enregistrer le SW
//     setTimeout(() => {
//       navigator.serviceWorker.register('/sw-optimized.js')
//         .then(registration => {
//           console.log('✅ Service Worker optimisé enregistré');
//           
//           // Vérifier les mises à jour
//           registration.addEventListener('updatefound', () => {
//             const newWorker = registration.installing;
//             if (newWorker) {
//               newWorker.addEventListener('statechange', () => {
//                 if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
//                   // Nouvelle version disponible
//                   console.log('🔄 Nouvelle version disponible');
//                 }
//               });
//             }
//           });
//           
//           // Gérer les erreurs de SW
//           registration.addEventListener('error', (error) => {
//             console.error('❌ Erreur Service Worker:', error);
//             // Forcer la mise à jour si nécessaire
//             window.forceUpdateServiceWorker?.();
//           });
//         })
//         .catch(error => {
//           console.error('❌ Erreur enregistrement Service Worker:', error);
//           // Essayer de nettoyer et réenregistrer
//           setTimeout(() => window.forceUpdateServiceWorker?.(), 2000);
//       });
//     }, 1000);
//   }
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#1db954" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Synaura" />
        {/* AdSense: méthode alternative de validation (balise meta) */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? (
          <meta name="google-adsense-account" content={process.env.NEXT_PUBLIC_ADSENSE_CLIENT} />
        ) : null}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* Précharger le DNS et la connexion au CDN Bunny */}
        <link rel="dns-prefetch" href={`https://${process.env.NEXT_PUBLIC_CDN_DOMAIN || 'synaura-cdn.b-cdn.net'}`} />
        <link rel="preconnect" href={`https://${process.env.NEXT_PUBLIC_CDN_DOMAIN || 'synaura-cdn.b-cdn.net'}`} crossOrigin="anonymous" />
        <AdSenseScript />
        {/* Mobile debug console (eruda) — activated with ?debug=1 in URL */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  if (typeof window === 'undefined') return;
                  var p = new URLSearchParams(window.location.search);
                  if (p.get('debug') === '1' || localStorage.getItem('__eruda') === '1') {
                    localStorage.setItem('__eruda', '1');
                    var s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
                    s.onload = function(){ eruda.init(); };
                    document.head.appendChild(s);
                  }
                  if (p.get('debug') === '0') localStorage.removeItem('__eruda');
                } catch(e){}
              })();
            `,
          }}
        />
      </head>
          <body className={`theme-suno ${inter.className} overflow-hidden max-w-full h-full`}>
        <Providers>
          {/* Studio Background (fond global de l'app) */}
          <StudioBackground />
          
          {/* Aurora background (fixed layers) */}
          <div className="aurora-bg" aria-hidden>
            <div className="aurora-layer aurora-1"></div>
            <div className="aurora-layer aurora-2"></div>
            <div className="aurora-layer aurora-3"></div>
            <div className="aurora-vignette"></div>
          </div>

          {/* Conteneur de scroll unique : hauteur viewport, scroll interne, pas de rebond */}
          <div className="app-scroll-container">
            <div className="flex min-h-screen overflow-x-hidden max-w-full relative z-10">
              <ConditionalNav>
                <LayoutContent>
                  <ConditionalNavbar />
                  <main className="flex-1 overflow-x-hidden max-w-full">
                    {children}
                  </main>
                  <ConditionalBottomNav />
                  <GlobalQueueBubble />
                  <FullScreenPlayer />
                </LayoutContent>
              </ConditionalNav>
            </div>
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
} 