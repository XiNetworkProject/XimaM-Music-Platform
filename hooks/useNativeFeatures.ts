import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export function useNativeFeatures() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Configuration de la barre d'état
    const configureStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#050214' });
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
      } catch (e) {
        console.warn('StatusBar not available', e);
      }
    };

    configureStatusBar();

    // Gestion du bouton retour Android
    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        const path = window.location.pathname;
        if (path === '/' || path === '/home') {
          App.exitApp();
        } else {
          router.push('/');
        }
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [router]);
}
