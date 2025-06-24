'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface AppUpdate {
  version: string;
  downloadUrl: string;
  changelog: string;
  isRequired: boolean;
  size: string;
}

interface NativeFeatures {
  isNative: boolean;
  platform: string;
  appVersion: string;
  checkForUpdates: () => Promise<AppUpdate | null>;
  showUpdateDialog: (update: AppUpdate) => void;
  downloadUpdate: (update: AppUpdate) => Promise<void>;
  showNotification: (title: string, body: string) => Promise<void>;
  setStatusBarStyle: (style: 'light' | 'dark') => Promise<void>;
  getDeviceInfo: () => Promise<any>;
}

export const useNativeFeatures = (): NativeFeatures => {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    const initNative = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNative(true);
        setPlatform('android'); // Par défaut pour Android
        setAppVersion('1.0.0');
      }
    };

    initNative();
  }, []);

  const checkForUpdates = async (): Promise<AppUpdate | null> => {
    if (!isNative) return null;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_UPDATE_SERVER_URL}/api/updates/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentVersion: appVersion,
          platform: platform,
          deviceId: 'mobile',
        }),
      });

      if (response.ok) {
        const update = await response.json();
        return update.available ? update : null;
      }
    } catch (error) {
      console.error('Erreur vérification mise à jour:', error);
    }

    return null;
  };

  const showUpdateDialog = (update: AppUpdate) => {
    if (!isNative) return;

    const message = `
Nouvelle version disponible !

Version: ${update.version}
Taille: ${update.size}
${update.changelog}

${update.isRequired ? 'Cette mise à jour est obligatoire.' : 'Voulez-vous mettre à jour maintenant ?'}
    `.trim();

    if (update.isRequired) {
      downloadUpdate(update);
    } else {
      if (confirm(message)) {
        downloadUpdate(update);
      }
    }
  };

  const downloadUpdate = async (update: AppUpdate) => {
    if (!isNative) return;

    try {
      await showNotification(
        'Mise à jour en cours',
        'Téléchargement de la nouvelle version...'
      );

      // Simuler le téléchargement
      await new Promise(resolve => setTimeout(resolve, 2000));

      await showNotification(
        'Mise à jour prête',
        'L\'application va redémarrer pour installer la mise à jour.'
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Erreur téléchargement mise à jour:', error);
      await showNotification(
        'Erreur de mise à jour',
        'Impossible de télécharger la mise à jour.'
      );
    }
  };

  const showNotification = async (title: string, body: string) => {
    if (!isNative) return;

    try {
      // Utiliser les notifications du navigateur en fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      } else {
        console.log(`Notification: ${title} - ${body}`);
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  const setStatusBarStyle = async (style: 'light' | 'dark') => {
    if (!isNative) return;
    // Implémentation simplifiée
    console.log(`Status bar style: ${style}`);
  };

  const getDeviceInfo = async () => {
    if (!isNative) return null;

    return {
      platform: 'android',
      appVersion: '1.0.0',
      uuid: 'mobile-device',
    };
  };

  return {
    isNative,
    platform,
    appVersion,
    checkForUpdates,
    showUpdateDialog,
    downloadUpdate,
    showNotification,
    setStatusBarStyle,
    getDeviceInfo,
  };
}; 