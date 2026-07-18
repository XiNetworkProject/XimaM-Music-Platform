import type { Metadata, Viewport } from 'next';
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
import AndroidAppPrompt from '@/components/mobile/AndroidAppPrompt';
import { SynauraThemeProvider } from '@/components/theme/SynauraThemeProvider';

const SYNAURA_THEME_STORAGE_KEY = 'synaura.theme.mode.v1';

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
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Synaura',
  },
  icons: {
    icon: [
      { url: '/brand/2026/synaura-symbol-2026-white.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/brand/2026/synaura-symbol-2026-white.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('${SYNAURA_THEME_STORAGE_KEY}');m=(m==='dark'||m==='light'||m==='system')?m:'system';var t=m==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var d=document.documentElement;d.dataset.synauraThemeMode=m;d.dataset.synauraTheme=t;d.classList.toggle('dark',t==='dark');d.classList.toggle('light',t==='light');d.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
        <meta name="theme-color" content="#0D0D0D" />
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
      </head>
          <body className={`theme-suno ${inter.className} overflow-hidden max-w-full h-full`}>
        <SynauraThemeProvider>
        <Providers>
          {/* Studio Background (fond global de l'app) */}
          <StudioBackground variant="synaura" />
          
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
          <AndroidAppPrompt />
        </Providers>
        </SynauraThemeProvider>
      </body>
    </html>
  );
}
