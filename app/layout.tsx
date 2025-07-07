import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import BottomNav from '@/components/BottomNav';
import FullScreenPlayer from '@/components/FullScreenPlayer';
import PageTransition from '@/components/PageTransition';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'XimaM - Partagez votre musique',
  description: 'Découvrez et partagez de la musique avec la communauté XimaM',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  other: {
    'mobile-web-app-capable': 'yes',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'XimaM',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// Enregistrement du service worker optimisé côté client
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-optimized.js')
      .then(registration => {
        console.log('✅ Service Worker optimisé enregistré');
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouvelle version disponible
                console.log('🔄 Nouvelle version disponible');
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('❌ Erreur enregistrement Service Worker:', error);
    });
  }
}

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
        <meta name="apple-mobile-web-app-title" content="XimaM Music" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
            <BottomNav />
            <FullScreenPlayer />
          </div>
        </Providers>
      </body>
    </html>
  );
} 