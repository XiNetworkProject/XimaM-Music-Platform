import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import BottomNav from '@/components/BottomNav';
import AudioPlayer from '@/components/AudioPlayer';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1" style={{ marginBottom: '120px' }}>
              {children}
            </main>
            <BottomNav />
            <AudioPlayer />
          </div>
        </Providers>
      </body>
    </html>
  );
} 