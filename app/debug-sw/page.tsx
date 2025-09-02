'use client';

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../providers';

export default function DebugSWPage() {
  const [swStatus, setSwStatus] = useState<any>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [logs, setLogs] = useState<string[]>([]);
  const { audioState, playTrack, requestNotificationPermission: requestPermissionFromHook } = useAudioPlayer();

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    checkServiceWorkerStatus();
    checkNotificationStatus();
  }, []);

  const checkServiceWorkerStatus = async () => {
    addLog('🔍 Vérification du statut du service worker...');
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          setSwStatus({
            registered: true,
            active: !!registration.active,
            waiting: !!registration.waiting,
            installing: !!registration.installing,
            scope: registration.scope
          });
          addLog('✅ Service worker enregistré');
          addLog(`📋 État: ${registration.active ? 'Actif' : 'Inactif'}`);
        } else {
          setSwStatus({ registered: false });
          addLog('❌ Aucun service worker enregistré');
        }
      } catch (error) {
        addLog(`❌ Erreur vérification SW: ${error}`);
      }
    } else {
      addLog('❌ Service Worker non supporté');
    }
  };

  const checkNotificationStatus = () => {
    addLog('🔍 Vérification du statut des notifications...');
    
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
      addLog(`📱 Permission: ${Notification.permission}`);
    } else {
      addLog('❌ Notifications non supportées');
    }
  };

  const requestNotificationPermission = async () => {
    addLog('🔐 Demande de permission notification...');
    
    if (!('Notification' in window)) {
      addLog('❌ Notifications non supportées');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      addLog(`📱 Permission accordée: ${permission}`);
    } catch (error) {
      addLog(`❌ Erreur permission: ${error}`);
    }
  };

  const testNotification = () => {
    addLog('🧪 Test de notification...');
    
    if (Notification.permission !== 'granted') {
      addLog('❌ Permission non accordée');
      return;
    }

    try {
              const notification = new Notification('Test Synaura', {
        body: 'Test de notification depuis la page de debug',
        icon: '/android-chrome-192x192.png',
        tag: 'test'
      });
      
      addLog('✅ Notification de test affichée');
      
      setTimeout(() => {
        notification.close();
        addLog('🔒 Notification de test fermée');
      }, 3000);
      
    } catch (error) {
      addLog(`❌ Erreur notification: ${error}`);
    }
  };

  const testAudioNotification = () => {
    addLog('🎵 Test notification audio...');
    
    if (!audioState.tracks.length) {
      addLog('❌ Aucune piste disponible');
      return;
    }

    const track = audioState.tracks[0];
    addLog(`🎵 Test avec la piste: ${track.title}`);
    
    // Simuler une notification audio
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'UPDATE_NOTIFICATION',
            title: track.title,
            body: `${track.artist.name} - En lecture`,
            track: track,
            isPlaying: true
          });
          addLog('✅ Message notification envoyé au SW');
        } else {
          addLog('❌ Service worker non actif');
        }
      }).catch(error => {
        addLog(`❌ Erreur envoi message: ${error}`);
      });
    }
  };

  const forceUpdateSW = async () => {
    addLog('🔄 Forçage mise à jour SW...');
    
    if (!('serviceWorker' in navigator)) {
      addLog('❌ Service Worker non supporté');
      return;
    }

    try {
      // Désenregistrer
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      addLog('✅ Service workers désenregistrés');
      
      // Attendre
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Réenregistrer
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });
      addLog('✅ Service worker réenregistré');
      
      // Forcer activation
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Nettoyer cache
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      addLog('✅ Caches nettoyés');
      
      // Recharger
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Erreur mise à jour: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔧 Debug Service Worker & Notifications
        </h1>

        {/* Statuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Service Worker</h2>
            {swStatus ? (
              <div className="space-y-2">
                <p>Enregistré: {swStatus.registered ? '✅' : '❌'}</p>
                {swStatus.registered && (
                  <>
                    <p>Actif: {swStatus.active ? '✅' : '❌'}</p>
                    <p>En attente: {swStatus.waiting ? '✅' : '❌'}</p>
                    <p>Installation: {swStatus.installing ? '✅' : '❌'}</p>
                  </>
                )}
              </div>
            ) : (
              <p>Chargement...</p>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Notifications</h2>
            <p>Permission: {notificationStatus}</p>
            <p>Pistes chargées: {audioState.tracks.length}</p>
            <p>Lecture: {audioState.isPlaying ? '✅' : '❌'}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={checkServiceWorkerStatus}
              className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600"
            >
              🔍 Vérifier SW
            </button>
            
            <button
              onClick={requestNotificationPermission}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
            >
              🔐 Demander Permission
            </button>
            
            <button
              onClick={testNotification}
              className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600"
            >
              🧪 Test Notification
            </button>
            
            <button
              onClick={testAudioNotification}
              className="bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600"
            >
              🎵 Test Audio
            </button>
            
            <button
              onClick={forceUpdateSW}
              className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
            >
              🔄 Forcer Update
            </button>
            
            <button
              onClick={clearLogs}
              className="bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
            >
              🗑️ Nettoyer Logs
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Logs</h2>
            <span className="text-sm text-gray-500">{logs.length} messages</span>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">Aucun log pour le moment...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 