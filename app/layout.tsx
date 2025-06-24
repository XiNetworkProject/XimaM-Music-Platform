import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import BottomNav from '@/components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'XimaM - Partagez votre musique',
  description: 'Découvrez et partagez de la musique avec la communauté XimaM',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
            {children}
            
            {/* Navigation persistante */}
            <BottomNav />
            
            {/* Lecteur audio global */}
            <GlobalAudioPlayer />
          </div>
        </Providers>
      </body>
    </html>
  );
} 